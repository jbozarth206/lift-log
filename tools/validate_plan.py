#!/usr/bin/env python3
"""Validate Lift Log's coach plan before publishing.

Usage:
  python3 tools/validate_plan.py [plan.json] [--data liftlog.json] [--prev old_plan.json | --no-prev]

Checks:
  - valid JSON and matches PLAN_SCHEMA.md (schema 1)
  - version is an integer and is HIGHER than the published one
    (compares with `git show origin/main:plan.json` unless --prev/--no-prev is given)
  - every exercise has a name or id, sets 1-20, reps [min, max] 1-100, rest 0-900 s
  - optional "prescriptions": {exerciseId: {sets: [{weight, reps}], note, updated, phase}}
  - optional "meals" (per-phase meal template, swaps, groceries) and "daily" (cardio, targets, supplements, photoDay)
  - PRIVACY: plan.json is PUBLIC. Rejects health keys (peds, labs, photos, habits, body, ...) anywhere,
    and strings that mention PED compounds, lab markers/results or diagnoses
  - with --data: every "id" exists in that body group in the user's synced data,
    and every prescriptions key matches an exercise id (or name)
Exit code 0 = OK to push, 1 = fix the errors first.
"""
import json, re, subprocess, sys

PHASES = {'bulk', 'cut'}
FOCUSES = {
    'back': {'upper', 'mid', 'lower', 'all'},
    'chest': {'upper', 'mid', 'lower', 'all'},
    'legs': {'quads', 'hamstrings', 'glutes', 'calves', 'all'},
    'shoulders': {'front', 'side', 'rear', 'all'},
    'arms': {'biceps', 'triceps', 'forearms', 'all'},
}
ARM_HOSTS = {'back', 'chest'}
ALLOWED_KEYS = {'id', 'name', 'sets', 'reps', 'rest', 'notes', 'arm'}


MEAL_SLOTS = {'breakfast', 'lunch', 'dinner', 'snack'}
# --- privacy: plan.json is served publicly at jbozarth206.github.io/lift-log/plan.json ---
HEALTH_KEYS = {'peds', 'ped', 'labs', 'lab', 'labresults', 'bloodwork', 'photos', 'photo', 'habits', 'body', 'profile', 'doses', 'dose_log',
               'compounds', 'medications', 'meds', 'diagnosis', 'diagnoses', 'conditions', 'bodyfat', 'bf', 'patient', 'mychart', 'fhir'}
HEALTH_RE = re.compile(r'''\b(
    testosterone|test\s?(e|c|cyp|enan)|enanthate|cypionate|propionate|undecylenate|decanoate|nandrolone|deca|npp|masteron|drostanolone|
    trenbolone|tren|primobolan|primo|methenolone|equipoise|boldenone|anavar|oxandrolone|dianabol|dbol|winstrol|stanozolol|superdrol|turinabol|
    sarms?|ostarine|rad[- ]?140|lgd[- ]?4033|mk[- ]?677|hgh|growth\s+hormone|bpc[- ]?157|hcg|anastrozole|arimidex|aromasin|exemestane|
    letrozole|clomid|clomiphene|nolvadex|tamoxifen|cabergoline|pct|post[- ]cycle|trt|steroids?|aas|injections?|mg/ml|
    bloodwork|blood\s?work|blood\s?test|labs?|lab\s+results?|hematocrit|hemoglobin|hgb|hct|ldl|hdl|a1c|cholesterol|triglycerides?|estradiol|shbg|
    psa|tsh|egfr|creatinine|liver\s+enzymes|bilirubin|lipid\s+panel|cbc|cmp|vitamin\s+d\s+(level|deficien\w*|low)|low\s+vitamin\s+d|
    diagnos\w*|hypertension|blood\s+pressure|mychart|aprn|physician|endocrinolog\w*|urolog\w*|cardiolog\w*|echocardiogram|holter|troponin|ekg|ecg
)\b''', re.I | re.X)


def privacy_scan(node, where, errors):
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(k, str) and k.lower() in HEALTH_KEYS:
                errors.append(f'PRIVACY {where}.{k}: health data key in the public plan.json (keep PED/lab/photo/body data in lift-log-data only)')
            privacy_scan(v, f'{where}.{k}', errors)
    elif isinstance(node, list):
        for i, v in enumerate(node): privacy_scan(v, f'{where}[{i}]', errors)
    elif isinstance(node, str):
        m = HEALTH_RE.search(node)
        if m: errors.append(f'PRIVACY {where}: mentions "{m.group(0)}". plan.json is public; no PED, lab, diagnosis or provider details')


def num_ok(x, lo, hi):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and lo <= x <= hi


def check_foods(foods, w, errors, warns):
    if not isinstance(foods, list) or not 1 <= len(foods) <= 25: errors.append(f'{w}: "foods" must be a list of 1-25 foods'); return
    for i, f in enumerate(foods, 1):
        fw = f'{w}.foods[{i}]'
        if not isinstance(f, dict): errors.append(f'{fw} must be an object'); continue
        if not isinstance(f.get('name'), str) or not f['name'].strip() or len(f['name']) > 80: errors.append(f'{fw}: "name" must be a string up to 80 chars')
        if 'qty' in f and (not isinstance(f['qty'], str) or len(f['qty']) > 40): errors.append(f'{fw}: "qty" must be a string up to 40 chars (e.g. "200 g")')
        for k, hi in (('kcal', 10000), ('p', 1000), ('c', 2000), ('f', 1000)):
            if k in f and not num_ok(f[k], 0, hi): errors.append(f'{fw}: "{k}" must be a number 0-{hi}')
        if not any(k in f for k in ('p', 'c', 'f')): warns.append(f'{fw}: no macros (p/c/f)')
        if 'kcal' in f and all(k in f for k in ('p', 'c', 'f')):
            calc = 4 * f['p'] + 4 * f['c'] + 9 * f['f']
            if calc and abs(f['kcal'] - calc) > max(40, 0.2 * calc): warns.append(f'{fw}: kcal {f["kcal"]} is far from 4/4/9 of its macros ({round(calc)})')
        for k in f:
            if k not in {'name', 'qty', 'kcal', 'p', 'c', 'f'}: warns.append(f'{fw}: unknown key "{k}" (ignored)')


def check_meals(meals, errors, warns):
    if not isinstance(meals, dict): errors.append('"meals" must be an object like {"bulk": {"meals": [...], "groceries": [...]}}'); return 0
    n = 0
    for ph, mp in meals.items():
        w = f'meals.{ph}'
        if ph not in PHASES: errors.append(f'{w}: unknown phase (use bulk or cut)'); continue
        if not isinstance(mp, dict): errors.append(f'{w} must be an object'); continue
        lst = mp.get('meals', [])
        if not isinstance(lst, list) or len(lst) > 12: errors.append(f'{w}.meals must be a list of up to 12 meals'); lst = []
        ids = set(); kcal = 0
        for i, m in enumerate(lst, 1):
            mw = f'{w}.meals[{i}]'
            if not isinstance(m, dict): errors.append(f'{mw} must be an object'); continue
            n += 1
            if not isinstance(m.get('name'), str) or not m['name'].strip() or len(m['name']) > 60: errors.append(f'{mw}: "name" must be a string up to 60 chars')
            mid = m.get('id')
            if mid is not None and (not isinstance(mid, str) or not mid): errors.append(f'{mw}: "id" must be a non-empty string')
            if mid is None: warns.append(f'{mw}: no "id"; give each meal a stable id so adherence lines up across plan versions')
            if mid in ids: errors.append(f'{mw}: duplicate id "{mid}"')
            ids.add(mid)
            if 'slot' in m and m['slot'] not in MEAL_SLOTS: errors.append(f'{mw}: "slot" must be one of {", ".join(sorted(MEAL_SLOTS))}')
            if 'time' in m and not (isinstance(m['time'], str) and re.fullmatch(r'\d{1,2}:\d\d', m['time'])): errors.append(f'{mw}: "time" must be "HH:MM"')
            check_foods(m.get('foods'), mw, errors, warns)
            if isinstance(m.get('foods'), list):
                kcal += sum(f.get('kcal', 4 * f.get('p', 0) + 4 * f.get('c', 0) + 9 * f.get('f', 0)) for f in m['foods'] if isinstance(f, dict) and all(num_ok(f.get(k, 0), 0, 10000) for k in ('kcal', 'p', 'c', 'f')))
            sw = m.get('swaps', [])
            if not isinstance(sw, list) or len(sw) > 6: errors.append(f'{mw}: "swaps" must be a list of up to 6'); sw = []
            for j, s_ in enumerate(sw, 1):
                if not isinstance(s_, dict) or not isinstance(s_.get('name'), str): errors.append(f'{mw}.swaps[{j}]: needs "name" and "foods"'); continue
                check_foods(s_.get('foods'), f'{mw}.swaps[{j}]', errors, warns)
            if 'notes' in m and (not isinstance(m['notes'], str) or len(m['notes']) > 300): errors.append(f'{mw}: "notes" must be a string up to 300 chars')
            for k in m:
                if k not in {'id', 'name', 'slot', 'time', 'foods', 'swaps', 'notes'}: warns.append(f'{mw}: unknown key "{k}" (ignored)')
        g = mp.get('groceries', [])
        if not isinstance(g, list) or len(g) > 80 or not all(isinstance(x, str) and len(x) <= 80 for x in g): errors.append(f'{w}.groceries must be a list of up to 80 strings')
        print(f'meals.{ph}: {len(lst)} meals, {round(kcal)} kcal/day planned')
    return n


def check_daily(d, errors, warns):
    if not isinstance(d, dict): errors.append('"daily" must be an object'); return
    for k in d:
        if k not in {'cardio', 'targets', 'supplements', 'photoDay'}: warns.append(f'daily: unknown key "{k}" (ignored)')
    cardio = d.get('cardio', [])
    if not isinstance(cardio, list) or len(cardio) > 10: errors.append('daily.cardio must be a list of up to 10 sessions'); cardio = []
    ids = set()
    for i, c in enumerate(cardio, 1):
        w = f'daily.cardio[{i}]'
        if not isinstance(c, dict): errors.append(f'{w} must be an object'); continue
        if not isinstance(c.get('type'), str) or not c['type'].strip() or len(c['type']) > 60: errors.append(f'{w}: "type" must be a string up to 60 chars (e.g. "Incline walk")')
        if 'id' not in c: warns.append(f'{w}: no "id"; give it a stable id so ticks line up across plan versions')
        elif c['id'] in ids: errors.append(f'{w}: duplicate id')
        ids.add(c.get('id'))
        if 'minutes' in c and not (isinstance(c['minutes'], int) and not isinstance(c['minutes'], bool) and 1 <= c['minutes'] <= 300): errors.append(f'{w}: "minutes" must be an integer 1-300')
        days = c.get('days')
        if days is not None and not (isinstance(days, list) and all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 6 for x in days)): errors.append(f'{w}: "days" must be a list of weekday numbers 0-6 (0 = Sun)')
        if 'zone' in c and (not isinstance(c['zone'], str) or len(c['zone']) > 30): errors.append(f'{w}: "zone" must be a short string like "Z2" or "120-140 bpm"')
        if 'notes' in c and (not isinstance(c['notes'], str) or len(c['notes']) > 200): errors.append(f'{w}: "notes" must be a string up to 200 chars')
        if 'phase' in c and c['phase'] not in PHASES: errors.append(f'{w}: "phase" must be bulk or cut')
    t = d.get('targets', {})
    if not isinstance(t, dict): errors.append('daily.targets must be an object'); t = {}
    for k, lo, hi in (('steps', 1, 100000), ('waterOz', 1, 400), ('sleepHours', 1, 14)):
        if k in t and t[k] is not None and not num_ok(t[k], lo, hi): errors.append(f'daily.targets.{k} must be a number {lo}-{hi}')
    for k in t:
        if k not in {'steps', 'waterOz', 'sleepHours'}: warns.append(f'daily.targets: unknown key "{k}" (ignored)')
    sup = d.get('supplements', [])
    if not isinstance(sup, list) or len(sup) > 20: errors.append('daily.supplements must be a list of up to 20'); sup = []
    for i, s_ in enumerate(sup, 1):
        w = f'daily.supplements[{i}]'
        if not isinstance(s_, dict) or not isinstance(s_.get('name'), str) or not s_['name'].strip(): errors.append(f'{w}: needs a "name"'); continue
        for k, n_ in (('name', 60), ('dose', 40), ('time', 20), ('id', 40)):
            if k in s_ and (not isinstance(s_[k], str) or len(s_[k]) > n_): errors.append(f'{w}: "{k}" must be a string up to {n_} chars')
    pd = d.get('photoDay')
    if pd is not None and not (isinstance(pd, int) and not isinstance(pd, bool) and 0 <= pd <= 6): errors.append('daily.photoDay must be 0-6 (0 = Sun) or null')


def main(argv):
    args = argv[1:]
    path, data_path, prev_path, no_prev = 'plan.json', None, None, False
    i = 0
    while i < len(args):
        a = args[i]
        if a == '--data': data_path = args[i + 1]; i += 2; continue
        if a == '--prev': prev_path = args[i + 1]; i += 2; continue
        if a == '--no-prev': no_prev = True; i += 1; continue
        path = a; i += 1
    errors, warns = [], []
    try:
        with open(path) as f:
            plan = json.load(f)
    except Exception as e:
        print(f'ERROR: {path} is not valid JSON: {e}')
        return 1
    if not isinstance(plan, dict):
        print('ERROR: top level must be an object'); return 1
    if plan.get('schema') != 1: errors.append('"schema" must be 1')
    v = plan.get('version')
    if not isinstance(v, int) or isinstance(v, bool) or v < 1: errors.append('"version" must be a positive integer')
    if 'updatedAt' in plan and not isinstance(plan['updatedAt'], str): errors.append('"updatedAt" must be an ISO date string')
    if 'message' in plan and not isinstance(plan['message'], str): errors.append('"message" must be a string')
    if len(plan.get('message') or '') > 1000: warns.append('message is long (>1000 chars)')
    for k in plan:
        if k not in {'schema', 'version', 'updatedAt', 'message', 'phases', 'nutrition', 'options', 'prescriptions', 'meals', 'daily'}: warns.append(f'unknown top-level key "{k}" (ignored by the app)')
    nut = plan.get('nutrition')
    if nut is not None:
        if not isinstance(nut, dict): errors.append('"nutrition" must be an object like {"bulk": {"kcal":..,"p":..,"c":..,"f":..}}')
        else:
            for ph, t in nut.items():
                if ph not in PHASES: errors.append(f'nutrition.{ph}: unknown phase (use bulk or cut)'); continue
                if not isinstance(t, dict): errors.append(f'nutrition.{ph} must be an object'); continue
                for k, hi in (('kcal', 10000), ('p', 1000), ('c', 2000), ('f', 1000)):
                    x = t.get(k)
                    if x is not None and (not isinstance(x, (int, float)) or isinstance(x, bool) or not 0 < x <= hi): errors.append(f'nutrition.{ph}.{k} must be a number 1-{hi}')
                for k in t:
                    if k not in {'kcal', 'p', 'c', 'f'}: warns.append(f'nutrition.{ph}: unknown key "{k}" (ignored)')
    opts = plan.get('options')
    if opts is not None:
        if not isinstance(opts, dict): errors.append('"options" must be an object')
        elif 'autoArmFinishers' in opts and not isinstance(opts['autoArmFinishers'], bool): errors.append('options.autoArmFinishers must be true or false')

    data_ids = None
    if data_path:
        with open(data_path) as f:
            data = json.load(f)
        data_ids = {g: {e['id']: e['name'] for e in data.get('exercises', {}).get(g, [])} for g in FOCUSES}
        for g in ARM_HOSTS: data_ids[g] = {**data_ids[g], **data_ids['arms']}  # back/chest may reference Arms exercises

    privacy_scan(plan, 'plan', errors)
    meal_count = check_meals(plan['meals'], errors, warns) if 'meals' in plan else 0
    if 'daily' in plan: check_daily(plan['daily'], errors, warns)

    rx = plan.get('prescriptions')
    rx_count = 0
    if rx is not None:
        if not isinstance(rx, dict): errors.append('"prescriptions" must be an object keyed by exercise id')
        else:
            all_ids = {}
            if data_ids is not None:
                for g in FOCUSES: all_ids.update(data_ids[g])
            names = {n.strip().lower() for n in all_ids.values()}
            for key, p in rx.items():
                w = f'prescriptions["{key}"]'
                if not isinstance(key, str) or not key.strip(): errors.append(f'{w}: key must be an exercise id'); continue
                if not isinstance(p, dict): errors.append(f'{w} must be an object'); continue
                rx_count += 1
                for k in p:
                    if k not in {'sets', 'note', 'updated', 'phase', 'name'}: warns.append(f'{w}: unknown key "{k}" (ignored)')
                sets = p.get('sets')
                if not isinstance(sets, list) or not 1 <= len(sets) <= 20: errors.append(f'{w}: "sets" must be a list of 1-20 {{"weight", "reps"}} objects'); sets = []
                for n, st in enumerate(sets, 1):
                    if not isinstance(st, dict): errors.append(f'{w}.sets[{n}] must be an object'); continue
                    wt, rp = st.get('weight'), st.get('reps')
                    if wt is not None and (not isinstance(wt, (int, float)) or isinstance(wt, bool) or not 0 <= wt <= 2000): errors.append(f'{w}.sets[{n}]: "weight" must be lb 0-2000 (0 = bodyweight) or null')
                    if not isinstance(rp, int) or isinstance(rp, bool) or not 1 <= rp <= 100: errors.append(f'{w}.sets[{n}]: "reps" must be an integer 1-100')
                    for k in st:
                        if k not in {'weight', 'reps'}: warns.append(f'{w}.sets[{n}]: unknown key "{k}" (ignored)')
                note = p.get('note')
                if note is not None and (not isinstance(note, str) or len(note) > 300): errors.append(f'{w}: "note" must be a string up to 300 chars')
                up = p.get('updated')
                if up is None: warns.append(f'{w}: no "updated" date; the app cannot tell when it has been done and will keep showing it')
                elif not isinstance(up, str) or not re.fullmatch(r'\d{4}-\d\d-\d\d', up): errors.append(f'{w}: "updated" must be "YYYY-MM-DD"')
                ph = p.get('phase')
                if ph is not None and ph not in PHASES: errors.append(f'{w}: "phase" must be bulk or cut')
                if data_ids is not None and key not in all_ids:
                    nm = (p.get('name') or key).strip().lower()
                    if nm in names: warns.append(f'{w}: not an exercise id; matched by name')
                    else: errors.append(f'{w}: no exercise with this id (or name) in the synced data; the app will skip it')

    phases = plan.get('phases')
    count = 0
    if not isinstance(phases, dict) or not phases:
        errors.append('"phases" must be a non-empty object')
        phases = {}
    for ph, groups in phases.items():
        if ph not in PHASES: errors.append(f'phases.{ph}: unknown phase (use bulk or cut)'); continue
        if not isinstance(groups, dict): errors.append(f'phases.{ph} must be an object'); continue
        for g, focuses in groups.items():
            if g not in FOCUSES: errors.append(f'{ph}.{g}: unknown body group (use {", ".join(FOCUSES)})'); continue
            if not isinstance(focuses, dict): errors.append(f'{ph}.{g} must be an object'); continue
            for f, items in focuses.items():
                where = f'{ph}.{g}.{f}'
                if f not in FOCUSES[g]: errors.append(f'{where}: unknown focus (use {", ".join(sorted(FOCUSES[g]))})'); continue
                if not isinstance(items, list): errors.append(f'{where} must be a list'); continue
                if not items: warns.append(f'{where} is empty (that focus will show no exercises)')
                seen = set()
                for n, it in enumerate(items, 1):
                    w = f'{where}[{n}]'
                    if not isinstance(it, dict): errors.append(f'{w} must be an object'); continue
                    count += 1
                    for k in it:
                        if k not in ALLOWED_KEYS: warns.append(f'{w}: unknown key "{k}" (ignored)')
                    name, eid = it.get('name'), it.get('id')
                    if not (isinstance(name, str) and name.strip()) and not (isinstance(eid, str) and eid):
                        errors.append(f'{w}: needs "name" or "id"')
                    if name is not None and (not isinstance(name, str) or len(name) > 60): errors.append(f'{w}: "name" must be a string up to 60 chars')
                    if eid is not None and data_ids is not None and eid not in data_ids[g]:
                        (warns if name else errors).append(f'{w}: id "{eid}" not found in {g} exercises of the synced data' + (' (will fall back to name)' if name else ''))
                    key = (eid or '').lower() or (name or '').strip().lower()
                    if key in seen: warns.append(f'{w}: duplicate exercise in this focus (later copy ignored)')
                    seen.add(key)
                    s = it.get('sets')
                    if not isinstance(s, int) or isinstance(s, bool) or not 1 <= s <= 20: errors.append(f'{w}: "sets" must be an integer 1-20')
                    r = it.get('reps')
                    if not (isinstance(r, list) and len(r) == 2 and all(isinstance(x, int) and not isinstance(x, bool) and 1 <= x <= 100 for x in r) and r[0] <= r[1]):
                        errors.append(f'{w}: "reps" must be [min, max] integers 1-100 with min <= max')
                    rest = it.get('rest')
                    if rest is not None and (not isinstance(rest, int) or isinstance(rest, bool) or not 0 <= rest <= 900): errors.append(f'{w}: "rest" must be seconds 0-900')
                    if 'arm' in it and (not isinstance(it['arm'], bool) or g not in ARM_HOSTS): errors.append(f'{w}: "arm" must be true/false and only on back/chest entries')
                    notes = it.get('notes')
                    if notes is not None and (not isinstance(notes, str) or len(notes) > 400): errors.append(f'{w}: "notes" must be a string up to 400 chars')

    if not no_prev and isinstance(v, int):
        prev = None
        try:
            if prev_path:
                with open(prev_path) as f: prev = json.load(f)
            else:
                subprocess.run(['git', 'fetch', '-q', 'origin', 'main'], check=False, capture_output=True)
                out = subprocess.run(['git', 'show', 'origin/main:plan.json'], capture_output=True, text=True)
                if out.returncode == 0: prev = json.loads(out.stdout)
        except Exception as e:
            warns.append(f'could not read the published plan to compare versions: {e}')
        if prev is not None:
            pv = prev.get('version', 0)
            if v <= pv: errors.append(f'"version" is {v} but the published plan is {pv}. Bump it to {pv + 1} or the app will ignore the update.')
            else: print(f'version {pv} -> {v}')

    for w in warns: print('WARN :', w)
    for e in errors: print('ERROR:', e)
    if errors:
        print(f'\nFAILED: {len(errors)} error(s). Do not push.')
        return 1
    print(f'OK: plan v{v}, {count} exercise entries, {rx_count} prescriptions. Safe to push.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
