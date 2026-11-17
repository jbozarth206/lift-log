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
        if k not in {'schema', 'version', 'updatedAt', 'message', 'phases', 'nutrition', 'options', 'prescriptions'}: warns.append(f'unknown top-level key "{k}" (ignored by the app)')
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
