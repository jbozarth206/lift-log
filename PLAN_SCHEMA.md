# Lift Log coach plan: `plan.json` schema (v1)

`plan.json` sits at the root of this repo and is served at
**https://jbozarth206.github.io/lift-log/plan.json**. Each time the app opens or comes back online, it fetches this file,
bypassing all caches. If `version` is **higher** than the last plan it applied, it:

1. Replaces the exercise list and targets for **every phase · group · focus listed** in the file. Combos you leave out keep their current lists.
2. Creates any exercise referenced by a `name` that the user doesn't have yet, and adds it to that group's **All** list.
3. Shows a dismissible **"Coach updated your plan"** banner on the home screen, with `message` and a summary of the changes.

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
- phase: `bulk`, `cut`
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
| `rest` | int seconds 0–900 | optional (recommended) | Rest between sets. Shown next to the target **and drives the in-app rest timer** (app 7.1+), which starts when he commits a set and dings at 10 s left and at 0. `0` = no timer for that exercise (e.g. supersets). If omitted, the app uses its default: Bulk 165 s compound / 90 s isolation, Cut 75 s compound / 60 s isolation (compound = name matches squat, deadlift, bench, press, row, pull-up, chin-up, dip, thrust, lunge, rack pull, good morning, clean, snatch). His own Settings › Rest length override, if set, beats the plan. |
| `notes` | string ≤400 | no | Coach cue shown on the logging screen for that exercise in that phase and focus. |

When the app applies a plan, its targets **replace** any manual edits the user made to that phase · group · focus. Leave a combo out of the file to keep his version.
Invalid entries are skipped, and an invalid file (wrong `schema`, or a missing or non-integer `version`) is ignored. Still, always run `python3 tools/validate_plan.py` before pushing.

> Body metrics (`body`, `profile`) live only in the synced data file (`lift-log-data/data/liftlog.json`, see COACH_GUIDE.md). `plan.json` doesn't hold them and the app ignores any such keys in it. Put body-weight guidance for the week in `message`.

## Additions in app v6 (all optional and backward compatible)

Any plan without these keys works exactly as before. The app keeps its built-in defaults for any group or focus the plan leaves out, including all of `arms`.

### `arms` body group
`phases.<phase>.arms.<biceps|triceps|forearms|all>` uses the same exercise-entry format. Arms exercises live in their own group, so a curl keeps **one shared history** whether it's done on Arms day or as a Back finisher.

### Arm finishers on Back and Chest days
By default, each `back` focus ends with 1–2 biceps exercises and each `chest` focus ends with 1–2 triceps exercises, in both phases. These are Arms-group exercises used as finishers.
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
  "cut":  {"kcal": 2300, "p": 210, "c": 220, "f": 65}
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
- `rest` (per exercise, seconds) is optional. It now also sets the length of the rest countdown on the logging screen. Omit it to get the phase/type default listed above. Use `0` for exercises that should not start a timer.
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
| `phase` | `"bulk"` / `"cut"` | no | Only show this target in that phase. Omit it to show in either phase. |

Rules:
- When a plan with `prescriptions` is applied, it **replaces** the whole stored set. An exercise left out has no Coach target any more. Leave the key out entirely to keep the previous set.
- It doesn't change `phases` targets (sets × rep range, rest), which still show in the Target row and drive the rest timer.
- Changed targets are listed in the "Coach updated your plan" banner.
- Fallback when an exercise has no current prescription, labelled **⚙️ Auto** (never "Coach"): if every set last time reached the top of the plan's rep range, +5 lb (upper body) / +10 lb (lower body: Legs group, or squat/deadlift/leg press/lunge/hip thrust/RDL/rack pull/good morning/calf moves) with reps at the bottom of the range; otherwise the same weight with +1 rep (capped at the top of the range). With no history either, the card shows the plan's sets × reps and nothing is pre-filled.
- Each logged set is marked **▲ beat / ✓ met / ▼ missed** against its target. More weight and fewer reps (or the reverse) is judged by estimated 1RM. The target is saved with the entry (`entries[].target`), so the Journal shows it too.
- `tools/validate_plan.py` checks all of this. Pass `--data liftlog.json` to confirm every key matches an exercise.
