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
const APP_VERSION = '8.4';
const SEED_PLAN_VERSION = 1; // plan.json v1 == built-in defaults
const PHASE_DAYS = 28;
const PHASES = {
  bulk: {id:'bulk', name:'Bulking', short:'Bulk', color:'#ff6b35', icon:'💪',
    tagline:'Build strength & size', points:['Heavy compounds, 4–5 sets × 4–8 reps','Longer rest: 2–4 min','Add weight when you hit the top of the range'],
    fallback:[4, 6, 8, 150]},
  cut: {id:'cut', name:'Cutting', short:'Cut', color:'#2ec4ff', icon:'🔥',
    tagline:'Lean out, keep muscle', points:['3–4 sets × 10–15 reps, more machines & isolation','Short rest: 45–75 s','Superset isolation moves to keep the pace up'],
    fallback:[3, 10, 15, 60]},
  recomp: {id:'recomp', name:'Body Recomp', short:'Body Recomp', color:'#d2f34c', icon:'⚖️',
    tagline:'Build muscle, stay lean', points:['Compounds 4 × 6–12, isolation 3 × 10–15','Moderate rest: ~2 min compounds, ~75 s isolation','Fill the rep range, then add a little weight'],
    fallback:[4, 8, 12, 90]}
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
  },
  recomp: {
    back: {upper:['Pull-Up|4|6|10|120','Lat Pulldown|4|8|12|90','Wide-Grip Seated Row|3|8|12|90','Rear Delt Fly|3|12|15|75','Face Pull|3|12|15|60','arms:Barbell Curl|3|8|12|75','arms:Hammer Curl|3|10|12|60'],
      mid:['Chest-Supported T-Bar Row|4|6|10|120','Seated Cable Row|3|8|12|90','Single-Arm DB Row|3|8|12|75','Straight-Arm Pulldown|3|12|15|60','arms:EZ-Bar Curl|3|8|12|75','arms:Hammer Curl|3|10|12|60'],
      lower:['Deadlift|3|5|8|150','Romanian Deadlift|3|8|10|120','Good Morning|3|8|10|90','Back Extension|3|10|15|60','arms:Cable Curl|3|10|15|60','arms:Reverse Curl|3|10|12|60']},
    chest: {upper:['Incline Bench Press|4|6|10|120','Incline DB Press|3|8|12|90','Low-to-High Cable Fly|3|12|15|60','Landmine Press|3|8|12|75','arms:Close-Grip Bench Press|3|8|10|90','arms:Overhead Cable Extension|3|10|15|60'],
      mid:['Bench Press|4|6|10|120','DB Bench Press|3|8|12|90','Cable Fly|3|12|15|60','Machine Chest Press|3|10|12|75','arms:Skull Crusher|3|8|12|75','arms:Rope Pushdown|3|10|15|60'],
      lower:['Dips|4|8|12|90','Decline DB Press|3|8|12|90','High-to-Low Cable Fly|3|12|15|60','Machine Chest Press|3|10|12|75','arms:Skull Crusher|3|10|12|75','arms:Rope Pushdown|3|12|15|60']},
    legs: {quads:['Back Squat|4|6|10|150','Leg Press|3|10|12|90','Bulgarian Split Squat|3|8|12|75','Leg Extension|3|12|15|60'],
      hamstrings:['Romanian Deadlift|4|6|10|120','Leg Curl|3|10|15|60','Seated Leg Curl|3|10|15|60','Nordic Curl|3|6|8|75'],
      glutes:['Hip Thrust|4|8|12|90','Bulgarian Split Squat|3|8|12|75','Walking Lunge|3|10|12|75','Cable Kickback|3|12|15|60'],
      calves:['Calf Raise|4|10|15|60','Seated Calf Raise|3|12|15|45','Leg Press Calf Raise|3|12|15|45']},
    shoulders: {front:['Overhead Press|4|6|10|120','Seated DB Press|3|8|12|90','Arnold Press|3|8|12|75','Front Raise|3|12|15|60'],
      side:['Lateral Raise|4|12|15|60','Cable Lateral Raise|3|12|15|60','Seated DB Press|3|8|12|90','Upright Row|3|10|12|75'],
      rear:['Face Pull|4|12|15|60','Rear Delt Fly|3|12|15|60','Reverse Pec Deck|3|12|15|60','DB Shrug|3|8|12|75']},
    arms: {biceps:['Barbell Curl|4|8|12|75','Incline DB Curl|3|10|12|60','Hammer Curl|3|10|12|60','Cable Curl|3|12|15|45'],
      triceps:['Close-Grip Bench Press|4|6|10|90','Skull Crusher|3|8|12|75','Overhead Cable Extension|3|10|15|60','Rope Pushdown|3|12|15|45'],
      forearms:['Reverse Curl|3|10|12|60','Wrist Curl|3|12|15|45','Reverse Wrist Curl|3|12|15|45','Hammer Curl|3|10|12|60']}
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
/* Rest defaults when a plan item has no rest: Bulk 165/90, Body Recomp 120/75, Cut 75/60 (compound/isolation) */
const COMPOUND_RE = /squat|deadlift|bench|press|\brows?\b|pull-?up|chin-?up|\bdips?\b|thrust|lunge|rack pull|good morning|clean|snatch/i;
const DEFAULT_REST = {bulk: {compound: 165, isolation: 90}, cut: {compound: 75, isolation: 60}, recomp: {compound: 120, isolation: 75}};
const isCompound = name => COMPOUND_RE.test(name || '');
const defaultRest = (phase, name) => (DEFAULT_REST[phase] || DEFAULT_REST.bulk)[isCompound(name) ? 'compound' : 'isolation'];
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
const DEFAULT_SETTINGS = {restTimer: true, restSound: true, restVolume: 0.8, restOverride: null, autoOpenWorkout: true};
function normSettings(x){
  const o = Object.assign({}, DEFAULT_SETTINGS, x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  o.restTimer = o.restTimer !== false; o.restSound = o.restSound !== false;
  o.restVolume = Number.isFinite(+o.restVolume) ? Math.min(1, Math.max(0, +o.restVolume)) : DEFAULT_SETTINGS.restVolume;
  o.restOverride = Number.isFinite(+o.restOverride) && +o.restOverride >= 15 && +o.restOverride <= 900 && o.restOverride !== null ? Math.round(+o.restOverride) : null;
  o.autoOpenWorkout = o.autoOpenWorkout !== false; // missing = on, so existing v8.1 data opens today's workout
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
const emptyFood = () => ({entries: [], favorites: [], custom: [], targets: {kcal: null, p: null, c: null, f: null}, targetsSource: 'coach'});
function normPeds(p){
  p = p && typeof p === 'object' ? p : {};
  for (const k of ['compounds', 'doses', 'labs']) if (!Array.isArray(p[k])) p[k] = [];
  return p;
}
function normFood(f){
  f = f && typeof f === 'object' ? f : {};
  for (const k of ['entries', 'favorites', 'custom']) if (!Array.isArray(f[k])) f[k] = [];
  f.targets = Object.assign({kcal: null, p: null, c: null, f: null}, f.targets || {});
  if (!['coach', 'manual'].includes(f.targetsSource)) f.targetsSource = 'coach';
  if (!f.adherence || typeof f.adherence !== 'object' || Array.isArray(f.adherence)) f.adherence = {};
  return f;
}
/** drop arm-finisher items (Arms-pool ids) from a built back/chest plan */
function stripArms(plan, d){
  const armIds = new Set((d.exercises.arms || []).map(x => x.id));
  for (const k of Object.keys(plan)) plan[k] = plan[k].filter(i => !armIds.has(i.exId));
  return plan;
}
function freshDb(){
  const d = {version: 13, habits: {}, photos: [], exercises: {}, plans: {}, phase: null, coach: {planVersion: SEED_PLAN_VERSION, banner: null}, sessions: [], body: [], profile: {height: null}, peds: emptyPeds(), food: emptyFood(), labs: emptyLabs(), settings: normSettings()};
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
  if (d.version < 10) {
    // v10 (app 7.3): MyChart portal lab imports land in labs.results (source 'mychart-portal') + labs.portal; nothing to convert
    d.version = 10;
  }
  if (d.version < 11) {
    // v11 (app 8.0): daily checklist (habits by date), progress-photo index (images live in the private repo), meal-plan adherence (food.adherence)
    d.version = 11;
  }
  if (d.version < 12) {
    // v12 (app 8.1): Body Recomp. The loop below builds plans.recomp (and any other missing phase/group) from defaults.
    // Bulk and Cut lists, sessions, exercises, body, food, peds, labs, habits and photos are left in place.
    d.version = 12;
  }
  if (d.version < 13) {
    // v13 (app 8.2): auto-open today's Coach workout (settings.autoOpenWorkout, default on).
    // The weekly schedule itself arrives via plan.json (db.coach.schedule) and is not built here.
    // Sessions, exercises, Bulk/Cut/Recomp plans, body, food, peds, labs, habits and photos stay as they are.
    d.version = 13;
  }
  // App 8.3 adds form demos. They are resolved from the exercise name (and an optional plan `demo`
  // field) at render time, so the stored log is not migrated and nothing already saved is rewritten.
  // App 8.4 adds the common-foods picker (foods-data.js). Saved foods live in food.custom, which
  // normFood creates when missing. Entries may gain optional foodId and lib. Version stays 13.
  if (!d.habits || typeof d.habits !== 'object' || Array.isArray(d.habits)) d.habits = {};
  if (!Array.isArray(d.photos)) d.photos = [];
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
        if (!d.version || d.version < 13) localStorage.setItem(STORE_KEY + '.backup-v' + (d.version || 1), raw); // safety copy before upgrading
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
/** the phase block Coach scheduled, else "default", else top-level days/dates shorthand */
function scheduleBlockFor(phase){
  const s = db.coach && db.coach.schedule;
  if (!s || typeof s !== 'object') return null;
  const ok = b => b && typeof b === 'object' && (b.days || b.dates);
  if (phase && ok(s[phase])) return s[phase];
  if (ok(s.default)) return s.default;
  if (s.days || s.dates) return s;
  return null;
}
/** today's entry: dates[YYYY-MM-DD] beats days["0"-"6"] (0 = Sun). null if none. */
function scheduleEntryFor(date, phase){
  const block = scheduleBlockFor(phase);
  if (!block) return null;
  if (block.dates && block.dates[date]) return block.dates[date];
  const wd = String(parseDate(date).getDay());
  return (block.days && block.days[wd]) || null;
}
function todaySchedule(){
  if (!db.phase || !PHASES[db.phase.id]) return null;
  return scheduleEntryFor(todayStr(), db.phase.id);
}
function coachDayLabel(entry){
  if (!entry) return '';
  if (entry.label) return entry.label;
  if (entry.rest) return 'Rest day';
  const g = groupOf(entry.group), f = focusName(entry.group, entry.focus);
  if (!g) return 'Workout';
  return f && f !== 'All' ? `${g.name} (${f})` : g.name;
}
/** a saved session today for this group + focus (any phase). Empty sessions don't count. */
function scheduleLogged(entry, date){
  if (!entry || entry.rest) return null;
  const d = date || todayStr();
  return db.sessions.find(s => s.date === d && s.group === entry.group && fk(s.focus) === fk(entry.focus)
    && (s.entries || []).some(e => validSets(e.sets || []).length)) || null;
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
      const v = validSets(en.sets); if (v.length) out.push({date: s.date, sets: v, sessionId: s.id, phase: s.phase || null});
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
/** one auto-open per launch; any navigation or tap ends the window so a late plan.json can't hijack */
const launchGate = {consumed: false, touched: false};
function noteLaunchTouch(){ launchGate.touched = true; }
document.addEventListener('pointerdown', noteLaunchTouch, true);
document.addEventListener('click', noteLaunchTouch, true);
document.addEventListener('keydown', noteLaunchTouch, true);
function push(view){ closeDemo(); noteLaunchTouch(); stacks[tab].push(view); render(); window.scrollTo(0, 0); }
function pop(){
  if ($('#demoWrap') && !$('#demoWrap').classList.contains('hidden')) { closeDemo(); return; }
  if (stacks[tab].length > 1) { noteLaunchTouch(); launchGate.consumed = true; stacks[tab].pop(); render(); }
}
function switchTab(t){
  closeDemo();
  noteLaunchTouch();
  if (t === tab) stacks[t] = [stacks[t][0]];
  tab = t;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  render(); window.scrollTo(0, 0);
}
/** leave the scheduled workout for the Workout home screen (pick any group) */
function changeWorkout(){
  closeDemo();
  noteLaunchTouch();
  launchGate.consumed = true;
  stacks.workout = [{v:'home'}];
  tab = 'workout';
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'workout'));
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
  stopDemoMotion($('#view'));
  const v = cur(), el = $('#view');
  el.className = 'fade-in'; void el.offsetWidth;
  ({phase: renderPhase, home: renderHome, focus: renderFocus, group: renderGroup, log: renderLog, journal: renderJournal, session: renderSession,
    progress: renderProgress, track: renderTrack, marker: renderMarker, photos: renderPhotos, settings: renderSettings})[v.v](el, v);
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
    ${photoBannerHtml()}
    <button class="phase-chip" id="phaseChip" style="--c:${ph.color}"><span class="pc-ico">${ph.icon}</span><span class="pc-main"><b>${ph.name}</b><span>${db.phase ? `Week ${Math.min(4, Math.floor(phaseDays() / 7) + 1)} of 4 · ` + ph.tagline + ' · ' + Math.max(0, PHASE_DAYS - phaseDays()) + ' days left' : ''}</span></span><span class="pc-chg">Change</span></button>
    ${coachDayCardHtml()}
    <div class="hero">
      <div class="stat"><div class="v">${new Set(thisWeek.map(s => s.date)).size}</div><div class="l">Days this week</div></div>
      <div class="stat"><div class="v">${vol >= 10000 ? fmtNum(vol/1000) + 'k' : fmtNum(vol)}</div><div class="l">Lbs lifted (7d)</div></div>
      <div class="stat"><div class="v">${days}</div><div class="l">Total days</div></div>
    </div>
    ${todayCardHtml()}
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
  bindCoachBanner(); bindPhotoBanner(); bindCoachDayCard(); bindTodayCard();
}
function coachDayCardHtml(){
  const entry = todaySchedule();
  if (!entry) return '';
  const notes = entry.notes ? `<div class="n">${esc(entry.notes)}</div>` : '';
  if (entry.rest) return `<div class="coach-day rest" id="coachDayCard">
      <div class="k">🧠 Coach · Rest day</div>
      <div class="t">${esc(coachDayLabel(entry))}</div>
      ${notes}
      <div class="m">Rest day · you can still train any group below</div>
    </div>`;
  const done = scheduleLogged(entry), g = groupOf(entry.group);
  return `<button class="coach-day ${done ? 'done' : ''}" id="coachDayCard" style="--c:${g ? g.color : 'var(--green)'}">
      <div class="k">🧠 Coach's workout today</div>
      <div class="t">${esc(coachDayLabel(entry))}</div>
      ${notes}
      <div class="m">${done ? '<b>Done today</b> · tap to view or edit' : 'Tap to start · or pick another group below'}</div>
    </button>`;
}
function bindCoachDayCard(){
  const b = $('#coachDayCard');
  if (!b || b.tagName !== 'BUTTON') return;
  b.onclick = () => {
    const entry = todaySchedule();
    if (!entry || entry.rest) return;
    push({v:'group', g: entry.group, focus: entry.focus, date: todayStr(), phase: db.phase.id, fromCoach: true});
  };
}
function coachStripHtml(entry){
  const done = scheduleLogged(entry);
  return `<div class="coach-strip" id="coachWorkoutBanner">
      <div class="cs-top"><span class="cs-k">🧠 Coach's workout today</span><button class="text-btn" id="changeWorkout" type="button">Change workout</button></div>
      <div class="cs-t">${esc(coachDayLabel(entry))}</div>
      ${entry.notes ? `<div class="cs-n">${esc(entry.notes)}</div>` : ''}
      ${done ? '<div class="cs-m"><b>Done today</b></div>' : '<div class="cs-m">Back or Change workout returns to the workout list</div>'}
    </div>`;
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
  const sched = v.date === todayStr() ? todaySchedule() : null;
  const coachHere = !!(sched && !sched.rest && sched.group === v.g && sched.focus === (v.focus || 'all'));
  setHeader(fname && fname !== 'All' ? `${g.name} · ${fname}` : g.name, `${PHASES[tp].short} · ` + (v.date === todayStr() ? 'Today' : fmtDay(v.date)) + ` · ${doneIds.size}/${list.length} done`,
    `<button class="text-btn" id="editBtn">${v.editing ? 'Done' : 'Edit'}</button>`);
  el.innerHTML = `
    ${coachHere ? coachStripHtml(sched) : ''}
    <div class="phase-tip" style="--c:${PHASES[tp].color}">${PHASES[tp].icon} <b>${PHASES[tp].name}:</b> ${PHASES[tp].points[1]}</div>
    <div class="list">
      ${list.map((e, i) => {
        const last = lastEntry(e.id, v.date + '~');
        const done = doneIds.has(e.id);
        const demo = resolveDemo(e.name, e.item && e.item.demo);
        return `<div class="row" role="button" data-id="${e.id}" style="--c:${g.color}">
          <button type="button" class="demo-thumb" data-demo="${esc(e.id)}" aria-label="Form demo for ${esc(e.name)}">${demoVisualHtml(demo)}<span class="badge-num">${i + 1}</span></button>
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
  armDemoMotion(el);
  $('#editBtn').onclick = () => { v.editing = !v.editing; render(); };
  if ($('#changeWorkout')) $('#changeWorkout').onclick = changeWorkout;
  $('#addEx').onclick = () => exerciseSheet(g.id, null, v.focus, tp);
  if ($('#viewSession')) $('#viewSession').onclick = () => { switchTab('journal'); push({v:'session', id: session.id}); };
  el.querySelectorAll('.demo-thumb').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    const ex = list.find(x => x.id === b.dataset.demo);
    if (ex) openDemo(resolveDemo(ex.name, ex.item && ex.item.demo), ex.name);
  }));
  el.querySelectorAll('.row').forEach(r => r.addEventListener('click', ev => {
    if (ev.target.closest('.demo-thumb')) return;
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
  const demo = resolveDemo(e.name, e.item && e.item.demo);
  const lastFocus = lastSession ? [lastSession.phase && PHASES[lastSession.phase] ? PHASES[lastSession.phase].short : '', focusName(lastSession.group, lastSession.focus, lastSession.focusName)].filter(Boolean).join(' · ') : '';
  const lastLine = last ? last.sets.map(x => `${fmtNum(x.w)}×${x.r}`).join(', ') : '';
  const tTitle = {coach: '🧠 Coach target', auto: '⚙️ Auto target', plan: '🎯 Plan target'}[tgt.src];
  const tSub = tgt.saved ? 'when logged' : tgt.src === 'coach' ? (tgt.updated ? 'set ' + fmtDay(tgt.updated) : 'from Coach') : tgt.src === 'auto' ? 'not Coach · from last session' : `${PHASES[tphase].short} plan`;
  el.innerHTML = `
    ${demo ? `<button type="button" class="form-strip" id="openDemo">${demoVisualHtml(demo)}<span class="form-copy"><b>Form</b><span>${esc((demo.muscles || []).slice(0, 3).join(' · ') || 'How to do it')}</span></span></button>` : `<div class="form-strip form-none"><span class="demo-thumb static">${DEMO_FALLBACK}</span><span class="form-copy"><b>Form</b><span>No demo for this exercise yet</span></span></div>`}
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
  armDemoMotion(el);
  if ($('#openDemo')) $('#openDemo').onclick = () => openDemo(demo, e.name);
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

/* ---------- Exercise form demo ---------- */
function closeDemo(){
  stopDemoMotion($('#demoCard'));
  const wrap = $('#demoWrap');
  if (wrap) wrap.classList.add('hidden');
}
function openDemo(demo, name){
  const frames = demo && Array.isArray(demo.frames) ? demo.frames.map(safeDemoSrc).filter(Boolean) : [];
  if (!frames.length) { toast('No form demo for this exercise yet'); return; }
  const title = name || demo.name || 'Form';
  const muscles = (demo.muscles || []).filter(Boolean);
  const cues = (demo.cues || []).filter(Boolean);
  const multi = frames.length > 1;
  $('#demoCard').innerHTML = `
    <div class="demo-top"><h2 id="demoTitle">${esc(title)}</h2><button type="button" class="demo-x" id="demoClose" aria-label="Close">✕</button></div>
    <div class="demo-stage">${demoVisualHtml(demo)}</div>
    ${multi ? `<div class="demo-controls"><button type="button" class="btn small" id="demoPlay">Pause</button><button type="button" class="btn small" id="demoStep">Step</button></div>` : ''}
    ${muscles.length ? `<div class="demo-muscles">${muscles.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
    ${demo.equipment ? `<div class="demo-eq">${esc(demo.equipment)}</div>` : ''}
    ${cues.length ? `<ul class="demo-cues">${cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${demo.note ? `<p class="demo-note">${esc(demo.note)}</p>` : ''}
    <p class="demo-credit">${esc(DEMO_CATALOG.source.credit)}</p>`;
  stopDemoMotion($('#demoCard'));
  $('#demoWrap').classList.remove('hidden');
  armDemoMotion($('#demoCard'));
  const vis = $('#demoCard .demo-visual');
  const play = $('#demoPlay');
  if (play && vis && !vis.classList.contains('is-playing')) play.textContent = 'Play';
  $('#demoClose').onclick = closeDemo;
  if (play) play.onclick = () => {
    const on = !(vis && vis.classList.contains('is-playing'));
    setDemoPlaying(vis, on);
    play.textContent = on ? 'Pause' : 'Play';
  };
  if ($('#demoStep')) $('#demoStep').onclick = () => {
    stepDemo(vis);
    if (play) play.textContent = 'Play';
  };
}
$('#demoBackdrop').addEventListener('click', closeDemo);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#demoWrap').classList.contains('hidden')) closeDemo(); });
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
    if (!confirm(`${borrowed ? 'Remove' : 'Delete'} ${e.name} from ${g.name} (all phases, all focuses)? Past entries stay in your Journal.`)) return;
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
    noteLaunchTouch(); // picking a phase is navigation; don't auto-open over the home screen they just reached
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
    <div class="set-group">${[...allHist].reverse().slice(0, 30).map(h => `<div class="set-item" style="font-weight:500;font-size:15px"><span class="grow">${fmtDay(h.date)} ${phasePill(h.phase)}</span><span style="color:var(--muted);font-variant-numeric:tabular-nums;font-size:14px">${esc(setsStr(h.sets))}</span></div>`).join('')}</div>`;
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
      <button class="set-item" id="phaseBtn"><span class="grow">${db.phase ? PHASES[db.phase.id].icon + ' ' + PHASES[db.phase.id].name : 'Not set'}<span class="sub">${db.phase ? phaseLabel() + ' · started ' + fmtDay(db.phase.start) : 'Pick Bulk, Cut, or Body Recomp'} · tap to change</span></span>›</button>
    </div>
    <div class="section-title">Profile</div>
    <div class="set-group">
      <button class="set-item" id="targetsSet"><span class="grow">Nutrition targets<span class="sub">${(() => { const T = foodTargets(); return T.source === 'none' ? 'Not set' : `${T.kcal || '–'} kcal · P ${T.p || '–'} · C ${T.c || '–'} · F ${T.f || '–'} g · ${T.source === 'coach' ? 'from coach' : 'yours'}`; })()}</span></span>›</button>
      <button class="set-item" id="heightSet"><span class="grow">Height<span class="sub">${fmtHeight(db.profile.height)}${db.profile.height ? ' · ' + fmtNum(db.profile.height) + ' in' : ''} · used for BMI</span></span>›</button>
    </div>
    <div class="section-title">Today's workout</div>
    <div class="set-group">
      <button class="set-item" id="autoOpen"><span class="grow">Auto-open today's workout<span class="sub">On launch, open the workout Coach scheduled for today. Back or Change workout returns here.</span></span><span class="tog ${db.settings.autoOpenWorkout ? 'on' : ''}">${db.settings.autoOpenWorkout ? 'On' : 'Off'}</span></button>
    </div>
    <div class="section-title">Rest timer</div>
    <div class="set-group">
      <button class="set-item" id="rtOn"><span class="grow">Rest timer<span class="sub">Starts when a set has weight and reps · dings at 10 s and at 0</span></span><span class="tog ${db.settings.restTimer ? 'on' : ''}">${db.settings.restTimer ? 'On' : 'Off'}</span></button>
      <button class="set-item" id="rtSound"><span class="grow">Sound<span class="sub">Generated beep · mixes with your music</span></span><span class="tog ${db.settings.restSound ? 'on' : ''}">${db.settings.restSound ? 'On' : 'Off'}</span></button>
      <div class="set-item rt-vol"><span class="grow">Volume<span class="sub">${Math.round(db.settings.restVolume * 100)}%</span></span><input type="range" id="rtVol" min="0" max="100" step="5" value="${Math.round(db.settings.restVolume * 100)}"><button class="mini-btn" id="rtTest">Test</button></div>
      <div class="set-item"><span class="grow">Rest length<span class="sub">Plan uses each exercise's rest. If rest is omitted: Bulk ${DEFAULT_REST.bulk.compound}/${DEFAULT_REST.bulk.isolation}s · Body Recomp ${DEFAULT_REST.recomp.compound}/${DEFAULT_REST.recomp.isolation}s · Cut ${DEFAULT_REST.cut.compound}/${DEFAULT_REST.cut.isolation}s (compound/isolation)</span></span>
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
    <p class="note">Install: open in Safari → Share → <b>Add to Home Screen</b>. Est. 1RM uses the Epley formula. Version ${APP_VERSION}.</p>
    <p class="note">Form demos: <a href="${esc(DEMO_CATALOG.source.url)}" target="_blank" rel="noopener noreferrer">${esc(DEMO_CATALOG.source.name)}</a> (${esc(DEMO_CATALOG.source.license)}). A guide to the movement, not coaching or medical advice.</p>`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { switchTab('workout'); push({v:'focus', g: b.dataset.g, date: todayStr()}); });
  $('#exportBtn').onclick = exportData;
  $('#phaseBtn').onclick = () => { switchTab('workout'); push({v:'phase'}); };
  bindCoachSettings();
  $('#heightSet').onclick = heightSheet;
  $('#targetsSet').onclick = targetsSheet;
  $('#autoOpen').onclick = () => { db.settings.autoOpenWorkout = !db.settings.autoOpenWorkout; save(); render(); };
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
    db = freshDb(); if (window.MyChart) MyChart.disconnect(); localStorage.removeItem('liftlog.thumbs'); save(); stacks.workout = [{v:'phase'}]; switchTab('workout'); toast('All data erased');
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
        labs: d.labs && typeof d.labs === 'object' && !Array.isArray(d.labs) ? d.labs : db.labs, settings: d.settings || db.settings,
        habits: d.habits && typeof d.habits === 'object' ? d.habits : db.habits, photos: Array.isArray(d.photos) ? d.photos : db.photos});
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
    <div class="btn-row"><button class="btn small" id="heightBtn">📏 Height: ${fmtHeight(db.profile.height)}</button><button class="btn small" id="photosBtn">📸 Photos</button>${series.length > 1 ? `<button class="btn small" id="trendBtn">📈 Weight trend</button>` : ''}</div>
    <div class="section-title">History</div>
    ${list.length ? `<div class="list">${list.map(e => `
      <button class="row body-row" data-id="${esc(e.id)}">
        <div class="main"><div class="name">${fmtNum(e.weight)} lb${e.bf ? ` <span class="pill">${fmtNum(e.bf)}% bf</span>` : ''}</div>
          <div class="meta">${fmtDay(e.date, true)}${BODY_FIELDS.filter(f => f.k !== 'bf' && e[f.k]).map(f => ` · ${f.label} ${fmtNum(e[f.k])}″`).join('')}</div>
          ${e.note ? `<div class="meta body-note">${esc(e.note)}</div>` : ''}</div>
        <svg class="chev" width="20" height="20" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>`).join('')}</div>` : `<div class="empty" style="padding:30px 10px"><div class="ico">⚖️</div><p>Log your weight (and optional measurements) to track your bulk, cut, or body recomp.</p></div>`}`;
  $('#addBody').onclick = () => bodySheet(null);
  $('#photosBtn').onclick = () => push({v: 'photos'});
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
const TRACK_MODES = [['body', '⚖️', 'Body'], ['food', '🍽️', 'Food'], ['daily', '✅', 'Daily'], ['protocol', '💉', 'Protocol'], ['labs', '🩸', 'Labs']];
let trackMode = localStorage.getItem('liftlog.trackMode') || 'body';
if (!TRACK_MODES.some(m => m[0] === trackMode)) trackMode = 'body';
function openTrack(mode){ trackMode = mode; localStorage.setItem('liftlog.trackMode', mode); stacks.track = [{v:'track'}]; switchTab('track'); }
function renderTrack(el){
  ({body: renderBody, food: renderFood, daily: renderDaily, protocol: renderProtocol, labs: renderLabs})[trackMode](el);
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
    ${mealPlanHtml()}
    ${MEALS.map(([m, label, ico]) => {
      const list = entries.filter(e => e.meal === m), mk = list.reduce((a, e) => a + kcalOf(e), 0);
      return `<div class="meal-head"><span>${ico} ${label}</span><span class="mk">${list.length ? fmtNum(mk) + ' kcal' : ''}</span><button class="mini-btn" data-addmeal="${m}">＋ Add</button></div>
        ${list.length ? `<div class="list">${list.map(e => `<button class="row food-row" data-id="${esc(e.id)}"><div class="main"><div class="name">${esc(e.name)}</div>
          <div class="meta">${e.plan ? `<span class="plan-tag ${e.plan.status === 'edited' ? 'ed' : ''}">${e.plan.status === 'edited' ? '✎ edited' : '✓ as planned'}</span> ` : ''}${e.qty ? esc(e.qty) + ' · ' : ''}P ${fmtNum(e.p || 0)} · C ${fmtNum(e.c || 0)} · F ${fmtNum(e.f || 0)}</div></div><div class="kc">${fmtNum(kcalOf(e))}<small> kcal</small></div></button>`).join('')}</div>` : ''}`;
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
  bindMealPlan(el);
}
const FOOD_FILTERS = [['all','All'],['recent','Recent'],['fav','Favorites'],['mine','My foods'],['pizza','Pizza'],['fast-food','Fast food'],['mexican','Mexican'],['sandwich','Subs'],['grocery','Grocery'],['snack','Snacks'],['drink','Drinks'],['gym','Gym']];
const scaleFood = (food, mult) => {
  if (window.foodScale) return window.foodScale(food, mult);
  const m = Number(mult) || 0, r1 = n => Math.round((Number(n) || 0) * m * 10) / 10;
  return {p: r1(food.p), c: r1(food.c), f: r1(food.f), kcal: Math.round((Number(food.kcal) || 0) * m)};
};
const qtyFood = (food, mult) => window.foodQty ? window.foodQty(food, mult) : food.srv;
const normQ = s => window.foodNorm ? window.foodNorm(s) : String(s || '').toLowerCase();
function mealLabel(id){ return MEALS.find(x => x[0] === id)[1]; }
function customAsFoods(){
  return (db.food.custom || []).map(f => ({id: f.id, name: f.name, srv: f.srv || f.qty || '1 serving', g: f.g || null,
    p: f.p || 0, c: f.c || 0, f: f.f || 0, kcal: f.kcal != null ? f.kcal : kcalOf(f), cat: 'mine', mine: true, fromLib: true}));
}
function catalogFoods(){ return (window.FOOD_DB || []).map(f => Object.assign({fromLib: true}, f)).concat(customAsFoods()); }
function favAsFoods(){
  return db.food.favorites.map(f => ({id: f.foodId || null, name: f.name, srv: f.qty || f.srv || '1 serving', g: f.g || null,
    p: f.p || 0, c: f.c || 0, f: f.f || 0, kcal: kcalOf(f), fromLib: !!f.foodId}));
}
function recentPicks(){
  return recentFoods().map(en => {
    const base = en.lib && en.lib.srv ? {id: en.lib.id || en.foodId || null, name: en.name, srv: en.lib.srv, g: en.lib.g || null,
      p: en.lib.p || 0, c: en.lib.c || 0, f: en.lib.f || 0, kcal: en.lib.kcal != null ? en.lib.kcal : kcalOf(en),
      fromLib: !!(en.lib.id || en.foodId), openServings: en.lib.servings || 1} : {id: en.foodId || null, name: en.name, srv: en.qty || '1 serving', g: null,
      p: en.p || 0, c: en.c || 0, f: en.f || 0, kcal: kcalOf(en), fromLib: !!en.foodId};
    return {food: base, title: en.name, sub: `${en.qty ? en.qty + ' · ' : ''}${fmtNum(kcalOf(en))} kcal`, kcal: kcalOf(en)};
  });
}
function foodSheet(e, meal){
  const fav = db.food.favorites;
  let sel = e ? e.meal : meal;
  let filter = 'all';
  let picked = null;
  let mult = 1;
  const val = k => e && e[k] != null ? e[k] : '';
  openSheet(`<h2>${e ? 'Edit food' : 'Add food'}</h2>
    <div class="seg" id="mealSeg">${MEALS.map(([m, l]) => `<button type="button" data-m="${m}" class="${sel === m ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div id="foodBrowse" class="${e ? 'hidden' : ''}">
      <div class="food-search"><input class="text-input" id="foodQ" type="search" enterkeyhint="search" placeholder="Search foods, e.g. pepperoni pizza" autocomplete="off" autocapitalize="off" autocorrect="off" aria-label="Search foods"></div>
      <div class="chip-scroll" id="foodChips">${FOOD_FILTERS.map(([k, l]) => `<button type="button" class="chip${k === 'all' ? ' on' : ''}" data-filter="${k}">${l}</button>`).join('')}</div>
      <div id="foodHits"></div>
      <div class="btn-row"><button type="button" class="btn small" id="foodManualBtn">Enter macros manually</button></div>
    </div>
    <div id="foodAmount" class="hidden"></div>
    <div id="foodManual" class="${e ? '' : 'hidden'}">
      ${e ? `<div class="btn-row"><button type="button" class="btn small" id="foodSearchBtn">Search foods</button></div>` : `<div class="btn-row"><button type="button" class="btn small" id="foodBackSearch">Back to search</button></div>`}
      <label class="form-label">Food</label><input class="text-input" id="fName" maxlength="80" value="${esc(val('name'))}" placeholder="e.g. Chicken breast" autocomplete="off">
      <label class="form-label">Quantity</label><input class="text-input" id="fQty" maxlength="40" value="${esc(val('qty'))}" placeholder="e.g. 200 g, 1 cup, 2 eggs">
      <div class="four" style="margin-top:4px">
        <div><label class="form-label">kcal</label><input class="text-input" id="fKcal" type="number" inputmode="decimal" value="${val('kcal')}" placeholder="auto"></div>
        <div><label class="form-label">Protein g</label><input class="text-input" id="fP" type="number" inputmode="decimal" value="${val('p')}"></div>
        <div><label class="form-label">Carbs g</label><input class="text-input" id="fC" type="number" inputmode="decimal" value="${val('c')}"></div>
        <div><label class="form-label">Fat g</label><input class="text-input" id="fF" type="number" inputmode="decimal" value="${val('f')}"></div>
      </div>
      <label class="check"><input type="checkbox" id="fFav" ${e && fav.some(f => lc(f.name) === lc(e.name)) ? 'checked' : ''}> ★ Save to favorites</label>
      <label class="check"><input type="checkbox" id="fMine"> Save to my foods</label>
      <p class="note">Leave kcal blank to calculate it from macros (4/4/9). Saved foods show up in search later.</p>
      <div class="btn-row" style="margin-top:12px"><button type="button" class="btn primary" id="fSave">${e ? 'Save changes' : 'Add to ' + mealLabel(sel)}</button></div>
      ${e ? `<div class="btn-row"><button type="button" class="btn small danger" id="fDel">Delete</button></div>` : ''}
      <div class="btn-row"><button type="button" class="btn small" id="fCancel">Cancel</button></div>
    </div>`);
  const mealName = () => mealLabel(sel);
  const show = id => { for (const k of ['foodBrowse', 'foodAmount', 'foodManual']) { const n = $('#' + k); if (n) n.classList.toggle('hidden', k !== id); } };
  const syncMealButtons = () => {
    $('#sheet').querySelectorAll('#mealSeg button').forEach(x => x.classList.toggle('on', x.dataset.m === sel));
    if ($('#fSave') && !e) $('#fSave').textContent = 'Add to ' + mealName();
    if ($('#foodAdd')) $('#foodAdd').textContent = (e ? 'Save to ' : 'Add to ') + mealName();
  };
  $('#sheet').querySelectorAll('#mealSeg button').forEach(b => b.onclick = () => { sel = b.dataset.m; syncMealButtons(); });
  function commit(item){
    if (!item.name) { toast('Enter a food name'); return; }
    if (e) {
      if (!item.foodId) delete e.foodId;
      if (!item.lib) delete e.lib;
      Object.assign(e, item, {meal: sel});
      if (e.plan) e.plan.status = sameFood(item, e.plan.orig || {}) ? 'as-planned' : 'edited';
    } else db.food.entries.push({id: uid(), date: foodDate, meal: sel, ...item});
    recomputeAdherence(e ? e.date : foodDate);
    save(); closeSheet(); render(); toast(e ? 'Updated' : `✓ Added ${fmtNum(item.kcal)} kcal`);
  }
  function hitButton(title, sub, kcal, extra){
    return `<button type="button" class="food-hit" data-pick="1"><span class="grow"><span class="nm">${esc(title)}</span><span class="sub">${esc(sub)}</span></span>${extra || ''}<span class="kc">${fmtNum(kcal)}<small> kcal</small></span></button>`;
  }
  function renderHits(){
    const box = $('#foodHits');
    if (!box) return;
    const q = $('#foodQ') ? $('#foodQ').value : '';
    let rows = [];
    if (filter === 'recent') {
      const nq = normQ(q);
      rows = recentPicks().filter(r => !nq || normQ(r.title + ' ' + r.sub).includes(nq)).slice(0, 40);
    } else if (filter === 'fav') {
      rows = (window.foodSearch ? window.foodSearch(q, favAsFoods()) : favAsFoods()).slice(0, 40).map(f => ({food: f, title: f.name, sub: `${f.srv} · ${fmtNum(f.kcal)} kcal`, kcal: f.kcal}));
    } else if (filter === 'mine') {
      const mine = window.foodSearch ? window.foodSearch(q, customAsFoods()) : customAsFoods();
      rows = mine.slice(0, 40).map(f => ({food: f, title: f.name, sub: `${f.srv} · ${fmtNum(f.kcal)} kcal`, kcal: f.kcal, remove: f.id}));
    } else {
      const list = catalogFoods().filter(f => filter === 'all' || f.cat === filter);
      const found = window.foodSearch ? window.foodSearch(q, list) : (q ? [] : list);
      rows = found.slice(0, 40).map(f => ({food: f, title: f.name, sub: `${f.srv} · ${fmtNum(f.kcal)} kcal`, kcal: f.kcal}));
    }
    if (!rows.length) {
      const empty = filter === 'recent' ? 'Foods you log show up here.' : filter === 'fav' ? 'Star a food and it stays here.' : filter === 'mine' ? 'Save a food from manual entry to pick it again.' : (q ? 'No match. Try another name, or enter macros.' : 'Search the food list.');
      box.innerHTML = `<p class="note">${empty}</p>`;
      return;
    }
    box.innerHTML = rows.map(r => {
      const x = r.remove ? `<span class="food-x" data-x="${esc(r.remove)}" role="button" aria-label="Remove ${esc(r.title)}">✕</span>` : '';
      return hitButton(r.title, r.sub, r.kcal, x);
    }).join('');
    box.querySelectorAll('[data-pick]').forEach((b, i) => b.onclick = ev => {
      if (ev.target.closest('[data-x]')) return;
      showAmount(rows[i].food);
    });
    box.querySelectorAll('[data-x]').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      db.food.custom = db.food.custom.filter(f => f.id !== b.dataset.x);
      save(); renderHits(); toast('Removed from my foods');
    });
  }
  function updatePreview(){
    if (!picked) return;
    const scaled = scaleFood(picked, mult);
    $('#pvK').textContent = fmtNum(scaled.kcal);
    $('#pvP').textContent = fmtNum(scaled.p);
    $('#pvC').textContent = fmtNum(scaled.c);
    $('#pvF').textContent = fmtNum(scaled.f);
    const presets = [0.5, 1, 1.5, 2];
    $('#sheet').querySelectorAll('#srvRow button').forEach(b => {
      const presetOn = b.dataset.s !== 'custom' && presets.some(p => Math.abs(p - mult) < 0.02 && String(p) === b.dataset.s);
      const customOn = b.dataset.s === 'custom' && !presets.some(p => Math.abs(p - mult) < 0.02);
      b.classList.toggle('on', presetOn || customOn);
    });
    const custom = $('#srvCustom');
    if (custom) custom.classList.toggle('hidden', presets.some(p => Math.abs(p - mult) < 0.02));
    if ($('#foodAdd')) $('#foodAdd').textContent = (e ? 'Save to ' : 'Add to ') + mealName();
  }
  function showAmount(food){
    picked = food;
    mult = food.openServings && food.openServings > 0 ? food.openServings : 1;
    let gramTouch = false;
    const starred = fav.some(f => lc(f.name) === lc(food.name));
    const presets = [['0.5','½'],['1','1'],['1.5','1½'],['2','2']];
    $('#foodAmount').innerHTML = `<div class="amt-top"><h3>${esc(food.name)}</h3><button type="button" class="chip${starred ? ' on' : ''}" id="foodStar">${starred ? '★' : '☆'} Favorite</button></div>
      <p class="note" style="margin-top:6px">${esc(food.srv)}${food.g ? ' · ' + fmtNum(food.g) + ' g' : ''}</p>
      <label class="form-label">Servings</label>
      <div class="srv-row" id="srvRow">${presets.map(([v, l]) => `<button type="button" data-s="${v}">${l}</button>`).join('')}<button type="button" data-s="custom">Custom</button></div>
      <input class="text-input hidden" id="srvCustom" type="number" inputmode="decimal" min="0.1" max="20" step="0.1" aria-label="Custom servings" placeholder="Servings">
      ${food.g ? `<label class="form-label">Or weigh it</label><input class="text-input" id="foodGrams" type="number" inputmode="decimal" min="1" max="2000" step="1" aria-label="Grams">` : ''}
      <div class="macro-read"><div><b id="pvK"></b><span>kcal</span></div><div><b id="pvP"></b><span>protein</span></div><div><b id="pvC"></b><span>carbs</span></div><div><b id="pvF"></b><span>fat</span></div></div>
      <div class="btn-row" style="margin-top:14px"><button type="button" class="btn primary" id="foodAdd"></button></div>
      <div class="btn-row"><button type="button" class="btn small" id="foodTweak">Tweak macros</button></div>
      <div class="btn-row"><button type="button" class="btn small" id="foodBack">Back</button></div>`;
    show('foodAmount');
    const applyPreset = n => {
      gramTouch = false; mult = n;
      const g = $('#foodGrams'); if (g && food.g) g.value = String(Math.round(food.g * mult * 10) / 10);
      updatePreview();
    };
    $('#sheet').querySelectorAll('#srvRow button').forEach(b => b.onclick = () => {
      if (b.dataset.s === 'custom') {
        $('#srvCustom').value = String(Math.round(mult * 100) / 100);
        $('#srvCustom').classList.remove('hidden');
        updatePreview();
        $('#srvCustom').focus();
        return;
      }
      applyPreset(+b.dataset.s);
    });
    if ($('#srvCustom')) $('#srvCustom').oninput = () => {
      const n = parseFloat($('#srvCustom').value);
      if (n > 0 && n <= 20) { gramTouch = false; mult = n; const g = $('#foodGrams'); if (g && food.g) g.value = String(Math.round(food.g * mult * 10) / 10); updatePreview(); }
    };
    if ($('#foodGrams')) {
      $('#foodGrams').value = String(Math.round(food.g * mult * 10) / 10);
      $('#foodGrams').oninput = () => { const g = parseFloat($('#foodGrams').value); if (g > 0 && food.g) { gramTouch = true; mult = g / food.g; updatePreview(); } };
    }
    $('#foodStar').onclick = () => {
      const i = fav.findIndex(f => lc(f.name) === lc(food.name));
      if (i >= 0) fav.splice(i, 1);
      else fav.push({id: uid(), name: food.name, qty: food.srv, kcal: food.kcal, p: food.p, c: food.c, f: food.f, foodId: food.fromLib ? food.id : null, g: food.g || null});
      save(); $('#foodStar').classList.toggle('on', i < 0); $('#foodStar').textContent = (i < 0 ? '★' : '☆') + ' Favorite';
    };
    $('#foodBack').onclick = () => show('foodBrowse');
    $('#foodTweak').onclick = () => {
      const scaled = scaleFood(food, mult);
      $('#fName').value = food.name; $('#fQty').value = gramTouch && $('#foodGrams') ? (fmtNum(parseFloat($('#foodGrams').value)) + ' g') : qtyFood(food, mult);
      $('#fKcal').value = scaled.kcal; $('#fP').value = scaled.p; $('#fC').value = scaled.c; $('#fF').value = scaled.f;
      show('foodManual');
    };
    $('#foodAdd').onclick = () => {
      if (!(mult > 0) || mult > 20) { toast('Enter a serving size'); return; }
      const scaled = scaleFood(picked, mult);
      const qty = gramTouch && $('#foodGrams') ? (fmtNum(parseFloat($('#foodGrams').value)) + ' g') : qtyFood(picked, mult);
      const item = {name: picked.name, qty, kcal: scaled.kcal, p: scaled.p, c: scaled.c, f: scaled.f};
      if (picked.fromLib && picked.id) item.foodId = picked.id;
      item.lib = {id: picked.id || null, srv: picked.srv, g: picked.g || null, p: picked.p, c: picked.c, f: picked.f, kcal: picked.kcal, servings: Math.round(mult * 100) / 100};
      commit(item);
    };
    applyPreset(mult);
  }
  $('#foodQ').oninput = renderHits;
  $('#foodQ').addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); });
  $('#sheet').querySelectorAll('#foodChips button').forEach(b => b.onclick = () => {
    filter = b.dataset.filter;
    $('#sheet').querySelectorAll('#foodChips button').forEach(x => x.classList.toggle('on', x === b));
    renderHits();
  });
  $('#foodManualBtn').onclick = () => show('foodManual');
  if ($('#foodBackSearch')) $('#foodBackSearch').onclick = () => show('foodBrowse');
  if ($('#foodSearchBtn')) $('#foodSearchBtn').onclick = () => show('foodBrowse');
  $('#fCancel').onclick = closeSheet;
  $('#fSave').onclick = () => {
    const name = $('#fName').value.trim();
    if (!name) { toast('Enter a food name'); return; }
    const p = numOrNull($('#fP').value, 1000), c = numOrNull($('#fC').value, 2000), f = numOrNull($('#fF').value, 1000);
    let kcal = numOrNull($('#fKcal').value, 10000);
    if (kcal == null) kcal = Math.round(4 * (p || 0) + 4 * (c || 0) + 9 * (f || 0));
    const item = {name, qty: $('#fQty').value.trim(), kcal, p: p || 0, c: c || 0, f: f || 0};
    const fi = fav.findIndex(x => lc(x.name) === lc(name));
    if ($('#fFav').checked) { if (fi >= 0) Object.assign(fav[fi], item); else fav.push({id: uid(), ...item}); }
    else if (fi >= 0) fav.splice(fi, 1);
    if ($('#fMine').checked) {
      const row = {name, srv: item.qty || '1 serving', kcal, p: item.p, c: item.c, f: item.f};
      const i = db.food.custom.findIndex(x => lc(x.name) === lc(name));
      if (i >= 0) Object.assign(db.food.custom[i], row); else db.food.custom.push({id: uid(), ...row});
    }
    commit(item);
  };
  if ($('#fDel')) $('#fDel').onclick = () => { db.food.entries = db.food.entries.filter(x => x !== e); recomputeAdherence(e.date); save(); closeSheet(); render(); toast('Deleted'); };
  renderHits();
  if (!e) setTimeout(() => { const q = $('#foodQ'); if (q) q.focus(); }, 280);
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
    const opened = maybeAutoOpenWorkout();
    if (manual) toast(result.applied ? 'Plan updated' : 'Plan is up to date');
    if (result.applied || opened) render();
    return result;
  },
  /** apply a plan object if newer; returns {applied, changes} */
  apply(plan){
    if (!plan || typeof plan !== 'object' || plan.schema !== 1 || !Number.isInteger(plan.version)) return {applied: false, error: 'invalid plan'};
    const pv = db.coach.planVersion || 0;
    if (plan.version < pv) return {applied: false};
    // Same version already applied: re-apply only if a different app version applied it (an older app may have skipped keys it
    // didn't know, e.g. v7 ignoring meals/daily) or a coach-owned copy the plan has is missing. A re-apply skips `phases`
    // (already applied; keeps any manual target edits) and refreshes only Coach-owned copies, so it is idempotent.
    const reapply = plan.version === pv;
    if (reapply && db.coach.appliedByAppVersion === APP_VERSION
        && !(plan.meals !== undefined && !db.coach.meals) && !(plan.daily !== undefined && !db.coach.daily)
        && !(plan.schedule !== undefined && db.coach.schedule == null)) return {applied: false};
    const changes = [];
    let created = 0;
    for (const ph of reapply ? [] : Object.keys(plan.phases || {})) {
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
            if (typeof p.demo === 'string' && p.demo.trim()) it.demo = String(p.demo).trim().slice(0, 300);
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
    // v8: meal plan + daily checklist (each replaces the stored copy when present)
    if (plan.meals !== undefined) {
      const m = cleanMeals(plan.meals);
      if (m) {
        for (const ph of Object.keys(m)) { const old = (db.coach.meals || {})[ph]; if (JSON.stringify(old) !== JSON.stringify(m[ph])) changes.unshift({where: `Meal plan · ${PHASES[ph].short}`, diffs: [`${m[ph].meals.length} meals · ${macroLine(foodsTotal(m[ph].meals.flatMap(x => x.foods)))}${m[ph].groceries.length ? ` · ${m[ph].groceries.length} groceries` : ''}`]}); }
        db.coach.meals = m;
      }
    }
    if (plan.daily !== undefined) {
      const d = cleanDaily(plan.daily);
      if (d && JSON.stringify(d) !== JSON.stringify(db.coach.daily || null)) {
        const T = d.targets, bits = [d.cardio.length ? d.cardio.map(c => `${c.type}${c.minutes ? ' ' + c.minutes + ' min' : ''}${c.days.length ? ' ' + c.days.map(x => WEEKDAYS[x]).join('/') : ''}${c.phase ? ' (' + PHASES[c.phase].short + ')' : ''}`).join(', ') : '',
          T.steps ? fmtNum(T.steps) + ' steps' : '', T.waterOz ? T.waterOz + ' oz water' : '', T.sleepHours ? T.sleepHours + ' h sleep' : '',
          d.targetsByPhase && Object.keys(d.targetsByPhase).length ? 'phase targets ' + Object.keys(d.targetsByPhase).map(ph => PHASES[ph].short).join('/') : '',
          d.supplements.length ? d.supplements.length + ' supplements' : '', d.photoDay != null ? 'photos ' + WEEKDAYS[d.photoDay] : ''].filter(Boolean);
        changes.unshift({where: 'Daily', diffs: [bits.join(' · ') || 'updated']});
      }
      if (d) db.coach.daily = d;
    }
    // v8.2: weekly workout schedule. Present = replace the stored copy (like meals/daily). Omitted = leave it.
    if (plan.schedule !== undefined) {
      const sch = cleanSchedule(plan.schedule) || {};
      if (JSON.stringify(sch) !== JSON.stringify(db.coach.schedule || {})) changes.unshift({where: 'Schedule', diffs: [scheduleSummary(sch)]});
      db.coach.schedule = sch;
    }
    db.coach.appliedByAppVersion = APP_VERSION;
    if (reapply) {
      // only surface what this app newly picked up; never clear an existing banner
      if (changes.length) db.coach.banner = {version: plan.version, message: plan.message || '', changes, at: new Date().toISOString()};
      save();
      return {applied: changes.length > 0, reapplied: true, changes, created};
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
    if (ok) { portalCheckedAt = 0; checkPortalLabs(false); }
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
    // a FHIR copy replaces the same result from a portal import
    db.labs.results = m.results.filter(r => !isPortal(r) || !m.results.some(x => !isPortal(x) && sameLab(x, r)));
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

/* ---------- MyChart portal import (data/labs-import.json in the private lift-log-data repo, fetched with the Coach Sync token) ---------- */
const PORTAL_PATH = 'data/labs-import.json', PORTAL_LABEL = 'MyChart (portal import)';
let portalBusy = false, portalCheckedAt = 0;
const isPortal = r => r && r.source === 'mychart-portal';
const labVal = r => r.value != null ? String(r.value) : lc(r.text || '');
/** same lab result: same date + value and same name, LOINC code, or known marker */
const sameLab = (x, r) => x.date === r.date && labVal(x) === labVal(r) && (lc(x.name) === lc(r.name) || (!!x.code && x.code === r.code) || (markerKey(x) === markerKey(r) && !markerKey(r).startsWith('name:')));
/** merge a labs-import.json object into db.labs if its `updated` is newer than the last one applied. Pure apart from db. */
function applyPortalLabs(f){
  if (!f || typeof f !== 'object' || !Array.isArray(f.results) || !f.updated || isNaN(Date.parse(f.updated))) return {applied: false, error: 'invalid'};
  const prev = db.labs.portal && db.labs.portal.updated;
  if (prev && Date.parse(f.updated) <= Date.parse(prev)) return {applied: false};
  const num = x => x === null || x === undefined || x === '' || !Number.isFinite(+x) ? null : +x;
  const str = (x, n) => x == null ? '' : String(x).slice(0, n);
  const incoming = f.results.filter(r => r && typeof r === 'object' && /^\d{4}-\d\d-\d\d$/.test(r.date || '') && r.name).map(r => ({
    id: str(r.id || `mcp-${r.date}-${lc(r.name)}`, 120), date: r.date, code: r.code ? str(r.code, 20) : null, name: str(r.name, 120),
    value: num(r.value), unit: str(r.unit, 30), refLow: num(r.refLow), refHigh: num(r.refHigh),
    flag: ['H', 'L', 'HH', 'LL', 'A'].includes(r.flag) ? r.flag : null, text: str(r.text, 300), reportId: r.reportId ? str(r.reportId, 120) : null, source: 'mychart-portal'}));
  const same = sameLab;
  const list = db.labs.results.slice();
  let added = 0, updated = 0;
  for (const r of incoming) {
    let i = list.findIndex(x => x.id === r.id);
    if (i < 0) i = list.findIndex(x => same(x, r)); // de-dupe by date + name (or marker) + value, incl. FHIR imports
    if (i < 0) { list.push(r); added++; }
    else if (isPortal(list[i]) && JSON.stringify(list[i]) !== JSON.stringify(r)) { list[i] = r; updated++; } // a FHIR copy wins
  }
  list.sort((a, b) => b.date.localeCompare(a.date) || String(a.name).localeCompare(String(b.name)));
  db.labs.results = list;
  for (const p of Array.isArray(f.reports) ? f.reports : []) {
    if (!p || !p.id) continue;
    db.labs.reports[str(p.id, 120)] = {name: str(p.name || 'Lab report', 120), date: /^\d{4}-\d\d-\d\d$/.test(p.date || '') ? p.date : null,
      orderedBy: str(p.orderedBy, 80), note: str(p.note, 1000), source: 'mychart-portal'};
  }
  db.labs.portal = {updated: f.updated, importedAt: new Date().toISOString(), count: incoming.length, added,
    available: (Array.isArray(f.available) ? f.available : []).filter(a => a && a.name).slice(0, 300).map(a => ({name: str(a.name, 120), date: /^\d{4}-\d\d-\d\d$/.test(a.date || '') ? a.date : null, imported: !!a.imported}))};
  return {applied: true, added, updated};
}
/** fetch data/labs-import.json from lift-log-data (needs Coach Sync). Silent unless manual. */
async function checkPortalLabs(manual){
  if (!Sync.enabled || portalBusy || !navigator.onLine) { if (manual && !Sync.enabled) toast('Turn on Coach Sync first'); return false; }
  if (!manual && Date.now() - portalCheckedAt < 10 * 60e3) return false;
  portalBusy = true; portalCheckedAt = Date.now();
  if (manual && tab === 'track' && trackMode === 'labs') render();
  try {
    const res = await fetch(`https://api.github.com/repos/${Sync.owner}/${Sync.repo}/contents/${PORTAL_PATH}?t=${Date.now()}`,
      {headers: {...Sync.headers(), 'Accept': 'application/vnd.github.raw+json'}, cache: 'no-store'});
    if (res.status === 404) { if (manual) toast('No lab import waiting'); return false; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const r = applyPortalLabs(await res.json());
    if (r.applied) { save(); toast(r.added ? `✓ ${r.added} lab result${r.added > 1 ? 's' : ''} imported from MyChart` : '✓ MyChart import updated'); }
    else if (manual) toast(r.error ? 'Lab import file is invalid' : 'Labs up to date');
    return !!r.applied;
  } catch (e) {
    if (manual) toast('Could not fetch the lab import');
    return false;
  } finally {
    portalBusy = false;
    if (tab === 'track' && trackMode === 'labs') render();
  }
}
function portalHtml(){
  const P = db.labs.portal;
  if (!P && !Sync.enabled) return '';
  const btn = Sync.enabled ? `<div class="btn-row"><button class="btn small" id="portalCheck" ${portalBusy ? 'disabled' : ''}>${portalBusy ? 'Checking…' : '⟳ Check for new import'}</button></div>` : '';
  if (!P) return `<div class="card mc-card portal-card"><div class="mc-head"><span class="mc-dot"></span><div class="grow"><b>${PORTAL_LABEL}</b>
    <div class="sub">No portal import yet. Results pulled from the MyChart website arrive here through Coach Sync.</div></div></div>${btn}</div>`;
  const nr = P.available.filter(a => !a.imported);
  return `<div class="card mc-card ok portal-card"><div class="mc-head"><span class="mc-dot ok"></span><div class="grow"><b>${PORTAL_LABEL}</b>
    <div class="sub">${P.count} results · pulled ${fmtDay(new Date(P.updated).toLocaleDateString('en-CA'), true)} · imported ${timeAgo(P.importedAt)}${Sync.enabled ? '' : ' · Coach Sync off'}</div></div></div>${btn}
    ${nr.length ? `<details class="portal-avail"><summary>${nr.length} more results in MyChart, not imported yet</summary>
      ${[...new Set(nr.map(a => a.date))].sort().reverse().map(d => `<div class="pa-day"><b>${d ? fmtDay(d, true) : 'Undated'}</b> ${nr.filter(a => a.date === d).map(a => esc(a.name)).join(' · ')}</div>`).join('')}</details>` : ''}</div>`;
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
    const srcs = [...new Set(items.map(r => isPortal(r) ? PORTAL_LABEL : 'MyChart (FHIR)'))];
    const reps = [...new Set(items.map(r => r.reportId).filter(id => id && L.reports[id]))].map(id => L.reports[id]);
    const orderedBy = [...new Set(reps.map(p => p.orderedBy).filter(Boolean))];
    const notes = [...new Set(reps.map(p => p.note).filter(Boolean))];
    return `<div class="section-title draw-title">${fmtDay(date, true)} ${flagged ? `<span class="st-sub">${flagged} flagged</span>` : ''}${panels.length ? `<div class="draw-panels">${panels.map(esc).join(' · ')}</div>` : ''}
      <div class="draw-src">${srcs.map(esc).join(' + ')}${orderedBy.length ? ' · ordered by ' + orderedBy.map(esc).join(', ') : ''}</div></div>
      ${notes.map(n => `<div class="lab-note">📝 ${esc(n)}</div>`).join('')}
      <div class="list">${items.map(r => `<button class="row lab-res" data-marker="${esc(markerKey(r))}"><div class="main"><div class="name">${esc(r.name)}</div>
        <div class="meta">${refStr(r) ? 'ref ' + esc(refStr(r)) : 'no range'}${r.status ? ' · ' + esc(r.status) : ''}</div></div>
        <div class="lab-v ${r.flag ? 'flagged' : ''}">${valStr(r)}<small> ${esc(r.unit)}</small> ${flagPill(r.flag)}</div></button>`).join('')}</div>`;
  }).join('');
  const ls = labsState(), hideFhir = L.portal && ls.st !== 'unavailable' && !ls.conn && !ls.configured.length; // FHIR not set up yet: don't nag when the portal import works
  el.innerHTML = `${portalHtml()}${hideFhir ? '' : labsConnHtml()}
    ${keys.length ? `<div class="section-title">Key markers</div><div class="lab-tiles">${tiles}</div>` : ''}
    ${rs.length ? draws : `<p class="note">No lab results yet. Once MyChart is connected, results import here grouped by draw date, with H/L flags and a trend chart for each marker.</p>`}
    <p class="note">Imported from MyChart (read-only${rs.some(isPortal) ? `; ${rs.filter(isPortal).length} via portal import` : ''}) · ${rs.length} results. Manual bloodwork notes stay in Protocol › Health notes. Not medical advice.</p>`;
  if ($('#labConnect')) $('#labConnect').onclick = () => connectLabs($('#labEp') ? $('#labEp').value : (labsState().configured[0] || {}).id);
  if ($('#labReconnect')) $('#labReconnect').onclick = reconnectLabs;
  if ($('#labSync')) $('#labSync').onclick = () => syncLabs(true);
  if ($('#portalCheck')) $('#portalCheck').onclick = () => checkPortalLabs(true);
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
      <div class="meta">${esc(r.name)}${refStr(r) ? ' · ref ' + esc(refStr(r)) : ''}${r.reportId && db.labs.reports[r.reportId] ? ' · ' + esc(db.labs.reports[r.reportId].name) : ''}${isPortal(r) ? ' · ' + PORTAL_LABEL : ''}</div></div>
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
/* =====================================================================
 * v8: Coach meal plan (Food), daily checklist (cardio / steps / water / sleep / supplements), progress photos
 * ===================================================================== */
const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];
const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const r1 = x => Math.round(x * 10) / 10;
const numIn = (v, lo, hi) => v !== null && v !== '' && v !== undefined && Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : null;
const slugId = (s, i) => (String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'x') + (i != null ? '-' + i : '');

/* ----- plan.json sanitizers (Coach.apply) ----- */
function cleanFood(f){
  if (!f || typeof f !== 'object' || !f.name) return null;
  const o = {name: String(f.name).trim().slice(0, 80), qty: f.qty ? String(f.qty).slice(0, 40) : '',
    p: r1(numIn(f.p, 0, 1000) || 0), c: r1(numIn(f.c, 0, 2000) || 0), f: r1(numIn(f.f, 0, 1000) || 0)};
  const k = numIn(f.kcal, 0, 10000);
  o.kcal = k != null ? Math.round(k) : Math.round(4 * o.p + 4 * o.c + 9 * o.f);
  return o;
}
function cleanMeals(m){
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const out = {};
  for (const ph of Object.keys(PHASES)) {
    const src = m[ph]; if (!src || typeof src !== 'object') continue;
    const meals = (Array.isArray(src.meals) ? src.meals : []).slice(0, 12).map((x, i) => {
      if (!x || typeof x !== 'object') return null;
      const foods = (Array.isArray(x.foods) ? x.foods : []).slice(0, 25).map(cleanFood).filter(Boolean);
      if (!foods.length) return null;
      const name = String(x.name || `Meal ${i + 1}`).slice(0, 60);
      return {id: x.id ? String(x.id).slice(0, 40) : slugId(name, i), name,
        slot: MEAL_SLOTS.includes(x.slot) ? x.slot : (MEAL_SLOTS.find(s => lc(name).includes(s)) || 'snack'),
        time: /^\d{1,2}:\d\d$/.test(x.time || '') ? x.time : null, foods,
        swaps: (Array.isArray(x.swaps) ? x.swaps : []).slice(0, 6).map((s, j) => {
          const sf = s && Array.isArray(s.foods) ? s.foods.slice(0, 25).map(cleanFood).filter(Boolean) : [];
          return sf.length ? {name: String(s.name || `Swap ${j + 1}`).slice(0, 60), foods: sf} : null;
        }).filter(Boolean),
        notes: x.notes ? String(x.notes).slice(0, 300) : ''};
    }).filter(Boolean);
    const ids = new Set(); for (const x of meals) { while (ids.has(x.id)) x.id += '-b'; ids.add(x.id); }
    const groceries = (Array.isArray(src.groceries) ? src.groceries : []).slice(0, 80).map(g => String(g).slice(0, 80)).filter(Boolean);
    if (meals.length || groceries.length) out[ph] = {meals, groceries};
  }
  return out;
}
function scheduleSummary(sch){
  const bits = [];
  const desc = (name, block) => {
    if (!block) return '';
    const days = block.days ? Object.values(block.days) : [];
    const rest = days.filter(e => e.rest).length, lift = days.length - rest;
    const dates = block.dates ? Object.keys(block.dates).length : 0;
    return `${name}: ${lift} workout${lift === 1 ? '' : 's'}${rest ? `, ${rest} rest` : ''}${dates ? `, ${dates} date${dates === 1 ? '' : 's'}` : ''}`;
  };
  for (const ph of Object.keys(PHASES)) if (sch[ph]) bits.push(desc(PHASES[ph].short, sch[ph]));
  if (sch.default) bits.push(desc('Default', sch.default));
  if (sch.days || sch.dates) bits.push(desc('All phases', {days: sch.days, dates: sch.dates}));
  return bits.join(' · ') || 'cleared';
}
function cleanSchedEntry(raw){
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 60) : '';
  const notes = typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 300) : '';
  const extra = {};
  if (label) extra.label = label;
  if (notes) extra.notes = notes;
  if (raw.rest === true) return Object.assign({rest: true}, extra);
  if (!groupOf(raw.group) || !FOCUS_IDS(raw.group).includes(raw.focus)) return null;
  return Object.assign({group: raw.group, focus: raw.focus}, extra);
}
function cleanSchedBlock(block){
  if (!block || typeof block !== 'object' || Array.isArray(block)) return null;
  const out = {};
  if (block.days && typeof block.days === 'object' && !Array.isArray(block.days)) {
    const days = {};
    for (const k of Object.keys(block.days)) {
      if (!/^[0-6]$/.test(k)) continue;
      const e = cleanSchedEntry(block.days[k]);
      if (e) days[k] = e;
    }
    if (Object.keys(days).length) out.days = days;
  }
  if (block.dates && typeof block.dates === 'object' && !Array.isArray(block.dates)) {
    const dates = {};
    for (const k of Object.keys(block.dates)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const [y, m, d] = k.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) continue;
      const e = cleanSchedEntry(block.dates[k]);
      if (e) dates[k] = e;
    }
    if (Object.keys(dates).length) out.dates = dates;
  }
  return out.days || out.dates ? out : null;
}
/** keep valid phase blocks (bulk/cut/recomp/default) and a top-level days/dates shorthand */
function cleanSchedule(s){
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  const out = {};
  for (const ph of Object.keys(PHASES).concat('default')) {
    const b = cleanSchedBlock(s[ph]);
    if (b) out[ph] = b;
  }
  const top = cleanSchedBlock({days: s.days, dates: s.dates});
  if (top) { if (top.days) out.days = top.days; if (top.dates) out.dates = top.dates; }
  return Object.keys(out).length ? out : null;
}
function cleanDaily(d){
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const cardio = (Array.isArray(d.cardio) ? d.cardio : []).slice(0, 10).map((c, i) => {
    if (!c || typeof c !== 'object' || !c.type) return null;
    const days = Array.isArray(c.days) ? [...new Set(c.days.filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
    return {id: c.id ? String(c.id).slice(0, 40) : slugId(c.type, i), type: String(c.type).slice(0, 60), minutes: Math.round(numIn(c.minutes, 1, 300) || 0) || null,
      days, zone: c.zone ? String(c.zone).slice(0, 30) : '', notes: c.notes ? String(c.notes).slice(0, 200) : '', phase: PHASES[c.phase] ? c.phase : null};
  }).filter(Boolean);
  const t = d.targets && typeof d.targets === 'object' ? d.targets : {};
  const targets = {steps: numIn(t.steps, 1, 100000) != null ? Math.round(t.steps) : null, waterOz: numIn(t.waterOz, 1, 400), sleepHours: numIn(t.sleepHours, 1, 14)};
  const targetsByPhase = {};
  const tbp = d.targetsByPhase && typeof d.targetsByPhase === 'object' && !Array.isArray(d.targetsByPhase) ? d.targetsByPhase : {};
  for (const ph of Object.keys(PHASES)) {
    const src = tbp[ph];
    if (!src || typeof src !== 'object') continue;
    const bag = {};
    const steps = numIn(src.steps, 1, 100000), water = numIn(src.waterOz, 1, 400), sleep = numIn(src.sleepHours, 1, 14);
    if (steps != null) bag.steps = Math.round(steps);
    if (water != null) bag.waterOz = water;
    if (sleep != null) bag.sleepHours = sleep;
    if (Object.keys(bag).length) targetsByPhase[ph] = bag;
  }
  const supplements = (Array.isArray(d.supplements) ? d.supplements : []).slice(0, 20).map((s, i) => {
    if (!s || !s.name) return null;
    const item = {id: s.id ? String(s.id).slice(0, 40) : slugId(s.name, i), name: String(s.name).slice(0, 60), dose: s.dose ? String(s.dose).slice(0, 40) : '', time: s.time ? String(s.time).slice(0, 20) : ''};
    if (PHASES[s.phase]) item.phase = s.phase; // omitted = every phase
    return item;
  }).filter(Boolean);
  const out = {cardio, targets, supplements, photoDay: Number.isInteger(d.photoDay) && d.photoDay >= 0 && d.photoDay <= 6 ? d.photoDay : null};
  if (Object.keys(targetsByPhase).length) out.targetsByPhase = targetsByPhase;
  return out;
}

/* ----- meal plan on Track › Food ----- */
const foodsTotal = foods => { const t = {kcal: 0, p: 0, c: 0, f: 0}; for (const x of foods) { t.kcal += kcalOf(x); t.p += x.p || 0; t.c += x.c || 0; t.f += x.f || 0; } for (const k in t) t[k] = r1(t[k]); return t; };
const mealPlan = () => (db.coach.meals || {})[curPhase()] || null;
const macroLine = t => `${fmtNum(Math.round(t.kcal))} kcal · P ${fmtNum(t.p)} · C ${fmtNum(t.c)} · F ${fmtNum(t.f)}`;
const sameFood = (a, b) => lc(a.name) === lc(b.name) && String(a.qty || '') === String(b.qty || '') && ['kcal', 'p', 'c', 'f'].every(k => Math.abs((+a[k] || 0) - (+b[k] || 0)) < 0.05);
let mealSwap = {}; // mealId -> swap index chosen in the UI (memory only)
function logPlanned(m, swapIdx, foodIdx){
  const foods = swapIdx != null ? m.swaps[swapIdx].foods : m.foods, group = uid();
  const pick = foodIdx != null ? [[foods[foodIdx], foodIdx]] : foods.map((f, i) => [f, i]);
  for (const [f, i] of pick) db.food.entries.push({id: uid(), date: foodDate, meal: m.slot, name: f.name, qty: f.qty, kcal: kcalOf(f), p: f.p, c: f.c, f: f.f,
    plan: {meal: m.id, food: i, swap: swapIdx != null ? swapIdx : null, group, status: 'as-planned', orig: {name: f.name, qty: f.qty, kcal: kcalOf(f), p: f.p, c: f.c, f: f.f}}});
  recomputeAdherence(foodDate); save(); render();
  const t = foodsTotal(pick.map(x => x[0]));
  toast(`✓ Logged ${foodIdx != null ? pick[0][0].name : m.name} · ${fmtNum(t.kcal)} kcal`);
}
/** planned vs actual for one day → db.food.adherence[date] (synced, for Coach) */
function recomputeAdherence(date){
  const mp = mealPlan();
  db.food.adherence = db.food.adherence && typeof db.food.adherence === 'object' ? db.food.adherence : {};
  if (!mp || !mp.meals.length) return;
  const ents = db.food.entries.filter(e => e.date === date);
  const meals = {}, n = {asPlanned: 0, swapped: 0, partial: 0, edited: 0, missed: 0};
  for (const m of mp.meals) {
    const es = ents.filter(e => e.plan && e.plan.meal === m.id);
    const swap = es.find(e => e.plan.swap != null), need = swap ? (m.swaps[swap.plan.swap] || {foods: []}).foods.length : m.foods.length;
    const st = !es.length ? 'missed' : es.some(e => e.plan.status === 'edited') ? 'edited' : new Set(es.map(e => e.plan.food)).size < need ? 'partial' : swap ? 'swapped' : 'as-planned';
    meals[m.id] = st; n[st === 'as-planned' ? 'asPlanned' : st]++;
  }
  const planned = foodsTotal(mp.meals.flatMap(m => m.foods)), actual = dayTotals(date);
  db.food.adherence[date] = {phase: curPhase(), planned, actual: {kcal: actual.kcal, p: actual.p, c: actual.c, f: actual.f}, meals, ...n,
    offPlan: ents.filter(e => !e.plan).length, kcalPct: planned.kcal ? Math.round(actual.kcal / planned.kcal * 100) : null, proteinPct: planned.p ? Math.round(actual.p / planned.p * 100) : null,
    updated: new Date().toISOString()};
}
function mealPlanHtml(){
  const mp = mealPlan(); if (!mp) return '';
  const ents = db.food.entries.filter(e => e.date === foodDate), ad = (db.food.adherence || {})[foodDate];
  const tot = foodsTotal(mp.meals.flatMap(m => m.foods));
  const ST = {'as-planned': '✓ Logged', swapped: '✓ Swapped', partial: '◐ Partly', edited: '✎ Edited'};
  return `<div class="card mp-card">
    <div class="mp-head"><div><b>🧠 Coach meal plan · ${PHASES[curPhase()].short}</b><div class="sub">${mp.meals.length} meals · ${macroLine(tot)}</div></div>
      ${ad ? `<div class="mp-score"><b>${ad.asPlanned + ad.swapped}</b>/${mp.meals.length}<span>on plan</span></div>` : ''}</div>
    ${mp.meals.map(m => {
      const si = mealSwap[m.id] != null && m.swaps[mealSwap[m.id]] ? mealSwap[m.id] : null, foods = si != null ? m.swaps[si].foods : m.foods, t = foodsTotal(foods);
      const es = ents.filter(e => e.plan && e.plan.meal === m.id), st = ad && ad.meals[m.id] !== 'missed' && es.length ? ad.meals[m.id] : null;
      return `<div class="mp-meal ${st ? 'logged' : ''}">
        <div class="mpm-head"><div class="grow"><b>${esc(m.name)}</b>${m.time ? ` <span class="mpm-time">${esc(m.time)}</span>` : ''}<div class="sub">${si != null ? '↔ ' + esc(m.swaps[si].name) + ' · ' : ''}${macroLine(t)}</div></div>
          ${st ? `<span class="pill done">${ST[st] || '✓'}</span>` : `<button class="mini-btn accent" data-logmeal="${esc(m.id)}">＋ Log meal</button>`}</div>
        <div class="mpm-foods">${foods.map((f, i) => `<button class="mpf" data-logfood="${esc(m.id)}" data-i="${i}" aria-label="Log ${esc(f.name)}"><span class="grow">${esc(f.name)}${f.qty ? ` <small>${esc(f.qty)}</small>` : ''}</span><span class="mpf-k">${fmtNum(kcalOf(f))} · P${fmtNum(f.p)}</span><span class="mpf-add">＋</span></button>`).join('')}</div>
        ${m.swaps.length ? `<div class="chips mp-swaps"><button class="chip ${si == null ? 'on' : ''}" data-swap="${esc(m.id)}" data-s="">Planned</button>${m.swaps.map((s, j) => `<button class="chip ${si === j ? 'on' : ''}" data-swap="${esc(m.id)}" data-s="${j}">↔ ${esc(s.name)}</button>`).join('')}</div>` : ''}
        ${m.notes ? `<div class="mpm-note">${esc(m.notes)}</div>` : ''}
      </div>`;
    }).join('')}
    ${mp.groceries.length ? `<details class="mp-groc"><summary>🛒 Grocery list (${mp.groceries.length})</summary><ul>${mp.groceries.map(g => `<li>${esc(g)}</li>`).join('')}</ul></details>` : ''}
    <p class="note" style="margin:8px 2px 0">Tap a food to log just that item. Logged items are marked as planned; editing one marks it edited.</p>
  </div>`;
}
function bindMealPlan(el){
  const mp = mealPlan(); if (!mp) return;
  const byId = id => mp.meals.find(m => m.id === id);
  el.querySelectorAll('[data-logmeal]').forEach(b => b.onclick = () => { const m = byId(b.dataset.logmeal); logPlanned(m, mealSwap[m.id] != null && m.swaps[mealSwap[m.id]] ? mealSwap[m.id] : null, null); });
  el.querySelectorAll('[data-logfood]').forEach(b => b.onclick = () => { const m = byId(b.dataset.logfood); logPlanned(m, mealSwap[m.id] != null && m.swaps[mealSwap[m.id]] ? mealSwap[m.id] : null, +b.dataset.i); });
  el.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => { if (b.dataset.s === '') delete mealSwap[b.dataset.swap]; else mealSwap[b.dataset.swap] = +b.dataset.s; render(); });
}

/* ----- daily checklist ----- */
let dailyDate = todayStr();
const dailyPlan = () => db.coach.daily || {cardio: [], targets: {steps: null, waterOz: null, sleepHours: null}, supplements: [], photoDay: null};
/** daily.targets with per-field overrides from daily.targetsByPhase for the active phase */
function effectiveTargets(){
  const P = dailyPlan(), base = P.targets || {}, over = (P.targetsByPhase && P.targetsByPhase[curPhase()]) || {};
  const pick = k => over[k] != null ? over[k] : (base[k] != null ? base[k] : null);
  return {steps: pick('steps'), waterOz: pick('waterOz'), sleepHours: pick('sleepHours')};
}
function dueCardio(date){ const wd = parseDate(date).getDay(); return dailyPlan().cardio.filter(c => (!c.days.length || c.days.includes(wd)) && (!c.phase || c.phase === curPhase())); }
function dueSupps(){ return (dailyPlan().supplements || []).filter(s => !s.phase || s.phase === curPhase()); }
function habitItems(date){
  const T = effectiveTargets(), h = (db.habits || {})[date] || {};
  const items = [];
  for (const c of dueCardio(date)) { const v = (h.cardio || {})[c.id] || {}; items.push({key: 'cardio:' + c.id, kind: 'cardio', ico: '🏃', label: c.type, sub: [c.minutes ? c.minutes + ' min' : '', c.zone, c.notes].filter(Boolean).join(' · '), done: !!v.done, c}); }
  items.push({key: 'steps', kind: 'steps', ico: '👟', label: 'Steps', target: T.steps, unit: 'steps', value: h.steps ?? null, done: T.steps ? (h.steps || 0) >= T.steps : h.steps != null});
  items.push({key: 'water', kind: 'water', ico: '💧', label: 'Water', target: T.waterOz, unit: 'oz', value: h.water ?? null, done: T.waterOz ? (h.water || 0) >= T.waterOz : h.water != null});
  items.push({key: 'sleep', kind: 'sleep', ico: '😴', label: 'Sleep', target: T.sleepHours, unit: 'h', value: h.sleep ?? null, done: T.sleepHours ? (h.sleep || 0) >= T.sleepHours : h.sleep != null});
  for (const s of dueSupps()) items.push({key: 'supp:' + s.id, kind: 'supp', ico: '💊', label: s.name, sub: [s.dose, s.time].filter(Boolean).join(' · '), done: !!(h.supps || {})[s.id], s});
  return items;
}
/** write one change into db.habits[date] with a snapshot of the day's targets + done/total for Coach */
function setHabit(date, fn){
  db.habits = db.habits && typeof db.habits === 'object' ? db.habits : {};
  const h = db.habits[date] = db.habits[date] || {cardio: {}, supps: {}, steps: null, water: null, sleep: null};
  h.cardio = h.cardio || {}; h.supps = h.supps || {};
  fn(h);
  const T = effectiveTargets(), items = habitItems(date);
  h.plan = {cardio: dueCardio(date).map(c => ({id: c.id, type: c.type, minutes: c.minutes})), steps: T.steps, waterOz: T.waterOz, sleepHours: T.sleepHours, supps: dueSupps().map(s => s.id)};
  h.done = items.filter(i => i.done).length; h.total = items.length; h.updated = new Date().toISOString();
  save();
}
const habitVal = (i) => i.value == null ? (i.target ? `0 / ${fmtNum(i.target)} ${i.unit}` : 'tap to log') : `${fmtNum(i.value)}${i.target ? ' / ' + fmtNum(i.target) : ''} ${i.unit}`;
function todayCardHtml(){
  const items = habitItems(todayStr()), done = items.filter(i => i.done).length, pct = items.length ? done / items.length : 0;
  const R = 22, C = 2 * Math.PI * R;
  return `<div class="card today-card" id="todayCard">
    <div class="tc-head"><svg class="tc-ring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="${R}" class="bg"/><circle cx="26" cy="26" r="${R}" class="fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/><text x="26" y="30">${done}/${items.length}</text></svg>
      <div class="grow"><b>Today</b><div class="sub">${db.coach.daily ? 'Daily checklist from Coach' : 'Daily checklist'}</div></div><button class="text-btn" id="tcOpen">Open ›</button></div>
    <div class="tc-items">${items.map(i => `<button class="tc-item ${i.done ? 'done' : ''}" data-hk="${esc(i.key)}"><span class="tci-ico">${i.done ? '✓' : i.ico}</span><span class="grow"><b>${esc(i.label)}</b><small>${i.kind === 'cardio' || i.kind === 'supp' ? esc(i.sub || '') : habitVal(i)}</small></span></button>`).join('')}</div>
  </div>`;
}
function toggleHabit(date, key){
  const [kind, id] = key.split(':');
  if (kind === 'cardio') setHabit(date, h => { const v = h.cardio[id] || {}; const c = dailyPlan().cardio.find(x => x.id === id) || {}; h.cardio[id] = v.done ? {done: false} : {done: true, minutes: v.minutes || c.minutes || null}; });
  else if (kind === 'supp') setHabit(date, h => { h.supps[id] = !h.supps[id]; });
  else return false;
  return true;
}
function bindTodayCard(){
  if (!$('#todayCard')) return;
  $('#tcOpen').onclick = () => { dailyDate = todayStr(); openTrack('daily'); };
  document.querySelectorAll('#todayCard [data-hk]').forEach(b => b.onclick = () => {
    if (toggleHabit(todayStr(), b.dataset.hk)) render(); else { dailyDate = todayStr(); openTrack('daily'); }
  });
}
function renderDaily(el){
  setHeader('Daily', fmtDay(dailyDate, true));
  const items = habitItems(dailyDate), done = items.filter(i => i.done).length;
  const week = Array.from({length: 7}, (_, k) => dateAdd(dailyDate, k - 6)).map(d => { const h = (db.habits || {})[d]; return {d, pct: h && h.total ? h.done / h.total : null}; });
  const QUICK = {steps: [1000, 2500], water: [8, 16], sleep: [0.5]};
  el.innerHTML = `
    <div class="date-nav"><button class="icon-btn" id="dPrev" aria-label="Previous day">‹</button><input type="date" id="dDate" value="${dailyDate}" max="${todayStr()}"><button class="icon-btn" id="dNext" aria-label="Next day" ${dailyDate >= todayStr() ? 'disabled' : ''}>›</button></div>
    <div class="card daily-sum"><div class="ds-top"><b>${done}/${items.length}</b> done${db.coach.daily ? '' : ' · <span class="sub">Coach hasn\'t published daily targets yet</span>'}</div>
      <div class="ds-week">${week.map(w => `<div class="dsw ${w.d === dailyDate ? 'cur' : ''}"><i style="height:${w.pct == null ? 0 : Math.max(6, Math.round(w.pct * 100))}%"></i><span>${WEEKDAYS[parseDate(w.d).getDay()][0]}</span></div>`).join('')}</div></div>
    ${items.some(i => i.kind === 'cardio') ? `<div class="section-title">Cardio</div>` : ''}
    <div class="list">${items.filter(i => i.kind === 'cardio').map(i => `<button class="row hb-row ${i.done ? 'done' : ''}" data-hk="${esc(i.key)}"><span class="hb-check">${i.done ? '✓' : ''}</span><div class="main"><div class="name">${esc(i.label)}</div><div class="meta">${esc(i.sub)}</div></div></button>`).join('')}</div>
    <div class="section-title">Targets</div>
    <div class="list">${items.filter(i => ['steps', 'water', 'sleep'].includes(i.kind)).map(i => `<div class="row hb-row hb-val ${i.done ? 'done' : ''}"><span class="hb-check">${i.done ? '✓' : i.ico}</span>
      <div class="main"><div class="name">${i.label}</div><div class="meta">${i.target ? 'Goal ' + fmtNum(i.target) : 'No goal set'}</div></div>
      <input class="hb-in" type="number" inputmode="decimal" min="0" step="any" data-hv="${i.kind}" value="${i.value ?? ''}" placeholder="0"><span class="hb-unit">${i.unit}</span>
      ${QUICK[i.kind].map(q => `<button class="mini-btn" data-hq="${i.kind}" data-q="${q}">+${fmtNum(q)}</button>`).join('')}</div>`).join('')}</div>
    ${items.some(i => i.kind === 'supp') ? `<div class="section-title">Supplements</div><div class="list">${items.filter(i => i.kind === 'supp').map(i => `<button class="row hb-row ${i.done ? 'done' : ''}" data-hk="${esc(i.key)}"><span class="hb-check">${i.done ? '✓' : ''}</span><div class="main"><div class="name">${esc(i.label)}</div><div class="meta">${esc(i.sub || '')}</div></div></button>`).join('')}</div>` : ''}
    <div class="section-title">Progress photos</div>
    <button class="row" id="dPhotos"><div class="main"><div class="name">📸 Weekly check-in</div><div class="meta">${photoStatusText()}</div></div><svg class="chev" width="20" height="20" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    <p class="note">Ticks and values sync to Coach by date. Steps are entered by hand (a web app can't read Apple Health).</p>`;
  const go = d => { dailyDate = d > todayStr() ? todayStr() : d; render(); };
  $('#dPrev').onclick = () => go(dateAdd(dailyDate, -1)); $('#dNext').onclick = () => go(dateAdd(dailyDate, 1));
  $('#dDate').onchange = ev => ev.target.value && go(ev.target.value);
  el.querySelectorAll('[data-hk]').forEach(b => b.onclick = () => { toggleHabit(dailyDate, b.dataset.hk); render(); });
  const KEY = {steps: 'steps', water: 'water', sleep: 'sleep'}, MAX = {steps: 100000, water: 400, sleep: 24};
  el.querySelectorAll('[data-hv]').forEach(inp => inp.onchange = () => { const k = inp.dataset.hv, v = numIn(inp.value, 0, MAX[k]); setHabit(dailyDate, h => { h[KEY[k]] = v == null ? null : (k === 'steps' ? Math.round(v) : r1(v)); }); render(); });
  el.querySelectorAll('[data-hq]').forEach(b => b.onclick = () => { const k = b.dataset.hq; setHabit(dailyDate, h => { h[KEY[k]] = Math.min(MAX[k], r1((h[KEY[k]] || 0) + +b.dataset.q)); }); render(); });
  $('#dPhotos').onclick = () => push({v: 'photos'});
}

/* ----- progress photos: private repo photos/YYYY-MM-DD-pose.jpg, index in db.photos, small thumbs in localStorage ----- */
const THUMB_KEY = 'liftlog.thumbs', THUMB_MAX = 45;
const Thumbs = {
  all(){ try { return JSON.parse(localStorage.getItem(THUMB_KEY)) || {}; } catch (e) { return {}; } },
  get(path){ return this.all()[path] || null; },
  put(path, url){
    const m = this.all(); m[path] = url;
    const keys = Object.keys(m).sort().reverse(); for (const k of keys.slice(THUMB_MAX)) delete m[k]; // newest dates win
    try { localStorage.setItem(THUMB_KEY, JSON.stringify(m)); } catch (e) { /* quota: skip cache */ }
  }
};
const photoFullCache = new Map(); // path -> object URL (memory only)
const photoDates = () => [...new Set((db.photos || []).map(p => p.date))].sort();
const lastPhotoDate = () => photoDates().pop() || null;
const dayDiff = (a, b) => Math.round((parseDate(a) - parseDate(b)) / 864e5);
function photoDue(today = todayStr()){
  const pd = dailyPlan().photoDay, last = lastPhotoDate();
  let due = today;
  if (pd != null) { const back = (parseDate(today).getDay() - pd + 7) % 7; due = dateAdd(today, -back); }
  if (!last) return {due: true, never: true, dueDate: due};
  return {due: dayDiff(due, last) >= 7, never: false, dueDate: due, since: dayDiff(today, last)};
}
function photoStatusText(){
  const last = lastPhotoDate(), pd = dailyPlan().photoDay;
  return (last ? `Last: ${fmtDay(last, true)} (${daysAgo(last)})` : 'No photos yet') + (pd != null ? ` · Check-in day: ${WEEKDAYS[pd]}` : ' · weekly');
}
function photoBannerHtml(){
  const st = photoDue();
  if (!st.due || localStorage.getItem('liftlog.photoSnooze') === todayStr()) return '';
  return `<div class="photo-banner" id="photoBanner"><span class="pb-ico">📸</span><div class="grow"><b>Progress photo check-in</b><div class="sub">${st.never ? 'Take your first front / side / back photos.' : `It's been ${st.since} days. Same spot, same light.`}</div></div>
    <button class="mini-btn accent" id="pbGo">Take</button><button class="cb-x" id="pbX" aria-label="Later">✕</button></div>`;
}
function bindPhotoBanner(){
  if ($('#pbGo')) $('#pbGo').onclick = () => { openTrack('daily'); push({v: 'photos'}); };
  if ($('#pbX')) $('#pbX').onclick = () => { localStorage.setItem('liftlog.photoSnooze', todayStr()); render(); };
}
function loadImage(src){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image')); i.src = src; }); }
function drawScaled(img, max, q){
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h);
  return {cv, w, h};
}
/** phone-side compression: longest side 1080 px JPEG (~150-300 KB) + ~200 px thumbnail */
async function compressPhoto(file){
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url); // Safari applies EXIF orientation when drawing
    const big = drawScaled(img, 1080, 0.82);
    const blob = await new Promise(r => big.cv.toBlob(r, 'image/jpeg', 0.82));
    const thumb = drawScaled(img, 200, 0.6).cv.toDataURL('image/jpeg', 0.6);
    return {blob, w: big.w, h: big.h, thumb};
  } finally { URL.revokeObjectURL(url); }
}
const blobB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
const Photos = {
  busy: {},
  url: path => `https://api.github.com/repos/${Sync.owner}/${Sync.repo}/contents/${path}`,
  async remoteSha(path){
    const res = await fetch(this.url(path) + '?t=' + Date.now(), {headers: Sync.headers(), cache: 'no-store'});
    if (res.status === 404) return null;
    if (!res.ok) throw {status: res.status, body: await res.json().catch(() => ({}))};
    return (await res.json()).sha;
  },
  async upload(date, pose, file){
    if (!Sync.enabled) throw {status: 0, body: {message: 'Coach Sync is off'}};
    const path = `photos/${date}-${pose}.jpg`;
    const c = await compressPhoto(file);
    const content = await blobB64(c.blob);
    const old = (db.photos || []).find(p => p.path === path);
    let sha = old ? old.sha : undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const body = {message: `Progress photo ${date} ${pose}`, content}; if (sha) body.sha = sha;
      const res = await fetch(this.url(path), {method: 'PUT', headers: {...Sync.headers(), 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      if (res.ok) {
        const j = await res.json();
        const rec = {date, pose, path, sha: j.content && j.content.sha, w: c.w, h: c.h, bytes: c.blob.size, at: new Date().toISOString()};
        db.photos = (db.photos || []).filter(p => p.path !== path).concat(rec).sort((a, b) => a.date.localeCompare(b.date) || POSES.findIndex(x => x[0] === a.pose) - POSES.findIndex(x => x[0] === b.pose));
        Thumbs.put(path, c.thumb);
        const prevUrl = photoFullCache.get(path); if (prevUrl) URL.revokeObjectURL(prevUrl);
        photoFullCache.set(path, URL.createObjectURL(c.blob));
        save();
        return rec;
      }
      if ((res.status === 409 || res.status === 422) && attempt === 0) { sha = await this.remoteSha(path) || undefined; continue; } // file exists / sha moved
      throw {status: res.status, body: await res.json().catch(() => ({}))};
    }
  },
  /** full image via the contents API (raw), memory-cached object URL */
  async full(p){
    if (photoFullCache.has(p.path)) return photoFullCache.get(p.path);
    const res = await fetch(this.url(p.path), {headers: {...Sync.headers(), 'Accept': 'application/vnd.github.raw'}, cache: 'no-store'});
    if (!res.ok) throw {status: res.status};
    const u = URL.createObjectURL(await res.blob());
    photoFullCache.set(p.path, u);
    if (!Thumbs.get(p.path)) { try { Thumbs.put(p.path, drawScaled(await loadImage(u), 200, 0.6).cv.toDataURL('image/jpeg', 0.6)); } catch (e) {} }
    return u;
  }
};
let photoView = {date: null, a: null, b: null, pose: 'front'};
function renderPhotos(el){
  setHeader('Progress photos', photoStatusText());
  const dates = photoDates(), on = Sync.enabled;
  if (!photoView.date) photoView.date = todayStr();
  if (!photoView.b || !dates.includes(photoView.b)) photoView.b = dates[dates.length - 1] || null;
  if (!photoView.a || !dates.includes(photoView.a)) photoView.a = dates[0] || null;
  const at = (d, pose) => (db.photos || []).find(p => p.date === d && p.pose === pose);
  const thumbHtml = p => { const t = p && Thumbs.get(p.path); return t ? `<img src="${t}" alt="">` : p ? '<span class="ph-cloud">☁︎</span>' : ''; };
  const wAt = d => { const e = db.body.filter(x => Math.abs(dayDiff(x.date, d)) <= 3).sort((a, b) => Math.abs(dayDiff(a.date, d)) - Math.abs(dayDiff(b.date, d)))[0]; return e ? `${fmtNum(e.weight)} lb` : ''; };
  el.innerHTML = `
    ${on ? '' : `<div class="card muted-card">Turn on Coach Sync (Settings) to take progress photos. They're stored only in your private <b>lift-log-data</b> repo, never on the public site.</div>`}
    <div class="section-title">Check-in</div>
    <div class="date-chip"><span>Photo date</span><input type="date" id="phDate" value="${photoView.date}" max="${todayStr()}"></div>
    <div class="pose-grid">${POSES.map(([k, l]) => { const p = at(photoView.date, k), busy = Photos.busy[photoView.date + k]; return `<label class="pose-tile ${p ? 'has' : ''} ${on ? '' : 'off'}">
      ${thumbHtml(p)}<span class="pt-l">${busy ? 'Uploading…' : (p ? '✓ ' : '＋ ') + l}</span>
      <input type="file" accept="image/*" data-pose="${k}" ${on && !busy ? '' : 'disabled'} hidden></label>`; }).join('')}</div>
    <p class="note">Same spot, same light, relaxed and flexed as you like. Photos are shrunk to 1080 px on the phone and uploaded to your private repo with your sync token.</p>
    ${dates.length ? `<div class="section-title">Compare</div>
      <div class="seg" id="poseSeg">${POSES.map(([k, l]) => `<button data-p="${k}" class="${photoView.pose === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="cmp-pick"><select class="select" id="cmpA">${dates.map(d => `<option ${d === photoView.a ? 'selected' : ''}>${d}</option>`).join('')}</select><span>vs</span><select class="select" id="cmpB">${dates.map(d => `<option ${d === photoView.b ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div class="cmp">${[photoView.a, photoView.b].map((d, i) => { const p = at(d, photoView.pose); return `<div class="cmp-side"><div class="cmp-img" id="cmp${i}">${p ? (Thumbs.get(p.path) ? `<img src="${Thumbs.get(p.path)}" class="blur" alt="">` : '') + '<span class="cmp-load">Loading…</span>' : '<span class="cmp-none">No ' + photoView.pose + ' photo</span>'}</div>
        <div class="cmp-cap"><b>${fmtDay(d, true)}</b>${wAt(d) ? ' · ' + wAt(d) : ''}</div></div>`; }).join('')}</div>
      ${photoView.a && photoView.b && photoView.a !== photoView.b ? `<p class="note" style="text-align:center">${Math.abs(dayDiff(photoView.b, photoView.a))} days apart</p>` : ''}
      <div class="section-title">History</div>
      <div class="list">${[...dates].reverse().map(d => `<div class="row ph-row"><div class="main"><div class="name">${fmtDay(d, true)}</div><div class="meta">${POSES.filter(([k]) => at(d, k)).map(x => x[1]).join(' · ')}</div></div>
        <div class="ph-thumbs">${POSES.map(([k]) => `<span class="ph-t">${thumbHtml(at(d, k))}</span>`).join('')}</div></div>`).join('')}</div>` : ''}`;
  $('#phDate').onchange = ev => { if (ev.target.value) { photoView.date = ev.target.value; render(); } };
  el.querySelectorAll('input[data-pose]').forEach(inp => inp.onchange = async () => {
    const file = inp.files && inp.files[0]; if (!file) return;
    const d = photoView.date, pose = inp.dataset.pose;
    Photos.busy[d + pose] = true; render();
    try { await Photos.upload(d, pose, file); toast(`✓ ${pose} photo saved privately`); photoView.b = d; }
    catch (e) { toast(e && e.status ? Sync.explain(e.status, e.body) : 'Upload failed. Check your connection and try again.'); }
    finally { delete Photos.busy[d + pose]; if (cur().v === 'photos') render(); }
  });
  if ($('#poseSeg')) el.querySelectorAll('#poseSeg button').forEach(b => b.onclick = () => { photoView.pose = b.dataset.p; render(); });
  if ($('#cmpA')) { $('#cmpA').onchange = ev => { photoView.a = ev.target.value; render(); }; $('#cmpB').onchange = ev => { photoView.b = ev.target.value; render(); }; }
  [photoView.a, photoView.b].forEach(async (d, i) => {
    const p = at(d, photoView.pose), box = $('#cmp' + i); if (!p || !box) return;
    if (!on) { box.querySelector('.cmp-load').textContent = 'Sync off'; return; }
    try { const u = await Photos.full(p); if (cur().v === 'photos' && $('#cmp' + i)) $('#cmp' + i).innerHTML = `<img src="${u}" alt="${esc(p.pose)} ${esc(p.date)}">`; }
    catch (e) { const l = box.querySelector('.cmp-load'); if (l) l.textContent = 'Could not load'; }
  });
}

function checkPhase(){
  if (needsPhase() && stacks.workout[0].v !== 'phase') {
    stacks.workout = [{v:'phase'}];
    if (tab !== 'workout') switchTab('workout'); else render();
    return true;
  }
  return false;
}
/** open today's scheduled workout once, with Workout home underneath so Back returns there */
function maybeAutoOpenWorkout(){
  if (launchGate.consumed || launchGate.touched) return false;
  if (needsPhase() || !db.phase || !PHASES[db.phase.id]) return false;
  if (tab !== 'workout') return false;
  if (!db.settings || db.settings.autoOpenWorkout === false) return false;
  const stack = stacks.workout;
  if (stack.length !== 1 || stack[0].v !== 'home') return false;
  const entry = todaySchedule();
  if (!entry || entry.rest || scheduleLogged(entry)) return false;
  launchGate.consumed = true;
  stack.push({v:'group', g: entry.group, focus: entry.focus, date: todayStr(), phase: db.phase.id, fromCoach: true});
  return true;
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
maybeAutoOpenWorkout();
render();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkPhase(); Sync.retryPending(); Coach.check(); maybeAutoSyncLabs(); checkPortalLabs(false); } });
window.addEventListener('online', () => { Sync.retryPending(); Coach.check(); checkPortalLabs(false); });
Sync.retryPending();
Coach.check();
if (!mcParam) maybeAutoSyncLabs();
checkPortalLabs(false);
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
