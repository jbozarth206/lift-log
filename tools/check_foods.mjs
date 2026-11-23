#!/usr/bin/env node
/** Lightweight checks for the bundled common-foods library. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {globalThis: {}, window: {}, console};
ctx.globalThis = ctx;
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'foods-data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'foods.js'), 'utf8'), ctx);

const foods = ctx.FOOD_DB;
const fail = msg => { console.error(msg); process.exitCode = 1; };
if (!Array.isArray(foods) || foods.length < 250) fail(`expected at least 250 foods, got ${foods && foods.length}`);

const ids = new Set();
const cats = new Set(['pizza', 'fast-food', 'mexican', 'sandwich', 'grocery', 'snack', 'drink', 'gym']);
const banned = /testosterone|trenbolone|nandrolone|masteron|hematocrit|estradiol|anastrozole|bloodwork/i;
for (const f of foods) {
  if (!f || typeof f.id !== 'string' || !f.id) { fail('missing id'); continue; }
  if (ids.has(f.id)) fail('duplicate id ' + f.id);
  ids.add(f.id);
  if (typeof f.name !== 'string' || f.name.length < 2 || f.name.length > 120) fail('bad name ' + f.id);
  if (typeof f.srv !== 'string' || !f.srv.trim()) fail('bad serving ' + f.id);
  if (!cats.has(f.cat)) fail('bad cat ' + f.id + ' ' + f.cat);
  for (const k of ['p', 'c', 'f', 'kcal']) {
    if (typeof f[k] !== 'number' || !Number.isFinite(f[k]) || f[k] < 0) fail(`bad ${k} on ${f.id}`);
  }
  if (f.g != null && (typeof f.g !== 'number' || !(f.g > 0) || f.g > 2000)) fail('bad grams ' + f.id);
  if (f.a != null && (typeof f.a !== 'number' || f.a < 0)) fail('bad alcohol ' + f.id);
  if (banned.test(f.name) || banned.test(f.aka || '') || banned.test(f.src || '')) fail('privacy term in ' + f.id);
  const exp = 4 * f.p + 4 * f.c + 9 * f.f + 7 * (f.a || 0);
  const diff = Math.abs(f.kcal - exp);
  if (diff > Math.max(30, 0.22 * Math.max(f.kcal, exp, 1))) fail(`${f.name}: kcal ${f.kcal} vs 4/4/9 ${exp.toFixed(0)}`);
}

const pep = ctx.foodSearch('pepperoni pizza').slice(0, 8);
if (pep.length < 5 || pep.some(f => !/pepperoni/i.test(f.name) || !/pizza/i.test(f.name))) fail('pepperoni pizza search failed');
if (!pep.some(f => /slice/i.test(f.srv) && /14"/.test(f.srv))) fail('pepperoni pizza should offer a 14" slice');
const typo = ctx.foodSearch('peperoni pizza');
if (!typo.length || !/pepperoni pizza/i.test(typo[0].name)) fail('fuzzy pepperoni search failed');
const cfa = ctx.foodSearch('cfa');
if (!cfa.some(f => /chick-fil-a/i.test(f.name) && /sandwich/i.test(f.name))) fail('Chick-fil-A alias search failed');
if (!ctx.foodSearch('chipotle chicken').some(f => /chipotle chicken/i.test(f.name))) fail('chipotle chicken missing');
if (!ctx.foodSearch('subway').some(f => /subway/i.test(f.name))) fail('subway missing');
if (!ctx.foodSearch('whey').some(f => /whey/i.test(f.name))) fail('whey missing');

const sample = pep[0];
const doubled = ctx.foodScale(sample, 2);
if (doubled.kcal !== Math.round(sample.kcal * 2) || Math.abs(doubled.p - Math.round(sample.p * 2 * 10) / 10) > 0.05) fail('foodScale failed');
if (ctx.foodQty(sample, 1) !== sample.srv) fail('foodQty 1');
if (!ctx.foodQty(sample, 1.5).startsWith('1.5 × ')) fail('foodQty 1.5');
if (ctx.foodSearch('zzzz-not-a-food').length) fail('nonsense query should be empty');

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!sw.includes("'liftlog-v8-4'")) fail('service worker cache should be liftlog-v8-4');
if (!sw.includes('./foods-data.js') || !sw.includes('./foods.js')) fail('food library is not precached');
if (!html.includes('foods-data.js') || !html.includes('foods.js')) fail('index.html does not load the food library');

if (process.exitCode) process.exit(process.exitCode);
console.log(`OK foods ${foods.length}`);
