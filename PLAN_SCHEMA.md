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
- `all` is optional. Any exercise not listed under `all` is still added there automatically, with default targets for that phase.

**Exercise entry** (the list order is the order shown in the app)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | one of id/name | An existing exercise id from the synced data (`exercises.<group>[].id`). Best for exercises the user already logs. |
| `name` | string ≤60 | one of id/name | Matched case-insensitively against the user's exercises in that group. If there's no match, a new exercise is created. |
| `sets` | int 1–20 | yes | Target sets. |
| `reps` | `[min, max]` ints 1–100 | yes | Target rep range (`[8, 8]` for a fixed number). |
| `rest` | int seconds 0–900 | recommended | Shown as the rest time next to the target. |
| `notes` | string ≤400 | no | Coach cue shown on the logging screen for that exercise in that phase and focus. |

When the app applies a plan, its targets **replace** any manual edits the user made to that phase · group · focus. Leave a combo out of the file to keep his version.
Invalid entries are skipped, and an invalid file (wrong `schema`, or a missing or non-integer `version`) is ignored. Still, always run `python3 tools/validate_plan.py` before pushing.

> Body metrics (`body`, `profile`) live only in the synced data file (`lift-log-data/data/liftlog.json`, see COACH_GUIDE.md). `plan.json` doesn't hold them and the app ignores any such keys in it. Put body-weight guidance for the week in `message`.
