# Lift Log: guide for the AI coach

Lift Log is RyuKen's iPhone workout tracker (a web app at https://jbozarth206.github.io/lift-log/).
Data flows both ways through GitHub:

| Direction | Where | Who writes |
|---|---|---|
| Workouts **up** | private repo `jbozarth206/lift-log-data`, file `data/liftlog.json` | **the app only** (after every saved, edited or deleted workout, plus "Sync now") |
| Plan **down** | public repo `jbozarth206/lift-log`, file `plan.json` (served on GitHub Pages) | **the coach** |

## 1. Read the latest workout data

```bash
# quickest: decode the file through the API
gh api repos/jbozarth206/lift-log-data/contents/data/liftlog.json --jq .content | base64 -d > /tmp/liftlog.json
# when it was last synced
gh api 'repos/jbozarth206/lift-log-data/commits?path=data/liftlog.json&per_page=1' --jq '.[0].commit.committer.date'
# or: git clone https://github.com/jbozarth206/lift-log-data && cat lift-log-data/data/liftlog.json
```
(For a file over 1 MB the API leaves out `content`. Use `gh api -H 'Accept: application/vnd.github.raw' repos/jbozarth206/lift-log-data/contents/data/liftlog.json` instead.)

### Data format (same as the app's backup export)
```jsonc
{
  "app": "liftlog", "appVersion": "8.3",
  "exportedAt": "2026-11-11T18:40:00.000Z",      // when the phone pushed it
  "version": 13,                                  // data schema version (13 = app 8.2, adds settings.autoOpenWorkout; coach.schedule is the phone's copy of plan.json schedule)
  "phase": {"id": "bulk", "start": "2026-11-11"}, // current 4-week block (bulk|cut|recomp), null if not chosen yet
  "exercises": { "back": [{"id": "mhx2k1abcde", "name": "Lat Pulldown"}], "chest": [], "legs": [], "shoulders": [], "arms": [] },
  "plans": { "bulk": { "back": { "upper": [{"exId": "mhx2k1abcde", "sets": 4, "min": 6, "max": 8, "rest": 150, "notes": "…"}], "mid": [], "lower": [], "all": [] } }, "cut": {}, "recomp": {} },
  "coach": {"planVersion": 1, "planUpdatedAt": null, "lastCheck": "…", "schedule": {}},    // plan version applied; schedule is the phone's copy of plan.json "schedule" (app 8.2+)
  "profile": {"height": 70},                      // inches; null until he sets it
  "body": [                                       // body-metrics log (v5+), any order; sort by date
    {"id": "mwclzbjze0bno", "date": "2026-11-11", "weight": 181.4, "bf": 15.2,
     "waist": 33.5, "chest": null, "arm": 15.8, "thigh": null, "note": "morning, fasted"}
  ],
  "sessions": [
    {"id": "…", "date": "2026-11-11", "group": "back", "focus": "upper", "phase": "bulk",
     "entries": [{"exId": "mhx2k1abcde", "name": "Lat Pulldown", "sets": [{"w": 135, "r": 12}, {"w": 140, "r": 10}],
                  "target": {"src": "coach", "sets": [{"w": 135, "r": 12}, {"w": 140, "r": 10}]}}]}   // target: v7.2+, optional
  ]
}
```
- Weights are in **lb**. `w` = weight and `r` = reps for one working set.
- `focus` / `phase` are `null` on workouts logged before those features existed. Treat them as unlabeled, not as errors.
- `focus: "all"` means he trained the whole group that day.
- `target` on an entry (app 7.2+, optional) is the target shown when he logged it: `src` is `"coach"` (your prescription) or `"auto"` (the app's fallback), and `sets[i]` lines up with the logged `sets[i]` (`w: 0` = bodyweight). Use it to see which prescribed sets he met, beat or missed. `coach.prescriptions` in the data is just the phone's copy of what you published; read it, don't treat it as his input.
- Use the exercise `id` (it never changes) to follow progress across renames. `name` in entries is a snapshot taken when the set was logged.
- **Body log** (top-level `body`, added in app v5; missing or empty in older data, so treat a missing key as `[]`):

  | Field | Unit / type | Notes |
  |---|---|---|
  | `id` | string | Stable entry id. |
  | `date` | `YYYY-MM-DD` | His local date. There can be several entries on one day. |
  | `weight` | lb, number (1 decimal) | Always present. |
  | `bf` | body fat %, number or `null` | Optional. |
  | `waist`, `chest`, `arm`, `thigh` | inches, number or `null` | Optional tape measurements (`arm` = arms, `thigh` = thighs). |
  | `note` | string ≤140 | Optional, may be `""`. |

  The app's trend line is a **7-day rolling average**: it averages same-day entries into one daily value, then for each day it averages the daily values from the previous 7 calendar days (that day included). Use the same method to judge bulk and cut rate, e.g. about 0.25–0.5 lb/week up on a bulk and about 0.5–1% of body weight per week down on a cut.
- **Arms (v6)**: `exercises.arms` and `plans.<phase>.arms.<biceps|triceps|forearms|all>`. Back/chest plan lists may contain **Arms exercise ids** (biceps finishers on back, triceps finishers on chest). Look up a session entry's `exId` across **all** groups' `exercises`. Arms-day sessions have `group: "arms"`.
- **Protocol log** (top-level `peds`, v6+; missing in older data, so treat it as empty). This is a neutral personal log of what he entered. Report what was logged against what he planned; don't give dosing advice.
  ```jsonc
  "peds": {
    "compounds": [{"id": "…", "name": "Testosterone Enanthate", "ester": "Enanthate", "mgPerMl": 250,
                   "weeklyMg": 500, "schedule": {"type": "interval", "everyDays": 3.5},   // or {"type":"weekdays","days":[1,4]}  (0=Sun … 6=Sat)
                   "start": "2026-11-16", "end": "2027-02-08", "active": true, "notes": ""}],
    "doses": [{"id": "…", "compoundId": "…", "name": "Testosterone Enanthate", "at": "2026-11-16T08:30",
               "mg": 250, "ml": 1, "site": "Glute L", "note": ""}],
    "labs": [{"id": "…", "date": "2026-11-10", "kind": "bloodwork", "text": "Total T 1100 ng/dL, E2 42 pg/mL, Hct 49%"}]
  }
  ```
  | Field | Unit / type | Notes |
  |---|---|---|
  | `compounds[].mgPerMl` | mg per mL, number or null | Vial concentration he entered. |
  | `compounds[].weeklyMg` | mg per week, number or null | His planned weekly total. |
  | `compounds[].schedule` | `{type:"interval", everyDays:N}` (N may be a decimal, e.g. 3.5) or `{type:"weekdays", days:[0-6]}` | |
  | `compounds[].start` / `end` | `YYYY-MM-DD` or null | Cycle window. `end: null` = open-ended. |
  | `compounds[].active` | bool | Inactive compounds are never "due". |
  | `doses[].at` | local `YYYY-MM-DDTHH:MM` (his time zone, America/New_York) | |
  | `doses[].mg` | mg (required) | `ml` is mL (computed from `mgPerMl` unless he overrode it). |
  | `doses[].compoundId` | id or null | `name` is a snapshot, so a dose survives deletion of its compound. |
  | `doses[].site` | string | One of: Glute L/R, Delt L/R, Quad L/R, Ventroglute L/R, Lat L/R, Pec L/R, Sub-Q, Other, or `""`. |
  | `labs[].kind` | `"bloodwork"`, `"side-effect"` or `"note"` | `text` is free text (markers with units, symptoms…). |

  The app's "due" logic: for `interval`, the next dose = last dose time + `everyDays` (or `start` if nothing is logged yet). For `weekdays`, it's the next listed weekday on or after today with no dose. A due date before today shows as overdue. Weekly totals run Monday–Sunday.
- **Food log** (top-level `food`, v6+; treat a missing key as empty):
  ```jsonc
  "food": {
    "entries": [{"id": "…", "date": "2026-11-16", "meal": "lunch", "name": "Chicken breast", "qty": "200 g",
                 "kcal": 330, "p": 62, "c": 0, "f": 7}],
    "favorites": [{"id": "…", "name": "Whey shake", "qty": "1 scoop", "kcal": 120, "p": 24, "c": 3, "f": 1.5}],
    "targets": {"kcal": null, "p": null, "c": null, "f": null},   // his own targets (null = not set)
    "targetsSource": "coach"                                       // "coach" = use plan.json nutrition for his phase, "manual" = use targets
  }
  ```
  - `meal`: `breakfast`, `lunch`, `dinner` or `snack`. `qty` is free text. `kcal` is kcal; `p`/`c`/`f` are **grams**. If he left kcal blank, the app filled in `4p + 4c + 9f`.
  - Daily totals = sum of `entries` for a `date`. Days with no entries mean **not logged**, not zero intake.
  - The coach targets he sees are in `coach.nutrition.<phase>` once a plan with `nutrition` has been applied.
- **Lab results from MyChart** (top-level `labs`, v7+; treat a missing key as empty). Imported read-only from his Epic MyChart (Orlando Health) through a SMART on FHIR patient connection (FHIR R4 `Observation`, category `laboratory`). These are separate from his **manual** notes in `peds.labs`, which are unchanged.
  ```jsonc
  "labs": {
    "source": {"system": "epic-mychart", "name": "Orlando Health", "endpointId": "orlando-health", "env": "production",
               "fhirBase": "https://epicproxy.et1131.epichosted.com/FHIRProxy/api/FHIR/R4"},   // null until first import
    "connectedAt": "2026-11-17T20:10:00.000Z",   // ISO UTC; null after he disconnects
    "lastSync": "2026-11-17T20:10:04.000Z",      // ISO UTC of the last successful import
    "results": [{"id": "eXk…3", "date": "2026-10-28", "code": "4544-3", "name": "Hematocrit", "value": 53.1, "unit": "%",
                 "refLow": 37.5, "refHigh": 51, "flag": "H", "text": "", "reportId": "eDR…3"}],
    "reports": {"eDR…3": {"name": "CBC W/O DIFFERENTIAL", "date": "2026-10-28"}}
  }
  ```
  | Field | Unit / type | Notes |
  |---|---|---|
  | `results[].id` | string | Epic FHIR Observation id (dedupe key). Component rows use `<id>#<n>`. |
  | `results[].date` | `YYYY-MM-DD` | Draw (collection) date in his time zone (America/New_York), from `effectiveDateTime` (falls back to `issued`). |
  | `results[].code` | LOINC code or `null` | Prefer this to `name` when matching markers (e.g. `2986-8` total testosterone, `2991-8` free T, `2243-4` estradiol, `4544-3` hematocrit, `718-7` hemoglobin, `13457-7` LDL, `2085-9` HDL, `2571-8` triglycerides, `2093-3` total cholesterol, `1742-6` ALT, `1920-8` AST, `2857-1` PSA). |
  | `results[].name` | string | The lab's display name. |
  | `results[].value` | number or `null` | Numeric result **in `unit`**, exactly as the lab reported it. `null` for qualitative results. Units are the lab's, not converted. |
  | `results[].unit` | string | UCUM-style unit from the lab (`ng/dL`, `pg/mL`, `%`, `g/dL`, `mg/dL`, `IU/L`, `ng/mL`, …). |
  | `results[].refLow` / `refHigh` | number or `null` (same unit as `value`) | The lab's reference range. One side can be `null` (e.g. HDL `>39`). `refText` appears only when the range was text that couldn't be parsed. |
  | `results[].flag` | `"H"`, `"L"`, `"HH"`, `"LL"`, `"A"` or `null` | The lab's interpretation flag. If the lab sent none, the app sets H/L from the range. `null` = normal or unknown. |
  | `results[].text` | string | Qualitative or comparator result (e.g. `"Non Reactive"`, `"<0.1"`), plus any lab comment. Empty for plain numbers. |
  | `results[].reportId` | string or `null` | The FHIR DiagnosticReport (panel) it belongs to. Look up its name in `labs.reports`. |
  | `results[].status` | optional string | Present only when not `final` (e.g. `"preliminary"`, `"amended"`, `"corrected"`). |

  New results appear only after he opens the app and imports (each MyChart sign-in lasts about an hour, so imports happen when he taps Sync or reconnects). Use `lastSync` to know how fresh the list is. Report lab values factually against the lab's own ranges, and point out anything flagged. Don't diagnose or give dosing advice; suggest he discuss flagged results with his clinician.
- **Settings** (top-level `settings`, v8 / app 7.1+; treat a missing key as defaults): `{"restTimer": true, "restSound": true, "restVolume": 0.8, "restOverride": null, "autoOpenWorkout": true}`. `restOverride` is seconds (15–900) or `null`. When set, he has chosen one rest length for **every** exercise, and it beats your plan `rest`. Mention it if your rest prescriptions matter. `autoOpenWorkout` (app 8.2, default `true`) opens today's `schedule` workout on launch when it is not a rest day and he has not already logged it. He can turn it off under Settings › Auto-open today's workout. The other keys are device preferences you can ignore.
- **Rest timer & plan `rest`**: each plan item's `rest` (seconds) drives the rest countdown on his logging screen (it dings at 10 s left and at 0). Omitted `rest` falls back to Bulk 165 s compound / 90 s isolation, Body Recomp 120 s / 75 s, Cut 75 s / 60 s. `0` = no timer. Timer runs aren't logged, so you can't see actual rest taken.
- **Body Recomp (app 8.1, phase id `recomp`)**: a third 4-week block. `phase.id` may be `"recomp"`, and sessions logged in it have `phase: "recomp"`. `plans.recomp` holds the same group/focus shape as bulk and cut. Upgrading from v8 / v8.0.1 (data version 11) adds `plans.recomp` from the built-in defaults and keeps workouts, exercises, Bulk/Cut plans, body, food, peds, labs, habits, and photos. The phone saves `liftlog.v1.backup-v11` before that upgrade.
- **App 8.2 (data version 13)**: adds `settings.autoOpenWorkout` (default `true` when the key is missing) and reads `coach.schedule` from `plan.json`. Upgrading from v8.1 (data version 12) keeps workouts, exercises, Bulk/Cut/Recomp plans, body, food, peds, labs, habits, and photos. The phone saves `liftlog.v1.backup-v12` before that upgrade.
- **App 8.3 (still data version 13)**: form demos on every workout card. Nothing in his log changes and no backup is written for this update. Pictures come from the app's catalog by exercise name. An optional `demo` on a plan exercise (slug, relative image, or https URL) overrides that match when you next publish a higher `version`. Schema: PLAN_SCHEMA.md › "Additions in app 8.3". Leave `demo` off for lifts he already has.
- **Profile**: `profile.height` is in **inches** (e.g. 70 = 5′10″), or `null` if not set. BMI = `703 × weight / height²`.
- **Meal-plan logging (app 8.0+)**: food entries logged from your meal plan carry `plan`:
  ```jsonc
  {"id": "…", "date": "2026-11-19", "meal": "breakfast", "name": "Oats", "qty": "100 g", "kcal": 420, "p": 13, "c": 67, "f": 7,
   "plan": {"meal": "breakfast", "food": 1, "swap": null, "group": "…", "status": "edited",            // "as-planned" | "edited"
            "orig": {"name": "Oats", "qty": "100 g", "kcal": 380, "p": 13, "c": 67, "f": 7}}}          // what you prescribed
  ```
  `meal` is your meal `id`, `food` the index in that meal's foods (or in `swaps[swap].foods` when `swap` is a number). Entries without `plan` are off-plan foods he added himself.
  **`food.adherence`** has one summary per day he logged against the plan (recomputed whenever he logs, edits or deletes food that day):
  ```jsonc
  "adherence": {"2026-11-19": {"phase": "bulk", "planned": {"kcal": 3950, "p": 250, "c": 480, "f": 110}, "actual": {"kcal": 3610, "p": 236, "c": 431, "f": 104},
    "meals": {"breakfast": "edited", "lunch": "as-planned", "preworkout": "partial", "dinner": "swapped", "late": "missed"},
    "asPlanned": 1, "swapped": 1, "partial": 1, "edited": 1, "missed": 1, "offPlan": 2, "kcalPct": 91, "proteinPct": 94, "updated": "…"}}
  ```
  `missed` on today's date may just mean "not eaten yet". Judge finished days.
- **Daily checklist** (top-level `habits`, app 8.0+; missing = `{}`): one object per local date he touched.
  ```jsonc
  "habits": {"2026-11-19": {"cardio": {"walk": {"done": true, "minutes": 25}}, "supps": {"vitd": true, "fishoil": false},
    "steps": 10500, "water": 96, "sleep": 7.5,                          // steps, fl oz, hours (entered by hand); null = not logged
    "plan": {"cardio": [{"id": "walk", "type": "Incline walk", "minutes": 25}], "steps": 10000, "waterOz": 128, "sleepHours": 8, "supps": ["vitd", "fishoil", "creatine"]},
    "done": 4, "total": 7, "updated": "…"}}
  ```
  `plan` is a snapshot of your `daily` targets due that day (cardio only on its `days`), so adherence stays readable after you change the plan. An item is done when ticked, or when steps/water/sleep reach the target. Days with no entry = he didn't open the checklist (not necessarily missed).
- **Progress photos** (top-level `photos`, app 8.0+; missing = `[]`): index only. `[{"date": "2026-11-19", "pose": "front"|"side"|"back", "path": "photos/2026-11-19-front.jpg", "sha": "…", "w": 810, "h": 1080, "bytes": 182344, "at": "…"}]`. The JPEGs (longest side 1080 px) are in the private repo under `photos/`. You may view them there to judge visual progress. **Never copy, re-host, describe identifiably, or put them (or links to them) in `lift-log`, `plan.json`, messages to third parties or anywhere public.**
- If `coach.planVersion` is lower than `plan.json`'s `version`, his phone hasn't opened the app since your last publish.

## 2. Publish a new plan

```bash
git clone https://github.com/jbozarth206/lift-log && cd lift-log    # or git pull if you already have it
# edit plan.json (see PLAN_SCHEMA.md): change only the phase/group/focus combos you mean to change,
# bump "version" by 1, update "updatedAt", and write this week's "message".
python3 tools/format_plan.py plan.json                    # optional: tidy layout
python3 tools/validate_plan.py plan.json --data /tmp/liftlog.json
git add plan.json && git commit -m "Coach plan vN: <short summary>" && git push origin main
# GitHub Pages redeploys in ~1 min; confirm:
curl -s "https://jbozarth206.github.io/lift-log/plan.json?t=$(date +%s)" | python3 -c 'import json,sys; print(json.load(sys.stdin)["version"])'
```
The phone applies it the next time the app opens or comes back online, and shows a banner with your message and a list of the changes.

Tips:
- Use the exercise `id` (from the data) for exercises he already logs, so his history stays attached. Use only a `name` for brand-new exercises.
- Keep each focus at 4–6 exercises. Bulk = heavier compounds (about 4–5 × 4–8, 2–4 min rest). Cut = 3–4 × 10–15, 45–75 s rest, more machines and isolation. Body Recomp = compounds about 4 × 6–12 and isolation 3 × 10–15, rest about 120 s compound / 75 s isolation when you omit `rest`. Publish it under `phases.recomp` (and `nutrition.recomp`, `meals.recomp`) the same way as bulk and cut. The app shows the label **Body Recomp**.
- `notes` are short cues (≤400 chars) that he sees on the logging screen.
- `demo` (app 8.3+, optional) pins the form animation for that exercise. Leave it off unless the name would miss the built-in catalog or you want a specific picture. A slug (`"incline-db-press"`), a relative image path, or an `https` GIF/WebP URL. Same public-plan privacy rules. See PLAN_SCHEMA.md.
- Base progression on his recent top sets and estimated 1RM (Epley: `w × (1 + r/30)`).

## 2b. Set prescriptions: what he should lift next time (app 7.2+)
On the logging screen the app shows **🧠 Coach target**, your weight × reps for every set, and pre-fills the inputs with it. Last time only appears as a small "Last: …" line. If an exercise has no current prescription, he sees an **⚙️ Auto** target instead: +5 lb (upper body) or +10 lb (lower body) if he hit the top of the rep range on every set, otherwise the same weight and +1 rep. So **at every review (each weekday, Mon–Fri), publish `prescriptions` for every exercise in his upcoming sessions.** Schema and validation rules are in PLAN_SCHEMA.md › "Additions in app 7.2".

How to compute them from the synced history:
1. Work out which sessions come next (his rotation and current phase from `phase` and recent `sessions`), and the exercises in each one from `plans.<phase>.<group>.<focus>` (ids are there).
2. For each exercise, take the most recent entry (look up `exId` across all groups) and the plan's `min`–`max` rep range:
   - Every set at or above `max` reps → add load: about +2.5–5% (normally +5 lb upper body / +10 lb lower body; +2.5–5 lb on small isolation lifts and dumbbells), reps back to `min`/`min+1`.
   - Within the range → same weight, +1 rep on the sets that fell short (double progression).
   - Missed `min` on 2+ sets, or 2 sessions in a row with no progress → hold, or cut ~5–10% and rebuild. Say why in `note`.
   - On a **cut**, aim to hold load and reps rather than add. Prescribe the last top weight for the bottom of the range and accept small rep drops.
   - On **Body Recomp**, progress reps inside the range first, then add a small load. Don't push a surplus-sized jump.
   - Check `target` on the last entries: if he keeps missing your targets, you're progressing too fast.
3. Give one `{weight, reps}` per set, matching the plan's `sets` count. Use `weight: 0` for bodyweight and `null` to let him pick the load. Round to loads he can actually use (2.5/5 lb plates, 5 lb dumbbell steps).
4. Set `updated` to today's date (`YYYY-MM-DD`). After he logs the exercise on or after that date, the app treats your target as done and shows Auto until your next review. Add `phase` (`"bulk"`, `"cut"`, or `"recomp"`) if a target only applies to one phase. Omit `phase` to show it in every phase.
5. `prescriptions` **replaces** the whole stored set each time. Include every exercise you want a Coach target on, not only the changed ones. Leave the key out entirely to keep the previous set.
6. Bump `version` (the app ignores the file otherwise), validate with `python3 tools/validate_plan.py --data liftlog.json` (it checks every key matches an exercise id), and push.

## 2c. Meal plan and daily checklist (app 8.0+)
Schemas are in PLAN_SCHEMA.md › "Additions in app 8.0".
- **`meals`**: per-phase daily template. Build it from his `nutrition` targets: the meal totals should land within about ±5% of `kcal` and `p`. Give every meal a stable `id` (adherence is keyed by it) and a `slot` (breakfast/lunch/dinner/snack = where it lands in his food log). Use foods he actually logs (check `food.entries`/`food.favorites`), realistic quantities, and 1–2 `swaps` for meals he skips or edits often. Keep `groceries` to a short weekly list. Each food needs `kcal`/`p`/`c`/`f`; the app sums meals and the day for him.
- Use `food.adherence` to adjust: meals that are often `missed` or `edited` need a different food, size or time, not a lecture. Compare `actual` with `planned` and the weight trend before changing calories.
- **`daily`**: `cardio` sessions (type, minutes, `days` 0=Sun…6=Sat, HR `zone`, notes, optional `phase` of `bulk`/`cut`/`recomp`), `targets` (`steps`, `waterOz`, `sleepHours`), optional `targetsByPhase` (`{bulk?, cut?, recomp?}` overriding individual target fields for the active phase; omitted fields fall back to `targets`), `supplements` (name, dose, time, optional `phase` so a generic supplement only shows in that phase; omit `phase` for every phase) and `photoDay` (weekday for the photo check-in). Keep it short; 5–8 daily items is plenty. Review `habits` for done/total by day and adjust targets he consistently misses. `habits.<date>.plan` is the phase-filtered snapshot (cardio due that day, merged targets, supplement ids he actually saw).
- **Privacy:** plan.json is public. Supplements are fine as a generic checklist (e.g. "Vitamin D3 5,000 IU", "Fish oil"). Never mention PEDs/compounds/doses, lab values or markers, diagnoses, providers or why a supplement was prescribed. `validate_plan.py` rejects these. Put anything health-related in your private message to him instead.

## 2d. Weekly schedule (app 8.2+)

`schedule` is what he trains each day. Schema and validation are in PLAN_SCHEMA.md › "Additions in app 8.2". Put it on the phase he is in (`schedule.recomp` while `phase.id` is `"recomp"`), and add `schedule.default` only if the other phases should share a fallback. A top-level `days` / `dates` object (no phase keys) applies to every phase.

- Weekday keys are strings `"0"` (Sunday) through `"6"` (Saturday). A `dates` entry (`"YYYY-MM-DD"`) replaces that weekday for one day (makeup sessions, travel, a holiday rest).
- A workout day is `{group, focus, label?, notes?}`. `group` and `focus` must be a real pair (`arms` + `all` is valid). `label` (≤60) is the card title, e.g. `"Back (Upper) + Photos"`. `notes` (≤300) is the one-line why.
- A rest day is `{"rest": true, "label": "Rest + Walk", "notes": "…"}`. He stays on Workout home and can still open a body group if he decides to lift.
- On launch, if `settings.autoOpenWorkout` is still true (the default) and today's entry is a workout he has **not** already logged (`sessions` for today with that `group` and `focus`), the app opens that workout with Workout home underneath. Back or **Change workout** leaves it, and it will not open again until the next launch. If he already logged it, or today is `rest: true`, he stays on Workout home and sees the card (marked **Done today** when logged).
- Include the whole `schedule` you want him to keep. Like `meals` and `daily`, publishing the key **replaces** the phone's copy; leaving it out keeps the old one. The "Coach updated your plan" banner summarizes the new schedule. Same privacy rule: labels and notes are public.

## 3. Review cadence: every weekday (Mon–Fri)

Coach reviews his data **every weekday, Monday to Friday**. Weekend data is covered by Monday's review. Each review:
1. Pull `data/liftlog.json`. Check `exportedAt` and the last commit date. If nothing new has synced since the last review, say so and change nothing.
2. Look at the sessions since the last review: top sets, estimated 1RM, rep targets hit or missed, and arm finishers. Look at the body-weight 7-day average trend against the phase goal, daily food totals against targets (logged days only), the protocol log (doses logged vs planned, any health notes), and any **new lab results** in `labs.results` since the last review (compare each marker with its previous value and the lab's range, and list flagged ones). Report protocol and lab data neutrally.
   Also look at `food.adherence`, `habits` (cardio, steps, water, sleep, supplements) and, weekly, new `photos` check-ins.
3. **Every review:** refresh `prescriptions` for every exercise in his upcoming sessions (section 2b). Adjust `meals` and `daily` when the data calls for it (section 2c). Set `schedule` for the week he is in, including rest days and any `dates` overrides (section 2d), so the phone opens the right workout. Bump `version`, validate, and push. This is how he sees what to lift and eat next. If nothing synced since the last review, change nothing.
4. If adjustments are warranted, also edit the rest of `plan.json` (exercises, sets/reps/rest, `notes`, `nutrition`) and write a short `message` summarizing the why. Small, specific changes beat full rewrites. Leave out combos you aren't changing.

## 4. Rules
1. **Never write to `lift-log-data`.** That includes `body`, `profile`, `peds`, `food`, `labs`, `habits`, `photos` and the `photos/` folder: read them, never edit them. Don't edit, delete, force-push or rewrite history there. It's his only cloud copy, and the app overwrites it.
2. In `lift-log`, change **only `plan.json`** (and these docs if asked). Don't touch app code (`app.js`, `sw.js`, `index.html`, …) unless the user asks.
3. **Always run `tools/validate_plan.py`** and push only if it prints `OK`. Every published change needs a version bump.
4. Never put tokens, passwords or personal data in `plan.json`. It's public: **no PED, lab, diagnosis, provider or photo data** in plan.json, its `message`, notes, or anywhere in the public `lift-log` repo. The validator's PRIVACY errors are hard stops.
5. Don't remove exercises just because their history looks bad. Removing an exercise from a focus doesn't delete history, but explain big changes in `message`.
6. Never force-push `main`.
