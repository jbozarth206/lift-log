# Lift Log coach plan: `plan.json` schema (v1)

`plan.json` sits at the root of this repo and is served at
**https://jbozarth206.github.io/lift-log/plan.json**. Each time the app opens or comes back online, it fetches this file,
bypassing all caches. If `version` is **higher** than the last plan it applied, it:

1. Replaces the exercise list and targets for **every phase · group · focus listed** in the file. Combos you leave out keep their current lists.
2. Creates any exercise referenced by a `name` that the user doesn't have yet, and adds it to that group's **All** list.
3. Shows a dismissible **"Coach updated your plan"** banner on the home screen, with `message` and a summary of the changes.

After an **app update** (app 8.0.1+), the app also re-applies the *current* version once, so keys an older app didn't understand (e.g. `meals`/`daily` applied by a pre-8.0 app, or `daily.supplements[].phase` / `daily.targetsByPhase` applied by a pre-8.1 app) get picked up. It does the same if the plan has `meals`/`daily` but the phone's copy is missing. That re-apply refreshes only the Coach-owned copies (`nutrition`, `prescriptions`, `meals`, `daily`) and leaves `phases` alone, so his manual target edits stay. You don't need to bump `version` to fix that case. A **new** phase block such as `phases.recomp` is applied only when `version` increases.

It never deletes logged workouts or exercise IDs. If an exercise is dropped from a focus, its history stays in the Journal and Progress, and it stays under **All**.

## Shape

```json
{
  "schema": 1,
  "version": 2,
  "updatedAt": "2026-11-18T09:00:00Z",
  "message": "Week 2: add a set on pulldowns and keep rests honest.",
  "phases": {
    "bulk": {
      "back": {
        "upper": [
          {"name": "Lat Pulldown", "sets": 5, "reps": [6, 8], "rest": 150, "notes": "Pause 1s at the chest. Drive elbows down."},
          {"id": "mhx2k1abcde", "name": "Pull-Up", "sets": 4, "reps": [5, 8], "rest": 180}
        ]
      }
    }
  }
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema` | int | yes | Always `1` for this format. |
| `version` | int | yes | Plan version. **Must increase** for the app to apply the file. |
| `updatedAt` | ISO string | no | Shown in the banner and Settings. |
| `message` | string | no | Weekly coach message shown in the banner (max ~1000 chars; line breaks allowed). |
| `phases` | object | yes | `phase → group → focus → [exercise]`. |

**Keys**
- phase: `bulk`, `cut`, `recomp` (Body Recomp, app 8.1+)
- group → focus:
  - `back` → `upper`, `mid`, `lower`, `all`
  - `chest` → `upper`, `mid`, `lower`, `all`
  - `legs` → `quads`, `hamstrings`, `glutes`, `calves`, `all`
  - `shoulders` → `front`, `side`, `rear`, `all`
  - `arms` → `biceps`, `triceps`, `forearms`, `all` *(new in app v6)*
- `all` is optional. Any exercise not listed under `all` is still added there automatically, with default targets for that phase.

**Exercise entry** (the list order is the order shown in the app)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | one of id/name | An existing exercise id from the synced data (`exercises.<group>[].id`). Best for exercises the user already logs. |
| `name` | string ≤60 | one of id/name | Matched case-insensitively against the user's exercises in that group. If there's no match, a new exercise is created. |
| `sets` | int 1–20 | yes | Target sets. |
| `reps` | `[min, max]` ints 1–100 | yes | Target rep range (`[8, 8]` for a fixed number). |
| `rest` | int seconds 0–900 | optional (recommended) | Rest between sets. Shown next to the target **and drives the in-app rest timer** (app 7.1+), which starts when he commits a set and dings at 10 s left and at 0. `0` = no timer for that exercise (e.g. supersets). If omitted, the app uses its default: Bulk 165 s compound / 90 s isolation, Body Recomp 120 s compound / 75 s isolation, Cut 75 s compound / 60 s isolation (compound = name matches squat, deadlift, bench, press, row, pull-up, chin-up, dip, thrust, lunge, rack pull, good morning, clean, snatch). His own Settings › Rest length override, if set, beats the plan. |
| `notes` | string ≤400 | no | Coach cue shown on the logging screen for that exercise in that phase and focus. |

When the app applies a plan, its targets **replace** any manual edits the user made to that phase · group · focus. Leave a combo out of the file to keep his version.
Invalid entries are skipped, and an invalid file (wrong `schema`, or a missing or non-integer `version`) is ignored. Still, always run `python3 tools/validate_plan.py` before pushing.

> Body metrics (`body`, `profile`) live only in the synced data file (`lift-log-data/data/liftlog.json`, see COACH_GUIDE.md). `plan.json` doesn't hold them and the app ignores any such keys in it. Put body-weight guidance for the week in `message`.

## Additions in app v6 (all optional and backward compatible)

Any plan without these keys works exactly as before. The app keeps its built-in defaults for any group or focus the plan leaves out, including all of `arms`.

### `arms` body group
`phases.<phase>.arms.<biceps|triceps|forearms|all>` uses the same exercise-entry format. Arms exercises live in their own group, so a curl keeps **one shared history** whether it's done on Arms day or as a Back finisher.

### Arm finishers on Back and Chest days
By default, each `back` focus ends with 1–2 biceps exercises and each `chest` focus ends with 1–2 triceps exercises, in every phase (Bulk, Cut, and Body Recomp). These are Arms-group exercises used as finishers.
- **If your list for a back/chest focus has no Arms exercise**, the app keeps its current finishers and appends them after your list. Plans written before v6 keep working this way.
- **To set the finishers yourself**, include them in the list. Use the `id` of an Arms exercise, or a `name` that matches one (e.g. `"Hammer Curl"`), or add `"arm": true` to create a new Arms exercise from a `name`:
  ```json
  {"name": "Spider Curl", "sets": 3, "reps": [10, 12], "rest": 60, "arm": true}
  ```
  Once a list contains at least one Arms exercise, it fully controls that focus's finishers.
- **To turn off auto-kept finishers everywhere**, set the top-level `"options": {"autoArmFinishers": false}`.

| Field | Type | Where | Meaning |
|---|---|---|---|
| `arm` | bool | exercise entry in `back`/`chest` | `true` = find or create this exercise in the Arms group. |
| `options.autoArmFinishers` | bool | top level | Default `true`. Set `false` to stop keeping current finishers when a back/chest list has no Arms exercise. |

### `nutrition`: daily calorie and macro targets per phase
```json
"nutrition": {
  "bulk": {"kcal": 3000, "p": 200, "c": 350, "f": 85},
  "cut":  {"kcal": 2300, "p": 210, "c": 220, "f": 65},
  "recomp": {"kcal": 2700, "p": 210, "c": 280, "f": 75}
}
```
| Field | Unit | Range |
|---|---|---|
| `kcal` | kcal per day | 1–10000 |
| `p` / `c` / `f` | grams of protein / carbs / fat per day | 1–1000 / 1–2000 / 1–1000 |

- The Food screen shows the targets for **his current phase** as "🧠 Coach targets". If he sets his own targets in the app, his take priority until he taps "Use coach targets".
- When a plan with `nutrition` is applied, it **replaces** the stored coach targets: a phase you leave out has no coach targets. If you don't change nutrition, leave the key out entirely, or copy the previous values.
- A change to the targets shows in the update banner.

## Additions in app 7.1 (rest timer)
- `rest` (per exercise, seconds) is optional. It now also sets the length of the rest countdown on the logging screen. Omit it to get the phase/type default listed above (Bulk 165/90, Body Recomp 120/75, Cut 75/60, compound/isolation). Use `0` for exercises that should not start a timer.
- No new top-level keys. Existing plans keep working unchanged.

## Additions in app 7.2: `prescriptions` (per-exercise set targets)
Optional top-level object with Coach's exact weight × reps for each set. The logging screen shows it as **🧠 Coach target** in place of last time, and pre-fills the inputs with it (dimmed). Last time stays visible as a small "Last: …" line. Plans without `prescriptions` work as before.

```json
"prescriptions": {
  "mhx2k1abcde": {
    "sets": [{"weight": 145, "reps": 8}, {"weight": 145, "reps": 8}, {"weight": 145, "reps": 7}, {"weight": 140, "reps": 8}],
    "note": "Hit 8s on every set last time: +5 lb. Pause at the chest.",
    "updated": "2026-11-18",
    "phase": "bulk"
  },
  "Pull-Up": {"sets": [{"weight": 0, "reps": 8}, {"weight": 0, "reps": 7}, {"weight": 0, "reps": 6}], "updated": "2026-11-18"}
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| key | string | yes | The exercise **id** from the synced data (`exercises.<group>[].id`, any group). An exact exercise name (case-insensitive) is accepted as a fallback, e.g. for an exercise this same plan creates by name. Unknown keys are skipped. |
| `sets` | list of 1–20 `{weight, reps}` | yes | One object per set, in order. `weight`: lb 0–2000 (`0` = bodyweight, `null` = his pick, decimals allowed). `reps`: int 1–100. The number of sets you give is the number of rows the app pre-fills. |
| `note` | string ≤300 | no | Shown under the targets (the why / cue). |
| `updated` | `"YYYY-MM-DD"` | strongly recommended | The day you published it. Once he has logged that exercise **on or after** this date, the target counts as done and the app falls back to Auto until you publish a new one. Without it, the target keeps showing until replaced. |
| `phase` | `"bulk"` / `"cut"` / `"recomp"` | no | Only show this target in that phase. Omit it to show in every phase. |

Rules:
- When a plan with `prescriptions` is applied, it **replaces** the whole stored set. An exercise left out has no Coach target any more. Leave the key out entirely to keep the previous set.
- It doesn't change `phases` targets (sets × rep range, rest), which still show in the Target row and drive the rest timer.
- Changed targets are listed in the "Coach updated your plan" banner.
- Fallback when an exercise has no current prescription, labelled **⚙️ Auto** (never "Coach"): if every set last time reached the top of the plan's rep range, +5 lb (upper body) / +10 lb (lower body: Legs group, or squat/deadlift/leg press/lunge/hip thrust/RDL/rack pull/good morning/calf moves) with reps at the bottom of the range; otherwise the same weight with +1 rep (capped at the top of the range). With no history either, the card shows the plan's sets × reps and nothing is pre-filled.
- Each logged set is marked **▲ beat / ✓ met / ▼ missed** against its target. More weight and fewer reps (or the reverse) is judged by estimated 1RM. The target is saved with the entry (`entries[].target`), so the Journal shows it too.
- `tools/validate_plan.py` checks all of this. Pass `--data liftlog.json` to confirm every key matches an exercise.

## Additions in app 8.0: `meals` and `daily` (both optional)
Plans without these keys work as before. When a plan includes `meals` or `daily`, it **replaces** the stored copy. Leave a key out to keep the previous one. Changes show in the update banner.

### `meals`: per-phase meal template (Track › Food)
```json
"meals": {
  "bulk": {
    "meals": [
      {"id": "breakfast", "name": "Breakfast", "slot": "breakfast", "time": "07:30",
       "foods": [
         {"name": "Whole eggs", "qty": "4 large", "kcal": 288, "p": 25, "c": 2, "f": 20},
         {"name": "Oats", "qty": "100 g", "kcal": 380, "p": 13, "c": 67, "f": 7}],
       "swaps": [{"name": "Greek yogurt bowl", "foods": [
         {"name": "Greek yogurt 0%", "qty": "300 g", "kcal": 177, "p": 30, "c": 11, "f": 1},
         {"name": "Granola", "qty": "80 g", "kcal": 380, "p": 8, "c": 54, "f": 14}]}],
       "notes": "Eat within an hour of waking."}
    ],
    "groceries": ["Eggs (2.5 dozen)", "Oats 1 kg", "Chicken breast 1.75 kg"]
  },
  "cut": {"meals": [], "groceries": []},
  "recomp": {"meals": [], "groceries": []}
}
```
| Field | Type | Required | Meaning |
|---|---|---|---|
| `meals.<phase>` | object | – | `bulk` / `cut` / `recomp`. The app shows the plan for his **current** phase. A phase you leave out has no meal plan. |
| `.meals[]` | list ≤12 | yes | In display order. |
| `.id` | string | strongly recommended | Stable id. Logged entries and adherence are keyed by it, so keep it the same across versions. Defaults to a slug of the name. |
| `.name` | string ≤60 | yes | e.g. "Pre-workout". |
| `.slot` | `breakfast`/`lunch`/`dinner`/`snack` | recommended | Which food-log section logged items go into. Defaults to a slot named in `name`, else `snack`. |
| `.time` | `"HH:MM"` | no | Shown next to the name. |
| `.foods[]` | list 1–25 | yes | `{name ≤80, qty ≤40, kcal 0–10000, p 0–1000, c 0–2000, f 0–1000}` (grams). Missing `kcal` = 4/4/9 from macros. The app sums each meal and the day. |
| `.swaps[]` | list ≤6 | no | Alternatives for the whole meal: `{name, foods[]}` (same food format). |
| `.notes` | string ≤300 | no | Cue under the meal. |
| `.groceries` | list ≤80 strings | no | Short weekly shopping list. |

**In the app**: one tap ("＋ Log meal") logs every food of the meal (or of the chosen swap) into `food.entries`; tapping one food logs only that food. Logged items carry `plan.status` = `as-planned`, or `edited` once he changes them. The app keeps a daily planned-vs-actual summary in `food.adherence` (see COACH_GUIDE.md), which syncs to the private data repo. `nutrition` targets still drive the totals bar, so keep the meal plan consistent with them.

### `daily`: cardio, daily targets, supplements, photo day (Workout › Today card and Track › Daily)
```json
"daily": {
  "cardio": [
    {"id": "walk", "type": "Incline walk", "minutes": 25, "days": [1, 2, 3, 4, 5], "zone": "Z2 (120-135 bpm)", "notes": "After lifting"},
    {"id": "bike", "type": "Bike intervals", "minutes": 15, "days": [6], "zone": "Z4", "phase": "cut"},
    {"id": "recomp-walk", "type": "Brisk walk", "minutes": 30, "days": [0, 2, 4, 6], "zone": "Z2", "phase": "recomp"}
  ],
  "targets": {"steps": 10000, "waterOz": 128, "sleepHours": 8},
  "targetsByPhase": {
    "recomp": {"steps": 12000, "waterOz": 140}
  },
  "supplements": [
    {"id": "vitd", "name": "Vitamin D3", "dose": "5,000 IU", "time": "AM"},
    {"id": "fishoil", "name": "Fish oil", "dose": "2 g EPA/DHA"},
    {"id": "creatine", "name": "Creatine", "dose": "5 g", "time": "Any", "phase": "recomp"}
  ],
  "photoDay": 0
}
```
| Field | Type | Meaning |
|---|---|---|
| `cardio[]` | list ≤10 | `{id, type ≤60 (required), minutes 1–300, days [0–6] (0 = Sun; empty/omitted = every day), zone ≤30 (e.g. "Z2" or "120-135 bpm"), notes ≤200, phase bulk/cut/recomp (optional: only in that phase)}`. Shown as a checklist item on the days it's due. |
| `targets.steps` | int 1–100000 | Daily steps (he types them in; a web app can't read Apple Health). |
| `targets.waterOz` | number 1–400 | Fluid ounces per day. |
| `targets.sleepHours` | number 1–14 | Hours per night. |
| `targetsByPhase` | object | Optional per-phase overrides of `targets`. Keys are `bulk`, `cut`, and/or `recomp`. Each value may set `steps`, `waterOz`, and/or `sleepHours` (same ranges). A field you set replaces that field of `targets` while he is in that phase; a field you omit keeps the `targets` value. App 8.1+. |
| `supplements[]` | list ≤20 | `{id, name ≤60 (required), dose ≤40, time ≤20, phase}`. `phase` is optional `bulk` / `cut` / `recomp` (app 8.1+): only show that item in that phase. Omit `phase` to show it in every phase. Daily tick boxes. **Public**: generic names only, no reasons or prescriptions. |
| `photoDay` | int 0–6 or null | Weekday for the progress-photo reminder (0 = Sun). With it, the home banner appears on/after that day when the last photos are 7+ days older than that day. Without it, the banner appears once 7+ days have passed since the last photos. |

Give cardio and supplements stable `id`s (ticks are stored by id in `habits`). Ticks and values sync to the private data repo by date (`habits`, see COACH_GUIDE.md). The habit snapshot stores the targets and supplement ids that were actually due that day (phase-filtered cardio and supplements, and `targetsByPhase` already merged).

## Additions in app 8.1: Body Recomp

`recomp` is a third phase next to `bulk` and `cut`. The display label in the app is **Body Recomp**. Plans that never mention `recomp` keep working: the phone uses its built-in Body Recomp exercise lists until you publish `phases.recomp`.

Use `recomp` anywhere a phase is allowed:

- `phases.recomp.<group>.<focus>`
- `nutrition.recomp` (`kcal`, `p`, `c`, `f`)
- `meals.recomp` (`meals`, `groceries`)
- `prescriptions.<exId>.phase`: `"bulk"` | `"cut"` | `"recomp"` (omit = every phase)
- `daily.cardio[].phase`: `"bulk"` | `"cut"` | `"recomp"` (omit = every phase)
- `daily.supplements[].phase`: `"bulk"` | `"cut"` | `"recomp"` (omit = every phase). Phase-specific generic supplements only show in that phase.
- `daily.targetsByPhase`: `{bulk?: {steps?, waterOz?, sleepHours?}, cut?: {...}, recomp?: {...}}`. Each field you set overrides that field of `daily.targets` for the active phase. Omitted fields fall back to `daily.targets`.

Built-in rest when an exercise omits `rest`: Body Recomp is 120 s for compounds and 75 s for isolation (between Bulk and Cut). Built-in lists cover all five groups (`back`, `chest`, `legs`, `shoulders`, `arms`), including biceps finishers on Back and triceps finishers on Chest.

Publishing `phases.recomp` still needs a `version` bump. Shipping the app update alone re-applies the current plan's coach-owned copies (`nutrition`, `prescriptions`, `meals`, `daily`) via `coach.appliedByAppVersion` and does not overwrite his phase lists.

### Privacy rule (enforced by `tools/validate_plan.py`)
`plan.json` is served publicly. The validator fails (`PRIVACY` errors) if:
- any key anywhere is a health-data key (`peds`, `labs`, `bloodwork`, `photos`, `habits`, `body`, `profile`, `doses`, `compounds`, `medications`, `diagnosis`, `patient`, `mychart`, …), or
- any string (message, notes, names) mentions PED compounds or terms (testosterone, "Test E", tren, deca, masteron, primo, anavar, HCG, AI names, SARMs, TRT, PCT, injections, mg/mL…), lab markers or results (hematocrit, LDL/HDL, A1c, PSA, estradiol, TSH, bloodwork, labs, "low vitamin D"…), diagnoses, providers or MyChart.

Keep all of that in the private `lift-log-data` repo and in direct messages.
