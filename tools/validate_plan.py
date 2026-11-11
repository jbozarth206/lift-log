#!/usr/bin/env python3
"""Validate Lift Log's coach plan before publishing.

Usage:
  python3 tools/validate_plan.py [plan.json] [--data liftlog.json] [--prev old_plan.json | --no-prev]

Checks:
  - valid JSON and matches PLAN_SCHEMA.md (schema 1)
  - version is an integer and is HIGHER than the published one
    (compares with `git show origin/main:plan.json` unless --prev/--no-prev is given)
  - every exercise has a name or id, sets 1-20, reps [min, max] 1-100, rest 0-900 s
  - with --data: every "id" exists in that body group in the user's synced data
Exit code 0 = OK to push, 1 = fix the errors first.
"""
import json, subprocess, sys

PHASES = {'bulk', 'cut'}
FOCUSES = {
    'back': {'upper', 'mid', 'lower', 'all'},
    'chest': {'upper', 'mid', 'lower', 'all'},
    'legs': {'quads', 'hamstrings', 'glutes', 'calves', 'all'},
    'shoulders': {'front', 'side', 'rear', 'all'},
}
ALLOWED_KEYS = {'id', 'name', 'sets', 'reps', 'rest', 'notes'}


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
        if k not in {'schema', 'version', 'updatedAt', 'message', 'phases'}: warns.append(f'unknown top-level key "{k}" (ignored by the app)')

    data_ids = None
    if data_path:
        with open(data_path) as f:
            data = json.load(f)
        data_ids = {g: {e['id']: e['name'] for e in data.get('exercises', {}).get(g, [])} for g in FOCUSES}

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
    print(f'OK: plan v{v}, {count} exercise entries. Safe to push.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
