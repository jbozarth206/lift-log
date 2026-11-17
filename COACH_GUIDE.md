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
  "app": "liftlog", "appVersion": "7.1",
  "exportedAt": "2026-11-11T18:40:00.000Z",      // when the phone pushed it
  "version": 8,                                   // data schema version
  "phase": {"id": "bulk", "start": "2026-11-11"}, // current 4-week block (bulk|cut), null if not chosen yet
  "exercises": { "back": [{"id": "mhx2k1abcde", "name": "Lat Pulldown"}], "chest": [], "legs": [], "shoulders": [], "arms": [] },
  "plans": { "bulk": { "back": { "upper": [{"exId": "mhx2k1abcde", "sets": 4, "min": 6, "max": 8, "rest": 150, "notes": "…"}], "mid": [], "lower": [], "all": [] } }, "cut": {} },
  "coach": {"planVersion": 1, "planUpdatedAt": null, "lastCheck": "…"},    // which plan.json version the phone has applied
  "profile": {"height": 70},                      // inches; null until he sets it
  "body": [                                       // body-metrics log (v5+), any order; sort by date
    {"id": "mwclzbjze0bno", "date": "2026-11-11", "weight": 181.4, "bf": 15.2,
     "waist": 33.5, "chest": null, "arm": 15.8, "thigh": null, "note": "morning, fasted"}
  ],
  "sessions": [
    {"id": "…", "date": "2026-11-11", "group": "back", "focus": "upper", "phase": "bulk",
     "entries": [{"exId": "mhx2k1abcde", "name": "Lat Pulldown", "sets": [{"w": 135, "r": 12}, {"w": 140, "r": 10}]}]}
  ]
}
```
- Weights are in **lb**. `w` = weight and `r` = reps for one working set.
- `focus` / `phase` are `null` on workouts logged before those features existed. Treat them as unlabeled, not as errors.
- `focus: "all"` means he trained the whole group that day.
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
- **Settings** (top-level `settings`, v8 / app 7.1+; treat a missing key as defaults): `{"restTimer": true, "restSound": true, "restVolume": 0.8, "restOverride": null}`. `restOverride` is seconds (15–900) or `null`. When set, he has chosen one rest length for **every** exercise, and it beats your plan `rest`. Mention it if your rest prescriptions matter. The other keys are device preferences you can ignore.
- **Rest timer & plan `rest`**: each plan item's `rest` (seconds) drives the rest countdown on his logging screen (it dings at 10 s left and at 0). Omitted `rest` falls back to Bulk 165 s compound / 90 s isolation, Cut 75 s / 60 s. `0` = no timer. Timer runs aren't logged, so you can't see actual rest taken.
- **Profile**: `profile.height` is in **inches** (e.g. 70 = 5′10″), or `null` if not set. BMI = `703 × weight / height²`.
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
- Keep each focus at 4–6 exercises. Bulk = heavier compounds (about 4–5 × 4–8, 2–4 min rest). Cut = 3–4 × 10–15, 45–75 s rest, more machines and isolation.
- `notes` are short cues (≤400 chars) that he sees on the logging screen.
- Base progression on his recent top sets and estimated 1RM (Epley: `w × (1 + r/30)`).

## 3. Review cadence: 3× per week

Coach reviews his data **three times a week** (e.g. Mon/Wed/Fri, spaced about 2–3 days apart). Each review:
1. Pull `data/liftlog.json`. Check `exportedAt` and the last commit date. If nothing new has synced since the last review, say so and change nothing.
2. Look at the sessions since the last review: top sets, estimated 1RM, rep targets hit or missed, and arm finishers. Look at the body-weight 7-day average trend against the phase goal, daily food totals against targets (logged days only), the protocol log (doses logged vs planned, any health notes), and any **new lab results** in `labs.results` since the last review (compare each marker with its previous value and the lab's range, and list flagged ones). Report protocol and lab data neutrally.
3. If adjustments are warranted, edit `plan.json` (exercises, sets/reps/rest, `notes`, `nutrition`), write a short `message` summarizing the why, bump `version`, validate, and push. Small, specific changes beat full rewrites. Leave out combos you aren't changing.
4. If no plan change is needed, don't bump the version just to send a message. Message him through the usual channel instead.

## 4. Rules
1. **Never write to `lift-log-data`.** That includes `body`, `profile`, `peds`, `food` and `labs`: read them, never edit them. Don't edit, delete, force-push or rewrite history there. It's his only cloud copy, and the app overwrites it.
2. In `lift-log`, change **only `plan.json`** (and these docs if asked). Don't touch app code (`app.js`, `sw.js`, `index.html`, …) unless the user asks.
3. **Always run `tools/validate_plan.py`** and push only if it prints `OK`. Every published change needs a version bump.
4. Never put tokens, passwords or personal data in `plan.json`. It's public.
5. Don't remove exercises just because their history looks bad. Removing an exercise from a focus doesn't delete history, but explain big changes in `message`.
6. Never force-push `main`.
