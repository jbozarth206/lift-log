'use strict';
/* Form demos: catalog (assets/demos/catalog.js) + name/alias matching.
   Frames are start → peak stills. The card and the sheet crossfade them
   so the lift reads as motion, including on iOS Safari. */

const DEMO_SAFE_EXTRA = new Set(['barbell', 'dumbbell', 'machine', 'ezbar', 'bilateral', 'bench', 'bar', 'free', 'weight', 'weights', 'shoulder', 'biceps', 'tricep', 'triceps']);

function normDemoName(s) {
  let x = String(s || '').toLowerCase();
  const reps = [
    [/dumbbells?/g, 'dumbbell'],
    [/\bdbs?\b/g, 'dumbbell'],
    [/barbells?/g, 'barbell'],
    [/\bbb\b/g, 'barbell'],
    [/ez[\s-]?bar/g, 'ezbar'],
    [/pull[\s-]?ups?/g, 'pullup'],
    [/push[\s-]?ups?/g, 'pushup'],
    [/chin[\s-]?ups?/g, 'chinup'],
    [/pulldowns?/g, 'pulldown'],
    [/pushdowns?/g, 'pushdown'],
    [/\bt[\s-]?bar\b/g, 'tbar'],
    [/flyes|flies/g, 'fly'],
    [/raises/g, 'raise'],
    [/curls/g, 'curl'],
    [/presses/g, 'press'],
    [/\brows\b/g, 'row'],
    [/extensions/g, 'extension'],
    [/lunges/g, 'lunge'],
    [/squats/g, 'squat'],
    [/\bdips\b/g, 'dip'],
    [/shrugs/g, 'shrug'],
    [/kickbacks/g, 'kickback'],
    [/thrusts/g, 'thrust'],
    [/deadlifts/g, 'deadlift'],
    [/one[\s-]?arm/g, 'singlearm'],
    [/single[\s-]?arm/g, 'singlearm'],
    [/one[\s-]?leg/g, 'singleleg'],
    [/single[\s-]?leg/g, 'singleleg'],
    [/wide[\s-]?grip/g, 'widegrip'],
    [/close[\s-]?grip/g, 'closegrip'],
    [/chest[\s-]?supported/g, 'chestsupported'],
    [/straight[\s-]?arm/g, 'straightarm'],
    [/rear[\s-]?delts?/g, 'reardelt'],
    [/low[\s-]?to[\s-]?high/g, 'lowtohigh'],
    [/high[\s-]?to[\s-]?low/g, 'hightolow'],
    [/pec[\s-]?(?:deck|dec)/g, 'pecdeck'],
    [/\brdls?\b/g, 'romanian deadlift'],
    [/\bohp\b/g, 'overhead press'],
    [/seated|sitting/g, 'seated'],
    [/[^a-z0-9]+/g, ' ']
  ];
  for (const [a, b] of reps) x = x.replace(a, b);
  const stop = new Set(['the', 'a', 'an', 'with', 'using', 'on', 'of', 'and', 'for']);
  const tokens = x.split(/\s+/).filter(t => t && !stop.has(t));
  tokens.sort();
  return tokens.join(' ');
}

const DEMO_ALIAS = {};
const DEMO_CLASHES = [];
(function indexDemos() {
  const items = (typeof DEMO_CATALOG !== 'undefined' && DEMO_CATALOG.items) || {};
  for (const item of Object.values(items)) {
    const names = [item.id, item.name].concat(item.aliases || []);
    for (const n of names) {
      const key = normDemoName(n);
      if (!key) continue;
      const prev = DEMO_ALIAS[key];
      if (prev && prev.id !== item.id) DEMO_CLASHES.push(key + ' → ' + prev.id + ' / ' + item.id);
      else DEMO_ALIAS[key] = item;
    }
  }
})();

function safeDemoSrc(url) {
  const s = String(url || '').trim();
  if (!s || s.length > 300 || /[\s"'<>]/.test(s) || s.includes('..') || s.includes('\\')) return '';
  if (/^https:\/\//i.test(s)) return s;
  if (/^(?:\.\/)?assets\/demos\/[a-z0-9][a-z0-9.-]*\.(?:webp|gif|png|jpe?g|avif)$/i.test(s)) return s;
  if (/^(?:\.\/)?[a-z0-9][a-z0-9._/-]*\.(?:webp|gif|png|jpe?g|avif)$/i.test(s)) return s;
  return '';
}

function demoByExplicit(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const items = (DEMO_CATALOG && DEMO_CATALOG.items) || {};
  const slug = s.toLowerCase();
  if (items[slug]) return items[slug];
  const key = normDemoName(s);
  if (key && DEMO_ALIAS[key]) return DEMO_ALIAS[key];
  const src = safeDemoSrc(s);
  if (!src) return null;
  return {id: 'custom', name: '', muscles: [], equipment: '', cues: [], note: '', frames: [src], external: true};
}

/** Resolve a demo for an exercise name. `explicit` is an optional plan `demo` slug, relative path, or https URL. */
function resolveDemo(name, explicit) {
  const forced = demoByExplicit(explicit);
  if (forced) return forced;
  const key = normDemoName(name);
  if (!key) return null;
  if (DEMO_ALIAS[key]) return DEMO_ALIAS[key];
  const qt = key.split(' ');
  const hits = [];
  for (const alias in DEMO_ALIAS) {
    const at = alias.split(' ');
    if (at.length < 2) continue;
    if (!at.every(t => qt.includes(t))) continue;
    const extra = qt.filter(t => !at.includes(t));
    if (extra.length && extra.every(t => DEMO_SAFE_EXTRA.has(t))) hits.push(DEMO_ALIAS[alias]);
  }
  const ids = [...new Set(hits.map(d => d.id))];
  return ids.length === 1 ? hits.find(d => d.id === ids[0]) : null;
}

function demoAttr(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

const DEMO_FALLBACK = '<span class="demo-fallback" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M18 56l7-16 6 8 7-20 8 28" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

/** One image that steps between the start and peak pose. A second stacked
    frame with an opacity animation painted black on some WebPs. */
function demoVisualHtml(demo) {
  const frames = demo && Array.isArray(demo.frames) ? demo.frames.map(safeDemoSrc).filter(Boolean) : [];
  if (!frames.length) return DEMO_FALLBACK;
  const start = frames[0];
  const peak = frames.length > 1 ? frames[frames.length - 1] : '';
  return `<span class="demo-visual${peak ? ' can-play' : ''}"${peak ? ` data-peak="${demoAttr(peak)}"` : ''}>` +
    `<img class="demo-img" alt="" src="${demoAttr(start)}" draggable="false" decoding="async">` +
    `</span>`;
}

function setDemoPlaying(el, on) {
  if (!el) return;
  if (el._timer) { clearInterval(el._timer); el._timer = null; }
  el.classList.toggle('is-playing', !!on);
  if (on && el._tick) el._timer = setInterval(el._tick, 900);
}
function stepDemo(el) {
  setDemoPlaying(el, false);
  if (el && el._tick) el._tick();
}
function stopDemoMotion(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('.demo-visual').forEach(el => setDemoPlaying(el, false));
}
function armDemoMotion(root) {
  if (!root) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('.demo-visual').forEach(el => {
    const img = el.querySelector('img.demo-img');
    if (img && !img.dataset.guard) {
      img.dataset.guard = '1';
      img.addEventListener('error', () => {
        if (el.dataset.broke) return;
        el.dataset.broke = '1';
        setDemoPlaying(el, false);
        el.classList.remove('can-play');
        el.innerHTML = DEMO_FALLBACK;
      });
    }
    if (!el.classList.contains('can-play') || el._tick || !img) return;
    const start = img.getAttribute('src');
    const peak = el.dataset.peak;
    if (!start || !peak) return;
    el._at = 'start';
    el._tick = () => {
      el._at = el._at === 'peak' ? 'start' : 'peak';
      img.src = el._at === 'peak' ? peak : start;
    };
    if (!reduce) setDemoPlaying(el, true);
  });
}

if (typeof globalThis !== 'undefined') {
  globalThis.normDemoName = normDemoName;
  globalThis.resolveDemo = resolveDemo;
  globalThis.DEMO_ALIAS = DEMO_ALIAS;
  globalThis.DEMO_CLASHES = DEMO_CLASHES;
  globalThis.armDemoMotion = armDemoMotion;
  globalThis.stopDemoMotion = stopDemoMotion;
  globalThis.setDemoPlaying = setDemoPlaying;
  globalThis.stepDemo = stepDemo;
}
