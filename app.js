'use strict';
/* ---------- Data ---------- */
const STORE_KEY = 'liftlog.v1';
const GROUPS = [
  {id:'back', name:'Back', color:'#4f8cff', icon:'<path d="M12 3v18M7 6c-2 3-3 7-2 12M17 6c2 3 3 7 2 12M8 10h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'},
  {id:'chest', name:'Chest', color:'#ff6b35', icon:'<path d="M4 8c2-2 6-2 8 0 2-2 6-2 8 0v5c0 3-3 5-8 5s-8-2-8-5V8zM12 8v10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'},
  {id:'legs', name:'Legs', color:'#3ddc97', icon:'<path d="M9 3l-1 8 2 10M15 3l1 8-2 10M8 11h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'},
  {id:'shoulders', name:'Shoulders', color:'#b77dff', icon:'<circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 19c0-4 2-7 4-8h8c2 1 4 4 4 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'},
  {id:'arms', name:'Arms', color:'#ffc145', icon:'<path d="M5 18c1-5 3-8 6-10l2-3 3 1-1 4c2 1 3 3 3 5 0 2-2 4-5 4H8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>'}
];
const ARM_HOSTS = ['back', 'chest']; // groups that get arm finishers (biceps on back, triceps on chest)
const APP_VERSION = '7.2';
const SEED_PLAN_VERSION = 1; // plan.json v1 == built-in defaults
const PHASE_DAYS = 28;
const PHASES = {
  bulk: {id:'bulk', name:'Bulking', short:'Bulk', color:'#ff6b35', icon:'💪',
    tagline:'Build strength & size', points:['Heavy compounds, 4–5 sets × 4–8 reps','Longer rest: 2–4 min','Add weight when you hit the top of the range'],
    fallback:[4, 6, 8, 150]},
  cut: {id:'cut', name:'Cutting', short:'Cut', color:'#2ec4ff', icon:'🔥',
    tagline:'Lean out, keep muscle', points:['3–4 sets × 10–15 reps, more machines & isolation','Short rest: 45–75 s','Superset isolation moves to keep the pace up'],
    fallback:[3, 10, 15, 60]}
};
const FOCUS_META = {
  back: [{id:'upper', name:'Upper', desc:'Lats, traps & rear delts'}, {id:'mid', name:'Mid', desc:'Rhomboids & mid-traps · rows'}, {id:'lower', name:'Lower', desc:'Erectors & posterior chain'}],
  chest: [{id:'upper', name:'Upper', desc:'Upper chest · incline work'}, {id:'mid', name:'Mid', desc:'Flat pressing & flyes'}, {id:'lower', name:'Lower', desc:'Decline pressing & dips'}],
  legs: [{id:'quads', name:'Quads', desc:'Squats, presses & extensions'}, {id:'hamstrings', name:'Hamstrings', desc:'Hinges & curls'}, {id:'glutes', name:'Glutes', desc:'Thrusts, split squats & abduction'}, {id:'calves', name:'Calves', desc:'Standing & seated raises'}],
  shoulders: [{id:'front', name:'Front', desc:'Front delts · pressing'}, {id:'side', name:'Side', desc:'Side delts · width'}, {id:'rear', name:'Rear', desc:'Rear delts & upper back'}],
  arms: [{id:'biceps', name:'Biceps', desc:'Curls · all angles'}, {id:'triceps', name:'Triceps', desc:'Pressing & extensions'}, {id:'forearms', name:'Forearms', desc:'Grip, wrist & brachioradialis'}]
};
/* Default plans: 'Name|sets|minReps|maxReps|restSeconds' per phase -> group -> focus */
const PLAN_DEFS = {
  bulk: {
    back: {upper:['Pull-Up|4|5|8|180','Lat Pulldown|4|6|8|150','Wide-Grip Seated Row|4|6|8|150','Barbell Shrug|4|6|8|120','Rear Delt Fly|3|10|12|90','arms:Barbell Curl|3|6|8|90','arms:Hammer Curl|3|8|10|75'],
      mid:['Barbell Row|5|5|8|180','Chest-Supported T-Bar Row|4|6|8|150','Seated Cable Row|4|6|8|120','Single-Arm DB Row|4|6|8|120','arms:Preacher Curl|3|8|10|75','arms:Hammer Curl|3|8|10|75'],
      lower:['Deadlift|5|3|5|240','Rack Pull|4|4|6|180','Good Morning|4|6|8|150','Back Extension|3|8|10|90','arms:Barbell Curl|3|6|8|90','arms:Reverse Curl|3|8|10|75']},
    chest: {upper:['Incline Bench Press|5|4|6|180','Incline DB Press|4|6|8|150','Landmine Press|3|6|8|120','Incline Machine Press|3|6|8|120','arms:Close-Grip Bench Press|3|6|8|120','arms:Overhead Cable Extension|3|8|10|75'],
      mid:['Bench Press|5|4|6|180','DB Bench Press|4|6|8|150','Machine Chest Press|3|6|8|120','Cable Fly|3|8|10|90','arms:Skull Crusher|3|6|8|90','arms:Rope Pushdown|3|8|10|75'],
      lower:['Decline Bench Press|5|4|6|180','Dips|4|6|8|150','Decline DB Press|4|6|8|120','Bench Press|3|5|6|180','arms:Skull Crusher|3|8|10|90','arms:Rope Pushdown|3|8|10|75']},
    legs: {quads:['Back Squat|5|4|6|240','Hack Squat|4|6|8|180','Leg Press|4|6|8|150','Bulgarian Split Squat|3|6|8|120'],
      hamstrings:['Romanian Deadlift|4|5|8|180','Good Morning|4|6|8|150','Leg Curl|4|6|8|90','Nordic Curl|3|4|6|120'],
      glutes:['Hip Thrust|5|5|8|150','Bulgarian Split Squat|4|6|8|120','Romanian Deadlift|4|6|8|150','Walking Lunge|3|8|10|90'],
      calves:['Calf Raise|5|6|10|90','Seated Calf Raise|4|8|10|90','Leg Press Calf Raise|4|8|12|90']},
    shoulders: {front:['Overhead Press|5|4|6|180','Seated DB Press|4|6|8|150','Arnold Press|3|6|8|120','Front Raise|3|8|10|90'],
      side:['Seated DB Press|4|6|8|150','Upright Row|4|6|8|120','Lateral Raise|4|8|12|90','Cable Lateral Raise|3|8|12|90'],
      rear:['Rear Delt Fly|4|8|12|90','Face Pull|4|8|12|90','Reverse Pec Deck|3|8|12|90','DB Shrug|4|6|8|120']},
    arms: {biceps:['Barbell Curl|4|6|8|120','Incline DB Curl|3|8|10|90','Preacher Curl|3|8|10|90','Hammer Curl|3|8|10|90'],
      triceps:['Close-Grip Bench Press|4|5|8|150','Skull Crusher|3|6|8|120','Overhead Cable Extension|3|8|10|90','Rope Pushdown|3|8|10|90'],
      forearms:['Reverse Curl|3|8|10|75','Wrist Curl|3|10|12|60','Reverse Wrist Curl|3|10|12|60','Hammer Curl|3|8|10|75']}
  },
  cut: {
    back: {upper:['Lat Pulldown|4|10|12|75','Wide-Grip Seated Row|3|12|15|60','Straight-Arm Pulldown|3|12|15|45','Rear Delt Fly|3|15|20|45','Face Pull|3|15|20|45','arms:Cable Curl|3|12|15|45','arms:Hammer Curl|3|12|15|45'],
      mid:['Seated Cable Row|4|10|12|75','Single-Arm DB Row|3|10|12|60','Chest-Supported T-Bar Row|3|10|12|75','Machine Row|3|12|15|60','Straight-Arm Pulldown|3|12|15|45','arms:EZ-Bar Curl|3|10|12|60','arms:Concentration Curl|3|12|15|45'],
      lower:['Back Extension|4|12|15|60','Good Morning|3|10|12|75','Rack Pull|3|8|10|90','Reverse Hyper|3|12|15|60','Seated Cable Row|3|12|15|60','arms:Cable Curl|3|12|15|45','arms:Reverse Curl|3|12|15|45']},
    chest: {upper:['Incline DB Press|4|10|12|75','Incline Machine Press|3|12|15|60','Low-to-High Cable Fly|3|15|20|45','Landmine Press|3|12|15|60','arms:Rope Pushdown|3|12|15|45','arms:Overhead Cable Extension|3|12|15|45'],
      mid:['Machine Chest Press|4|10|12|75','DB Bench Press|3|10|12|75','Pec Deck|3|15|20|45','Cable Fly|3|15|20|45','Push-Up|3|15|20|45','arms:Rope Pushdown|3|12|15|45','arms:Bench Dip|3|12|15|45'],
      lower:['Dips|4|10|15|60','Decline DB Press|3|10|12|75','High-to-Low Cable Fly|3|15|20|45','Machine Chest Press|3|12|15|60','arms:Skull Crusher|3|10|12|60','arms:Overhead Cable Extension|3|12|15|45']},
    legs: {quads:['Leg Press|4|12|15|75','Hack Squat|3|10|12|90','Leg Extension|4|15|20|45','Walking Lunge|3|12|15|60','Goblet Squat|3|12|15|60'],
      hamstrings:['Leg Curl|4|12|15|45','Seated Leg Curl|3|12|15|45','Romanian Deadlift|3|10|12|75','Nordic Curl|3|6|10|60'],
      glutes:['Hip Thrust|4|10|15|60','Cable Kickback|3|15|20|45','Hip Abduction|3|15|20|45','Walking Lunge|3|12|15|60','Bulgarian Split Squat|3|10|12|60'],
      calves:['Calf Raise|4|15|20|45','Seated Calf Raise|4|15|20|45','Single-Leg Calf Raise|3|12|15|30','Leg Press Calf Raise|3|15|20|45']},
    shoulders: {front:['Seated DB Press|4|10|12|75','Arnold Press|3|10|12|60','Machine Shoulder Press|3|12|15|60','Front Raise|3|12|15|45'],
      side:['Lateral Raise|4|15|20|45','Cable Lateral Raise|3|12|15|45','Machine Lateral Raise|3|15|20|45','Upright Row|3|12|15|60'],
      rear:['Reverse Pec Deck|4|15|20|45','Face Pull|3|15|20|45','Rear Delt Cable Fly|3|15|20|45','Rear Delt Fly|3|15|20|45','DB Shrug|3|12|15|45']},
    arms: {biceps:['EZ-Bar Curl|3|10|12|60','Cable Curl|3|12|15|45','Hammer Curl|3|12|15|45','Concentration Curl|3|12|15|45'],
      triceps:['Rope Pushdown|4|12|15|45','Overhead Cable Extension|3|12|15|45','Skull Crusher|3|10|12|60','Bench Dip|3|12|15|45'],
      forearms:['Wrist Curl|3|15|20|45','Reverse Wrist Curl|3|15|20|45','Reverse Curl|3|12|15|45']}
  }
};
/* Exercise names shipped in v1 (a v1 default the user deleted is not re-added during migration) */
const V1_NAMES = {
  back: ['Lat Pulldown','Barbell Row','Seated Cable Row','Pull-Up','Single-Arm DB Row','Rear Delt Fly','Straight-Arm Pulldown'],
  chest: ['Bench Press','Incline DB Press','Machine Chest Press','Cable Fly','Dips','Pec Deck'],
  legs: ['Back Squat','Romanian Deadlift','Leg Press','Leg Curl','Leg Extension','Walking Lunge','Calf Raise'],
  shoulders: ['Overhead Press','Seated DB Press','Lateral Raise','Face Pull','Reverse Pec Deck','Front Raise','DB Shrug']
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const lc = s => String(s).trim().toLowerCase();
const parseDef = d => { const [name, sets, min, max, rest] = d.split('|'); return {name, sets: +sets, min: +min, max: +max, rest: +rest}; };
/* Rest defaults when a plan item has no rest: Bulk compound 165 s, Bulk isolation 90 s, Cut compound 75 s, Cut isolation 60 s */
const COMPOUND_RE = /squat|deadlift|bench|press|\brows?\b|pull-?up|chin-?up|\bdips?\b|thrust|lunge|rack pull|good morning|clean|snatch/i;
const DEFAULT_REST = {bulk: {compound: 165, isolation: 90}, cut: {compound: 75, isolation: 60}};
const isCompound = name => COMPOUND_RE.test(name || '');
const defaultRest = (phase, name) => DEFAULT_REST[phase === 'cut' ? 'cut' : 'bulk'][isCompound(name) ? 'compound' : 'isolation'];
/** fallback targets for an exercise with no plan entry in a phase (custom ones keep their own sets/reps) */
function fallbackItem(phase, ex){
  const [sets, min, max] = PHASES[phase].fallback, rest = defaultRest(phase, ex && ex.name);
  return ex && ex.sets ? {exId: ex.id, sets: ex.sets, min: ex.min, max: ex.max, rest: ex.rest || rest} : {exId: ex.id, sets, min, max, rest};
}
/** Build {focusId: [items], all: [items]} for one phase+group, reusing pool exercises by name. */
function buildPlan(phase, gid, pools, skipNames){
  const plan = {};
  for (const k of [gid, 'arms']) if (!Array.isArray(pools[k])) pools[k] = [];
  const getEx = raw => {
    const cross = raw.startsWith('arms:'), name = cross ? raw.slice(5) : raw, pool = pools[cross ? 'arms' : gid];
    let e = pool.find(x => lc(x.name) === lc(name));
    if (!e) {
      if (!cross && skipNames && skipNames.has(lc(name))) return null;
      e = {id: uid(), name}; pool.push(e);
    }
    return e;
  };
  for (const f of FOCUS_META[gid]) {
    plan[f.id] = [];
    for (const d of PLAN_DEFS[phase][gid][f.id]) {
      const p = parseDef(d), e = getEx(p.name);
      if (e && !plan[f.id].some(i => i.exId === e.id)) plan[f.id].push({exId: e.id, sets: p.sets, min: p.min, max: p.max, rest: p.rest});
    }
  }
  plan.all = [];
  for (const f of FOCUS_META[gid]) for (const it of plan[f.id]) if (!plan.all.some(i => i.exId === it.exId)) plan.all.push({...it});
  return plan;
}
/** pool + (for back/chest) the Arms pool, so arm finishers keep one shared history */
const allowedPool = (d, gid) => ARM_HOSTS.includes(gid) ? d.exercises[gid].concat(d.exercises.arms || []) : d.exercises[gid];
/** append the default arm finishers (from PLAN_DEFS 'arms:' entries) to back/chest focuses, if missing */
function addArmFinishers(d){
  for (const ph of Object.keys(PHASES)) for (const gid of ARM_HOSTS) {
    const plan = d.plans[ph][gid];
    for (const f of FOCUS_META[gid]) {
      if (!Array.isArray(plan[f.id])) plan[f.id] = [];
      for (const def of PLAN_DEFS[ph][gid][f.id].filter(x => x.startsWith('arms:'))) {
        const p = parseDef(def.slice(5));
        let e = d.exercises.arms.find(x => lc(x.name) === lc(p.name));
        if (!e) { e = {id: uid(), name: p.name}; d.exercises.arms.push(e); }
        const it = {exId: e.id, sets: p.sets, min: p.min, max: p.max, rest: p.rest};
        if (!plan[f.id].some(i => i.exId === e.id)) plan[f.id].push({...it});
        if (plan.all && !plan.all.some(i => i.exId === e.id)) plan.all.push({...it});
      }
    }
  }
}
/** make sure every pool exercise appears in each phase's 'All' list */
function syncAll(d){
  for (const ph of Object.keys(PHASES)) for (const g of GROUPS) {
    const plan = d.plans[ph][g.id], ids = new Set(allowedPool(d, g.id).map(x => x.id));
    for (const k of Object.keys(plan)) plan[k] = plan[k].filter(i => ids.has(i.exId));
    for (const e of d.exercises[g.id]) if (!plan.all.some(i => i.exId === e.id)) plan.all.push(fallbackItem(ph, e));
    for (const f of FOCUS_META[g.id]) if (!Array.isArray(plan[f.id])) plan[f.id] = [];
  }
}
const emptyPeds = () => ({compounds: [], doses: [], labs: []});
const DEFAULT_SETTINGS = {restTimer: true, restSound: true, restVolume: 0.8, restOverride: null};
function normSettings(x){
  const o = Object.assign({}, DEFAULT_SETTINGS, x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  o.restTimer = o.restTimer !== false; o.restSound = o.restSound !== false;
  o.restVolume = Number.isFinite(+o.restVolume) ? Math.min(1, Math.max(0, +o.restVolume)) : DEFAULT_SETTINGS.restVolume;
  o.restOverride = Number.isFinite(+o.restOverride) && +o.restOverride >= 15 && +o.restOverride <= 900 && o.restOverride !== null ? Math.round(+o.restOverride) : null;
  return o;
}
const emptyLabs = () => ({source: null, connectedAt: null, lastSync: null, results: [], reports: {}});
function normLabs(l){
  l = Object.assign(emptyLabs(), l && typeof l === 'object' && !Array.isArray(l) ? l : {});
  if (!Array.isArray(l.results)) l.results = [];
  if (!l.reports || typeof l.reports !== 'object') l.reports = {};
  for (const k of ['source', 'connectedAt', 'lastSync']) if (!(k in l)) l[k] = null;
  return l;
}
const emptyFood = () => ({entries: [], favorites: [], targets: {kcal: null, p: null, c: null, f: null}, targetsSource: 'coach'});
function normPeds(p){
  p = p && typeof p === 'object' ? p : {};
  for (const k of ['compounds', 'doses', 'labs']) if (!Array.isArray(p[k])) p[k] = [];
  return p;
}
function normFood(f){
  f = f && typeof f === 'object' ? f : {};
  for (const k of ['entries', 'favorites']) if (!Array.isArray(f[k])) f[k] = [];
  f.targets = Object.assign({kcal: null, p: null, c: null, f: null}, f.targets || {});
  if (!['coach', 'manual'].includes(f.targetsSource)) f.targetsSource = 'coach';
  return f;
}
/** drop arm-finisher items (Arms-pool ids) from a built back/chest plan */
function stripArms(plan, d){
  const armIds = new Set((d.exercises.arms || []).map(x => x.id));
  for (const k of Object.keys(plan)) plan[k] = plan[k].filter(i => !armIds.has(i.exId));
  return plan;
}
function freshDb(){
  const d = {version: 9, exercises: {}, plans: {}, phase: null, coach: {planVersion: SEED_PLAN_VERSION, banner: null}, sessions: [], body: [], profile: {height: null}, peds: emptyPeds(), food: emptyFood(), labs: emptyLabs(), settings: normSettings()};
  for (const g of GROUPS) d.exercises[g.id] = [];
  for (const ph of Object.keys(PHASES)) { d.plans[ph] = {}; for (const g of ['arms', ...GROUPS.map(x => x.id).filter(x => x !== 'arms')]) d.plans[ph][g] = buildPlan(ph, g, d.exercises); }
  return d;
}
/** Upgrade older data in place. Never drops sessions or exercises. */
function migrate(d){
  d.exercises = d.exercises || {};
  for (const g of GROUPS) if (!Array.isArray(d.exercises[g.id])) d.exercises[g.id] = [];
  if (!d.version || d.version < 3 || !d.plans) {
    // v1 defaults the user removed shouldn't come back
    const removed = {};
    for (const g of GROUPS) removed[g.id] = new Set((V1_NAMES[g.id] || []).map(lc).filter(n => !d.exercises[g.id].some(x => lc(x.name) === n)));
    d.plans = {};
    // v3 had no arm finishers; build without them (the v6 step below adds them, like for real v3 data)
    for (const ph of Object.keys(PHASES)) { d.plans[ph] = {}; for (const g of GROUPS) if (g.id !== 'arms') d.plans[ph][g.id] = stripArms(buildPlan(ph, g.id, d.exercises, removed[g.id]), d); }
    delete d.focuses;
    for (const s of d.sessions) { if (!('focus' in s)) s.focus = null; if (!('phase' in s)) s.phase = null; } // unlabeled history
    if (!('phase' in d)) d.phase = null;
    d.version = 3;
  }
  if (d.version < 4) {
    // v3 targets == coach plan v1 seed, so mark it applied (nothing changes on first fetch)
    d.coach = Object.assign({planVersion: SEED_PLAN_VERSION, banner: null}, d.coach || {});
    d.version = 4;
  }
  d.coach = d.coach || {planVersion: SEED_PLAN_VERSION, banner: null};
  if (d.version < 5) {
    // v5: body-metrics log + profile (additive only)
    if (!Array.isArray(d.body)) d.body = [];
    if (!d.profile || typeof d.profile !== 'object') d.profile = {height: null};
    d.version = 5;
  }
  if (!Array.isArray(d.body)) d.body = [];
  if (!d.profile || typeof d.profile !== 'object') d.profile = {height: null};
  if (d.version < 6) {
    // v6: Arms day + arm finishers on back/chest, protocol log, food log (additive only)
    if (!Array.isArray(d.exercises.arms)) d.exercises.arms = [];
    for (const ph of Object.keys(PHASES)) { d.plans[ph] = d.plans[ph] || {}; if (!d.plans[ph].arms) d.plans[ph].arms = buildPlan(ph, 'arms', d.exercises); }
    addArmFinishers(d);
    d.version = 6;
  }
  d.peds = normPeds(d.peds);
  d.food = normFood(d.food);
  if (d.version < 7) {
    // v7: imported MyChart lab results (additive only; peds.labs manual notes stay as they are)
    d.labs = normLabs(d.labs);
    d.version = 7;
  }
  d.labs = normLabs(d.labs);
  if (d.version < 8) {
    // v8 (app 7.1): rest-timer settings only
    d.settings = normSettings(d.settings);
    d.version = 8;
  }
  d.settings = normSettings(d.settings);
  if (d.version < 9) {
    // v9 (app 7.2): Coach set prescriptions arrive via plan.json (db.coach.prescriptions); no stored data changes
    d.version = 9;
  }
  for (const ph of Object.keys(PHASES)) { d.plans[ph] = d.plans[ph] || {}; for (const g of GROUPS) if (!d.plans[ph][g.id]) d.plans[ph][g.id] = buildPlan(ph, g.id, d.exercises); }
  syncAll(d);
  return d;
}
function load(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.exercises && Array.isArray(d.sessions)) {
        if (!d.version || d.version < 9) localStorage.setItem(STORE_KEY + '.backup-v' + (d.version || 1), raw); // safety copy before upgrading
        return migrate(d);
      }
    }
  } catch (e) { console.warn('load failed', e); }
  return freshDb();
}
let db = load();
function persist(){ localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
/** save a user change: persist locally, then (debounced) push to Coach Sync */
function save(){ persist(); try { Sync.markDirty(); } catch (e) { /* sync module not ready yet */ } }
persist();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const parseDate = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const groupOf = id => GROUPS.find(g => g.id === id);
const fmtNum = n => (Math.round(n * 10) / 10).toLocaleString();
function fmtDay(s, long){
  const d = parseDate(s), t = parseDate(todayStr());
  const diff = Math.round((t - d) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, long ? {weekday:'long', month:'short', day:'numeric', year: d.getFullYear() !== t.getFullYear() ? 'numeric' : undefined} : {weekday:'short', month:'short', day:'numeric'});
}
function daysAgo(s){ const n = Math.round((parseDate(todayStr()) - parseDate(s)) / 864e5); return n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`; }
const repsLabel = e => e.min === e.max ? `${e.min}` : `${e.min}–${e.max}`;
const e1rm = (w, r) => r <= 0 || w <= 0 ? 0 : (r === 1 ? w : w * (1 + r / 30));
const validSets = sets => sets.filter(s => s.w > 0 || s.r > 0);
const entryVolume = en => validSets(en.sets).reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0);
const sessionVolume = s => s.entries.reduce((a, en) => a + entryVolume(en), 0);
function findExercise(exId){
  for (const g of GROUPS) { const e = db.exercises[g.id].find(x => x.id === exId); if (e) return {ex: e, group: g.id}; }
  return null;
}
const fk = f => f || '';
/* ----- phase ----- */
const curPhase = () => db.phase && PHASES[db.phase.id] ? db.phase.id : 'bulk';
function phaseDays(){ return db.phase ? Math.round((parseDate(todayStr()) - parseDate(db.phase.start)) / 864e5) : 0; }
const needsPhase = () => !db.phase || !PHASES[db.phase.id] || phaseDays() >= PHASE_DAYS;
function phaseLabel(){
  if (!db.phase) return 'Pick a phase';
  const d = phaseDays();
  return `${PHASES[db.phase.id].short} · week ${Math.min(4, Math.floor(d / 7) + 1)} of 4`;
}
const restLabel = s => !s ? "" : s >= 90 ? (s % 60 ? `${Math.floor(s / 60)}:${pad(s % 60)} min` : `${s / 60} min`) : `${s}s`;
function getSession(date, group, focus, phase){ return db.sessions.find(s => s.date === date && s.group === group && fk(s.focus) === fk(focus) && fk(s.phase) === fk(phase)); }
function focusName(gid, fid, fallback){
  if (!fid) return '';
  if (fid === 'all') return 'All';
  const f = FOCUS_META[gid].find(x => x.id === fid);
  return f ? f.name : (fallback || fid);
}
function sessionLabel(s){ const g = groupOf(s.group), f = focusName(s.group, s.focus, s.focusName); return g.name + (f ? ' · ' + f : ''); }
const phasePill = ph => ph && PHASES[ph] ? `<span class="pill phase" style="--c:${PHASES[ph].color}">${PHASES[ph].short}</span>` : '';
const planItems = (gid, fid, phase) => db.plans[phase || curPhase()][gid][!fid || !db.plans[phase || curPhase()][gid][fid] ? 'all' : fid];
/** exercises visible in a focus for a phase, merged with that phase+focus's targets */
function focusList(gid, fid, phase){
  const pool = allowedPool(db, gid);
  return planItems(gid, fid, phase).map(it => {
    const e = pool.find(x => x.id === it.exId);
    return e ? {id: e.id, name: e.name, sets: it.sets, min: it.min, max: it.max, rest: it.rest, item: it, ex: e} : null;
  }).filter(Boolean);
}
function sortedSessions(){ return [...db.sessions].sort((a, b) => b.date.localeCompare(a.date) || (b.updated || 0) - (a.updated || 0)); }
/** history entries for an exercise, oldest first: [{date, sets}] */
function exerciseHistory(exId, name){
  const out = [];
  for (const s of db.sessions) for (const en of s.entries)
    if (en.exId === exId || (!findExercise(en.exId) && en.name === name && name)) {
      const v = validSets(en.sets); if (v.length) out.push({date: s.date, sets: v, sessionId: s.id});
    }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
/** most recent logged entry for an exercise up to `date`, excluding a given session (the one being edited) */
function lastEntry(exId, date, excludeSessionId){
  const h = exerciseHistory(exId).filter(h => excludeSessionId !== undefined ? (h.date <= date && h.sessionId !== excludeSessionId) : h.date < date);
  return h[h.length - 1];
}
const setsStr = sets => sets.map(s => `${fmtNum(s.w)}×${s.r}`).join(', ');
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800); }

/* ---------- Navigation ---------- */
let tab = 'workout';
const stacks = {workout: [{v:'home'}], journal: [{v:'journal'}], track: [{v:'track'}], progress: [{v:'progress'}], settings: [{v:'settings'}]};
const cur = () => stacks[tab][stacks[tab].length - 1];
function push(view){ stacks[tab].push(view); render(); window.scrollTo(0, 0); }
function pop(){ if (stacks[tab].length > 1) { stacks[tab].pop(); render(); } }
function switchTab(t){
  if (t === tab) stacks[t] = [stacks[t][0]];
  tab = t;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  render(); window.scrollTo(0, 0);
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
$('#backBtn').addEventListener('click', pop);

function setHeader(title, subtitle = '', action = ''){
  $('#title').textContent = title;
  $('#subtitle').textContent = subtitle;
  $('#topAction').innerHTML = action;
  $('#backBtn').classList.toggle('hidden', stacks[tab].length <= 1);
}
function render(){
  const v = cur(), el = $('#view');
  el.className = 'fade-in'; void el.offsetWidth;
  ({phase: renderPhase, home: renderHome, focus: renderFocus, group: renderGroup, log: renderLog, journal: renderJournal, session: renderSession,
    progress: renderProgress, track: renderTrack, marker: renderMarker, settings: renderSettings})[v.v](el, v);
}

/* ---------- Workout: Home ---------- */
function renderHome(el){
  const h = new Date().getHours();
  setHeader('Workout', h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const wk = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth()+1)}-${pad(weekAgo.getDate())}`;
  const thisWeek = db.sessions.filter(s => s.date >= wk);
  const days = new Set(db.sessions.map(s => s.date)).size;
  const vol = thisWeek.reduce((a, s) => a + sessionVolume(s), 0);
  const ph = PHASES[curPhase()];
  el.innerHTML = `
    ${coachBannerHtml()}
    <button class="phase-chip" id="phaseChip" style="--c:${ph.color}"><span class="pc-ico">${ph.icon}</span><span class="pc-main"><b>${phaseLabel()}</b><span>${db.phase ? ph.tagline + ' · ' + Math.max(0, PHASE_DAYS - phaseDays()) + ' days left' : ''}</span></span><span class="pc-chg">Change</span></button>
    <div class="hero">
      <div class="stat"><div class="v">${new Set(thisWeek.map(s => s.date)).size}</div><div class="l">Days this week</div></div>
      <div class="stat"><div class="v">${vol >= 10000 ? fmtNum(vol/1000) + 'k' : fmtNum(vol)}</div><div class="l">Lbs lifted (7d)</div></div>
      <div class="stat"><div class="v">${days}</div><div class="l">Total days</div></div>
    </div>
    <div class="section-title">What are we training?</div>
    <div class="group-grid">
      ${GROUPS.map(g => {
        const last = sortedSessions().find(s => s.group === g.id);
        return `<button class="group-card" data-g="${g.id}" style="--c:${g.color}">
          <div class="glow"></div><div class="gicon"><svg viewBox="0 0 24 24">${g.icon}</svg></div>
          <div class="gname">${g.name}</div>
          <div class="gmeta">${last ? (focusName(g.id, last.focus, last.focusName) ? `<b>${esc(focusName(g.id, last.focus, last.focusName))}</b> · ` : 'Last: ') + daysAgo(last.date) : FOCUS_META[g.id].length + ' focuses'}</div>
        </button>`;}).join('')}
    </div>`;
  el.querySelectorAll('.group-card').forEach(b => b.addEventListener('click', () => push({v:'focus', g: b.dataset.g, date: todayStr()})));
  $('#phaseChip').onclick = () => push({v:'phase'});
  bindCoachBanner();
}

/* ---------- Workout: Focus picker ---------- */
function renderFocus(el, v){
  const g = groupOf(v.g), ph = PHASES[curPhase()];
  setHeader(g.name, `${ph.short} · ` + (v.date === todayStr() ? "today's focus" : fmtDay(v.date)));
  const lastOf = fid => sortedSessions().find(s => s.group === g.id && fk(s.focus) === fid);
  const fs = FOCUS_META[g.id];
  // suggest the focus trained least recently (never trained first)
  let suggest = null, oldest = '9999';
  for (const f of fs) { const l = lastOf(f.id); const d = l ? l.date : '0000'; if (d < oldest) { oldest = d; suggest = f.id; } }
  const card = (fid, name, desc, count) => {
    const l = lastOf(fid);
    return `<button class="focus-card" data-f="${fid}" style="--c:${g.color}">
      <div class="fbar"></div>
      <div class="main"><div class="name">${esc(name)} ${fid === suggest ? '<span class="pill sugg">Up next</span>' : ''}</div>
        <div class="meta">${esc(desc)}</div>
        <div class="meta2">${count} exercise${count === 1 ? '' : 's'} · ${l ? 'last ' + daysAgo(l.date) : 'not trained yet'}</div></div>
      <svg class="chev" width="20" height="20" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    </button>`;
  };
  el.innerHTML = `
    <div class="section-title">Pick a focus</div>
    <div class="list">${fs.map(f => card(f.id, f.name, f.desc || '', focusList(g.id, f.id).length)).join('')}</div>
    <div class="section-title">Or</div>
    <div class="list">${card('all', 'All ' + g.name, 'Every ' + g.name.toLowerCase() + ' exercise, incl. your custom ones', db.exercises[g.id].length)}</div>`;
  el.querySelectorAll('.focus-card').forEach(b => b.onclick = () => push({v:'group', g: g.id, focus: b.dataset.f, date: v.date}));
}

/* ---------- Workout: Group (exercise list) ---------- */
function renderGroup(el, v){
  const phase = v.phase === undefined ? curPhase() : v.phase, tp = phase || curPhase();
  const g = groupOf(v.g), list = focusList(g.id, v.focus, tp);
  const fname = focusName(g.id, v.focus);
  const session = getSession(v.date, g.id, v.focus, phase);
  const doneIds = new Set(session ? session.entries.filter(e => validSets(e.sets).length).map(e => e.exId) : []);
  setHeader(fname && fname !== 'All' ? `${g.name} · ${fname}` : g.name, `${PHASES[tp].short} · ` + (v.date === todayStr() ? 'Today' : fmtDay(v.date)) + ` · ${doneIds.size}/${list.length} done`,
    `<button class="text-btn" id="editBtn">${v.editing ? 'Done' : 'Edit'}</button>`);
  el.innerHTML = `
    <div class="phase-tip" style="--c:${PHASES[tp].color}">${PHASES[tp].icon} <b>${PHASES[tp].name}:</b> ${PHASES[tp].points[1]}</div>
    <div class="list">
      ${list.map((e, i) => {
        const last = lastEntry(e.id, v.date + '~');
        const done = doneIds.has(e.id);
        return `<div class="row" role="button" data-id="${e.id}" style="--c:${g.color}">
          <div class="badge-num">${i + 1}</div>
          <div class="main"><div class="name">${esc(e.name)}</div>
            <div class="meta">${e.item.notes ? '🧠 ' : ''}${e.sets} × ${repsLabel(e)} · rest ${restLabel(e.rest)}${!done ? (() => { const t = setTarget(e, g.id, tp, v.date, (getSession(v.date, g.id, v.focus, phase) || {}).id); return t.src !== 'plan' && t.sets[0] ? ` · ${t.src === 'coach' ? '🧠' : '⚙️'} ${tsetStr(t.sets[0])}` : last ? ` · last ${fmtNum(Math.max(...last.sets.map(s => s.w)))} lb` : ''; })() : ''}</div></div>
          ${v.editing
            ? `<button class="mini-btn" data-act="up" data-id="${e.id}" aria-label="Move up">↑</button><button class="mini-btn" data-act="edit" data-id="${e.id}">Edit</button>`
            : done ? `<span class="pill done">✓ Done</span>` : `<svg class="chev" width="20" height="20" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`}
        </div>`;}).join('')}
    </div>
    <div class="btn-row"><button class="btn small" id="addEx">＋ Add exercise</button></div>
    ${!list.length ? `<div class="empty" style="padding:30px 10px"><p>No exercises in this focus yet. Add one above.</p></div>` : ''}
    ${session && !v.editing ? `<div class="btn-row"><button class="btn small" id="viewSession">View ${v.date === todayStr() ? "today's" : 'this'} session</button></div>` : ''}`;
  $('#editBtn').onclick = () => { v.editing = !v.editing; render(); };
  $('#addEx').onclick = () => exerciseSheet(g.id, null, v.focus, tp);
  if ($('#viewSession')) $('#viewSession').onclick = () => { switchTab('journal'); push({v:'session', id: session.id}); };
  el.querySelectorAll('.row').forEach(r => r.addEventListener('click', ev => {
    const act = ev.target.closest('[data-act]');
    if (act) {
      ev.stopPropagation();
      const idx = list.findIndex(x => x.id === act.dataset.id);
      if (act.dataset.act === 'edit') exerciseSheet(g.id, list[idx], v.focus, tp);
      if (act.dataset.act === 'up' && idx > 0) {
        const arr = planItems(g.id, v.focus, tp);
        const a = arr.findIndex(x => x.exId === list[idx - 1].id), b = arr.findIndex(x => x.exId === list[idx].id);
        if (a >= 0 && b >= 0) { [arr[a], arr[b]] = [arr[b], arr[a]]; save(); render(); }
      }
      return;
    }
    if (v.editing) { exerciseSheet(g.id, list.find(x => x.id === r.dataset.id), v.focus, tp); return; }
    push({v:'log', g: g.id, focus: v.focus, phase, exId: r.dataset.id, date: v.date});
  }));
}

/* ---------- Workout: Log an exercise ---------- */

/* ---------- Set targets: Coach prescription > Auto progression > Plan ---------- */
const LOWER_RE = /squat|deadlift|leg press|lunge|hip thrust|\brdl\b|romanian|rack pull|good morning|calf|step-?up|leg extension|leg curl|hack/i;
const isLowerBody = (name, gid) => gid === 'legs' || LOWER_RE.test(name || '');
/** coach prescription for an exercise in a phase (null if none / other phase); stale = he already logged it on/after the day Coach published it */
function coachRx(exId, phase, date, excludeSessionId){
  const rx = db.coach && db.coach.prescriptions && db.coach.prescriptions[exId];
  if (!rx || !Array.isArray(rx.sets) || !rx.sets.length) return null;
  if (rx.phase && phase && rx.phase !== phase) return null;
  const last = lastEntry(exId, date, excludeSessionId);
  return {...rx, stale: !!(rx.updated && last && last.date >= rx.updated)};
}
/** automatic progression from the last session: all sets at the top of the range → +5 lb (upper) / +10 lb (lower), reps back to the bottom; else same weight, +1 rep */
function autoTarget(e, last, gid){
  if (!last || !last.sets.length) return null;
  const inc = isLowerBody(e.name, gid) ? 10 : 5, n = Math.max(1, e.sets || last.sets.length);
  const allTop = last.sets.every(x => x.r >= e.max);
  const sets = Array.from({length: n}, (_, i) => {
    const ls = last.sets[Math.min(i, last.sets.length - 1)];
    if (!ls.w) return {w: 0, r: ls.r + 1}; // bodyweight: add a rep
    return allTop ? {w: ls.w + inc, r: e.min} : {w: ls.w, r: Math.min(ls.r + 1, e.max)};
  });
  return {src: 'auto', sets, why: allTop ? `hit ${e.max}+ reps on every set last time → +${inc} lb` : `same weight, aim for +1 rep (up to ${e.max})`};
}
/** the target shown on the log screen: Coach > Auto > Plan */
function setTarget(e, gid, phase, date, excludeSessionId){
  const id = e.id || e.exId;
  const last = lastEntry(id, date, excludeSessionId);
  const rx = coachRx(id, phase, date, excludeSessionId);
  if (rx && !rx.stale) return {src: 'coach', sets: rx.sets.map(x => ({w: x.weight == null ? null : x.weight, r: x.reps})), note: rx.note || '', updated: rx.updated || null};
  const auto = autoTarget(e, last, gid);
  if (auto) return {...auto, staleCoach: rx ? (rx.updated || true) : null};
  return {src: 'plan', sets: [], note: ''};
}
/** compare a logged set with its target: 'beat' | 'met' | 'miss' | null */
function vsTarget(w, r, t){
  if (!t || !(r > 0)) return null;
  const tw = t.w || 0, tr = t.r || 0;
  if (w === tw && r === tr) return 'met';
  if (w >= tw && r >= tr) return 'beat';
  if (w <= tw && r <= tr) return 'miss';
  const a = e1rm(w, r), b = e1rm(tw, tr); // mixed (more weight, fewer reps or vice versa): compare estimated 1RM
  return Math.abs(a - b) < 0.5 ? 'met' : a > b ? 'beat' : 'miss';
}
const VS_LABEL = {beat: '▲ beat', met: '✓ met', miss: '▼ missed'};
const vsChip = v => v ? `<span class="vs vs-${v}">${VS_LABEL[v]}</span>` : '';
const tsetStr = t => t.w ? `${fmtNum(t.w)}×${t.r}` : `BW×${t.r}`;

const draftCache = new Map();
function renderLog(el, v){
  const g = groupOf(v.g);
  const phase = v.phase === undefined ? curPhase() : v.phase; // session's phase (null = unlabeled old session)
  const tphase = phase || curPhase();                            // phase whose targets we show
  const found = findExercise(v.exId);
  const session = getSession(v.date, v.g, v.focus, phase);
  const existing = session && session.entries.find(e => e.exId === v.exId);
  const inPlan = focusList(v.g, v.focus, tphase).find(x => x.id === v.exId) || focusList(v.g, 'all', tphase).find(x => x.id === v.exId);
  const e = inPlan || (found ? {...fallbackItem(tphase, found.ex), name: found.ex.name} : {name: existing ? existing.name : 'Exercise', ...fallbackItem(tphase, {id: v.exId})});
  const last = lastEntry(v.exId, v.date, session ? session.id : null);
  const lastSession = last && db.sessions.find(s => s.id === last.sessionId);
  const tgt = existing && existing.target ? {...existing.target, note: '', saved: true} : setTarget({...e, id: v.exId}, v.g, tphase, v.date, session ? session.id : null);
  const tsets = tgt.sets;
  const dkey = [v.g, v.focus, v.exId, v.date, phase].join('|');
  if (!v.draft && draftCache.has(dkey)) v.draft = draftCache.get(dkey);
  if (!v.draft) {
    if (existing) v.draft = existing.sets.map(s => ({w: s.w || '', r: s.r || '', pre: false}));
    else {
      const n = Math.max(1, tsets.length || e.sets);
      v.draft = Array.from({length: n}, (_, i) => {
        const ts = tsets[i]; // ghost values = the target (Coach or Auto)
        return ts ? {w: ts.w == null ? '' : ts.w, r: ts.r, pre: true} : {w: '', r: '', pre: false};
      });
    }
  }
  draftCache.set(dkey, v.draft); // unsaved sets survive hopping to another exercise and back (memory only)
  const fname = focusName(v.g, v.focus);
  setHeader(e.name, `${phase ? PHASES[phase].short + ' · ' : ''}${g.name}${fname && fname !== 'All' ? ' · ' + fname : ''} · ${fmtDay(v.date)}`);
  const hintFor = i => last && last.sets[i] ? `last ${fmtNum(last.sets[i].w)}×${last.sets[i].r}` : '';
  const anyPre = v.draft.some(d => d.pre);
  const rowVs = i => { const d = v.draft[i], t = tsets[i]; if (!d || !t || d.w === '' || d.r === '') return null; return vsTarget(parseFloat(d.w) || 0, parseInt(d.r) || 0, t); };
  const lastFocus = lastSession ? [lastSession.phase && PHASES[lastSession.phase] ? PHASES[lastSession.phase].short : '', focusName(lastSession.group, lastSession.focus, lastSession.focusName)].filter(Boolean).join(' · ') : '';
  const lastLine = last ? last.sets.map(x => `${fmtNum(x.w)}×${x.r}`).join(', ') : '';
  const tTitle = {coach: '🧠 Coach target', auto: '⚙️ Auto target', plan: '🎯 Plan target'}[tgt.src];
  const tSub = tgt.saved ? 'when logged' : tgt.src === 'coach' ? (tgt.updated ? 'set ' + fmtDay(tgt.updated) : 'from Coach') : tgt.src === 'auto' ? 'not Coach · from last session' : `${PHASES[tphase].short} plan`;
  el.innerHTML = `
    <div class="last-card tgt-card tgt-${tgt.src}" style="--c:${tgt.src === 'coach' ? '#3ddc97' : tgt.src === 'auto' ? '#ffc145' : g.color}">
      <div class="lc-head"><span class="lc-title">${tTitle}</span><span class="lc-date">${tSub}</span></div>
      ${tsets.length ? `<div class="lc-sets">${tsets.map((t, i) => `
        <div class="lc-set"><div class="k">Set ${i + 1}</div><div class="w">${t.w ? fmtNum(t.w) + '<small> lb</small>' : t.w === 0 ? '<small>BW</small>' : '<small>your pick</small>'}</div><div class="r">× ${t.r} reps</div></div>`).join('')}</div>`
        : `<div class="lc-first">${e.sets} sets × ${repsLabel(e)} reps.${last ? '' : ' No history yet. Today sets your baseline 💪'}</div>`}
      ${tgt.note ? `<div class="tgt-note">${esc(tgt.note)}</div>` : ''}
      ${tgt.src === 'auto' && !tgt.saved ? `<div class="tgt-note auto">Auto: ${esc(tgt.why)}${tgt.staleCoach ? ` · Coach's target${typeof tgt.staleCoach === 'string' ? ' from ' + fmtDay(tgt.staleCoach) : ''} is done; new one after his next review` : ''}</div>` : ''}
      ${last ? `<details class="last-line"><summary>Last: <b>${lastLine}</b> · ${fmtDay(last.date)}${/^(Today|Yesterday)$/.test(fmtDay(last.date)) ? '' : ' · ' + daysAgo(last.date)}</summary>
        <div class="lc-foot">Top ${fmtNum(Math.max(...last.sets.map(s => s.w)))} lb · e1RM ${fmtNum(Math.round(Math.max(...last.sets.map(s => e1rm(s.w, s.r)))))} · ${fmtNum(last.sets.reduce((a, s) => a + s.w * s.r, 0))} lb vol${lastFocus ? ' · ' + esc(lastFocus) : ''}</div></details>` : ''}
    </div>
    <div class="target-row" style="--c:${PHASES[tphase].color}"><div><span class="tr-lbl">Target · ${PHASES[tphase].short}</span><b>${e.sets} sets × ${repsLabel(e)} reps</b></div><div class="rest"><span class="tr-lbl">Rest${db.settings.restOverride ? ' (yours)' : ''}</span><b>⏱ ${restLabel(restFor(e, tphase)) || 'none'}</b></div></div>
    ${e.item && e.item.notes ? `<div class="coach-note"><span class="cn-lbl">🧠 Coach note</span>${esc(e.item.notes)}</div>` : ''}
    <div class="sets-head"><div>Set</div><div style="text-align:center">Weight</div><div style="text-align:center">Reps</div><div></div></div>
    <div id="sets">
      ${v.draft.map((s, i) => `
      <div class="set-row ${s.w !== '' ? 'filled' : ''} ${s.done ? 'done' : ''} ${hintFor(i) ? 'has-hint' : ''}" style="--c:${g.color}">
        <button class="sn" data-done="${i}" aria-label="Set ${i + 1} done">${s.done ? '✓' : i + 1}</button>
        <div class="field"><input type="number" inputmode="decimal" step="any" min="0" data-i="${i}" data-k="w" value="${s.w}" class="${s.pre ? 'prefilled' : ''}" placeholder="0"><span class="unit">lb</span>${hintFor(i) ? `<span class="hint">${hintFor(i)}</span>` : ''}</div>
        <div class="field"><input type="number" inputmode="numeric" min="0" step="1" data-i="${i}" data-k="r" value="${s.r}" class="${s.pre ? 'prefilled' : ''}" placeholder="${tsets[i] ? tsets[i].r : e.max}"><span class="unit">reps</span><span class="vs-slot">${s.pre ? '' : vsChip(rowVs(i))}</span></div>
        <button class="del-set" data-del="${i}" aria-label="Remove set"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      </div>`).join('')}
    </div>
    ${anyPre ? `<p class="note pre-note"><span class="pre-dot"></span>Dimmed values are ${tgt.src === 'coach' ? "Coach's targets" : tgt.src === 'auto' ? 'the Auto targets' : 'prefilled'}. Type what you actually did, or tap the set number if you hit it exactly.</p>` : ''}
    <div class="btn-row"><button class="btn small" id="addSet">＋ Add set</button>${anyPre ? `<button class="btn small" id="clearPre">Clear prefill</button>` : last ? `<button class="btn small" id="copyLast">Copy last</button>` : ''}</div>
    <div class="date-chip"><span>Workout date</span><input type="date" id="dateIn" value="${v.date}" max="${todayStr()}"></div>
    <div class="btn-row" style="margin-top:18px"><button class="btn primary" id="saveBtn">${existing ? 'Update' : 'Save'} ${esc(e.name)}</button></div>
    ${existing ? `<div class="btn-row"><button class="btn small danger" id="delEntry">Delete this entry</button></div>` : ''}
    <p class="note">Blank reps count as the target (${e.max}). Sets with no weight or reps are skipped. ${db.settings.restTimer ? `Rest timer (${restLabel(restFor(e, tphase)) || 'off'}) starts when a set has weight and reps; tap the set number to check off a prefilled set.` : ''}</p>`;
  const restSecs = restFor(e, tphase);
  /** a set was committed (Done/blur with weight+reps, or checked off) → mark it and start the rest countdown */
  const commitSet = i => {
    const d = v.draft[i]; if (!d) return;
    d.done = true; d.pre = false;
    const row = el.querySelectorAll('.set-row')[i];
    if (row) { row.classList.add('done', 'filled'); const sn = row.querySelector('.sn'); if (sn) sn.textContent = '✓'; row.querySelectorAll('input').forEach(x => x.classList.remove('prefilled')); const slot = row.querySelector('.vs-slot'); if (slot) slot.innerHTML = vsChip(rowVs(i)); }
    const key = `${v.exId}|${v.date}|${i}`, st = Rest.st;
    if (st && st.key === key && !st.ended) return; // same set already timing: don't restart
    const n = v.draft.length;
    if (i === n - 1 || v.draft.every(x => x.done)) Rest.finish(e.name);
    else Rest.start(restSecs, {name: e.name, set: i + 1, of: n}, key);
  };
  el.querySelectorAll('input[data-i]').forEach(inp => {
    inp.addEventListener('input', () => {
      const d = v.draft[+inp.dataset.i]; d[inp.dataset.k] = inp.value; d.pre = false;
      inp.closest('.set-row').querySelectorAll('input').forEach(x => x.classList.remove('prefilled'));
      inp.closest('.set-row').classList.toggle('filled', d.w !== '');
      const slot = inp.closest('.set-row').querySelector('.vs-slot'); if (slot) slot.innerHTML = vsChip(rowVs(+inp.dataset.i));
    });
    inp.addEventListener('focus', () => { if (inp.classList.contains('prefilled')) inp.select(); });
    // commit (blur / keyboard Done), not every keystroke
    inp.addEventListener('change', () => { const d = v.draft[+inp.dataset.i]; if (d && d.w !== '' && d.r !== '' && !d.pre) commitSet(+inp.dataset.i); });
  });
  el.querySelectorAll('[data-done]').forEach(b => b.onclick = () => {
    const i = +b.dataset.done, d = v.draft[i];
    if (d.done) { d.done = false; b.textContent = i + 1; b.closest('.set-row').classList.remove('done'); return; }
    if (d.w === '') { toast('Enter the weight first'); return; }
    if (d.r === '') { d.r = e.max; const r = b.closest('.set-row').querySelector('input[data-k="r"]'); if (r) r.value = e.max; }
    commitSet(i);
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { v.draft.splice(+b.dataset.del, 1); render(); });
  $('#addSet').onclick = () => { const p = v.draft[v.draft.length - 1]; v.draft.push({w: p ? p.w : '', r: p ? p.r : '', pre: false}); render(); };
  if ($('#copyLast')) $('#copyLast').onclick = () => { v.draft = last.sets.map(s => ({w: s.w, r: s.r, pre: true})); render(); };
  if ($('#clearPre')) $('#clearPre').onclick = () => { v.draft = v.draft.map(d => d.pre ? {w: '', r: '', pre: false} : d); render(); };
  $('#dateIn').onchange = ev => { if (ev.target.value) { draftCache.delete(dkey); v.date = ev.target.value; v.draft = null; render(); } };
  $('#saveBtn').onclick = () => {
    const sets = v.draft.map(s => ({w: parseFloat(s.w) || 0, r: s.r === '' ? (s.w !== '' ? e.max : 0) : (parseInt(s.r) || 0)}))
      .filter(s => s.w > 0 || s.r > 0);
    if (!sets.length) { toast('Enter a weight for at least one set'); return; }
    let s = getSession(v.date, v.g, v.focus, phase);
    if (!s) { s = {id: uid(), date: v.date, group: v.g, focus: v.focus || null, focusName: focusName(v.g, v.focus), phase: phase || null, entries: []}; db.sessions.push(s); }
    const idx = s.entries.findIndex(x => x.exId === v.exId);
    const entry = {exId: v.exId, name: e.name, sets};
    if (tsets.length && tgt.src !== 'plan') entry.target = {src: tgt.src, sets: tsets.map(t => ({w: t.w || 0, r: t.r}))}; // target at the time → met/beat/missed in the Journal
    if (idx >= 0) s.entries[idx] = entry; else s.entries.push(entry);
    s.updated = Date.now();
    save();
    const best = Math.max(...sets.map(x => e1rm(x.w, x.r)));
    const prev = exerciseHistory(v.exId).filter(h => h.date !== v.date).flatMap(h => h.sets.map(x => e1rm(x.w, x.r)));
    toast(prev.length && best > Math.max(...prev) ? '🏆 New PR! Saved' : '✓ Saved');
    draftCache.delete(dkey); v.draft = null; pop();
  };
  if ($('#delEntry')) $('#delEntry').onclick = () => {
    if (!confirm(`Delete ${e.name} from this session?`)) return;
    removeEntry(session, v.exId); draftCache.delete(dkey); v.draft = null; toast('Entry deleted'); pop();
  };
}
function removeEntry(session, exId){
  session.entries = session.entries.filter(x => x.exId !== exId);
  if (!session.entries.length) db.sessions = db.sessions.filter(s => s !== session);
  save();
}

/* ---------- Exercise add/edit sheet ---------- */
function openSheet(html){ $('#sheet').innerHTML = '<div class="grab"></div>' + html; $('#sheetWrap').classList.remove('hidden'); }
function closeSheet(){ $('#sheetWrap').classList.add('hidden'); $('#sheet').innerHTML = ''; }
$('#sheetBackdrop').addEventListener('click', closeSheet);
function exerciseSheet(groupId, e, focusId, phase){
  phase = phase || curPhase();
  const g = groupOf(groupId), fs = FOCUS_META[groupId], plan = db.plans[phase][groupId], P = PHASES[phase];
  const fid = focusId && plan[focusId] ? focusId : 'all';
  const inFocus = fid !== 'all' ? fs.find(f => f.id === fid) : null;
  const member = new Set(e ? fs.filter(f => plan[f.id].some(i => i.exId === e.id)).map(f => f.id) : (inFocus ? [inFocus.id] : []));
  const others = !e ? allowedPool(db, groupId).filter(x => !plan[fid].some(i => i.exId === x.id)) : [];
  const borrowed = e && !db.exercises[groupId].some(x => x.id === e.id); // an Arms exercise used as a back/chest finisher
  const def = e || {sets: P.fallback[0], min: P.fallback[1], max: P.fallback[2], rest: P.fallback[3]};
  openSheet(`<h2>${e ? 'Edit exercise' : 'Add exercise'}</h2>
    <div class="sheet-ctx" style="--c:${P.color}">${P.icon} ${P.name} · ${esc(g.name)} · ${inFocus ? esc(inFocus.name) : 'All'}</div>
    ${others.length ? `<label class="form-label">Add an existing ${esc(g.name.toLowerCase())} exercise</label>
      <div class="chips">${others.map(x => `<button class="chip" data-add="${x.id}">＋ ${esc(x.name)}</button>`).join('')}</div>
      <label class="form-label" style="margin-top:20px">Or create a new one</label>` : `<label class="form-label">Name</label>`}
    <input class="text-input" id="exName" value="${e ? esc(e.name) : ''}" placeholder="e.g. T-Bar Row" autocomplete="off">
    <div class="four" style="margin-top:4px">
      <div><label class="form-label">Sets</label><input class="text-input" id="exSets" type="number" inputmode="numeric" value="${def.sets}"></div>
      <div><label class="form-label">Min reps</label><input class="text-input" id="exMin" type="number" inputmode="numeric" value="${def.min}"></div>
      <div><label class="form-label">Max reps</label><input class="text-input" id="exMax" type="number" inputmode="numeric" value="${def.max}"></div>
      <div><label class="form-label">Rest (s)</label><input class="text-input" id="exRest" type="number" inputmode="numeric" value="${def.rest || ''}"></div>
    </div>
    <label class="form-label">In ${P.short} focuses</label>
    <div class="chips" id="focusChips">${fs.map(f => `<button class="chip toggle ${member.has(f.id) ? 'on' : ''}" data-f="${f.id}" style="--c:${g.color}">${esc(f.name)}</button>`).join('')}<span class="chip static">All ✓</span></div>
    <div class="btn-row" style="margin-top:20px"><button class="btn primary" id="exSave">${e ? 'Save changes' : 'Add exercise'}</button></div>
    ${e && inFocus ? `<div class="btn-row"><button class="btn small" id="exRemoveFocus">Remove from ${esc(inFocus.name)} (${P.short})</button></div>` : ''}
    ${e ? `<div class="btn-row"><button class="btn small danger" id="exDel">${borrowed ? 'Remove from all ' + esc(g.name) + ' days' : 'Delete exercise from ' + esc(g.name)}</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="exCancel">Cancel</button></div>
    <p class="note">Sets, reps and rest apply to ${P.name} · ${esc(g.name)} · ${inFocus ? esc(inFocus.name) : 'All'} only.${e ? ' Deleting an exercise keeps its past entries in your Journal.' : ''}</p>`);
  $('#exCancel').onclick = closeSheet;
  $('#sheet').querySelectorAll('.chip.toggle').forEach(c => c.onclick = () => c.classList.toggle('on'));
  $('#sheet').querySelectorAll('[data-add]').forEach(c => c.onclick = () => {
    const src = plan.all.find(i => i.exId === c.dataset.add) || fallbackItem(phase, {id: c.dataset.add});
    plan[fid].push({...src, exId: c.dataset.add}); save(); closeSheet(); render(); toast('Added to ' + (inFocus ? inFocus.name : 'All'));
  });
  $('#exSave').onclick = () => {
    const name = $('#exName').value.trim();
    if (!name) { toast('Give it a name'); return; }
    const sets = Math.max(1, Math.min(20, parseInt($('#exSets').value) || def.sets));
    let min = Math.max(1, parseInt($('#exMin').value) || def.min), max = Math.max(1, parseInt($('#exMax').value) || min);
    if (max < min) [min, max] = [max, min];
    const rest = Math.max(0, Math.min(900, parseInt($('#exRest').value) || 0));
    const targets = {sets, min, max, rest};
    let exId;
    if (e) { e.ex.name = name; exId = e.id; Object.assign(e.item, targets); }
    else {
      const ex = {id: uid(), name}; db.exercises[groupId].push(ex); exId = ex.id;
      plan[fid].push({exId, ...targets});
      for (const ph of Object.keys(PHASES)) if (ph !== phase || fid !== 'all') {
        const all = db.plans[ph][groupId].all;
        if (!all.some(i => i.exId === exId)) all.push(ph === phase ? {exId, ...targets} : fallbackItem(ph, {id: exId}));
      }
    }
    const on = new Set([...$('#sheet').querySelectorAll('.chip.toggle.on')].map(c => c.dataset.f));
    for (const f of fs) {
      const has = plan[f.id].some(i => i.exId === exId);
      if (on.has(f.id) && !has) plan[f.id].push({exId, ...targets});
      if (!on.has(f.id) && has) plan[f.id] = plan[f.id].filter(i => i.exId !== exId);
    }
    save(); closeSheet(); render(); toast(e ? 'Updated' : 'Exercise added');
  };
  if ($('#exRemoveFocus')) $('#exRemoveFocus').onclick = () => {
    plan[fid] = plan[fid].filter(i => i.exId !== e.id); save(); closeSheet(); render(); toast('Removed from ' + inFocus.name);
  };
  if ($('#exDel')) $('#exDel').onclick = () => {
    if (!confirm(`${borrowed ? 'Remove' : 'Delete'} ${e.name} from ${g.name} (both phases, all focuses)? Past entries stay in your Journal.`)) return;
    if (borrowed) { for (const ph of Object.keys(PHASES)) for (const k of Object.keys(db.plans[ph][groupId])) db.plans[ph][groupId][k] = db.plans[ph][groupId][k].filter(i => i.exId !== e.id); }
    else db.exercises[groupId] = db.exercises[groupId].filter(x => x.id !== e.id);
    syncAll(db); save(); closeSheet(); render(); toast('Deleted');
  };
}

/* ---------- Phase picker ---------- */
function renderPhase(el, v){
  const expired = db.phase && phaseDays() >= PHASE_DAYS;
  setHeader(db.phase && !expired ? 'Training phase' : expired ? 'New 4-week block' : 'Welcome', db.phase ? phaseLabel() : 'Step 1');
  el.innerHTML = `
    <p class="lead">${expired ? `Your ${PHASES[db.phase.id].name.toLowerCase()} block wrapped up. What's next for the coming 4 weeks?` : db.phase ? 'Switching starts a fresh 4-week block from today.' : 'Pick your phase for the next 4 weeks. Exercises, sets, reps and rest will match it. I’ll ask again in 4 weeks.'}</p>
    <div class="list">${Object.values(PHASES).map(p => `
      <button class="phase-card ${db.phase && db.phase.id === p.id ? 'current' : ''}" data-p="${p.id}" style="--c:${p.color}">
        <div class="ph-top"><span class="ph-ico">${p.icon}</span><div><div class="ph-name">${p.name}</div><div class="ph-tag">${p.tagline}</div></div>
          ${db.phase && db.phase.id === p.id ? `<span class="pill phase" style="--c:${p.color}">${expired ? 'Last block' : 'Current'}</span>` : ''}</div>
        <ul>${p.points.map(x => `<li>${x}</li>`).join('')}</ul>
      </button>`).join('')}</div>
    ${db.phase && !expired ? `<div class="btn-row"><button class="btn small" id="restartBlock">Restart ${PHASES[db.phase.id].short} block from today</button></div>` : ''}`;
  const choose = id => {
    const same = db.phase && db.phase.id === id && !expired;
    if (!same) db.phase = {id, start: todayStr()};
    save();
    stacks.workout = [{v:'home'}]; tab = 'workout';
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'workout'));
    render(); window.scrollTo(0, 0);
    toast(same ? `Still ${PHASES[id].name.toLowerCase()} · ${phaseLabel().split(' · ')[1]}` : `${PHASES[id].icon} ${PHASES[id].name} block started`);
  };
  el.querySelectorAll('.phase-card').forEach(b => b.onclick = () => choose(b.dataset.p));
  if ($('#restartBlock')) $('#restartBlock').onclick = () => { db.phase.start = todayStr(); save(); choose(db.phase.id); };
}

/* ---------- Journal ---------- */
function renderJournal(el){
  setHeader('Journal', `${db.sessions.length} workout${db.sessions.length === 1 ? '' : 's'} logged`);
  const ss = sortedSessions();
  if (!ss.length) {
    el.innerHTML = `<div class="empty"><div class="ico">📓</div><h3>No workouts yet</h3><p>Log your first sets and they'll show up here, grouped by day.</p><button class="btn primary" id="go">Start a workout</button></div>`;
    $('#go').onclick = () => switchTab('workout');
    return;
  }
  // group by month then day
  let html = '', lastMonth = '';
  for (const s of ss) {
    const d = parseDate(s.date);
    const m = d.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
    if (m !== lastMonth) { html += `<div class="day-head">${m}</div>`; lastMonth = m; }
    const g = groupOf(s.group);
    html += `<button class="session-card" data-id="${s.id}">
      <div class="session-top"><span class="dot" style="--c:${g.color}"></span><span class="gname">${esc(sessionLabel(s))} ${phasePill(s.phase)}</span><span class="vol">${fmtDay(s.date)}</span></div>
      <div class="ex-lines">${s.entries.map(en => `<div class="ex-line"><span class="n">${esc(en.name)}</span><span class="s">${esc(setsStr(validSets(en.sets)))}</span></div>`).join('')}</div>
      <div class="meta" style="font-size:12px;color:var(--muted);margin-top:10px">${s.entries.length} exercise${s.entries.length === 1 ? '' : 's'} · ${fmtNum(sessionVolume(s))} lb volume</div>
    </button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('.session-card').forEach(b => b.onclick = () => push({v:'session', id: b.dataset.id}));
}
function renderSession(el, v){
  const s = db.sessions.find(x => x.id === v.id);
  if (!s) { stacks[tab] = [stacks[tab][0]]; render(); return; }
  const g = groupOf(s.group);
  setHeader(sessionLabel(s), (s.phase && PHASES[s.phase] ? PHASES[s.phase].name + ' · ' : '') + fmtDay(s.date, true));
  el.innerHTML = `
    <div class="hero">
      <div class="stat"><div class="v">${s.entries.length}</div><div class="l">Exercises</div></div>
      <div class="stat"><div class="v">${s.entries.reduce((a, e) => a + validSets(e.sets).length, 0)}</div><div class="l">Sets</div></div>
      <div class="stat"><div class="v">${fmtNum(sessionVolume(s))}</div><div class="l">Volume (lb)</div></div>
    </div>
    <div class="section-title">Exercises</div>
    ${s.entries.map(en => `<div class="detail-ex">
      <div class="hd"><span class="n">${esc(en.name)}</span>
        <button class="mini-btn" data-edit="${en.exId}">Edit</button><button class="mini-btn red" data-del="${en.exId}">Delete</button></div>
      ${en.target ? `<div class="jr-tgt">${en.target.src === 'coach' ? '🧠 Coach' : '⚙️ Auto'} target: ${en.target.sets.map(tsetStr).join(', ')}</div>` : ''}
      <table class="set-table">${validSets(en.sets).map((x, i) => `<tr><td>Set ${i + 1}</td><td><b>${fmtNum(x.w)} lb</b> × ${x.r}</td><td>${en.target && en.target.sets[i] ? vsChip(vsTarget(x.w, x.r, en.target.sets[i])) : `e1RM ${fmtNum(Math.round(e1rm(x.w, x.r)))}`}</td></tr>`).join('')}</table>
    </div>`).join('')}
    <div class="btn-row"><button class="btn small" id="addMore">＋ Add exercise to this day</button></div>
    <div class="btn-row"><button class="btn small danger" id="delSession">Delete entire workout</button></div>`;
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => push({v:'log', g: s.group, focus: s.focus, phase: s.phase || null, exId: b.dataset.edit, date: s.date}));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const en = s.entries.find(x => x.exId === b.dataset.del);
    if (!confirm(`Delete ${en.name} from this workout?`)) return;
    removeEntry(s, en.exId); toast('Entry deleted');
    if (!db.sessions.includes(s)) pop(); else render();
  });
  $('#addMore').onclick = () => push({v:'group', g: s.group, focus: s.focus, phase: s.phase || null, date: s.date});
  $('#delSession').onclick = () => {
    if (!confirm('Delete this entire workout?')) return;
    db.sessions = db.sessions.filter(x => x !== s); save(); toast('Workout deleted'); pop();
  };
}

/* ---------- Progress ---------- */
let prog = {exId: null, metric: 'top', range: 'all', mode: 'lifts'};
function loggedExercises(){
  const map = new Map();
  for (const s of db.sessions) for (const en of s.entries) {
    if (!validSets(en.sets).length) continue;
    const f = findExercise(en.exId);
    const key = en.exId;
    const prev = map.get(key);
    const item = {exId: key, name: f ? f.ex.name : en.name, group: f ? f.group : s.group, last: s.date, count: (prev ? prev.count : 0) + 1};
    if (!prev || s.date > prev.last) map.set(key, item); else prev.count++;
  }
  return [...map.values()];
}
function progressModeSeg(){
  return `<div class="seg mode-seg" id="modeSeg"><button data-m="lifts" class="${prog.mode !== 'body' ? 'on' : ''}">🏋️ Lifts</button><button data-m="body" class="${prog.mode === 'body' ? 'on' : ''}">⚖️ Body weight</button></div>`;
}
function bindModeSeg(el){ el.querySelectorAll('#modeSeg button').forEach(b => b.onclick = () => { prog.mode = b.dataset.m; render(); }); }
function renderProgress(el){
  if (prog.mode === 'body') { renderBodyProgress(el); el.insertAdjacentHTML('afterbegin', progressModeSeg()); bindModeSeg(el); return; }
  renderLiftProgress(el); el.insertAdjacentHTML('afterbegin', progressModeSeg()); bindModeSeg(el);
}
function renderLiftProgress(el){
  setHeader('Progress', 'Trends per exercise');
  const exs = loggedExercises();
  if (!exs.length) {
    el.innerHTML = `<div class="empty"><div class="ico">📈</div><h3>No data yet</h3><p>Once you log an exercise, your strength trends will chart here.</p><button class="btn primary" id="go">Start a workout</button></div>`;
    $('#go').onclick = () => switchTab('workout');
    return;
  }
  if (!prog.exId || !exs.find(x => x.exId === prog.exId)) prog.exId = exs.sort((a, b) => b.last.localeCompare(a.last))[0].exId;
  const sel = exs.find(x => x.exId === prog.exId);
  let hist = exerciseHistory(sel.exId, sel.name);
  // merge same-date entries
  const byDate = new Map(); for (const h of hist) { if (byDate.has(h.date)) byDate.get(h.date).sets.push(...h.sets); else byDate.set(h.date, {date: h.date, sets: [...h.sets]}); }
  hist = [...byDate.values()];
  if (prog.range !== 'all') {
    const d = new Date(); d.setDate(d.getDate() - (prog.range === '1m' ? 30 : prog.range === '3m' ? 91 : 365));
    const cut = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    hist = hist.filter(h => h.date >= cut);
  }
  const metricFn = {
    top: h => Math.max(...h.sets.map(s => s.w)),
    e1rm: h => Math.round(Math.max(...h.sets.map(s => e1rm(s.w, s.r)))),
    vol: h => h.sets.reduce((a, s) => a + s.w * s.r, 0)
  }[prog.metric];
  const pts = hist.map(h => ({date: h.date, y: metricFn(h), sets: h.sets}));
  const allHist = exerciseHistory(sel.exId, sel.name);
  const allSets = allHist.flatMap(h => h.sets);
  const bestW = allSets.length ? Math.max(...allSets.map(s => s.w)) : 0;
  const best1 = allSets.length ? Math.round(Math.max(...allSets.map(s => e1rm(s.w, s.r)))) : 0;
  const grouped = GROUPS.map(g => {
    const items = exs.filter(x => x.group === g.id).sort((a, b) => a.name.localeCompare(b.name));
    return items.length ? `<optgroup label="${g.name}">${items.map(x => `<option value="${x.exId}" ${x.exId === prog.exId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  const lastPt = pts[pts.length - 1], firstPt = pts[0];
  const delta = pts.length > 1 ? lastPt.y - firstPt.y : 0;
  const metricName = {top: 'Top set', e1rm: 'Est. 1RM', vol: 'Volume'}[prog.metric];
  el.innerHTML = `
    <select class="select" id="exSel">${grouped}</select>
    <div class="seg" style="margin-top:12px" id="metricSeg">
      ${[['top','Top set'],['e1rm','Est. 1RM'],['vol','Volume']].map(([k, l]) => `<button data-k="${k}" class="${prog.metric === k ? 'on' : ''}">${l}</button>`).join('')}
    </div>
    <div class="chart-card">
      <div class="chart-head">
        <div><div class="lbl" style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em" id="selLbl">${metricName} · latest</div>
          <div class="v" id="selVal">${lastPt ? fmtNum(lastPt.y) : '–'}<small>lb</small></div></div>
        <div class="d" id="selDate">${lastPt ? fmtDay(lastPt.date) : ''}<br>${pts.length > 1 ? `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(delta))} lb</span>` : ''}</div>
      </div>
      <div id="chartBox"></div>
      <div class="seg" style="margin-top:8px" id="rangeSeg">
        ${[['1m','1M'],['3m','3M'],['1y','1Y'],['all','All']].map(([k, l]) => `<button data-k="${k}" class="${prog.range === k ? 'on' : ''}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="pr-grid">
      <div class="stat"><div class="v">${fmtNum(bestW)}</div><div class="l">Heaviest (lb)</div></div>
      <div class="stat"><div class="v">${fmtNum(best1)}</div><div class="l">Best e1RM</div></div>
      <div class="stat"><div class="v">${allHist.length}</div><div class="l">Sessions</div></div>
    </div>
    <div class="section-title">History</div>
    <div class="set-group">${[...allHist].reverse().slice(0, 30).map(h => `<div class="set-item" style="font-weight:500;font-size:15px"><span class="grow">${fmtDay(h.date)}</span><span style="color:var(--muted);font-variant-numeric:tabular-nums;font-size:14px">${esc(setsStr(h.sets))}</span></div>`).join('')}</div>`;
  $('#chartBox').innerHTML = lineChart(pts, groupOf(sel.group).color);
  $('#exSel').onchange = ev => { prog.exId = ev.target.value; render(); };
  el.querySelectorAll('#metricSeg button').forEach(b => b.onclick = () => { prog.metric = b.dataset.k; render(); });
  el.querySelectorAll('#rangeSeg button').forEach(b => b.onclick = () => { prog.range = b.dataset.k; render(); });
  const svg = el.querySelector('svg.chart');
  if (svg && pts.length) {
    const pick = clientX => {
      const r = svg.getBoundingClientRect();
      const x = (clientX - r.left) / r.width * 360;
      let bi = 0, bd = 1e9;
      svg.querySelectorAll('.pt').forEach((c, i) => { const d = Math.abs(+c.getAttribute('cx') - x); if (d < bd) { bd = d; bi = i; } });
      svg.querySelectorAll('.pt').forEach((c, i) => c.setAttribute('r', i === bi ? 6 : 3.5));
      const p = pts[bi], g = svg.querySelector('.cursor'), c = svg.querySelectorAll('.pt')[bi];
      g.setAttribute('x1', c.getAttribute('cx')); g.setAttribute('x2', c.getAttribute('cx')); g.style.opacity = 1;
      $('#selLbl').textContent = metricName;
      $('#selVal').innerHTML = `${fmtNum(p.y)}<small>lb</small>`;
      $('#selDate').innerHTML = `${fmtDay(p.date)}<br><span style="font-size:12px">${esc(setsStr(p.sets))}</span>`;
    };
    svg.addEventListener('pointerdown', e => pick(e.clientX));
    svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') pick(e.clientX); });
  }
}
function lineChart(pts, color){
  const W = 360, H = 200, L = 40, R = 12, T = 14, B = 26;
  if (!pts.length) return `<div class="empty" style="padding:40px 0">No sessions in this range</div>`;
  const ys = pts.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= Math.max(5, lo * .1); hi += Math.max(5, hi * .1); }
  const span = hi - lo; lo = Math.max(0, lo - span * .15); hi = hi + span * .15;
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const t0 = parseDate(pts[0].date).getTime(), t1 = parseDate(pts[pts.length - 1].date).getTime();
  const xOf = (p, i) => pts.length === 1 ? (L + W - R) / 2 : (t1 === t0 ? L + (W - L - R) * i / (pts.length - 1) : L + (W - L - R) * (parseDate(p.date).getTime() - t0) / (t1 - t0));
  const yOf = y => T + (H - T - B) * (1 - (y - lo) / (hi - lo));
  const P = pts.map((p, i) => [xOf(p, i), yOf(p.y)]);
  const line = P.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `${line} L ${P[P.length - 1][0].toFixed(1)} ${H - B} L ${P[0][0].toFixed(1)} ${H - B} Z`;
  let grid = '';
  for (let v = lo; v <= hi + 1e-9; v += step) {
    const y = yOf(v);
    grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#262c38" stroke-width="1"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" fill="#6b7385" font-size="10.5">${v >= 10000 ? fmtNum(v / 1000) + 'k' : fmtNum(v)}</text>`;
  }
  const lbls = pts.length === 1 ? [0] : [0, pts.length - 1].concat(pts.length > 4 ? [Math.floor((pts.length - 1) / 2)] : []);
  const short = s => parseDate(s).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  const xl = [...new Set(lbls)].map(i => `<text x="${P[i][0]}" y="${H - 6}" text-anchor="${pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}" fill="#6b7385" font-size="10.5">${short(pts[i].date)}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    ${pts.length > 1 ? `<path d="${area}" fill="url(#ag)"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    <line class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#ffffff" stroke-opacity=".25" stroke-dasharray="3 3" style="opacity:0"/>
    ${P.map((p, i) => `<circle class="pt" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === P.length - 1 ? 6 : 3.5}" fill="${color}" stroke="#151922" stroke-width="2"/>`).join('')}
    ${xl}
  </svg>`;
}
function niceStep(raw){
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/* ---------- Settings ---------- */
function renderSettings(el){
  setHeader('Settings', 'Lift Log');
  const lastBackup = localStorage.getItem('liftlog.lastBackup');
  el.innerHTML = `
    <div class="section-title">Training phase</div>
    <div class="set-group">
      <button class="set-item" id="phaseBtn"><span class="grow">${db.phase ? PHASES[db.phase.id].icon + ' ' + PHASES[db.phase.id].name : 'Not set'}<span class="sub">${db.phase ? phaseLabel() + ' · started ' + fmtDay(db.phase.start) : 'Pick bulking or cutting'} · tap to change</span></span>›</button>
    </div>
    <div class="section-title">Profile</div>
    <div class="set-group">
      <button class="set-item" id="targetsSet"><span class="grow">Nutrition targets<span class="sub">${(() => { const T = foodTargets(); return T.source === 'none' ? 'Not set' : `${T.kcal || '–'} kcal · P ${T.p || '–'} · C ${T.c || '–'} · F ${T.f || '–'} g · ${T.source === 'coach' ? 'from coach' : 'yours'}`; })()}</span></span>›</button>
      <button class="set-item" id="heightSet"><span class="grow">Height<span class="sub">${fmtHeight(db.profile.height)}${db.profile.height ? ' · ' + fmtNum(db.profile.height) + ' in' : ''} · used for BMI</span></span>›</button>
    </div>
    <div class="section-title">Rest timer</div>
    <div class="set-group">
      <button class="set-item" id="rtOn"><span class="grow">Rest timer<span class="sub">Starts when a set has weight and reps · dings at 10 s and at 0</span></span><span class="tog ${db.settings.restTimer ? 'on' : ''}">${db.settings.restTimer ? 'On' : 'Off'}</span></button>
      <button class="set-item" id="rtSound"><span class="grow">Sound<span class="sub">Generated beep · mixes with your music</span></span><span class="tog ${db.settings.restSound ? 'on' : ''}">${db.settings.restSound ? 'On' : 'Off'}</span></button>
      <div class="set-item rt-vol"><span class="grow">Volume<span class="sub">${Math.round(db.settings.restVolume * 100)}%</span></span><input type="range" id="rtVol" min="0" max="100" step="5" value="${Math.round(db.settings.restVolume * 100)}"><button class="mini-btn" id="rtTest">Test</button></div>
      <div class="set-item"><span class="grow">Rest length<span class="sub">Plan uses each exercise's rest (defaults: Bulk ${DEFAULT_REST.bulk.compound}s compound / ${DEFAULT_REST.bulk.isolation}s isolation · Cut ${DEFAULT_REST.cut.compound}s / ${DEFAULT_REST.cut.isolation}s)</span></span>
        <select id="rtLen" class="mini-select"><option value="">Plan</option>${[45, 60, 75, 90, 120, 150, 180, 240].map(x => `<option value="${x}" ${db.settings.restOverride === x ? 'selected' : ''}>${restLabel(x)}</option>`).join('')}</select></div>
    </div>
    <p class="note">The timer keeps exact time if you lock the phone, but iPhone can't ding while the screen is locked or Lift Log is in the background; keep the screen on during rest (the countdown shows the right time when you come back). Sound follows the silent switch.</p>
    ${coachSettingsHtml()}
    <div class="section-title">Backup</div>
    <div class="set-group">
      <button class="set-item" id="exportBtn"><span class="grow">Export backup<span class="sub">${lastBackup ? 'Last backup ' + daysAgo(lastBackup) : 'Never backed up'} · saves a .json file</span></span>⬇︎</button>
      <button class="set-item" id="importBtn"><span class="grow">Import backup<span class="sub">Restore from a .json file</span></span>⬆︎</button>
    </div>
    <input type="file" id="fileIn" accept="application/json,.json" class="hidden">
    <p class="note">Your data lives only on this phone. iOS can clear web-app storage if the app goes unused for a long time, so export a backup now and then (save it to Files or iCloud Drive).</p>
    <div class="section-title">Exercises</div>
    <div class="set-group">
      ${GROUPS.map(g => `<button class="set-item" data-g="${g.id}"><span class="dot" style="--c:${g.color}"></span><span class="grow">${g.name}<span class="sub">${db.exercises[g.id].length} exercises · ${FOCUS_META[g.id].map(f => f.name).join(', ')}</span></span>›</button>`).join('')}
      <button class="set-item" id="resetEx"><span class="grow">Restore default exercises<span class="sub">Re-adds missing defaults to each focus</span></span></button>
    </div>
    <div class="section-title">Data</div>
    <div class="set-group">
      <div class="set-item" style="font-weight:500"><span class="grow">Workouts logged</span><span style="color:var(--muted)">${db.sessions.length}</span></div>
      <button class="set-item red" id="wipe"><span class="grow">Erase all data</span></button>
    </div>
    <p class="note">Install: open in Safari → Share → <b>Add to Home Screen</b>. Est. 1RM uses the Epley formula. Version ${APP_VERSION}.</p>`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { switchTab('workout'); push({v:'focus', g: b.dataset.g, date: todayStr()}); });
  $('#exportBtn').onclick = exportData;
  $('#phaseBtn').onclick = () => { switchTab('workout'); push({v:'phase'}); };
  bindCoachSettings();
  $('#heightSet').onclick = heightSheet;
  $('#targetsSet').onclick = targetsSheet;
  $('#rtOn').onclick = () => { db.settings.restTimer = !db.settings.restTimer; if (!db.settings.restTimer) Rest.skip(); save(); render(); };
  $('#rtSound').onclick = () => { db.settings.restSound = !db.settings.restSound; save(); render(); };
  $('#rtVol').oninput = ev => { db.settings.restVolume = +ev.target.value / 100; ev.target.closest('.set-item').querySelector('.sub').textContent = ev.target.value + '%'; };
  $('#rtVol').onchange = () => { save(); Ding.unlock(); Ding.play('warn'); };
  $('#rtTest').onclick = () => { Ding.unlock(); if (!db.settings.restSound) toast('Sound is off'); else Ding.play('go'); };
  $('#rtLen').onchange = ev => { db.settings.restOverride = ev.target.value ? +ev.target.value : null; save(); render(); toast(ev.target.value ? 'Rest set to ' + restLabel(+ev.target.value) + ' for every exercise' : 'Using plan rest times'); };
  $('#importBtn').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = importData;
  $('#resetEx').onclick = () => {
    let added = 0;
    for (const ph of Object.keys(PHASES)) for (const g of GROUPS) {
      const before = db.exercises[g.id].length;
      const fresh = buildPlan(ph, g.id, db.exercises);
      added += db.exercises[g.id].length - before;
      const plan = db.plans[ph][g.id];
      for (const k of Object.keys(fresh)) for (const it of fresh[k]) if (!plan[k].some(i => i.exId === it.exId)) plan[k].push(it);
    }
    syncAll(db);
    save(); render(); toast(added ? `Added ${added} exercise${added > 1 ? 's' : ''}` : 'All defaults present');
  };
  $('#wipe').onclick = () => {
    if (!confirm('Erase ALL workouts and exercises? This cannot be undone.')) return;
    if (!confirm('Really erase everything? Export a backup first if unsure.')) return;
    db = freshDb(); if (window.MyChart) MyChart.disconnect(); save(); stacks.workout = [{v:'phase'}]; switchTab('workout'); toast('All data erased');
  };
}
function exportPayload(){
  const now = new Date().toISOString();
  return {app: 'liftlog', appVersion: APP_VERSION, exported: now, exportedAt: now, ...db};
}
async function exportData(){
  const json = JSON.stringify(exportPayload(), null, 2);
  const name = `liftlog-backup-${todayStr()}.json`;
  const file = new File([json], name, {type: 'application/json'});
  localStorage.setItem('liftlog.lastBackup', todayStr());
  try {
    if (navigator.canShare && navigator.canShare({files: [file]})) { await navigator.share({files: [file], title: 'Lift Log backup'}); render(); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  render(); toast('Backup exported');
}
function importData(ev){
  const f = ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.exercises || !Array.isArray(d.sessions)) throw new Error('bad');
      if (!confirm(`Replace current data with backup (${d.sessions.length} workouts)?`)) return;
      db = migrate({version: d.version || 1, exercises: d.exercises, plans: d.plans, phase: d.phase === undefined ? db.phase : d.phase, coach: d.coach || db.coach, sessions: d.sessions,
        body: Array.isArray(d.body) ? d.body : db.body, profile: d.profile || db.profile,
        peds: d.peds && typeof d.peds === 'object' ? d.peds : db.peds, food: d.food && typeof d.food === 'object' ? d.food : db.food,
        labs: d.labs && typeof d.labs === 'object' && !Array.isArray(d.labs) ? d.labs : db.labs, settings: d.settings || db.settings});
      save(); render(); toast('Backup restored');
    } catch (e) { toast('That file is not a Lift Log backup'); }
    ev.target.value = '';
  };
  r.readAsText(f);
}

/* ---------- Body log ---------- */
const BODY_FIELDS = [
  {k: 'bf', label: 'Body fat', unit: '%', step: '0.1', max: 70},
  {k: 'waist', label: 'Waist', unit: 'in', step: '0.1', max: 80},
  {k: 'chest', label: 'Chest', unit: 'in', step: '0.1', max: 80},
  {k: 'arm', label: 'Arms', unit: 'in', step: '0.1', max: 40},
  {k: 'thigh', label: 'Thighs', unit: 'in', step: '0.1', max: 60}
];
const bodySorted = () => [...db.body].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
const bmi = w => db.profile && db.profile.height > 0 && w > 0 ? 703 * w / (db.profile.height * db.profile.height) : null;
const fmtHeight = h => h ? `${Math.floor(h / 12)}′${fmtNum(h % 12)}″` : 'Not set';
const dateAdd = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
/** one point per date (average of same-day entries) + trailing 7-day rolling average */
function weightSeries(){
  const byDate = new Map();
  for (const e of db.body) if (e.weight > 0) { const a = byDate.get(e.date) || []; a.push(e.weight); byDate.set(e.date, a); }
  const pts = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, ws]) => ({date, y: ws.reduce((x, y) => x + y, 0) / ws.length}));
  for (const p of pts) {
    const from = dateAdd(p.date, -6), win = pts.filter(q => q.date >= from && q.date <= p.date);
    p.avg = win.reduce((a, q) => a + q.y, 0) / win.length;
  }
  return pts;
}
function renderBody(el){
  const list = bodySorted(), latest = list[0];
  setHeader('Body', list.length ? `${list.length} entr${list.length === 1 ? 'y' : 'ies'}` : 'Weight & measurements');
  const series = weightSeries(), lastAvg = series.length ? series[series.length - 1].avg : null;
  const weekAgo = series.length ? series.filter(p => p.date <= dateAdd(series[series.length - 1].date, -7)).pop() : null;
  const b = latest ? bmi(latest.weight) : null;
  el.innerHTML = `
    <div class="hero">
      <div class="stat"><div class="v">${latest ? fmtNum(latest.weight) : '–'}</div><div class="l">Latest (lb)</div></div>
      <div class="stat"><div class="v">${lastAvg ? fmtNum(Math.round(lastAvg * 10) / 10) : '–'}</div><div class="l">7-day avg</div></div>
      <div class="stat"><div class="v">${b ? fmtNum(Math.round(b * 10) / 10) : '–'}</div><div class="l">BMI</div></div>
    </div>
    ${weekAgo && lastAvg ? `<p class="note" style="margin:0 6px 4px">7-day avg ${lastAvg - weekAgo.avg >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(Math.round((lastAvg - weekAgo.avg) * 10) / 10))} lb vs a week earlier</p>` : ''}
    <div class="btn-row"><button class="btn primary" id="addBody">＋ Log body weight</button></div>
    <div class="btn-row"><button class="btn small" id="heightBtn">📏 Height: ${fmtHeight(db.profile.height)}</button>${series.length > 1 ? `<button class="btn small" id="trendBtn">📈 Weight trend</button>` : ''}</div>
    <div class="section-title">History</div>
    ${list.length ? `<div class="list">${list.map(e => `
      <button class="row body-row" data-id="${esc(e.id)}">
        <div class="main"><div class="name">${fmtNum(e.weight)} lb${e.bf ? ` <span class="pill">${fmtNum(e.bf)}% bf</span>` : ''}</div>
          <div class="meta">${fmtDay(e.date, true)}${BODY_FIELDS.filter(f => f.k !== 'bf' && e[f.k]).map(f => ` · ${f.label} ${fmtNum(e[f.k])}″`).join('')}</div>
          ${e.note ? `<div class="meta body-note">${esc(e.note)}</div>` : ''}</div>
        <svg class="chev" width="20" height="20" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>`).join('')}</div>` : `<div class="empty" style="padding:30px 10px"><div class="ico">⚖️</div><p>Log your weight (and optional measurements) to track your bulk or cut.</p></div>`}`;
  $('#addBody').onclick = () => bodySheet(null);
  $('#heightBtn').onclick = heightSheet;
  if ($('#trendBtn')) $('#trendBtn').onclick = () => { prog.mode = 'body'; switchTab('progress'); };
  el.querySelectorAll('.body-row').forEach(r => r.onclick = () => bodySheet(db.body.find(x => String(x.id) === r.dataset.id)));
}
function bodySheet(e){
  const v = (k) => e && e[k] != null && e[k] !== '' ? e[k] : '';
  openSheet(`<h2>${e ? 'Edit entry' : 'Log body weight'}</h2>
    <div class="two">
      <div><label class="form-label">Date</label><input class="text-input" id="bDate" type="date" value="${e ? e.date : todayStr()}" max="${todayStr()}"></div>
      <div><label class="form-label">Weight (lb) *</label><input class="text-input big-num" id="bWeight" type="number" inputmode="decimal" step="0.1" min="0" value="${v('weight')}" placeholder="${bodySorted()[0] ? fmtNum(bodySorted()[0].weight) : '0'}"></div>
    </div>
    <label class="form-label">Optional</label>
    <div class="body-grid">${BODY_FIELDS.map(f => `<div class="field"><input type="number" inputmode="decimal" step="${f.step}" min="0" id="b_${f.k}" value="${v(f.k)}" placeholder="${f.label}"><span class="unit">${f.unit}</span></div>`).join('')}</div>
    <label class="form-label">Note</label><input class="text-input" id="bNote" maxlength="140" value="${esc(v('note'))}" placeholder="e.g. morning, fasted">
    <div class="btn-row" style="margin-top:18px"><button class="btn primary" id="bSave">${e ? 'Save changes' : 'Save entry'}</button></div>
    ${e ? `<div class="btn-row"><button class="btn small danger" id="bDel">Delete entry</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="bCancel">Cancel</button></div>`);
  if (!e) setTimeout(() => $('#bWeight').focus(), 250);
  $('#bCancel').onclick = closeSheet;
  $('#bSave').onclick = () => {
    const weight = parseFloat($('#bWeight').value);
    if (!(weight > 0 && weight < 1500)) { toast('Enter your body weight'); return; }
    const date = $('#bDate').value || todayStr();
    const entry = {id: e ? e.id : uid(), date, weight: Math.round(weight * 10) / 10};
    for (const f of BODY_FIELDS) { const x = parseFloat($('#b_' + f.k).value); entry[f.k] = x > 0 && x <= f.max ? Math.round(x * 10) / 10 : null; }
    entry.note = $('#bNote').value.trim().slice(0, 140);
    if (e) Object.assign(e, entry); else db.body.push(entry);
    save(); closeSheet(); render(); toast(e ? 'Updated' : '✓ Weight logged');
  };
  if ($('#bDel')) $('#bDel').onclick = () => {
    if (!confirm('Delete this body entry?')) return;
    db.body = db.body.filter(x => x !== e); save(); closeSheet(); render(); toast('Entry deleted');
  };
}
function heightSheet(){
  const h = db.profile.height || 0;
  openSheet(`<h2>Your height</h2>
    <div class="two">
      <div><label class="form-label">Feet</label><input class="text-input big-num" id="hFt" type="number" inputmode="numeric" value="${h ? Math.floor(h / 12) : ''}" placeholder="5"></div>
      <div><label class="form-label">Inches</label><input class="text-input big-num" id="hIn" type="number" inputmode="decimal" step="0.5" value="${h ? fmtNum(h % 12) : ''}" placeholder="10"></div>
    </div>
    <p class="note">Stored as total inches. Used for BMI.</p>
    <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="hSave">Save height</button></div>
    <div class="btn-row"><button class="btn small" id="hCancel">Cancel</button></div>`);
  $('#hCancel').onclick = closeSheet;
  $('#hSave').onclick = () => {
    const total = (parseFloat($('#hFt').value) || 0) * 12 + (parseFloat($('#hIn').value) || 0);
    if (!(total >= 36 && total <= 96)) { toast('Enter a height between 3′ and 8′'); return; }
    db.profile.height = Math.round(total * 10) / 10; save(); closeSheet(); render(); toast('Height saved');
  };
}
function renderBodyProgress(el){
  setHeader('Progress', 'Body weight trend');
  let pts = weightSeries();
  if (!pts.length) {
    el.innerHTML = `<div class="empty"><div class="ico">⚖️</div><h3>No weigh-ins yet</h3><p>Log your body weight on the Body tab to see the trend and 7-day average.</p><button class="btn primary" id="go">Log body weight</button></div>`;
    $('#go').onclick = () => openTrack('body');
    return;
  }
  if (prog.range !== 'all') {
    const d = new Date(); d.setDate(d.getDate() - (prog.range === '1m' ? 30 : prog.range === '3m' ? 91 : 365));
    const cut = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    pts = pts.filter(p => p.date >= cut);
  }
  const last = pts[pts.length - 1], first = pts[0];
  const delta = last && pts.length > 1 ? last.avg - first.avg : 0;
  const all = weightSeries();
  const r1 = n => fmtNum(Math.round(n * 10) / 10);
  el.innerHTML = `
    <div class="chart-card">
      <div class="chart-head">
        <div><div class="lbl" style="font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em" id="selLbl">7-day average</div>
          <div class="v" id="selVal">${last ? r1(last.avg) : '–'}<small>lb</small></div></div>
        <div class="d" id="selDate">${last ? fmtDay(last.date) + ' · ' + r1(last.y) + ' lb' : ''}<br>${pts.length > 1 ? `<span class="delta ${delta <= 0 ? 'up' : 'down'}" style="color:var(--muted)">${delta >= 0 ? '▲' : '▼'} ${r1(Math.abs(delta))} lb</span>` : ''}</div>
      </div>
      <div id="chartBox">${pts.length ? weightChart(pts) : '<div class="empty" style="padding:40px 0">No weigh-ins in this range</div>'}</div>
      <div class="legend"><span><i class="lg-dot"></i>Weigh-in</span><span><i class="lg-line"></i>7-day avg</span></div>
      <div class="seg" style="margin-top:8px" id="rangeSeg">
        ${[['1m','1M'],['3m','3M'],['1y','1Y'],['all','All']].map(([k, l]) => `<button data-k="${k}" class="${prog.range === k ? 'on' : ''}">${l}</button>`).join('')}
      </div>
    </div>
    <div class="pr-grid">
      <div class="stat"><div class="v">${r1(Math.min(...all.map(p => p.y)))}</div><div class="l">Lowest</div></div>
      <div class="stat"><div class="v">${r1(Math.max(...all.map(p => p.y)))}</div><div class="l">Highest</div></div>
      <div class="stat"><div class="v">${db.body.length}</div><div class="l">Weigh-ins</div></div>
    </div>
    <div class="btn-row"><button class="btn small" id="toBody">⚖️ Open body log</button></div>`;
  el.querySelectorAll('#rangeSeg button').forEach(b => b.onclick = () => { prog.range = b.dataset.k; render(); });
  $('#toBody').onclick = () => openTrack('body');
  const svg = el.querySelector('svg.chart');
  if (svg) {
    const pick = clientX => {
      const r = svg.getBoundingClientRect(), x = (clientX - r.left) / r.width * 360;
      const cs = [...svg.querySelectorAll('.pt')]; let bi = 0, bd = 1e9;
      cs.forEach((c, i) => { const dd = Math.abs(+c.getAttribute('cx') - x); if (dd < bd) { bd = dd; bi = i; } });
      cs.forEach((c, i) => c.setAttribute('r', i === bi ? 5.5 : 3));
      const p = pts[bi], cur = svg.querySelector('.cursor');
      cur.setAttribute('x1', cs[bi].getAttribute('cx')); cur.setAttribute('x2', cs[bi].getAttribute('cx')); cur.style.opacity = 1;
      $('#selLbl').textContent = 'Weigh-in';
      $('#selVal').innerHTML = `${r1(p.y)}<small>lb</small>`;
      $('#selDate').innerHTML = `${fmtDay(p.date)}<br><span style="font-size:12px">7-day avg ${r1(p.avg)} lb</span>`;
    };
    svg.addEventListener('pointerdown', e => pick(e.clientX));
    svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') pick(e.clientX); });
  }
}
function weightChart(pts){
  const W = 360, H = 200, L = 40, R = 12, T = 14, B = 26, color = '#2ec4ff', avgColor = '#ffc145';
  const ys = pts.flatMap(p => [p.y, p.avg]);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
  const span = hi - lo; lo -= span * .12; hi += span * .12;
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const t0 = parseDate(pts[0].date).getTime(), t1 = parseDate(pts[pts.length - 1].date).getTime();
  const xOf = p => pts.length === 1 || t1 === t0 ? (L + W - R) / 2 : L + (W - L - R) * (parseDate(p.date).getTime() - t0) / (t1 - t0);
  const yOf = y => T + (H - T - B) * (1 - (y - lo) / (hi - lo));
  const path = key => pts.map((p, i) => (i ? 'L' : 'M') + xOf(p).toFixed(1) + ' ' + yOf(p[key]).toFixed(1)).join(' ');
  let grid = '';
  for (let v = lo; v <= hi + 1e-9; v += step) { const y = yOf(v); grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#262c38"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" fill="#6b7385" font-size="10.5">${fmtNum(Math.round(v * 10) / 10)}</text>`; }
  const short = s => parseDate(s).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
  const lbl = pts.length === 1 ? `<text x="${xOf(pts[0])}" y="${H - 6}" text-anchor="middle" fill="#6b7385" font-size="10.5">${short(pts[0].date)}</text>`
    : `<text x="${L}" y="${H - 6}" fill="#6b7385" font-size="10.5">${short(pts[0].date)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" fill="#6b7385" font-size="10.5">${short(pts[pts.length - 1].date)}</text>`;
  return `<svg class="chart weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Body weight chart">
    ${grid}
    ${pts.length > 1 ? `<path d="${path('y')}" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="1.2"/>` : ''}
    ${pts.length > 1 ? `<path class="avg-line" d="${path('avg')}" fill="none" stroke="${avgColor}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    <line class="cursor" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#fff" stroke-opacity=".25" stroke-dasharray="3 3" style="opacity:0"/>
    ${pts.map(p => `<circle class="pt" cx="${xOf(p).toFixed(1)}" cy="${yOf(p.y).toFixed(1)}" r="3" fill="${color}" stroke="#151922" stroke-width="1.5"/>`).join('')}
    ${lbl}
  </svg>`;
}

/* ---------- Track hub: Body · Food · Protocol ---------- */
const TRACK_MODES = [['body', '⚖️', 'Body'], ['food', '🍽️', 'Food'], ['protocol', '💉', 'Protocol'], ['labs', '🩸', 'Labs']];
let trackMode = localStorage.getItem('liftlog.trackMode') || 'body';
if (!TRACK_MODES.some(m => m[0] === trackMode)) trackMode = 'body';
function openTrack(mode){ trackMode = mode; localStorage.setItem('liftlog.trackMode', mode); stacks.track = [{v:'track'}]; switchTab('track'); }
function renderTrack(el){
  ({body: renderBody, food: renderFood, protocol: renderProtocol, labs: renderLabs})[trackMode](el);
  el.insertAdjacentHTML('afterbegin', `<div class="seg track-seg" id="trackSeg">${TRACK_MODES.map(([k, i, l]) => `<button data-m="${k}" class="${trackMode === k ? 'on' : ''}">${i} ${l}</button>`).join('')}</div>`);
  el.querySelectorAll('#trackSeg button').forEach(b => b.onclick = () => { trackMode = b.dataset.m; localStorage.setItem('liftlog.trackMode', trackMode); render(); window.scrollTo(0, 0); });
}
const numOrNull = (v, hi = 1e6) => { const x = parseFloat(v); return Number.isFinite(x) && x >= 0 && x <= hi ? Math.round(x * 10) / 10 : null; };
const nowLocal = () => { const d = new Date(); return `${todayStr()}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtTime = at => { const [h, m] = at.slice(11, 16).split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
const weekStart = (s = todayStr()) => { const d = parseDate(s), wd = (d.getDay() + 6) % 7; return dateAdd(s, -wd); }; // Monday

/* ----- Food ----- */
const MEALS = [['breakfast', 'Breakfast', '🍳'], ['lunch', 'Lunch', '🥗'], ['dinner', 'Dinner', '🍽️'], ['snack', 'Snacks', '🍎']];
let foodDate = todayStr();
const MACROS = [['p', 'Protein', '#4f8cff'], ['c', 'Carbs', '#ffc145'], ['f', 'Fat', '#ff6b35']];
const kcalOf = e => e.kcal != null ? e.kcal : Math.round(4 * (e.p || 0) + 4 * (e.c || 0) + 9 * (e.f || 0));
function foodTargets(){
  const coachT = db.coach && db.coach.nutrition && db.coach.nutrition[curPhase()];
  const manual = db.food.targets, hasManual = Object.values(manual).some(x => x);
  if (db.food.targetsSource !== 'manual' && coachT) return {...coachT, source: 'coach'};
  return hasManual ? {...manual, source: 'manual'} : coachT ? {...coachT, source: 'coach'} : {kcal: null, p: null, c: null, f: null, source: 'none'};
}
function dayTotals(date){
  const t = {kcal: 0, p: 0, c: 0, f: 0, n: 0};
  for (const e of db.food.entries) if (e.date === date) { t.kcal += kcalOf(e); t.p += e.p || 0; t.c += e.c || 0; t.f += e.f || 0; t.n++; }
  for (const k of ['kcal', 'p', 'c', 'f']) t[k] = Math.round(t[k] * 10) / 10;
  return t;
}
function recentFoods(){
  const seen = new Set(), out = [];
  for (const e of [...db.food.entries].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))) {
    const k = lc(e.name); if (seen.has(k)) continue; seen.add(k); out.push(e); if (out.length >= 12) break;
  }
  return out;
}
function renderFood(el){
  const t = dayTotals(foodDate), T = foodTargets();
  setHeader('Food', fmtDay(foodDate, true));
  const bar = (v, max, color) => `<div class="mbar"><i style="width:${max ? Math.min(100, v / max * 100) : 0}%;background:${color}${max && v > max ? ';opacity:.6' : ''}"></i></div>`;
  const entries = db.food.entries.filter(e => e.date === foodDate);
  el.innerHTML = `
    <div class="date-nav"><button class="icon-btn" id="fPrev" aria-label="Previous day">‹</button><input type="date" id="fDate" value="${foodDate}" max="${todayStr()}"><button class="icon-btn" id="fNext" aria-label="Next day" ${foodDate >= todayStr() ? 'disabled' : ''}>›</button></div>
    <div class="food-totals">
      <div class="ft-kcal"><div><span class="big">${fmtNum(t.kcal)}</span><span class="of">${T.kcal ? ' / ' + fmtNum(T.kcal) + ' kcal' : ' kcal'}</span></div>
        <div class="ft-left">${T.kcal ? (T.kcal - t.kcal >= 0 ? fmtNum(Math.round(T.kcal - t.kcal)) + ' left' : fmtNum(Math.round(t.kcal - T.kcal)) + ' over') : '<button class="mini-btn" id="setTargets">Set targets</button>'}</div></div>
      ${bar(t.kcal, T.kcal, 'linear-gradient(90deg,var(--accent),var(--accent2))')}
      <div class="ft-macros">${MACROS.map(([k, l, c]) => `<div><div class="ml"><b>${fmtNum(t[k])}</b>${T[k] ? `<span> / ${fmtNum(T[k])} g</span>` : ' g'}</div>${bar(t[k], T[k], c)}<div class="mn">${l}</div></div>`).join('')}</div>
      ${T.source !== 'none' ? `<div class="ft-src">${T.source === 'coach' ? '🧠 Coach targets · ' + PHASES[curPhase()].short : 'Your targets'} · <button class="linkish" id="editTargets">Edit</button></div>` : ''}
    </div>
    ${MEALS.map(([m, label, ico]) => {
      const list = entries.filter(e => e.meal === m), mk = list.reduce((a, e) => a + kcalOf(e), 0);
      return `<div class="meal-head"><span>${ico} ${label}</span><span class="mk">${list.length ? fmtNum(mk) + ' kcal' : ''}</span><button class="mini-btn" data-addmeal="${m}">＋ Add</button></div>
        ${list.length ? `<div class="list">${list.map(e => `<button class="row food-row" data-id="${esc(e.id)}"><div class="main"><div class="name">${esc(e.name)}</div>
          <div class="meta">${e.qty ? esc(e.qty) + ' · ' : ''}P ${fmtNum(e.p || 0)} · C ${fmtNum(e.c || 0)} · F ${fmtNum(e.f || 0)}</div></div><div class="kc">${fmtNum(kcalOf(e))}<small> kcal</small></div></button>`).join('')}</div>` : ''}`;
    }).join('')}
    <div class="btn-row" style="margin-top:16px"><button class="btn primary" id="addFood">＋ Add food</button></div>`;
  const go = d => { foodDate = d > todayStr() ? todayStr() : d; render(); };
  $('#fPrev').onclick = () => go(dateAdd(foodDate, -1));
  $('#fNext').onclick = () => go(dateAdd(foodDate, 1));
  $('#fDate').onchange = ev => ev.target.value && go(ev.target.value);
  const h = new Date().getHours(), defMeal = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
  $('#addFood').onclick = () => foodSheet(null, defMeal);
  el.querySelectorAll('[data-addmeal]').forEach(b => b.onclick = () => foodSheet(null, b.dataset.addmeal));
  el.querySelectorAll('.food-row').forEach(r => r.onclick = () => foodSheet(db.food.entries.find(e => String(e.id) === r.dataset.id)));
  if ($('#setTargets')) $('#setTargets').onclick = targetsSheet;
  if ($('#editTargets')) $('#editTargets').onclick = targetsSheet;
}
function foodSheet(e, meal){
  const fav = db.food.favorites, rec = recentFoods().filter(r => !fav.some(f => lc(f.name) === lc(r.name)));
  let sel = e ? e.meal : meal;
  const val = k => e && e[k] != null ? e[k] : '';
  openSheet(`<h2>${e ? 'Edit food' : 'Add food'}</h2>
    <div class="seg" id="mealSeg">${MEALS.map(([m, l]) => `<button data-m="${m}" class="${sel === m ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${!e && (fav.length || rec.length) ? `
      ${fav.length ? `<label class="form-label">★ Favorites</label><div class="chips">${fav.map((f, i) => `<button class="chip" data-fav="${i}">★ ${esc(f.name)} <small>${fmtNum(kcalOf(f))}</small></button>`).join('')}</div>` : ''}
      ${rec.length ? `<label class="form-label">Recent</label><div class="chips">${rec.map((f, i) => `<button class="chip" data-rec="${i}">${esc(f.name)} <small>${fmtNum(kcalOf(f))}</small></button>`).join('')}</div>` : ''}` : ''}
    <label class="form-label">Food</label><input class="text-input" id="fName" maxlength="80" value="${esc(val('name'))}" placeholder="e.g. Chicken breast" autocomplete="off">
    <label class="form-label">Quantity</label><input class="text-input" id="fQty" maxlength="40" value="${esc(val('qty'))}" placeholder="e.g. 200 g, 1 cup, 2 eggs">
    <div class="four" style="margin-top:4px">
      <div><label class="form-label">kcal</label><input class="text-input" id="fKcal" type="number" inputmode="decimal" value="${val('kcal')}" placeholder="auto"></div>
      <div><label class="form-label">Protein g</label><input class="text-input" id="fP" type="number" inputmode="decimal" value="${val('p')}"></div>
      <div><label class="form-label">Carbs g</label><input class="text-input" id="fC" type="number" inputmode="decimal" value="${val('c')}"></div>
      <div><label class="form-label">Fat g</label><input class="text-input" id="fF" type="number" inputmode="decimal" value="${val('f')}"></div>
    </div>
    <label class="check"><input type="checkbox" id="fFav" ${e && fav.some(f => lc(f.name) === lc(e.name)) ? 'checked' : ''}> ★ Save to favorites</label>
    <p class="note">Leave kcal blank to calculate it from macros (4/4/9).</p>
    <div class="btn-row" style="margin-top:12px"><button class="btn primary" id="fSave">${e ? 'Save changes' : 'Add to ' + MEALS.find(x => x[0] === sel)[1]}</button></div>
    ${e ? `<div class="btn-row"><button class="btn small danger" id="fDel">Delete</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="fCancel">Cancel</button></div>`);
  $('#fCancel').onclick = closeSheet;
  $('#sheet').querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => {
    sel = b.dataset.m; $('#sheet').querySelectorAll('#mealSeg button').forEach(x => x.classList.toggle('on', x === b));
    if (!e) $('#fSave').textContent = 'Add to ' + MEALS.find(x => x[0] === sel)[1];
  });
  const fill = f => { $('#fName').value = f.name; $('#fQty').value = f.qty || ''; $('#fKcal').value = f.kcal ?? ''; $('#fP').value = f.p ?? ''; $('#fC').value = f.c ?? ''; $('#fF').value = f.f ?? ''; $('#fFav').checked = fav.some(x => lc(x.name) === lc(f.name)); };
  $('#sheet').querySelectorAll('[data-fav]').forEach(b => b.onclick = () => fill(fav[+b.dataset.fav]));
  $('#sheet').querySelectorAll('[data-rec]').forEach(b => b.onclick = () => fill(rec[+b.dataset.rec]));
  $('#fSave').onclick = () => {
    const name = $('#fName').value.trim();
    if (!name) { toast('Enter a food name'); return; }
    const p = numOrNull($('#fP').value, 1000), c = numOrNull($('#fC').value, 2000), f = numOrNull($('#fF').value, 1000);
    let kcal = numOrNull($('#fKcal').value, 10000);
    if (kcal == null) kcal = Math.round(4 * (p || 0) + 4 * (c || 0) + 9 * (f || 0));
    const item = {name, qty: $('#fQty').value.trim(), kcal, p: p || 0, c: c || 0, f: f || 0};
    if (e) Object.assign(e, item, {meal: sel});
    else db.food.entries.push({id: uid(), date: foodDate, meal: sel, ...item});
    const fi = fav.findIndex(x => lc(x.name) === lc(name));
    if ($('#fFav').checked) { if (fi >= 0) Object.assign(fav[fi], item); else fav.push({id: uid(), ...item}); }
    else if (fi >= 0) fav.splice(fi, 1);
    save(); closeSheet(); render(); toast(e ? 'Updated' : `✓ Added ${fmtNum(kcal)} kcal`);
  };
  if ($('#fDel')) $('#fDel').onclick = () => { db.food.entries = db.food.entries.filter(x => x !== e); save(); closeSheet(); render(); toast('Deleted'); };
}
function targetsSheet(){
  const coachT = db.coach.nutrition && db.coach.nutrition[curPhase()], m = db.food.targets;
  openSheet(`<h2>Nutrition targets</h2>
    ${coachT ? `<div class="sheet-ctx" style="--c:var(--green)">🧠 Coach (${PHASES[curPhase()].short}): ${coachT.kcal || '–'} kcal · P ${coachT.p || '–'} · C ${coachT.c || '–'} · F ${coachT.f || '–'} g</div>` : `<p class="note" style="margin:0 2px 6px">No coach targets published yet. Set your own below.</p>`}
    <label class="form-label">Your targets (per day)</label>
    <div class="four">
      <div><label class="form-label">kcal</label><input class="text-input" id="tK" type="number" inputmode="numeric" value="${m.kcal ?? ''}"></div>
      <div><label class="form-label">Protein g</label><input class="text-input" id="tP" type="number" inputmode="numeric" value="${m.p ?? ''}"></div>
      <div><label class="form-label">Carbs g</label><input class="text-input" id="tC" type="number" inputmode="numeric" value="${m.c ?? ''}"></div>
      <div><label class="form-label">Fat g</label><input class="text-input" id="tF" type="number" inputmode="numeric" value="${m.f ?? ''}"></div>
    </div>
    <div class="btn-row" style="margin-top:16px"><button class="btn primary" id="tSave">Use my targets</button></div>
    ${coachT ? `<div class="btn-row"><button class="btn small" id="tCoach">${db.food.targetsSource === 'coach' ? '✓ Using coach targets' : 'Use coach targets'}</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="tCancel">Cancel</button></div>`);
  $('#tCancel').onclick = closeSheet;
  $('#tSave').onclick = () => {
    db.food.targets = {kcal: numOrNull($('#tK').value, 10000), p: numOrNull($('#tP').value, 1000), c: numOrNull($('#tC').value, 2000), f: numOrNull($('#tF').value, 1000)};
    db.food.targetsSource = 'manual'; save(); closeSheet(); render(); toast('Targets saved');
  };
  if ($('#tCoach')) $('#tCoach').onclick = () => { db.food.targetsSource = 'coach'; save(); closeSheet(); render(); toast('Using coach targets'); };
}

/* ----- Protocol (personal compound log; neutral, no recommendations) ----- */
const COMPOUND_PRESETS = [
  ['Testosterone Enanthate', 'Enanthate', 250], ['Testosterone Cypionate', 'Cypionate', 200], ['Testosterone Propionate', 'Propionate', 100],
  ['Masteron Propionate', 'Propionate', 100], ['Masteron Enanthate', 'Enanthate', 200], ['Deca (Nandrolone Decanoate)', 'Decanoate', 250],
  ['NPP (Nandrolone Phenylpropionate)', 'Phenylpropionate', 100], ['Trenbolone Acetate', 'Acetate', 100], ['Trenbolone Enanthate', 'Enanthate', 200],
  ['Primobolan (Methenolone Enanthate)', 'Enanthate', 100], ['Equipoise (Boldenone Undecylenate)', 'Undecylenate', 300]];
const SITES = ['Glute L', 'Glute R', 'Delt L', 'Delt R', 'Quad L', 'Quad R', 'Ventroglute L', 'Ventroglute R', 'Lat L', 'Lat R', 'Pec L', 'Pec R', 'Sub-Q', 'Other'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const shotsPerWeek = c => c.schedule && c.schedule.type === 'weekdays' ? (c.schedule.days || []).length : (c.schedule && c.schedule.everyDays > 0 ? 7 / c.schedule.everyDays : 0);
const perShotMg = c => { const n = shotsPerWeek(c); return c.weeklyMg && n ? Math.round(c.weeklyMg / n * 10) / 10 : null; };
const mlFor = (c, mg) => c && c.mgPerMl > 0 && mg > 0 ? Math.round(mg / c.mgPerMl * 1000) / 1000 : null;
function scheduleLabel(c){
  const sc = c.schedule || {};
  if (sc.type === 'weekdays') return (sc.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => WEEKDAYS[d]).join('/') || 'No days set';
  return sc.everyDays ? (sc.everyDays === 1 ? 'Daily' : `Every ${fmtNum(sc.everyDays)} days`) : 'No schedule';
}
const dosesOf = id => db.peds.doses.filter(d => d.compoundId === id).sort((a, b) => a.at.localeCompare(b.at));
/** next scheduled date for a compound: {date, status: due|overdue|upcoming|inactive|ended|unscheduled} */
function nextDue(c, today = todayStr()){
  if (!c.active) return {date: null, status: 'inactive'};
  if (c.end && today > c.end) return {date: null, status: 'ended'};
  const sc = c.schedule || {}, start = c.start || today, ds = dosesOf(c.id), last = ds[ds.length - 1];
  let next = null;
  if (sc.type === 'weekdays') {
    const days = sc.days || [];
    if (!days.length) return {date: null, status: 'unscheduled'};
    const from = start > today ? start : today;
    for (let i = 0; i < 21 && !next; i++) {
      const d = dateAdd(from, i);
      if (days.includes(parseDate(d).getDay()) && !ds.some(x => x.at.slice(0, 10) === d)) next = d;
    }
  } else {
    if (!(sc.everyDays > 0)) return {date: null, status: 'unscheduled'};
    if (last) {
      const t = new Date(last.at.slice(0, 10) + 'T' + (last.at.slice(11, 16) || '12:00'));
      t.setTime(t.getTime() + sc.everyDays * 864e5);
      next = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
      if (next < start) next = start;
    } else next = start;
  }
  if (!next) return {date: null, status: 'unscheduled'};
  if (c.end && next > c.end) return {date: null, status: 'ended'};
  return {date: next, status: next < today ? 'overdue' : next === today ? 'due' : 'upcoming'};
}
function weekMg(id, ws = weekStart()){
  const we = dateAdd(ws, 6);
  return db.peds.doses.filter(d => d.compoundId === id && d.at.slice(0, 10) >= ws && d.at.slice(0, 10) <= we).reduce((a, d) => a + (d.mg || 0), 0);
}
function renderProtocol(el){
  const P = db.peds, active = P.compounds.filter(c => c.active);
  setHeader('Protocol', 'Personal log');
  const dues = active.map(c => ({c, n: nextDue(c)}));
  const today = dues.filter(x => x.n.status === 'due' || x.n.status === 'overdue');
  const upcoming = dues.filter(x => x.n.status === 'upcoming').sort((a, b) => a.n.date.localeCompare(b.n.date));
  const ws = weekStart();
  el.innerHTML = `
    <div class="section-title">Today</div>
    ${today.length ? `<div class="list">${today.map(({c, n}) => `<div class="row due-row ${n.status}"><div class="main"><div class="name">${esc(c.name)}</div>
        <div class="meta">${n.status === 'overdue' ? `⚠️ Was due ${fmtDay(n.date)}` : 'Due today'}${perShotMg(c) ? ` · planned ${fmtNum(perShotMg(c))} mg${mlFor(c, perShotMg(c)) ? ' (' + fmtNum(mlFor(c, perShotMg(c))) + ' mL)' : ''}` : ''}</div></div>
        <button class="mini-btn" data-log="${esc(c.id)}">Log</button></div>`).join('')}</div>`
      : `<div class="card muted-card">${active.length ? `Nothing scheduled today.${upcoming[0] ? ` Next: <b>${esc(upcoming[0].c.name)}</b> · ${fmtDay(upcoming[0].n.date)}` : ''}` : 'No active compounds yet. Add one to start your log.'}</div>`}
    ${active.length ? `<div class="section-title">This week <span class="st-sub">Mon ${parseDate(ws).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} – Sun</span></div>
    <div class="set-group">${active.map(c => {
      const mg = weekMg(c.id), n = dues.find(x => x.c === c).n;
      return `<div class="set-item wk-item"><span class="grow">${esc(c.name)}<span class="sub">${fmtNum(mg)}${c.weeklyMg ? ' / ' + fmtNum(c.weeklyMg) : ''} mg · next ${n.date ? fmtDay(n.date) : n.status}</span>
        ${c.weeklyMg ? `<span class="mbar"><i style="width:${Math.min(100, mg / c.weeklyMg * 100)}%;background:${mg > c.weeklyMg ? 'var(--red)' : 'var(--green)'}"></i></span>` : ''}</span></div>`;
    }).join('')}</div>` : ''}
    <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="logDose" ${P.compounds.length ? '' : 'disabled'}>＋ Log dose</button></div>
    <div class="btn-row"><button class="btn small" id="addCompound">＋ Compound</button><button class="btn small" id="addLab">＋ Health note</button></div>
    <div class="section-title">Compounds</div>
    ${P.compounds.length ? `<div class="list">${P.compounds.map(c => `<button class="row" data-comp="${esc(c.id)}"><div class="main"><div class="name">${esc(c.name)} ${c.active ? '<span class="pill done">Active</span>' : '<span class="pill">Off</span>'}</div>
      <div class="meta">${[c.ester, c.mgPerMl ? c.mgPerMl + ' mg/mL' : '', c.weeklyMg ? c.weeklyMg + ' mg/wk' : '', scheduleLabel(c)].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="meta">${c.start ? fmtDay(c.start) : 'No start'} → ${c.end ? fmtDay(c.end) : 'open-ended'}</div></div></button>`).join('')}</div>` : `<p class="note">No compounds yet.</p>`}
    <div class="section-title">Recent doses</div>
    ${P.doses.length ? `<div class="list">${[...P.doses].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30).map(d => `<button class="row dose-row" data-dose="${esc(d.id)}"><div class="main"><div class="name">${esc(d.name)}</div>
      <div class="meta">${fmtDay(d.at.slice(0, 10))} · ${fmtTime(d.at)}${d.site ? ' · ' + esc(d.site) : ''}${d.note ? ' · ' + esc(d.note) : ''}</div></div><div class="kc">${fmtNum(d.mg)}<small> mg</small>${d.ml ? `<div class="mlv">${fmtNum(d.ml)} mL</div>` : ''}</div></button>`).join('')}</div>` : `<p class="note">No doses logged yet.</p>`}
    <div class="section-title">Health notes${db.labs.results.length ? ` <button class="st-link" id="toLabs">MyChart labs (${db.labs.results.length}) ›</button>` : ''}</div>
    ${P.labs.length ? `<div class="list">${[...P.labs].sort((a, b) => b.date.localeCompare(a.date)).map(l => `<button class="row lab-row" data-lab="${esc(l.id)}"><div class="main"><div class="name">${l.kind === 'bloodwork' ? '🩸 Bloodwork' : l.kind === 'side-effect' ? '⚠️ Side effect' : '📝 Note'} <span class="pill">${fmtDay(l.date)}</span></div>
      <div class="meta lab-text">${esc(l.text)}</div></div></button>`).join('')}</div>` : `<p class="note">Bloodwork markers, side effects or anything else worth tracking.</p>`}
    <p class="note">Personal record-keeping only. Planned amounts are what you entered.</p>`;
  el.querySelectorAll('[data-log]').forEach(b => b.onclick = () => doseSheet(null, b.dataset.log));
  $('#logDose').onclick = () => doseSheet(null, (today[0] || upcoming[0] || {c: P.compounds[0]}).c.id);
  $('#addCompound').onclick = () => compoundSheet(null);
  $('#addLab').onclick = () => labSheet(null);
  if ($('#toLabs')) $('#toLabs').onclick = () => openTrack('labs');
  el.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => compoundSheet(P.compounds.find(c => c.id === b.dataset.comp)));
  el.querySelectorAll('[data-dose]').forEach(b => b.onclick = () => doseSheet(P.doses.find(d => d.id === b.dataset.dose)));
  el.querySelectorAll('[data-lab]').forEach(b => b.onclick = () => labSheet(P.labs.find(l => l.id === b.dataset.lab)));
}
function compoundSheet(c){
  const sc = c ? c.schedule || {} : {type: 'interval', everyDays: 3.5};
  let type = sc.type || 'interval', days = new Set(sc.days || []);
  openSheet(`<h2>${c ? 'Edit compound' : 'Add compound'}</h2>
    ${!c ? `<label class="form-label">Presets</label><div class="chips">${COMPOUND_PRESETS.map((p, i) => `<button class="chip" data-pre="${i}">${esc(p[0])}</button>`).join('')}</div>` : ''}
    <label class="form-label">Name</label><input class="text-input" id="cName" maxlength="60" value="${esc(c ? c.name : '')}" placeholder="Custom name">
    <div class="two">
      <div><label class="form-label">Ester</label><input class="text-input" id="cEster" maxlength="30" value="${esc(c ? c.ester || '' : '')}"></div>
      <div><label class="form-label">mg / mL</label><input class="text-input" id="cConc" type="number" inputmode="decimal" value="${c && c.mgPerMl ? c.mgPerMl : ''}"></div>
    </div>
    <label class="form-label">Planned mg per week</label><input class="text-input" id="cWeekly" type="number" inputmode="decimal" value="${c && c.weeklyMg ? c.weeklyMg : ''}">
    <label class="form-label">Schedule</label>
    <div class="seg" id="schedSeg"><button data-t="interval" class="${type === 'interval' ? 'on' : ''}">Every N days</button><button data-t="weekdays" class="${type === 'weekdays' ? 'on' : ''}">Weekdays</button></div>
    <div id="schedInterval" class="${type === 'interval' ? '' : 'hidden'}" style="margin-top:8px"><input class="text-input" id="cEvery" type="number" inputmode="decimal" step="0.5" value="${sc.everyDays || ''}" placeholder="e.g. 3.5"></div>
    <div id="schedDays" class="chips ${type === 'weekdays' ? '' : 'hidden'}" style="margin-top:8px">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip toggle ${days.has(d) ? 'on' : ''}" data-d="${d}" style="--c:var(--accent)">${WEEKDAYS[d]}</button>`).join('')}</div>
    <div class="two">
      <div><label class="form-label">Cycle start</label><input class="text-input" id="cStart" type="date" value="${c ? c.start || '' : todayStr()}"></div>
      <div><label class="form-label">Cycle end</label><input class="text-input" id="cEnd" type="date" value="${c ? c.end || '' : ''}"></div>
    </div>
    <label class="check"><input type="checkbox" id="cActive" ${!c || c.active ? 'checked' : ''}> Active</label>
    <label class="form-label">Notes</label><input class="text-input" id="cNotes" maxlength="200" value="${esc(c ? c.notes || '' : '')}">
    <p class="note">Check concentration against your vial label.</p>
    <div class="btn-row" style="margin-top:12px"><button class="btn primary" id="cSave">${c ? 'Save' : 'Add compound'}</button></div>
    ${c ? `<div class="btn-row"><button class="btn small danger" id="cDel">Delete compound</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="cCancel">Cancel</button></div>`);
  $('#cCancel').onclick = closeSheet;
  $('#sheet').querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { const p = COMPOUND_PRESETS[+b.dataset.pre]; $('#cName').value = p[0]; $('#cEster').value = p[1]; $('#cConc').value = p[2]; });
  $('#sheet').querySelectorAll('#schedSeg button').forEach(b => b.onclick = () => {
    type = b.dataset.t; $('#sheet').querySelectorAll('#schedSeg button').forEach(x => x.classList.toggle('on', x === b));
    $('#schedInterval').classList.toggle('hidden', type !== 'interval'); $('#schedDays').classList.toggle('hidden', type !== 'weekdays');
  });
  $('#sheet').querySelectorAll('#schedDays .chip').forEach(b => b.onclick = () => { const d = +b.dataset.d; days.has(d) ? days.delete(d) : days.add(d); b.classList.toggle('on'); });
  $('#cSave').onclick = () => {
    const name = $('#cName').value.trim();
    if (!name) { toast('Enter a name'); return; }
    const start = $('#cStart').value || null, end = $('#cEnd').value || null;
    if (start && end && end < start) { toast('End date is before start'); return; }
    const item = {name, ester: $('#cEster').value.trim(), mgPerMl: numOrNull($('#cConc').value, 10000), weeklyMg: numOrNull($('#cWeekly').value, 100000),
      schedule: type === 'weekdays' ? {type, days: [...days].sort()} : {type, everyDays: numOrNull($('#cEvery').value, 365)},
      start, end, active: $('#cActive').checked, notes: $('#cNotes').value.trim()};
    if (c) Object.assign(c, item); else db.peds.compounds.push({id: uid(), ...item});
    save(); closeSheet(); render(); toast(c ? 'Saved' : 'Compound added');
  };
  if ($('#cDel')) $('#cDel').onclick = () => {
    if (!confirm(`Delete ${c.name}? Logged doses stay in your history.`)) return;
    db.peds.compounds = db.peds.compounds.filter(x => x !== c); save(); closeSheet(); render(); toast('Deleted');
  };
}
function doseSheet(d, compoundId){
  const comps = db.peds.compounds;
  let comp = d ? comps.find(c => c.id === d.compoundId) : comps.find(c => c.id === compoundId) || comps[0];
  const lastSite = (() => { const ds = [...db.peds.doses].sort((a, b) => b.at.localeCompare(a.at)); return ds[0] && ds[0].site; })();
  let site = d ? d.site || '' : '';
  const mg0 = d ? d.mg : comp ? perShotMg(comp) || '' : '';
  openSheet(`<h2>${d ? 'Edit dose' : 'Log dose'}</h2>
    <label class="form-label">Compound</label>
    <select class="select" id="dComp">${comps.map(c => `<option value="${esc(c.id)}" ${comp && c.id === comp.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}${d && !comp ? `<option value="" selected>${esc(d.name)} (deleted)</option>` : ''}</select>
    <label class="form-label">Date & time</label><input class="text-input" id="dAt" type="datetime-local" value="${d ? d.at : nowLocal()}">
    <div class="two">
      <div><label class="form-label">mg</label><input class="text-input big-num" id="dMg" type="number" inputmode="decimal" value="${mg0}"></div>
      <div><label class="form-label">mL <span id="dConc" class="muted-inline"></span></label><input class="text-input big-num" id="dMl" type="number" inputmode="decimal" step="0.01" value="${d && d.ml ? d.ml : ''}"></div>
    </div>
    <label class="form-label">Site${lastSite ? ` <span class="muted-inline">last: ${esc(lastSite)}</span>` : ''}</label>
    <div class="chips" id="siteChips">${SITES.map(x => `<button class="chip toggle ${site === x ? 'on' : ''}" data-site="${x}" style="--c:var(--accent)">${x}</button>`).join('')}</div>
    <label class="form-label">Note</label><input class="text-input" id="dNote" maxlength="140" value="${esc(d ? d.note || '' : '')}">
    <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="dSave">${d ? 'Save' : 'Log dose'}</button></div>
    ${d ? `<div class="btn-row"><button class="btn small danger" id="dDel">Delete</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="dCancel">Cancel</button></div>`);
  const syncMl = () => { const ml = mlFor(comp, parseFloat($('#dMg').value)); $('#dMl').value = ml != null ? ml : ''; $('#dConc').textContent = comp && comp.mgPerMl ? `@ ${comp.mgPerMl} mg/mL` : ''; };
  if (!d || !d.ml) syncMl(); else $('#dConc').textContent = comp && comp.mgPerMl ? `@ ${comp.mgPerMl} mg/mL` : '';
  $('#dComp').onchange = ev => { comp = comps.find(c => c.id === ev.target.value); if (!d && comp && perShotMg(comp)) $('#dMg').value = perShotMg(comp); syncMl(); };
  $('#dMg').oninput = syncMl;
  $('#dMl').oninput = () => { const ml = parseFloat($('#dMl').value); if (comp && comp.mgPerMl && ml > 0) $('#dMg').value = Math.round(ml * comp.mgPerMl * 10) / 10; };
  $('#sheet').querySelectorAll('#siteChips .chip').forEach(b => b.onclick = () => { site = site === b.dataset.site ? '' : b.dataset.site; $('#sheet').querySelectorAll('#siteChips .chip').forEach(x => x.classList.toggle('on', x.dataset.site === site)); });
  $('#dCancel').onclick = closeSheet;
  $('#dSave').onclick = () => {
    const mg = numOrNull($('#dMg').value, 100000), at = $('#dAt').value;
    if (!(mg > 0)) { toast('Enter the amount in mg'); return; }
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(at)) { toast('Pick a date and time'); return; }
    const item = {compoundId: comp ? comp.id : (d && d.compoundId) || null, name: comp ? comp.name : d.name, at: at.slice(0, 16), mg, ml: (() => { const x = parseFloat($('#dMl').value); return Number.isFinite(x) && x > 0 && x <= 100 ? Math.round(x * 1000) / 1000 : mlFor(comp, mg); })(), site, note: $('#dNote').value.trim()};
    if (d) Object.assign(d, item); else db.peds.doses.push({id: uid(), ...item});
    save(); closeSheet(); render(); toast(d ? 'Saved' : '✓ Dose logged');
  };
  if ($('#dDel')) $('#dDel').onclick = () => { if (!confirm('Delete this dose?')) return; db.peds.doses = db.peds.doses.filter(x => x !== d); save(); closeSheet(); render(); toast('Deleted'); };
}
function labSheet(l){
  let kind = l ? l.kind : 'bloodwork';
  openSheet(`<h2>${l ? 'Edit note' : 'Health note'}</h2>
    <div class="seg" id="kindSeg">${[['bloodwork', '🩸 Bloodwork'], ['side-effect', '⚠️ Side effect'], ['note', '📝 Note']].map(([k, t]) => `<button data-k="${k}" class="${kind === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <label class="form-label">Date</label><input class="text-input" id="lDate" type="date" value="${l ? l.date : todayStr()}" max="${todayStr()}">
    <label class="form-label">Details</label><textarea class="text-input textarea" id="lText" maxlength="2000" placeholder="e.g. Total T 1100 ng/dL, E2 42 pg/mL, Hct 49%">${esc(l ? l.text : '')}</textarea>
    <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="lSave">Save</button></div>
    ${l ? `<div class="btn-row"><button class="btn small danger" id="lDel">Delete</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="lCancel">Cancel</button></div>`);
  $('#sheet').querySelectorAll('#kindSeg button').forEach(b => b.onclick = () => { kind = b.dataset.k; $('#sheet').querySelectorAll('#kindSeg button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#lCancel').onclick = closeSheet;
  $('#lSave').onclick = () => {
    const text = $('#lText').value.trim();
    if (!text) { toast('Add some details'); return; }
    const item = {date: $('#lDate').value || todayStr(), kind, text};
    if (l) Object.assign(l, item); else db.peds.labs.push({id: uid(), ...item});
    save(); closeSheet(); render(); toast('Saved');
  };
  if ($('#lDel')) $('#lDel').onclick = () => { db.peds.labs = db.peds.labs.filter(x => x !== l); save(); closeSheet(); render(); toast('Deleted'); };
}

/* ---------- Coach plan (down) ---------- */
const FOCUS_IDS = gid => FOCUS_META[gid].map(f => f.id).concat('all');
const tgtStr = it => `${it.sets}×${it.min === it.max ? it.min : it.min + '–' + it.max}${it.rest ? ' · ' + restLabel(it.rest) : ''}`;
const Coach = {
  url: 'plan.json',
  async check(manual){
    let plan;
    try {
      const res = await fetch(this.url + '?t=' + Date.now(), {cache: 'no-store'});
      if (!res.ok) throw new Error('HTTP ' + res.status);
      plan = await res.json();
    } catch (e) { if (manual) toast('Could not reach coach plan'); return {ok: false, error: String(e)}; }
    db.coach.lastCheck = new Date().toISOString();
    const result = this.apply(plan);
    persist();
    if (manual) toast(result.applied ? 'Plan updated' : 'Plan is up to date');
    if (result.applied) render();
    return result;
  },
  /** apply a plan object if newer; returns {applied, changes} */
  apply(plan){
    if (!plan || typeof plan !== 'object' || plan.schema !== 1 || !Number.isInteger(plan.version)) return {applied: false, error: 'invalid plan'};
    if (plan.version <= (db.coach.planVersion || 0)) return {applied: false};
    const changes = [];
    let created = 0;
    for (const ph of Object.keys(plan.phases || {})) {
      if (!PHASES[ph]) continue;
      for (const gid of Object.keys(plan.phases[ph] || {})) {
        if (!groupOf(gid)) continue;
        const pool = db.exercises[gid], wide = allowedPool(db, gid), armIds = new Set((db.exercises.arms || []).map(x => x.id));
        const host = ARM_HOSTS.includes(gid);
        for (const fid of Object.keys(plan.phases[ph][gid] || {})) {
          if (!FOCUS_IDS(gid).includes(fid)) continue;
          const list = plan.phases[ph][gid][fid];
          if (!Array.isArray(list)) continue;
          const items = [];
          for (const p of list) {
            if (!p || typeof p !== 'object') continue;
            let ex = p.id ? wide.find(x => x.id === p.id) : null;
            if (!ex && p.name && !(host && p.arm === true)) ex = pool.find(x => lc(x.name) === lc(p.name));
            if (!ex && p.name && host) ex = db.exercises.arms.find(x => lc(x.name) === lc(p.name));
            if (!ex && p.name) {
              ex = {id: uid(), name: String(p.name).trim().slice(0, 60)};
              (host && p.arm === true ? db.exercises.arms : pool).push(ex); created++;
              if (host && p.arm === true) armIds.add(ex.id);
              wide.push(ex);
            }
            if (!ex || items.some(i => i.exId === ex.id)) continue;
            const num = (v, lo, hi, dflt) => Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v) : dflt;
            const fb = PHASES[ph].fallback;
            const sets = num(p.sets, 1, 20, fb[0]);
            let min = num(p.reps && p.reps[0] !== undefined ? p.reps[0] : p.min, 1, 100, fb[1]);
            let max = num(p.reps && p.reps[1] !== undefined ? p.reps[1] : p.max, 1, 100, Math.max(min, fb[2]));
            if (max < min) [min, max] = [max, min];
            const it = {exId: ex.id, sets, min, max, rest: num(p.rest, 0, 900, defaultRest(ph, ex.name))};
            if (p.notes) it.notes = String(p.notes).slice(0, 400);
            items.push(it);
          }
          const old = db.plans[ph][gid][fid] || [];
          // back/chest: keep the current arm finishers if the coach's list has none (unless options.autoArmFinishers === false)
          if (host && !(plan.options && plan.options.autoArmFinishers === false) && !items.some(i => armIds.has(i.exId)))
            for (const o of old) if (armIds.has(o.exId) && !items.some(i => i.exId === o.exId)) items.push({...o});
          const nameOf = id => (wide.find(x => x.id === id) || {}).name || '?';
          const diffs = [];
          for (const it of items) {
            const o = old.find(x => x.exId === it.exId);
            if (!o) diffs.push(`+ ${nameOf(it.exId)} ${tgtStr(it)}`);
            else if (tgtStr(o) !== tgtStr(it)) diffs.push(`${nameOf(it.exId)} ${tgtStr(o)} → ${tgtStr(it)}`);
            else if ((o.notes || '') !== (it.notes || '') && it.notes) diffs.push(`${nameOf(it.exId)}: new note`);
          }
          for (const o of old) if (!items.some(x => x.exId === o.exId)) diffs.push(`− ${nameOf(o.exId)}`);
          if (!diffs.length && old.map(x => x.exId).join() !== items.map(x => x.exId).join()) diffs.push('reordered');
          db.plans[ph][gid][fid] = items;
          if (diffs.length) changes.push({where: `${PHASES[ph].short} · ${groupOf(gid).name} · ${focusName(gid, fid)}`, diffs});
        }
      }
    }
    // optional nutrition targets per phase
    if (plan.nutrition && typeof plan.nutrition === 'object') {
      const nut = {};
      for (const ph of Object.keys(PHASES)) {
        const n = plan.nutrition[ph];
        if (!n || typeof n !== 'object') continue;
        const v = (x, hi) => Number.isFinite(+x) && +x > 0 && +x <= hi ? Math.round(+x) : null;
        const t = {kcal: v(n.kcal, 10000), p: v(n.p, 1000), c: v(n.c, 2000), f: v(n.f, 1000)};
        if (Object.values(t).some(x => x)) nut[ph] = t;
      }
      const old = db.coach.nutrition || {};
      for (const ph of Object.keys(nut)) {
        const a = old[ph] || {}, b = nut[ph];
        if (['kcal', 'p', 'c', 'f'].some(k => a[k] !== b[k])) changes.unshift({where: `Nutrition · ${PHASES[ph].short}`, diffs: [`${b.kcal || '–'} kcal · P ${b.p || '–'} · C ${b.c || '–'} · F ${b.f || '–'} g`]});
      }
      db.coach.nutrition = nut;
    }
    syncAll(db); // new exercises show up under All; history untouched
    // optional per-exercise set prescriptions: when present, replaces the stored set
    if (plan.prescriptions && typeof plan.prescriptions === 'object' && !Array.isArray(plan.prescriptions)) {
      const all = GROUPS.flatMap(g => db.exercises[g.id] || []);
      const rxs = {};
      for (const [key, p] of Object.entries(plan.prescriptions)) {
        if (!p || typeof p !== 'object' || !Array.isArray(p.sets)) continue;
        const ex = all.find(x => x.id === key) || all.find(x => lc(x.name) === lc(key)) || (p.name ? all.find(x => lc(x.name) === lc(p.name)) : null);
        if (!ex) continue;
        const sets = p.sets.slice(0, 20).map(x => x && typeof x === 'object' ? {weight: x.weight !== null && x.weight !== '' && Number.isFinite(+x.weight) && +x.weight >= 0 && +x.weight <= 2000 ? Math.round(+x.weight * 100) / 100 : null, reps: Number.isFinite(+x.reps) && +x.reps >= 1 && +x.reps <= 100 ? Math.round(+x.reps) : null} : null).filter(x => x && x.reps);
        if (!sets.length) continue;
        const rx = {sets};
        if (p.note) rx.note = String(p.note).slice(0, 300);
        if (/^\d{4}-\d\d-\d\d$/.test(p.updated || '')) rx.updated = p.updated;
        if (PHASES[p.phase]) rx.phase = p.phase;
        rxs[ex.id] = rx;
      }
      const old = db.coach.prescriptions || {};
      const changed = Object.keys(rxs).filter(id => JSON.stringify(old[id]) !== JSON.stringify(rxs[id]));
      if (changed.length) changes.unshift({where: 'Set targets', diffs: changed.slice(0, 8).map(id => `${(all.find(x => x.id === id) || {}).name}: ${rxs[id].sets.map(x => x.weight ? `${x.weight}×${x.reps}` : x.weight === 0 ? `BW×${x.reps}` : `?×${x.reps}`).join(', ')}`).concat(changed.length > 8 ? [`+ ${changed.length - 8} more`] : [])});
      db.coach.prescriptions = rxs;
    }
    db.coach.planVersion = plan.version;
    db.coach.planUpdatedAt = plan.updatedAt || null;
    db.coach.message = plan.message || '';
    db.coach.banner = (changes.length || plan.message) ? {version: plan.version, message: plan.message || '', changes, at: new Date().toISOString()} : null;
    save();
    return {applied: true, changes, created};
  }
};
function coachBannerHtml(){
  const b = db.coach && db.coach.banner;
  if (!b) return '';
  const lines = b.changes.flatMap(c => c.diffs.map(d => ({w: c.where, d})));
  const shown = lines.slice(0, 6);
  return `<div class="coach-banner" id="coachBanner">
    <div class="cb-head"><span>🧠 Coach updated your plan</span><button class="cb-x" id="cbX" aria-label="Dismiss">✕</button></div>
    ${b.message ? `<div class="cb-msg">${esc(b.message)}</div>` : ''}
    ${shown.length ? `<ul class="cb-list">${shown.map(l => `<li><b>${esc(l.w)}</b> ${esc(l.d)}</li>`).join('')}</ul>${lines.length > shown.length ? `<div class="cb-more">+${lines.length - shown.length} more change${lines.length - shown.length > 1 ? 's' : ''}</div>` : ''}` : ''}
    <div class="cb-foot">Plan v${b.version}${db.coach.planUpdatedAt ? ' · ' + esc(String(db.coach.planUpdatedAt).slice(0, 10)) : ''}</div>
  </div>`;
}
function bindCoachBanner(){
  if ($('#cbX')) $('#cbX').onclick = () => { db.coach.banner = null; persist(); render(); };
}

/* ---------- Coach Sync (up): GitHub contents API ---------- */
const SYNC_KEY = 'liftlog.sync'; // token lives only here, never in exports
const Sync = {
  owner: 'jbozarth206', repo: 'lift-log-data', path: 'data/liftlog.json',
  timer: null, busy: false, again: false,
  get s(){ try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } },
  set(patch){ localStorage.setItem(SYNC_KEY, JSON.stringify(Object.assign(this.s, patch))); },
  get enabled(){ return !!this.s.token; },
  api(){ return `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}`; },
  headers(){ return {'Authorization': 'Bearer ' + this.s.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}; },
  markDirty(){
    if (!this.enabled) return;
    this.set({pending: true});
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), this.debounceMs);
  },
  debounceMs: 4000,
  b64(str){ const bytes = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); },
  explain(status, body){
    const msg = (body && body.message) || '';
    if (status === 401) return 'Token is invalid or expired. Create a new one and paste it here.';
    if (status === 403 && /rate limit/i.test(msg)) return 'GitHub rate limit hit. Will retry later.';
    if (status === 403) return 'Token has no write access. It needs Contents: Read and write on lift-log-data.';
    if (status === 404) return 'Repo not found, or the token has no access to jbozarth206/lift-log-data.';
    return `GitHub error ${status}${msg ? ': ' + msg : ''}`;
  },
  async getSha(){
    const res = await fetch(this.api() + '?t=' + Date.now(), {headers: this.headers(), cache: 'no-store'});
    if (res.status === 404) {
      const body = await res.json().catch(() => ({}));
      // file missing is fine (first sync); repo missing is not
      const repoRes = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}`, {headers: this.headers(), cache: 'no-store'});
      if (!repoRes.ok) throw {status: repoRes.status, body: await repoRes.json().catch(() => body)};
      return null;
    }
    if (!res.ok) throw {status: res.status, body: await res.json().catch(() => ({}))};
    return (await res.json()).sha;
  },
  /** push full export; returns true on success */
  async push(manual){
    clearTimeout(this.timer);
    if (!this.enabled) return false;
    if (this.busy) { this.again = true; return false; }
    if (!navigator.onLine) { this.set({pending: true, lastError: 'Offline · will sync when back online'}); this.refreshUi(); return false; }
    this.busy = true; this.refreshUi();
    try {
      const content = this.b64(JSON.stringify(exportPayload(), null, 1));
      let sha = this.s.sha;
      if (sha === undefined) sha = await this.getSha();
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(this.api(), {method: 'PUT', headers: {...this.headers(), 'Content-Type': 'application/json'}, cache: 'no-store',
          body: JSON.stringify({message: `Lift Log sync ${new Date().toISOString()}`, content, ...(sha ? {sha} : {})})});
        if (res.ok) {
          const body = await res.json();
          this.set({sha: body.content && body.content.sha, pending: false, lastSync: new Date().toISOString(), lastError: ''});
          if (manual) toast('✓ Synced to coach');
          return true;
        }
        const body = await res.json().catch(() => ({}));
        if (res.status === 409 || res.status === 422 || (res.status === 400 && /sha/i.test(body.message || ''))) { sha = await this.getSha(); continue; } // sha conflict: refetch & retry
        throw {status: res.status, body};
      }
      throw {status: 409, body: {message: 'kept conflicting'}};
    } catch (e) {
      const offline = !e || e.status === undefined;
      const err = offline ? 'Network error · will retry when online' : this.explain(e.status, e.body);
      this.set({pending: true, lastError: err, ...(offline ? {} : {sha: undefined})});
      if (manual) toast(offline ? 'Offline · queued' : 'Sync failed');
      return false;
    } finally {
      this.busy = false; this.refreshUi();
      if (this.again) { this.again = false; this.markDirty(); }
    }
  },
  retryPending(){ if (this.enabled && this.s.pending) this.push(); },
  refreshUi(){ if (tab === 'settings' && cur().v === 'settings') render(); }
};
function syncStatusText(){
  const s = Sync.s;
  if (!s.token) return {cls: 'off', t: 'Not connected'};
  if (Sync.busy) return {cls: 'busy', t: 'Syncing…'};
  if (s.lastError) return {cls: 'err', t: s.lastError};
  if (s.pending) return {cls: 'busy', t: 'Changes waiting to sync'};
  if (s.lastSync) return {cls: 'ok', t: 'Synced ' + timeAgo(s.lastSync)};
  return {cls: 'busy', t: 'Connected · not synced yet'};
}
function timeAgo(iso){
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60); if (h < 24) return h + ' h ago';
  return Math.round(h / 24) + ' d ago';
}
function coachSettingsHtml(){
  const s = Sync.s, st = syncStatusText();
  return `<div class="section-title">Coach sync</div>
    <div class="set-group">
      <div class="set-item" style="font-weight:600"><span class="grow">Workout data → coach<span class="sub sync-${st.cls}" id="syncStatus">${esc(st.t)}</span></span><span class="sync-dot sync-${st.cls}"></span></div>
      ${s.token ? `
      <button class="set-item" id="syncNow"><span class="grow">Sync now<span class="sub">Uploads your full log to the private lift-log-data repo</span></span>⟳</button>
      <button class="set-item red" id="syncOff"><span class="grow">Disconnect<span class="sub">Removes the token from this phone</span></span></button>` : `
      <div class="set-item token-row"><input class="text-input" id="tokenIn" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste GitHub token (github_pat_…)"><button class="mini-btn" id="tokenSave">Connect</button></div>`}
      <div class="set-item" style="font-weight:600"><span class="grow">Coach plan<span class="sub">Version ${db.coach.planVersion}${db.coach.planUpdatedAt ? ' · updated ' + esc(String(db.coach.planUpdatedAt).slice(0, 10)) : ''}${db.coach.lastCheck ? ' · checked ' + timeAgo(db.coach.lastCheck) : ''}</span></span><button class="mini-btn" id="planCheck">Check</button></div>
    </div>
    <p class="note">The token is stored only on this phone and is never included in backups. Use a fine-grained token limited to <b>lift-log-data</b> with Contents: Read and write.</p>`;
}
function bindCoachSettings(){
  if ($('#syncNow')) $('#syncNow').onclick = () => Sync.push(true);
  if ($('#syncOff')) $('#syncOff').onclick = () => { if (!confirm('Disconnect Coach Sync? Your workouts stay on this phone.')) return; localStorage.removeItem(SYNC_KEY); render(); toast('Disconnected'); };
  if ($('#tokenSave')) $('#tokenSave').onclick = async () => {
    const t = $('#tokenIn').value.trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(t)) { toast('That does not look like a GitHub token'); return; }
    localStorage.setItem(SYNC_KEY, JSON.stringify({token: t, pending: true}));
    render();
    const ok = await Sync.push(true);
    if (!ok && !navigator.onLine) return;
    render();
  };
  $('#planCheck').onclick = () => Coach.check(true);
}



/* ---------- Rest timer ---------- */
/** rest seconds for a plan/exercise item: Settings override > plan `rest` (0 = no timer) > phase/type default */
function restFor(e, phase){
  if (db.settings.restOverride) return db.settings.restOverride;
  if (e && e.rest === 0) return 0;
  return e && e.rest > 0 ? e.rest : defaultRest(phase || curPhase(), e && e.name);
}
/** generated beeps via Web Audio (no assets). iOS needs a user gesture to unlock, done on any tap. */
const Ding = {
  ctx: null, primed: false, calls: [],
  unlock(){
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        // 'ambient' mixes with his music instead of pausing it (iOS 16.4+ Safari audioSession API)
        try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') this.ctx.resume();
      if (!this.primed) { const b = this.ctx.createBuffer(1, 1, 22050), src = this.ctx.createBufferSource(); src.buffer = b; src.connect(this.ctx.destination); src.start(0); this.primed = true; }
    } catch (e) {}
  },
  tone(freq, at, dur, vol, type){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + dur + 0.05);
  },
  /** 'warn' = 10 s left (two short 880 Hz beeps) · 'go' = time's up (rising three-note chime) */
  play(kind){
    this.calls.push(kind);
    if (!db.settings.restSound || !db.settings.restVolume) return false;
    if (!this.ctx) this.unlock();
    if (!this.ctx) return false;
    try {
      if (this.ctx.state !== 'running') this.ctx.resume();
      const t = this.ctx.currentTime + 0.03, v = Math.max(0.001, Math.min(1, db.settings.restVolume));
      if (kind === 'warn') { this.tone(880, t, 0.16, v); this.tone(880, t + 0.24, 0.16, v); }
      else { this.tone(660, t, 0.18, v, 'triangle'); this.tone(880, t + 0.18, 0.18, v, 'triangle'); this.tone(1320, t + 0.36, 0.55, v, 'triangle'); }
      return true;
    } catch (e) { return false; }
  }
};
['touchend', 'pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Ding.unlock(), {capture: true, passive: true}));
const buzz = pat => { try { if (navigator.vibrate) navigator.vibrate(pat); } catch (e) {} };
const TIMER_KEY = 'liftlog.timer'; // device-local, never exported
const DING_GRACE = 2000;           // a ding moment older than this (screen was locked / app backgrounded) is not played late
const Rest = {
  iv: null,
  get st(){ try { return JSON.parse(localStorage.getItem(TIMER_KEY)); } catch (e) { return null; } },
  set(st){ if (st) localStorage.setItem(TIMER_KEY, JSON.stringify(st)); else localStorage.removeItem(TIMER_KEY); this.paint(); if (st) this.loop(); },
  start(secs, info, key){
    if (!db.settings.restTimer || !(secs > 0)) return;
    const now = Date.now();
    this.set({mode: 'rest', endAt: now + secs * 1000, total: secs * 1000, startedAt: now, name: info.name, set: info.set, of: info.of, key, warned: secs <= 10, ended: false});
  },
  finish(name){ if (db.settings.restTimer) this.set({mode: 'done', label: name, until: Date.now() + 5000}); },
  adjust(sec){
    const s = this.st; if (!s || s.mode !== 'rest') return;
    const now = Date.now();
    if (s.ended) { if (sec <= 0) return; s.ended = false; s.endAt = now; s.total = 0; }
    s.endAt = Math.max(now + 1000, s.endAt + sec * 1000);
    s.total = Math.max(s.endAt - s.startedAt, 1000);
    if (s.endAt - now > 10000) s.warned = false;
    this.set(s); this.tick();
  },
  skip(){ this.set(null); },
  tick(){
    const s = this.st;
    if (!s) { this.stop(); return; }
    const now = Date.now();
    if (s.mode === 'done') { if (now > s.until) this.set(null); else this.paint(); return; }
    let dirty = false;
    const rem = s.endAt - now;
    if (!s.warned && rem <= 10000) {
      s.warned = true; dirty = true;
      if (rem > 0 && now - (s.endAt - 10000) <= DING_GRACE) { Ding.play('warn'); buzz([120, 80, 120]); }
    }
    if (!s.ended && rem <= 0) {
      s.ended = true; dirty = true;
      if (now - s.endAt <= DING_GRACE) { Ding.play('go'); buzz([250, 100, 250, 100, 250]); }
    }
    if (s.ended && now - s.endAt > 120000) { this.set(null); return; } // auto-hide 2 min after "Go"
    if (dirty) localStorage.setItem(TIMER_KEY, JSON.stringify(s));
    this.paint(s);
  },
  loop(){ if (!this.iv) this.iv = setInterval(() => this.tick(), 250); },
  stop(){ clearInterval(this.iv); this.iv = null; this.paint(null); },
  paint(s){
    if (s === undefined) s = this.st;
    let bar = document.getElementById('restBar');
    document.body.classList.toggle('has-rest', !!s);
    if (!s) { if (bar) bar.remove(); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'restBar'; bar.setAttribute('role', 'timer'); bar.setAttribute('aria-live', 'off');
      bar.innerHTML = `<div class="rb-ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" class="rb-track"/><circle cx="32" cy="32" r="28" class="rb-prog" pathLength="100"/></svg><span class="rb-icon"></span></div>
        <div class="rb-main"><div class="rb-time"></div><div class="rb-label"></div></div>
        <div class="rb-btns"><button class="rb-btn" data-rb="-15">−15</button><button class="rb-btn" data-rb="15">+15</button><button class="rb-btn rb-skip" data-rb="skip">Skip</button></div>`;
      bar.addEventListener('click', ev => { const b = ev.target.closest('[data-rb]'); if (!b) return; Ding.unlock(); const a = b.dataset.rb; if (a === 'skip') this.skip(); else this.adjust(+a); });
      document.body.appendChild(bar);
    }
    const q = sel => bar.querySelector(sel);
    if (s.mode === 'done') {
      bar.className = 'rb-done';
      q('.rb-time').textContent = 'Exercise done ✓'; q('.rb-label').textContent = s.label; q('.rb-icon').textContent = '🏁';
      q('.rb-prog').style.strokeDashoffset = 0; q('[data-rb="skip"]').textContent = 'Close';
      return;
    }
    const rem = Math.max(0, s.endAt - Date.now()), secs = Math.ceil(rem / 1000);
    const cls = s.ended ? 'rb-go' : secs <= 3 ? 'rb-red' : secs <= 10 ? 'rb-amber' : 'rb-run';
    bar.className = cls;
    q('.rb-time').textContent = s.ended ? 'GO · next set' : `${Math.floor(secs / 60)}:${pad(secs % 60)}`;
    q('.rb-label').textContent = s.ended ? `Set ${s.set + 1} of ${s.of} · ${s.name}` : `Set ${s.set}/${s.of} done · ${s.name}`;
    q('.rb-icon').textContent = s.ended ? '💥' : '';
    q('.rb-prog').style.strokeDashoffset = s.ended ? 0 : (100 * (1 - rem / Math.max(1, s.total))).toFixed(2);
    q('[data-rb="skip"]').textContent = s.ended ? 'Close' : 'Skip';
  }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Rest.tick(); });
window.addEventListener('focus', () => Rest.tick());
window.addEventListener('pageshow', () => Rest.tick());

/* ---------- Labs: MyChart (Epic SMART on FHIR) import ---------- */
const MC = () => window.MyChart || null;
/** well-known markers: canonical id, LOINC codes, name fallback (first match wins, so order matters) */
const MARKERS = [
  {id: 'free-t', name: 'Free testosterone', codes: ['2991-8', '49041-7', '2990-0'], re: /free\s+testosterone|testosterone[, ]+free/i},
  {id: 'testosterone', name: 'Testosterone, total', codes: ['2986-8', '49541-6', '14913-8'], re: /testosterone(?!.*(free|bioavail))/i},
  {id: 'estradiol', name: 'Estradiol', codes: ['2243-4', '14715-7', '35383-9', '83112-3'], re: /estradiol/i},
  {id: 'shbg', name: 'SHBG', codes: ['13967-5'], re: /sex hormone binding|\bshbg\b/i},
  {id: 'lh', name: 'LH', codes: ['10501-5'], re: /luteinizing|^lh\b/i},
  {id: 'fsh', name: 'FSH', codes: ['15067-2'], re: /follicle stim|^fsh\b/i},
  {id: 'prolactin', name: 'Prolactin', codes: ['2842-3'], re: /prolactin/i},
  {id: 'hct', name: 'Hematocrit', codes: ['4544-3', '20570-8', '71833-8'], re: /hematocrit|^hct\b/i},
  {id: 'hgb', name: 'Hemoglobin', codes: ['718-7', '20509-6'], re: /^(hemoglobin|hgb)\b(?!.*a1c)/i},
  {id: 'rbc', name: 'RBC', codes: ['789-8'], re: /^(rbc|red blood cell)/i},
  {id: 'ldl', name: 'LDL cholesterol', codes: ['13457-7', '18262-6', '2089-1'], re: /\bldl\b/i},
  {id: 'hdl', name: 'HDL cholesterol', codes: ['2085-9'], re: /\bhdl\b/i},
  {id: 'tg', name: 'Triglycerides', codes: ['2571-8'], re: /triglycer/i},
  {id: 'chol', name: 'Total cholesterol', codes: ['2093-3'], re: /^cholesterol(,?\s*total)?$|total cholesterol/i},
  {id: 'alt', name: 'ALT', codes: ['1742-6', '1743-4', '76625-3'], re: /\balt\b|alanine amino/i},
  {id: 'ast', name: 'AST', codes: ['1920-8', '30239-8'], re: /\bast\b|aspartate amino/i},
  {id: 'psa', name: 'PSA', codes: ['2857-1', '35741-8', '10886-0'], re: /\bpsa\b|prostate specific/i},
  {id: 'creat', name: 'Creatinine', codes: ['2160-0', '38483-4'], re: /^creatinine(?!.*(clear|urine|ratio))/i},
  {id: 'egfr', name: 'eGFR', codes: ['33914-3', '48642-3', '62238-1', '98979-8', '88293-6'], re: /egfr|glomerular/i},
  {id: 'a1c', name: 'Hemoglobin A1c', codes: ['4548-4', '17856-6'], re: /a1c/i},
  {id: 'glucose', name: 'Glucose', codes: ['2345-7', '2339-0'], re: /^glucose/i}
];
const KEY_MARKERS = ['testosterone', 'free-t', 'estradiol', 'hct', 'hgb', 'ldl', 'hdl', 'tg', 'chol', 'alt', 'ast', 'psa'];
function markerKey(r){
  const m = MARKERS.find(x => r.code && x.codes.includes(r.code)) || MARKERS.find(x => x.re.test(r.name || ''));
  return m ? m.id : r.code ? 'loinc:' + r.code : 'name:' + String(r.name || '').toLowerCase();
}
function markerName(key){
  const m = MARKERS.find(x => x.id === key); if (m) return m.name;
  const r = db.labs.results.find(x => markerKey(x) === key); return r ? r.name : key;
}
/** numeric series for a marker, oldest first (one point per date: last value of that day) */
function markerSeries(key){
  const byDate = new Map();
  for (const r of db.labs.results) if (markerKey(r) === key) byDate.set(r.date, r);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
const flagPill = f => !f ? '' : `<span class="flag flag-${f === 'L' || f === 'LL' ? 'lo' : f === 'A' ? 'ab' : 'hi'}">${f}</span>`;
const refStr = r => r.refLow != null && r.refHigh != null ? `${fmtLab(r.refLow)}–${fmtLab(r.refHigh)}` : r.refHigh != null ? `≤ ${fmtLab(r.refHigh)}` : r.refLow != null ? `≥ ${fmtLab(r.refLow)}` : (r.refText || '');
const fmtLab = n => n == null ? '' : Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : String(Math.round(n * 100) / 100);
const valStr = r => r.text && (r.value == null || /^[<>]/.test(r.text)) ? esc(r.text.split(' · ')[0]) : fmtLab(r.value);

let labsBusy = false;
function labsState(){
  const mc = MC();
  if (!mc) return {st: 'unavailable'};
  const ep = mc.endpoint((mc.conn || {}).endpointId) || mc.endpoint(mc.config().defaultEndpoint) || mc.endpoints()[0];
  const configured = mc.endpoints().filter(e => mc.configured(e));
  return {st: mc.status(), conn: mc.conn, ep, configured};
}
async function syncLabs(manual){
  const mc = MC(); if (!mc || labsBusy) return false;
  if (mc.status() !== 'connected' && !(await mc.ensureToken())) {
    if (manual) { if (confirm('Your MyChart session has expired (Epic sign-ins last about an hour). Sign in again to import new results?')) reconnectLabs(); }
    if (trackMode === 'labs') render();
    return false;
  }
  if (!navigator.onLine) { if (manual) toast('Offline · try again when online'); return false; }
  labsBusy = true; if (tab === 'track' && trackMode === 'labs') render();
  try {
    const {observations, reports} = await mc.fetchLabs();
    const P = mc.parse, {reportOf, info} = P.indexReports(reports);
    const parsed = observations.flatMap(o => P.parseObservation(o, reportOf));
    const m = P.mergeResults(db.labs.results, parsed);
    const c = mc.conn;
    db.labs.results = m.results;
    db.labs.reports = Object.assign(db.labs.reports || {}, info);
    db.labs.source = {system: 'epic-mychart', name: c.name, endpointId: c.endpointId, env: c.env, fhirBase: c.fhirBase};
    if (!db.labs.connectedAt) db.labs.connectedAt = c.connectedAt || new Date().toISOString();
    db.labs.lastSync = new Date().toISOString();
    mc.setConn({...mc.conn, lastError: ''});
    save();
    if (manual || m.added) toast(m.added ? `✓ ${m.added} new lab result${m.added > 1 ? 's' : ''}` : '✓ Labs up to date');
    return true;
  } catch (e) {
    const expired = e && e.code === 'expired';
    if (mc.conn) mc.setConn({...mc.conn, lastError: expired ? '' : (e && e.status === 403 ? 'MyChart refused the request (403). The app may be missing an API on its Epic registration.' : 'Could not reach MyChart. Try again later.')});
    if (manual) toast(expired ? 'MyChart session expired' : 'Lab sync failed');
    return false;
  } finally {
    labsBusy = false;
    if (tab === 'track' && trackMode === 'labs') render();
  }
}
async function connectLabs(endpointId){
  const mc = MC(); if (!mc) return;
  if (!navigator.onLine) { toast('Connect needs internet'); return; }
  try { await mc.connect(endpointId); }
  catch (e) { toast(e.message === 'not-configured' ? 'MyChart is not set up yet (client ID missing)' : 'Could not reach MyChart'); }
}
function reconnectLabs(){ const s = labsState(); connectLabs(s.conn ? s.conn.endpointId : (s.ep || {}).id); }
function maybeAutoSyncLabs(){
  const mc = MC(); if (!mc || mc.status() !== 'connected' || !navigator.onLine) return;
  const hrs = mc.config().autoSyncHours || 6, last = db.labs.lastSync ? new Date(db.labs.lastSync).getTime() : 0;
  if (Date.now() - last > hrs * 3600e3) syncLabs(false);
}
function labsConnHtml(){
  const s = labsState(), L = db.labs;
  if (s.st === 'unavailable') return `<div class="card muted-card">MyChart connection is unavailable offline.</div>`;
  const last = L.lastSync ? `Last import ${timeAgo(L.lastSync)}` : 'Not imported yet';
  const err = s.conn && s.conn.lastError ? `<div class="lab-err">${esc(s.conn.lastError)}</div>` : '';
  if (s.st === 'connected') {
    const mins = Math.max(1, Math.round((s.conn.expiresAt - Date.now()) / 60000));
    return `<div class="card mc-card ok"><div class="mc-head"><span class="mc-dot ok"></span><div class="grow"><b>MyChart · ${esc(s.conn.name)}</b>
      <div class="sub">${s.conn.patientName ? esc(s.conn.patientName) + ' · ' : ''}${last}${s.conn.refreshToken ? '' : ` · session ${mins} min left`}</div></div></div>${err}
      <div class="btn-row"><button class="btn primary" id="labSync" ${labsBusy ? 'disabled' : ''}>${labsBusy ? 'Syncing…' : '⟳ Sync labs now'}</button></div>
      <div class="btn-row"><button class="btn small danger" id="labOff">Disconnect</button></div></div>`;
  }
  if (s.st === 'expired') return `<div class="card mc-card warn"><div class="mc-head"><span class="mc-dot warn"></span><div class="grow"><b>MyChart session expired</b>
      <div class="sub">${esc(s.conn.name)} · ${last}. Epic sign-ins last about an hour, so sign in again to import new results.</div></div></div>${err}
      <div class="btn-row"><button class="btn primary" id="labReconnect">Reconnect &amp; sync</button></div>
      <div class="btn-row"><button class="btn small danger" id="labOff">Disconnect</button></div></div>`;
  // not connected
  if (!s.configured.length) return `<div class="card mc-card"><div class="mc-head"><span class="mc-dot"></span><div class="grow"><b>Connect MyChart</b>
      <div class="sub">Import lab results from ${esc((s.ep || {}).name || 'MyChart')} automatically.</div></div></div>
      <div class="lab-err">Not set up yet: the app's Epic client ID still needs to be added (see EPIC_REGISTRATION.md).</div>
      <div class="btn-row"><button class="btn primary" id="labConnect" disabled>Connect MyChart</button></div></div>`;
  return `<div class="card mc-card"><div class="mc-head"><span class="mc-dot"></span><div class="grow"><b>Connect MyChart</b>
      <div class="sub">Sign in to MyChart to import your lab results (read-only). Tokens stay on this phone.</div></div></div>
      ${s.configured.length > 1 ? `<select class="select" id="labEp">${s.configured.map(e => `<option value="${esc(e.id)}" ${s.ep && e.id === s.ep.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>` : `<div class="sub" style="margin:8px 0 0">Health system: <b>${esc(s.configured[0].name)}</b></div>`}
      ${err}<div class="btn-row"><button class="btn primary" id="labConnect">Connect MyChart</button></div></div>`;
}
function renderLabs(el){
  setHeader('Labs', 'Bloodwork');
  const L = db.labs, rs = L.results;
  const byKey = new Map();
  for (const r of rs) { const k = markerKey(r); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(r); }
  const keys = KEY_MARKERS.filter(k => byKey.has(k) && byKey.get(k).some(r => r.value != null));
  const tiles = keys.map(k => {
    const ser = markerSeries(k).filter(r => r.value != null), last = ser[ser.length - 1], prev = ser[ser.length - 2];
    const d = prev ? last.value - prev.value : null;
    return `<button class="lab-tile" data-marker="${esc(k)}"><div class="lt-name">${esc(markerName(k))}</div>
      <div class="lt-val">${valStr(last)} <small>${esc(last.unit)}</small> ${flagPill(last.flag)}</div>
      <div class="lt-sub">${fmtDay(last.date)}${d != null && d !== 0 ? ` · <span class="lab-delta">${d > 0 ? '▲' : '▼'} ${fmtLab(Math.abs(d))}</span>` : ''}</div></button>`;
  }).join('');
  const dates = [...new Set(rs.map(r => r.date))].sort().reverse();
  const draws = dates.map(date => {
    const panelOf = r => r.reportId && L.reports[r.reportId] ? L.reports[r.reportId].name : '\uffff';
    const items = rs.filter(r => r.date === date).sort((a, b) => panelOf(a).localeCompare(panelOf(b)) || String(a.name).localeCompare(String(b.name)));
    const panels = [...new Set(items.map(r => r.reportId && L.reports[r.reportId] ? L.reports[r.reportId].name : null).filter(Boolean))];
    const flagged = items.filter(r => r.flag).length;
    return `<div class="section-title draw-title">${fmtDay(date, true)} ${flagged ? `<span class="st-sub">${flagged} flagged</span>` : ''}${panels.length ? `<div class="draw-panels">${panels.map(esc).join(' · ')}</div>` : ''}</div>
      <div class="list">${items.map(r => `<button class="row lab-res" data-marker="${esc(markerKey(r))}"><div class="main"><div class="name">${esc(r.name)}</div>
        <div class="meta">${refStr(r) ? 'ref ' + esc(refStr(r)) : 'no range'}${r.status ? ' · ' + esc(r.status) : ''}</div></div>
        <div class="lab-v ${r.flag ? 'flagged' : ''}">${valStr(r)}<small> ${esc(r.unit)}</small> ${flagPill(r.flag)}</div></button>`).join('')}</div>`;
  }).join('');
  el.innerHTML = `${labsConnHtml()}
    ${keys.length ? `<div class="section-title">Key markers</div><div class="lab-tiles">${tiles}</div>` : ''}
    ${rs.length ? draws : `<p class="note">No lab results yet. Once MyChart is connected, results import here grouped by draw date, with H/L flags and a trend chart for each marker.</p>`}
    <p class="note">Imported from MyChart (read-only) · ${rs.length} results. Manual bloodwork notes stay in Protocol › Health notes. Not medical advice.</p>`;
  if ($('#labConnect')) $('#labConnect').onclick = () => connectLabs($('#labEp') ? $('#labEp').value : (labsState().configured[0] || {}).id);
  if ($('#labReconnect')) $('#labReconnect').onclick = reconnectLabs;
  if ($('#labSync')) $('#labSync').onclick = () => syncLabs(true);
  if ($('#labOff')) $('#labOff').onclick = () => {
    if (!confirm('Disconnect MyChart? This deletes the sign-in from this phone. Imported results stay.')) return;
    const delAll = rs.length && confirm(`Also delete the ${rs.length} imported lab results from Lift Log?`);
    MC().disconnect(); db.labs.connectedAt = null;
    if (delAll) { db.labs.results = []; db.labs.reports = {}; db.labs.lastSync = null; db.labs.source = null; }
    save(); render(); toast('MyChart disconnected');
  };
  el.querySelectorAll('[data-marker]').forEach(b => b.onclick = () => push({v: 'marker', key: b.dataset.marker}));
}
function renderMarker(el, v){
  const ser = markerSeries(v.key), num = ser.filter(r => r.value != null), last = ser[ser.length - 1];
  setHeader(markerName(v.key), 'Lab trend');
  if (!last) { el.innerHTML = `<p class="note">No results for this marker.</p>`; return; }
  const unit = last.unit, lo = [...ser].reverse().find(r => r.refLow != null), hi = [...ser].reverse().find(r => r.refHigh != null);
  el.innerHTML = `<div class="card lab-hero"><div class="lt-name">Latest · ${fmtDay(last.date, true)}</div>
      <div class="lh-val">${valStr(last)} <small>${esc(unit)}</small> ${flagPill(last.flag)}</div>
      <div class="sub">${refStr(last) ? 'Reference ' + esc(refStr(last)) + ' ' + esc(unit) : 'No reference range'} · ${num.length} result${num.length === 1 ? '' : 's'}</div></div>
    ${num.length ? `<div class="card chart-card">${labChart(num, lo ? lo.refLow : null, hi ? hi.refHigh : null)}</div>` : ''}
    <div class="section-title">History</div>
    <div class="list">${[...ser].reverse().map(r => `<div class="row"><div class="main"><div class="name">${fmtDay(r.date, true)}</div>
      <div class="meta">${esc(r.name)}${refStr(r) ? ' · ref ' + esc(refStr(r)) : ''}${r.reportId && db.labs.reports[r.reportId] ? ' · ' + esc(db.labs.reports[r.reportId].name) : ''}</div></div>
      <div class="lab-v ${r.flag ? 'flagged' : ''}">${valStr(r)}<small> ${esc(r.unit)}</small> ${flagPill(r.flag)}</div></div>`).join('')}</div>`;
}
/** trend chart with shaded reference band */
function labChart(pts, refLow, refHigh){
  const W = 360, H = 200, L = 44, R = 12, T = 14, B = 26, color = '#ff4d8d';
  const ys = pts.map(p => p.value).concat([refLow, refHigh].filter(x => x != null));
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= Math.abs(lo) * .1 || 1; hi += Math.abs(hi) * .1 || 1; }
  const span = hi - lo; lo -= span * .12; hi += span * .12; if (Math.min(...ys) >= 0) lo = Math.max(0, lo);
  const step = niceStep((hi - lo) / 4); lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const t0 = parseDate(pts[0].date).getTime(), t1 = parseDate(pts[pts.length - 1].date).getTime();
  const xOf = p => pts.length === 1 || t1 === t0 ? (L + W - R) / 2 : L + (W - L - R) * (parseDate(p.date).getTime() - t0) / (t1 - t0);
  const yOf = y => T + (H - T - B) * (1 - (y - lo) / (hi - lo));
  let grid = '';
  for (let v = lo; v <= hi + 1e-9; v += step) { const y = yOf(v); grid += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#262c38"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" fill="#6b7385" font-size="10.5">${fmtLab(Math.round(v * 1000) / 1000)}</text>`; }
  const bandTop = yOf(refHigh != null ? Math.min(refHigh, hi) : hi), bandBot = yOf(refLow != null ? Math.max(refLow, lo) : lo);
  const band = refLow != null || refHigh != null ? `<rect class="ref-band" x="${L}" width="${W - L - R}" y="${bandTop.toFixed(1)}" height="${Math.max(0, bandBot - bandTop).toFixed(1)}" fill="#3ddc97" fill-opacity=".09"/>
    ${refHigh != null ? `<line x1="${L}" x2="${W - R}" y1="${yOf(refHigh)}" y2="${yOf(refHigh)}" stroke="#3ddc97" stroke-opacity=".5" stroke-dasharray="4 4"/>` : ''}
    ${refLow != null ? `<line x1="${L}" x2="${W - R}" y1="${yOf(refLow)}" y2="${yOf(refLow)}" stroke="#3ddc97" stroke-opacity=".5" stroke-dasharray="4 4"/>` : ''}` : '';
  const line = pts.map((p, i) => (i ? 'L' : 'M') + xOf(p).toFixed(1) + ' ' + yOf(p.value).toFixed(1)).join(' ');
  const short = s => { const t = parseDate(s); return t.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + " '" + String(t.getFullYear()).slice(2); };
  const lbl = pts.length === 1 ? `<text x="${xOf(pts[0])}" y="${H - 6}" text-anchor="middle" fill="#6b7385" font-size="10.5">${short(pts[0].date)}</text>`
    : `<text x="${L}" y="${H - 6}" fill="#6b7385" font-size="10.5">${short(pts[0].date)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end" fill="#6b7385" font-size="10.5">${short(pts[pts.length - 1].date)}</text>`;
  return `<svg class="chart lab-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lab trend chart">${grid}${band}
    ${pts.length > 1 ? `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
    ${pts.map(p => `<circle class="pt" cx="${xOf(p).toFixed(1)}" cy="${yOf(p.value).toFixed(1)}" r="4" fill="${p.flag ? '#ff4d5e' : color}" stroke="#151922" stroke-width="1.5"/>`).join('')}${lbl}</svg>`;
}

/* ---------- Boot ---------- */
function checkPhase(){
  if (needsPhase() && stacks.workout[0].v !== 'phase') {
    stacks.workout = [{v:'phase'}];
    if (tab !== 'workout') switchTab('workout'); else render();
    return true;
  }
  return false;
}
if (needsPhase()) stacks.workout = [{v:'phase'}];
// returning from MyChart (callback.html) → open Labs and import
const mcParam = new URLSearchParams(location.search).get('mychart');
if (mcParam) {
  history.replaceState(null, '', location.pathname);
  trackMode = 'labs'; localStorage.setItem('liftlog.trackMode', 'labs'); tab = 'track';
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'track'));
  if (mcParam === 'connected' && MC() && MC().conn) { db.labs.connectedAt = MC().conn.connectedAt; save(); setTimeout(() => syncLabs(true), 0); }
}
render();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkPhase(); Sync.retryPending(); Coach.check(); maybeAutoSyncLabs(); } });
window.addEventListener('online', () => { Sync.retryPending(); Coach.check(); });
Sync.retryPending();
Coach.check();
if (!mcParam) maybeAutoSyncLabs();
if (Rest.st) { Rest.loop(); Rest.tick(); }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // When a new version's service worker takes over, reload once so the new code runs.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true; location.reload();
  });
  navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(reg => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
