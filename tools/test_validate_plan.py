#!/usr/bin/env python3
"""Schema checks for the optional exercise demo field. Does not touch plan.json."""
import json, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALID = ROOT / 'tools' / 'validate_plan.py'
base = json.loads((ROOT / 'plan.json').read_text())


def run(plan):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(plan, f)
        name = f.name
    out = subprocess.run([sys.executable, str(VALID), name, '--no-prev'], capture_output=True, text=True)
    return out.returncode, out.stdout + out.stderr


def first_exercise(plan):
    for groups in plan['phases'].values():
        for focuses in groups.values():
            for items in focuses.values():
                if items:
                    return items[0]
    raise SystemExit('no exercise')


ok, text = run(base)
if ok != 0:
    print(text)
    raise SystemExit('current plan.json should pass with --no-prev')

for demo in ('incline-db-press', 'assets/demos/custom.webp', 'https://cdn.example.com/a.gif'):
    p = json.loads(json.dumps(base))
    first_exercise(p)['demo'] = demo
    code, text = run(p)
    if code != 0:
        print(text)
        raise SystemExit(f'demo {demo!r} should be valid')

for demo in ('javascript:alert(1)', 'http://example.com/a.gif', '../secret.webp', 'https://bad host/a.gif', ''):
    p = json.loads(json.dumps(base))
    first_exercise(p)['demo'] = demo
    code, text = run(p)
    if code == 0:
        raise SystemExit(f'demo {demo!r} should be rejected')

p = json.loads(json.dumps(base))
first_exercise(p)['notes'] = 'Started testosterone last week'
code, text = run(p)
if code == 0 or 'PRIVACY' not in text:
    print(text)
    raise SystemExit('PRIVACY check regressed')

print('OK validate demo field')
