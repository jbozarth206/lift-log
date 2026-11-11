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
  "app": "liftlog", "appVersion": "5.0",
  "exportedAt": "2026-11-11T18:40:00.000Z",      // when the phone pushed it
  "version": 5,                                   // data schema version
  "phase": {"id": "bulk", "start": "2026-11-11"}, // current 4-week block (bulk|cut), null if not chosen yet
  "exercises": { "back": [{"id": "mhx2k1abcde", "name": "Lat Pulldown"}], "chest": [], "legs": [], "shoulders": [] },
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

## 3. Rules
1. **Never write to `lift-log-data`.** That includes `body` and `profile`: read them, never edit them. Don't edit, delete, force-push or rewrite history there. It's his only cloud copy, and the app overwrites it.
2. In `lift-log`, change **only `plan.json`** (and these docs if asked). Don't touch app code (`app.js`, `sw.js`, `index.html`, …) unless the user asks.
3. **Always run `tools/validate_plan.py`** and push only if it prints `OK`. Every published change needs a version bump.
4. Never put tokens, passwords or personal data in `plan.json`. It's public.
5. Don't remove exercises just because their history looks bad. Removing an exercise from a focus doesn't delete history, but explain big changes in `message`.
6. Never force-push `main`.
