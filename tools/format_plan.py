#!/usr/bin/env python3
"""Rewrite plan.json in the canonical layout (one exercise per line). Usage: python3 tools/format_plan.py [plan.json]"""
import json, sys

def fmt(plan):
    out = ['{']
    top = [k for k in plan if k != 'phases']
    for k in top:
        out.append(f'  {json.dumps(k)}: {json.dumps(plan[k], ensure_ascii=False)},')
    out.append('  "phases": {')
    phases = list(plan.get('phases', {}).items())
    for pi, (ph, groups) in enumerate(phases):
        out.append(f'    {json.dumps(ph)}: {{')
        gl = list(groups.items())
        for gi, (g, focuses) in enumerate(gl):
            out.append(f'      {json.dumps(g)}: {{')
            fl = list(focuses.items())
            for fi, (f, items) in enumerate(fl):
                out.append(f'        {json.dumps(f)}: [')
                for ii, it in enumerate(items):
                    out.append('          ' + json.dumps(it, ensure_ascii=False) + (',' if ii < len(items) - 1 else ''))
                out.append('        ]' + (',' if fi < len(fl) - 1 else ''))
            out.append('      }' + (',' if gi < len(gl) - 1 else ''))
        out.append('    }' + (',' if pi < len(phases) - 1 else ''))
    out.append('  }')
    out.append('}')
    return '\n'.join(out) + '\n'

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'plan.json'
    with open(path) as f:
        plan = json.load(f)
    text = fmt(plan)
    assert json.loads(text) == plan
    with open(path, 'w') as f:
        f.write(text)
    print(f'formatted {path}')
