#!/usr/bin/env node
/** Confirm every plan.json and built-in exercise resolves to a real demo file. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {globalThis: {}, window: undefined, console};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/demos/catalog.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'demos.js'), 'utf8'), ctx);

const resolve = ctx.resolveDemo;
const clashes = ctx.DEMO_CLASHES || [];
if (clashes.length) {
  console.error('ALIAS CLASHES\n' + clashes.join('\n'));
  process.exit(1);
}

const plan = JSON.parse(fs.readFileSync(path.join(root, 'plan.json'), 'utf8'));
const names = new Set();
for (const groups of Object.values(plan.phases || {})) {
  for (const focuses of Object.values(groups || {})) {
    if (!focuses || typeof focuses !== 'object') continue;
    for (const items of Object.values(focuses)) {
      if (!Array.isArray(items)) continue;
      for (const it of items) if (it && it.name) names.add(String(it.name).trim());
    }
  }
}
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const block = app.split('const PLAN_DEFS')[1].split('const V1_NAMES')[0];
for (const m of block.matchAll(/'((?:arms:)?[^'|]+)\|/g)) {
  const n = m[1].startsWith('arms:') ? m[1].slice(5) : m[1];
  names.add(n);
}

let missing = 0;
const seen = new Map();
for (const name of [...names].sort()) {
  const demo = resolve(name);
  if (!demo || !demo.frames || !demo.frames.length) {
    console.error('NO DEMO', name);
    missing++;
    continue;
  }
  for (const rel of demo.frames) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file) || fs.statSync(file).size < 500) {
      console.error('MISSING FILE', name, rel);
      missing++;
    }
  }
  seen.set(name, demo.id);
}
const expect = {
  'Incline Dumbbell Press': 'incline-db-press',
  'Incline DB Bench Press': 'incline-db-press',
  'Pullups': 'pull-up',
  'Lat Pull Down': 'lat-pulldown',
  'EZ Bar Curl': 'ez-bar-curl',
  'Barbell Back Squat': 'back-squat',
  'OHP': 'overhead-press',
  'RDL': 'romanian-deadlift',
  'One-Arm Dumbbell Row': 'single-arm-db-row',
  'Lying Leg Curl': 'leg-curl',
  'Military Press': 'overhead-press',
  'Cable Crossover': 'cable-fly',
  'Machine Dips': 'machine-dip',
  'Walking Lunges': 'walking-lunge',
  'Hyperextensions': 'back-extension',
  'Close Grip Bench': 'close-grip-bench-press',
  'Wide-Grip Seated Cable Row': 'wide-grip-seated-row',
  'Decline Dumbbell Press': 'decline-db-press',
  'Seated Leg Curl': 'seated-leg-curl',
  'Seated Calf Raise': 'seated-calf-raise',
  'Calf Raise': 'calf-raise',
  'High-to-Low Cable Fly': 'high-to-low-cable-fly',
  'Low-to-High Cable Fly': 'low-to-high-cable-fly',
  'DB Bench Press': 'db-bench-press'
};
for (const [name, id] of Object.entries(expect)) {
  const demo = resolve(name);
  if (!demo || demo.id !== id) {
    console.error('BAD MATCH', name, '→', demo && demo.id, 'expected', id);
    missing++;
  }
}
if (resolve('Not A Real Lift XYZ')) {
  console.error('unknown name should not match');
  missing++;
}
const pinned = resolve('Whatever', 'incline-db-press');
if (!pinned || pinned.id !== 'incline-db-press') {
  console.error('explicit slug failed');
  missing++;
}
const url = resolve('Nope', 'https://cdn.example.com/curl.webp');
if (!url || !url.external || url.frames[0] !== 'https://cdn.example.com/curl.webp') {
  console.error('explicit https failed', url);
  missing++;
}
if (resolve('Nope', 'javascript:alert(1)') || resolve('Nope', '../secret.webp')) {
  console.error('unsafe demo accepted');
  missing++;
}
const files = fs.readdirSync(path.join(root, 'assets/demos')).filter(f => f.endsWith('.webp'));
let bytes = 0;
for (const f of files) bytes += fs.statSync(path.join(root, 'assets/demos', f)).size;
console.log(`${names.size} exercises, ${files.length} frames, ${(bytes / 1024).toFixed(0)} KB`);
if (missing) {
  console.error(`FAILED ${missing}`);
  process.exit(1);
}
console.log('OK demos');
