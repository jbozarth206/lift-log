#!/usr/bin/env python3
"""Bundle compact start/peak form frames for every Lift Log exercise.

Source: Open Exercise Illustrations (CC0 1.0)
https://github.com/hitmanrepo/open-exercise-illustrations

Downloads only the mapped exercises, crops empty margins, and writes
assets/demos/*.webp plus assets/demos/catalog.js. Re-run from the repo root:

  python3 tools/build_demos.py
"""
import json, os, re, urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'demos'
CACHE = Path('/tmp/exdb/raw')
SRC_JSON = 'https://raw.githubusercontent.com/hitmanrepo/open-exercise-illustrations/main/exercises.json'
IMG = 'https://raw.githubusercontent.com/hitmanrepo/open-exercise-illustrations/main/'
MAX_EDGE = 560
QUALITY = 64
THRESH = 16

# Lift Log name, source id (exercise or variant), extra aliases, honesty note.
# Notes are only set when the drawing is the right movement with a small
# equipment or setup difference worth saying out loud.
ENTRIES = [
    ("Arnold Press", "arnold-press", ["Arnold Dumbbell Press", "Arnold DB Press"], ""),
    ("Back Extension", "back-extensions", ["Back Extensions", "Hyperextension", "Hyperextensions", "45 Degree Back Extension"], ""),
    ("Back Squat", "squat", ["Barbell Back Squat", "Barbell Squat", "Squat", "BB Squat", "High Bar Squat", "Low Bar Squat"], ""),
    ("Barbell Curl", "barbell-curl", ["BB Curl", "Barbell Biceps Curl", "Standing Barbell Curl"], ""),
    ("Barbell Row", "bent-over-row", ["Bent-Over Row", "Bent Over Row", "Bent-Over Barbell Row", "Bent Over Barbell Row", "BB Row"], ""),
    ("Barbell Shrug", "shrugs", ["BB Shrug", "Shrug", "Shrugs"], ""),
    ("Bench Dip", "bench-dip", ["Bench Dips", "Tricep Bench Dip"], ""),
    ("Bench Press", "bench-press", ["Barbell Bench Press", "Flat Bench Press", "BB Bench Press", "Flat Barbell Bench Press"], ""),
    ("Bulgarian Split Squat", "bulgarian-split-squat", ["BSS", "Rear-Foot-Elevated Split Squat", "Rear Foot Elevated Split Squat"], ""),
    ("Cable Curl", "cable-curl", ["Cable Biceps Curl", "Straight Bar Cable Curl"], ""),
    ("Cable Fly", "cable-fly", ["Cable Crossover", "Cable Crossovers", "Cable Chest Fly"], ""),
    ("Cable Kickback", "cable-kickback", ["Cable Glute Kickback", "Glute Kickback"], ""),
    ("Cable Lateral Raise", "cable-lateral-raise", ["Cable Side Raise", "Cable Side Lateral Raise"], ""),
    ("Calf Raise", "standing-calf-raise-machine", ["Standing Calf Raise", "Standing Calf Raise Machine", "Machine Calf Raise", "Calf Raises"], ""),
    ("Chest-Supported T-Bar Row", "chest-supported-t-bar-row", ["Chest Supported T-Bar Row", "Chest Supported T Bar Row", "T-Bar Row"], ""),
    ("Close-Grip Bench Press", "close-grip-bench-press", ["Close Grip Bench Press", "Close-Grip Bench", "CGBP", "Close Grip Bench"], ""),
    ("Concentration Curl", "concentration-curl", ["Concentration Curls", "DB Concentration Curl"], ""),
    ("DB Bench Press", "dumbbell-bench-press", ["Dumbbell Bench Press", "Dumbbell Chest Press", "Flat DB Press", "Flat Dumbbell Press"], ""),
    ("DB Shrug", "dumbbell-shrug", ["Dumbbell Shrug", "Dumbbell Shrugs"], ""),
    ("Deadlift", "deadlift", ["Barbell Deadlift", "Conventional Deadlift", "BB Deadlift"], ""),
    ("Decline Bench Press", "decline-bench-press", ["Decline Barbell Bench Press", "Decline Barbell Press"], ""),
    ("Decline DB Press", "dumbbell-decline-press", ["Decline Dumbbell Press", "Decline Dumbbell Bench Press", "Decline DB Bench Press"], ""),
    ("Dips", "dips", ["Dip", "Chest Dip", "Parallel Bar Dip", "Parallel Bar Dips", "Bar Dip"], ""),
    ("EZ-Bar Curl", "ez-bar-curl", ["EZ Bar Curl", "Ez-Bar Curl", "EZ Curl", "EZ Bar Biceps Curl"], ""),
    ("Face Pull", "face-pulls", ["Face Pulls", "Cable Face Pull"], ""),
    ("Front Raise", "front-raises", ["Dumbbell Front Raise", "DB Front Raise", "Front Raises"], ""),
    ("Goblet Squat", "goblet-squat", ["Dumbbell Goblet Squat", "DB Goblet Squat"], ""),
    ("Good Morning", "good-morning", ["Good Mornings", "Barbell Good Morning"], ""),
    ("Hack Squat", "hack-squat", ["Hack Squats", "Machine Hack Squat"], ""),
    ("Hammer Curl", "hammer-curls", ["Hammer Curls", "Dumbbell Hammer Curl", "DB Hammer Curl"], ""),
    ("High-to-Low Cable Fly", "cable-fly-high-to-low", ["High to Low Cable Fly", "High-to-Low Fly", "Cable Fly High to Low"], ""),
    ("Hip Abduction", "hip-abduction-machine", ["Machine Hip Abduction", "Hip Abductions", "Seated Hip Abduction"], ""),
    ("Hip Thrust", "hip-thrusts", ["Hip Thrusts", "Barbell Hip Thrust", "BB Hip Thrust"], ""),
    ("Incline Bench Press", "incline-bench-press", ["Incline Barbell Bench Press", "Incline Barbell Press", "Incline BB Bench"], ""),
    ("Incline DB Curl", "incline-dumbbell-curl", ["Incline Dumbbell Curl", "Incline Dumbbell Curls"], ""),
    ("Incline DB Press", "incline-dumbbell-press", ["Incline Dumbbell Press", "Incline Dumbbell Bench Press", "Incline DB Bench Press"], ""),
    ("Incline Machine Press", "plate-loaded-incline-chest-press", ["Incline Machine Chest Press", "Plate-Loaded Incline Press", "Incline Chest Press Machine"], ""),
    ("Landmine Press", "landmine-press", ["Landmine Chest Press", "Standing Landmine Press"], ""),
    ("Lat Pulldown", "lat-pulldown", ["Lat Pull Down", "Lat Pull-Down", "Lat Pulldowns", "Cable Lat Pulldown"], ""),
    ("Lateral Raise", "lateral-raises", ["Dumbbell Lateral Raise", "DB Lateral Raise", "Side Lateral Raise", "Side Raise", "Lateral Raises"], ""),
    ("Leg Curl", "leg-curl", ["Lying Leg Curl", "Lying Hamstring Curl", "Hamstring Curl", "Prone Leg Curl"], ""),
    ("Leg Extension", "leg-extension", ["Leg Extensions", "Machine Leg Extension", "Knee Extension"], ""),
    ("Leg Press", "leg-press-moving-plate", ["Machine Leg Press", "Seated Leg Press", "Leg Presses"], ""),
    ("Leg Press Calf Raise", "leg-press-calf-raise", ["Leg Press Calf Raises", "Calf Press"], ""),
    ("Low-to-High Cable Fly", "cable-fly-low-to-high", ["Low to High Cable Fly", "Low-to-High Fly", "Cable Fly Low to High"], ""),
    ("Machine Chest Press", "chest-press-machine", ["Chest Press Machine", "Machine Chest Press", "Seated Chest Press"], ""),
    ("Machine Lateral Raise", "machine-lateral-raise", ["Lateral Raise Machine", "Machine Side Raise"], ""),
    ("Machine Row", "machine-row", ["Seated Machine Row", "Chest Supported Machine Row", "Machine Rows"], ""),
    ("Machine Shoulder Press", "shoulder-press-machine", ["Shoulder Press Machine", "Machine Overhead Press", "Seated Machine Press"], ""),
    ("Machine dip", "seated-dip-machine", ["Machine Dip", "Machine Dips", "Seated Dip Machine", "Tricep Dip Machine"], ""),
    ("Nordic Curl", "nordic-hamstring-curl", ["Nordic Hamstring Curl", "Nordic Ham Curl", "Nordic Curls"], ""),
    ("Overhead Cable Extension", "cable-overhead-triceps-extension", ["Cable Overhead Triceps Extension", "Overhead Cable Tricep Extension", "Cable Overhead Extension"], ""),
    ("Overhead Press", "overhead-press", ["Barbell Overhead Press", "Military Press", "OHP", "Standing Overhead Press", "Strict Press", "BB Overhead Press"], ""),
    ("Pec Deck", "pec-deck", ["Pec Deck Fly", "Machine Fly", "Pec Dec", "Chest Fly Machine"], ""),
    ("Preacher Curl", "preacher-curl", ["Preacher Curls", "EZ-Bar Preacher Curl", "EZ Bar Preacher Curl"], ""),
    ("Pull-Up", "pull-up", ["Pull Up", "Pullup", "Pullups", "Pull-Ups"], ""),
    ("Push-Up", "push-up", ["Push Up", "Pushup", "Pushups", "Push-Ups"], ""),
    ("Rack Pull", "rack-pull", ["Rack Pulls", "Barbell Rack Pull"], ""),
    ("Rear Delt Cable Fly", "rear-delt-fly", ["Cable Rear Delt Fly", "Rear Delt Cable Flyes"], "Shown with dumbbells. On a cable, set the pulleys up high and open the arms the same way."),
    ("Rear Delt Fly", "rear-delt-fly", ["Rear Delt Flyes", "Reverse Fly", "Bent-Over Rear Delt Fly", "DB Rear Delt Fly"], ""),
    ("Reverse Curl", "reverse-curl", ["Reverse Curls", "Reverse Barbell Curl", "EZ-Bar Reverse Curl"], ""),
    ("Reverse Hyper", "reverse-hyperextension", ["Reverse Hyperextension", "Reverse Hypers", "Reverse Hyper Extension"], "Shown on a flat bench. A reverse-hyper machine is the same hip extension."),
    ("Reverse Pec Deck", "reverse-pec-deck", ["Reverse Pec Dec", "Rear Delt Machine Fly", "Reverse Fly Machine"], ""),
    ("Reverse Wrist Curl", "reverse-wrist-curl", ["Reverse Wrist Curls", "Wrist Extension"], ""),
    ("Romanian Deadlift", "romanian-deadlift", ["RDL", "RDLs", "Barbell Romanian Deadlift", "Barbell RDL"], ""),
    ("Rope Pushdown", "rope-pushdown", ["Rope Pushdowns", "Tricep Pushdown", "Triceps Pushdown", "Cable Pushdown", "Triceps Rope Pushdown"], ""),
    ("Seated Cable Row", "seated-cable-row", ["Seated Row", "Cable Row", "Seated Rows"], ""),
    ("Seated Calf Raise", "seated-calf-raise-machine", ["Seated Calf Raises", "Seated Calf Raise Machine"], ""),
    ("Seated DB Press", "dumbbell-shoulder-press", ["Seated Dumbbell Press", "Seated Dumbbell Shoulder Press", "DB Shoulder Press", "Dumbbell Shoulder Press", "Seated DB Shoulder Press"], ""),
    ("Seated Leg Curl", "seated-leg-curl", ["Seated Hamstring Curl", "Seated Leg Curls"], ""),
    ("Single-Arm DB Row", "dumbbell-row", ["Single Arm DB Row", "One-Arm Dumbbell Row", "One Arm Dumbbell Row", "Single-Arm Dumbbell Row", "Dumbbell Row"], ""),
    ("Single-Leg Calf Raise", "single-leg-calf-raise", ["Single Leg Calf Raise", "One-Leg Calf Raise"], ""),
    ("Skull Crusher", "skull-crushers", ["Skull Crushers", "Skullcrushers", "Lying Triceps Extension", "EZ-Bar Skull Crusher"], ""),
    ("Straight-Arm Pulldown", "straight-arm-pulldown", ["Straight Arm Pulldown", "Straight-Arm Lat Pulldown", "Pullover Cable"], ""),
    ("Upright Row", "upright-row", ["Barbell Upright Row", "BB Upright Row", "Upright Rows"], ""),
    ("Walking Lunge", "walking-lunge", ["Walking Lunges", "Dumbbell Walking Lunge", "DB Walking Lunge"], ""),
    ("Wide-Grip Seated Row", "seated-cable-row", ["Wide Grip Seated Row", "Wide-Grip Seated Cable Row", "Wide Grip Cable Row"], "Shown with a close handle. For this one, take a wide bar and pull toward the lower chest."),
    ("Wrist Curl", "wrist-curl", ["Wrist Curls", "Barbell Wrist Curl"], ""),
]

CUES = {
    "Arnold Press": ["Palms face you at the shoulders.", "Rotate the palms forward as you press.", "Lower along the same path."],
    "Back Extension": ["Hips stay on the pad.", "Lift the chest until the body is straight.", "Don't throw the head back."],
    "Back Squat": ["Brace, then sit between the hips.", "Knees track over the mid-foot.", "Stand by driving the floor away."],
    "Barbell Curl": ["Elbows stay by your sides.", "Curl without swinging the torso.", "Squeeze, then lower all the way."],
    "Barbell Row": ["Hinge until the back is flat.", "Pull the bar to the lower ribs.", "Don't bounce off the floor."],
    "Barbell Shrug": ["Arms stay long.", "Shrug straight up and pause.", "Don't roll the shoulders."],
    "Bench Dip": ["Hands on the bench, feet out front.", "Bend the elbows back, not flared.", "Stop when the shoulders feel tight."],
    "Bench Press": ["Feet planted, shoulder blades set.", "Lower the bar to the lower chest.", "Press up and slightly back."],
    "Bulgarian Split Squat": ["Rear foot on the bench, torso tall.", "Drop straight down on the front heel.", "The front knee tracks over the toes."],
    "Cable Curl": ["Elbows pinned.", "Curl the handle toward the shoulders.", "Let the arms open fully at the bottom."],
    "Cable Fly": ["Soft elbows, arms open at chest height.", "Bring the hands together in front.", "Control the way back out."],
    "Cable Kickback": ["Hinge slightly and brace.", "Kick the heel back, glute tight.", "Don't swing the lower back."],
    "Cable Lateral Raise": ["Stand sideways to the stack.", "Lift the arm out to shoulder height.", "Lead with the elbow, not the hand."],
    "Calf Raise": ["Balls of the feet on the platform.", "Pause at the top on the big toe.", "Lower the heels under control."],
    "Chest-Supported T-Bar Row": ["Chest on the pad, spine long.", "Pull the handles to the ribs.", "Squeeze the shoulder blades, then reach."],
    "Close-Grip Bench Press": ["Grip just outside the shoulders.", "Elbows tuck as the bar comes down.", "Press up without flaring."],
    "Concentration Curl": ["Elbow braced on the thigh.", "Curl without moving the shoulder.", "Lower until the arm is straight."],
    "DB Bench Press": ["Dumbbells over the chest, wrists stacked.", "Lower until the elbows are near the bench.", "Press up and in, don't clang the bells."],
    "DB Shrug": ["Bells at your sides.", "Shrug up and hold a second.", "Keep the neck long."],
    "Deadlift": ["Bar over the mid-foot, back set.", "Push the floor away to stand.", "Lock the hips and knees together."],
    "Decline Bench Press": ["Shoulders pinned on the decline.", "Lower to the lower chest.", "Press up without bouncing."],
    "Decline DB Press": ["Same path as a decline bench.", "Elbows about 45 degrees.", "Press until the arms are long, not locked hard."],
    "Dips": ["Shoulders down before you bend.", "Lean for chest, stay tall for triceps.", "Stop above a painful shoulder stretch."],
    "EZ-Bar Curl": ["Hands on the angled grips.", "Elbows still, curl to the shoulders.", "Lower until the elbows open."],
    "Face Pull": ["Rope at face height.", "Pull to the forehead, elbows high.", "Hold a second, then reach back out."],
    "Front Raise": ["Soft elbows.", "Lift to shoulder height, no higher.", "Don't swing from the hips."],
    "Goblet Squat": ["Hold the bell at the chest.", "Sit down between the knees.", "Elbows stay inside the knees."],
    "Good Morning": ["Bar on the upper back, knees soft.", "Hinge until you feel the hamstrings.", "Stand by squeezing the glutes."],
    "Hack Squat": ["Back and shoulders on the pads.", "Lower until the thighs are deep.", "Don't bounce out of the bottom."],
    "Hammer Curl": ["Thumbs up the whole time.", "Elbows stay quiet.", "Curl and lower without rocking."],
    "High-to-Low Cable Fly": ["Handles start high and wide.", "Sweep down and together at the hips.", "Keep a slight bend in the elbows."],
    "Hip Abduction": ["Back against the pad.", "Press the knees out, pause.", "Bring them back in under control."],
    "Hip Thrust": ["Shoulder blades on the bench.", "Drive the hips up and squeeze.", "Chin stays tucked, ribs down."],
    "Incline Bench Press": ["Bench around 30 degrees.", "Lower to the upper chest.", "Press up over the shoulders."],
    "Incline DB Curl": ["Arms hang behind the torso.", "Curl without letting the elbows drift.", "Stretch at the bottom."],
    "Incline DB Press": ["Bells start over the upper chest.", "Lower with the elbows under the wrists.", "Press up and slightly together."],
    "Incline Machine Press": ["Seat so the handles meet the upper chest.", "Press without shrugging.", "Control the return."],
    "Landmine Press": ["Bar starts at the shoulder.", "Press up and slightly forward.", "Don't lean back to finish."],
    "Lat Pulldown": ["Lean back a little, chest up.", "Pull the bar to the upper chest.", "Elbows drive down and in."],
    "Lateral Raise": ["Soft elbows, bells by the thighs.", "Lift to shoulder height.", "Lower slowly. No torso swing."],
    "Leg Curl": ["Hips stay down on the pad.", "Curl the heels toward the glutes.", "Pause, then a slow negative."],
    "Leg Extension": ["Knees line up with the machine's pivot.", "Squeeze the quads at the top.", "Lower until the knees are bent again."],
    "Leg Press": ["Feet flat, about shoulder width.", "Lower until the knees are deep, not bouncing.", "Press through the mid-foot."],
    "Leg Press Calf Raise": ["Balls of the feet on the edge of the plate.", "Press the toes away and pause.", "Let the heels drop under control."],
    "Low-to-High Cable Fly": ["Handles start low.", "Sweep up and together at chest height.", "Soft elbows the whole way."],
    "Machine Chest Press": ["Handles at mid-chest.", "Press until the arms are long.", "Don't let the shoulders roll forward."],
    "Machine Lateral Raise": ["Pads sit against the arms.", "Lift out to shoulder height.", "Don't shrug to help."],
    "Machine Row": ["Chest supported if the pad is there.", "Pull the handles to the ribs.", "Squeeze, then let the shoulders reach."],
    "Machine Shoulder Press": ["Seat so the handles start at shoulder height.", "Press up without shrugging.", "Lower to about ear level."],
    "Machine dip": ["Stay upright so the triceps work.", "Bend until the upper arms are near parallel.", "Press back to straight arms."],
    "Nordic Curl": ["Feet locked, hips extended.", "Lower as far as you can with the hamstrings.", "Use the hands only to help back up."],
    "Overhead Cable Extension": ["Elbows point forward and stay narrow.", "Bend until you feel the triceps stretch.", "Straighten the elbows, shoulders quiet."],
    "Overhead Press": ["Bar on the front delts, glutes squeezed.", "Press the bar over the mid-foot.", "Head comes through at the top."],
    "Pec Deck": ["Upper arms parallel to the floor.", "Bring the pads together in front.", "Open the chest on the way back."],
    "Preacher Curl": ["Armpits on the pad.", "Curl without lifting the elbows.", "Lower until the arms are nearly straight."],
    "Pull-Up": ["Dead hang, then pull the chest toward the bar.", "Elbows down and back.", "Lower until the arms are straight."],
    "Push-Up": ["Body in one line, hands under the shoulders.", "Chest goes toward the floor.", "Press the floor away."],
    "Rack Pull": ["Bar starts at the knees, on the pins.", "Stand tall and lock the hips.", "Don't lean back at the top."],
    "Rear Delt Cable Fly": ["Hinge or set the cables high.", "Open the arms until they're in line with the body.", "Lead with the elbows and squeeze the rear delts."],
    "Rear Delt Fly": ["Hinge with a flat back.", "Raise the bells out to the sides.", "Stop when the arms are about parallel to the floor."],
    "Reverse Curl": ["Palms face down.", "Curl without swinging.", "The forearms and brachialis do the work."],
    "Reverse Hyper": ["Hips at the edge, legs long.", "Lift the legs with the glutes until the body is straight.", "Don't yank with the lower back."],
    "Reverse Pec Deck": ["Face the pad, arms in front.", "Open the arms wide and squeeze.", "Keep the chest on the pad."],
    "Reverse Wrist Curl": ["Palms face down, forearms supported.", "Extend the wrists and pause.", "Lower slowly."],
    "Romanian Deadlift": ["Soft knees, bar close to the legs.", "Hinge until the hamstrings load, about mid-shin.", "Stand by driving the hips through."],
    "Rope Pushdown": ["Elbows pinned to your sides.", "Push down and spread the rope at the bottom.", "Let the forearms come back up."],
    "Seated Cable Row": ["Sit tall, knees soft.", "Pull the handle to the stomach.", "Shoulders stay down, then reach forward."],
    "Seated Calf Raise": ["Knees under the pad.", "Press up onto the toes and pause.", "Drop the heels for a stretch."],
    "Seated DB Press": ["Back against the bench.", "Press the bells up over the shoulders.", "Lower to about ear level."],
    "Seated Leg Curl": ["Lean forward a bit if the machine allows.", "Curl until the hamstrings cramp-squeeze.", "Slow on the way out."],
    "Single-Arm DB Row": ["One knee and hand on the bench.", "Pull the bell to the hip.", "Don't rotate the chest open to cheat."],
    "Single-Leg Calf Raise": ["Balance on one foot.", "Go all the way up and all the way down.", "Use a hand for balance, not bounce."],
    "Skull Crusher": ["Upper arms stay vertical.", "Bend only the elbows toward the forehead.", "Extend without flaring."],
    "Straight-Arm Pulldown": ["Arms almost straight, slight elbow bend.", "Pull the bar down to the thighs.", "Feel the lats, not a row."],
    "Upright Row": ["Grip just outside the hips.", "Pull the elbows up and out.", "Stop before the shoulders pinch."],
    "Walking Lunge": ["Step forward and drop the back knee.", "Front heel stays down.", "Drive through and keep walking."],
    "Wide-Grip Seated Row": ["Take a wide grip and sit tall.", "Pull toward the lower chest.", "Squeeze the upper back, then reach."],
    "Wrist Curl": ["Palms up, forearms supported.", "Curl the wrists and pause.", "Open the fingers slightly at the bottom."],
}

MUSCLE_LABEL = {
    "quads": "Quads", "glutes": "Glutes", "hamstrings": "Hamstrings", "calves": "Calves",
    "core": "Core", "lower_back": "Lower back", "back": "Back", "lats": "Lats", "traps": "Traps",
    "upper_back": "Upper back", "shoulders": "Shoulders", "chest": "Chest", "biceps": "Biceps",
    "triceps": "Triceps", "forearms": "Forearms", "abs": "Abs", "obliques": "Obliques",
    "adductors": "Adductors", "hip_flexors": "Hip flexors", "rear_delts": "Rear delts",
    "front_delts": "Front delts", "side_delts": "Side delts",
}


def slug(name):
    s = name.lower().replace('&', ' and ')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'lift-log-demo-build'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def load_source():
    cache = CACHE / 'exercises.json'
    if cache.exists():
        data = json.loads(cache.read_text())
    else:
        CACHE.mkdir(parents=True, exist_ok=True)
        raw = fetch(SRC_JSON)
        cache.write_bytes(raw)
        data = json.loads(raw)
    by_id = {e['id']: e for e in data['exercises']}
    variants = {v['id']: v for v in data.get('variants', [])}
    return by_id, variants


def resolve_source(by_id, variants, key):
    if key in variants:
        v = variants[key]
        base = by_id[v['imageOf']]
        return base, v.get('difference') or ''
    if key in by_id:
        return by_id[key], ''
    raise SystemExit(f'unknown source id {key}')


def frame_bytes(ex, frame):
    rel = ex['images'][frame]
    dest = CACHE / rel
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(fetch(IMG + rel))
    return dest.read_bytes()


def crop_and_save(blob, dest):
    im = Image.open(BytesIO(blob)).convert('RGB')
    g = im.convert('L')
    mask = g.point(lambda p: 255 if p > THRESH else 0)
    box = mask.getbbox()
    if box:
        l, t, r, b = box
        pad = int(0.03 * max(im.size))
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(im.width, r + pad); b = min(im.height, b + pad)
        # keep the crop only when it actually removes margin
        if (r - l) * (b - t) < 0.92 * im.width * im.height:
            im = im.crop((l, t, r, b))
    im.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, 'WEBP', quality=QUALITY, method=6)


def muscles_of(ex):
    m = ex.get('muscles') or {}
    out = []
    for key in (m.get('primary') or []) + (m.get('secondary') or []):
        label = MUSCLE_LABEL.get(key, key.replace('_', ' ').title())
        if label not in out:
            out.append(label)
    return out[:4]


def main():
    by_id, variants = load_source()
    OUT.mkdir(parents=True, exist_ok=True)
    # drop previously generated frames so a remap can't leave orphans
    for old in OUT.glob('*.webp'):
        old.unlink()
    items = {}
    written = {}
    for name, key, extras, note in ENTRIES:
        ex, diff = resolve_source(by_id, variants, key)
        frames = [f for f in ('start', 'mid', 'end') if f in (ex.get('images') or {})]
        if 'start' not in frames:
            # holds
            frames = [f for f in ('hold', 'main') if f in (ex.get('images') or {})]
        if not frames:
            raise SystemExit(f'{name}: no frames on {ex["id"]}')
        paths = []
        for fr in frames:
            label = {'start': 'start', 'mid': 'mid', 'end': 'peak', 'hold': 'start', 'main': 'start'}[fr]
            fname = f'{ex["id"]}-{label}.webp'
            rel = f'assets/demos/{fname}'
            dest = OUT / fname
            if fname not in written:
                crop_and_save(frame_bytes(ex, fr), dest)
                written[fname] = dest.stat().st_size
            paths.append(rel)
        # start then peak (and mid in between when present)
        ordered = []
        for label in ('start', 'mid', 'peak'):
            for p in paths:
                if p.endswith(f'-{label}.webp') and p not in ordered:
                    ordered.append(p)
        sid = slug(name)
        item_note = note or diff or ''
        own = {n.lower() for n, *_rest in ENTRIES}
        aliases = [name] + list(extras)
        if key in variants:
            aliases.append(variants[key]['name'])
        src_name = (ex.get('name') or '').strip()
        # Don't stamp the source title onto a sibling lift that already has that name.
        if src_name and (src_name.lower() == name.lower() or src_name.lower() not in own):
            aliases.append(src_name)
        aliases = [a.strip() for a in aliases if a and a.strip()]
        # unique, keep order
        seen = set(); clean = []
        for a in aliases:
            k = a.lower()
            if k in seen:
                continue
            seen.add(k); clean.append(a)
        items[sid] = {
            'id': sid,
            'name': name,
            'muscles': muscles_of(ex),
            'equipment': ex.get('equipmentLabel') or '',
            'cues': CUES[name],
            'note': item_note,
            'frames': ordered,
            'aliases': clean,
            'sourceId': ex['id'],
        }
        if name not in CUES:
            raise SystemExit('missing cues for ' + name)
    missing = [n for n, *_ in ENTRIES if n not in CUES]
    if missing:
        raise SystemExit('missing cues ' + str(missing))
    catalog = {
        'source': {
            'name': 'Open Exercise Illustrations',
            'url': 'https://github.com/hitmanrepo/open-exercise-illustrations',
            'license': 'CC0 1.0',
            'credit': 'Exercise illustrations from Open Exercise Illustrations (CC0 1.0)',
        },
        'items': items,
    }
    js = '/* Generated by tools/build_demos.py. Do not edit by hand. */\n'
    js += 'const DEMO_CATALOG = ' + json.dumps(catalog, ensure_ascii=False, indent=2) + ';\n'
    (OUT / 'catalog.js').write_text(js)
    total = sum(written.values())
    print(f'{len(items)} exercises, {len(written)} frames, {total/1024:.0f} KB')


if __name__ == '__main__':
    main()
