'use strict';
/* ---------- Data ---------- */
const STORE_KEY = 'liftlog.v1';
const GROUPS = [
  {id:'back', name:'Back', color:'#4f8cff', icon:'<path d="M12 3v18M7 6c-2 3-3 7-2 12M17 6c2 3 3 7 2 12M8 10h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'},
  {id:'chest', name:'Chest', color:'#ff6b35', icon:'<path d="M4 8c2-2 6-2 8 0 2-2 6-2 8 0v5c0 3-3 5-8 5s-8-2-8-5V8zM12 8v10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'},
  {id:'legs', name:'Legs', color:'#3ddc97', icon:'<path d="M9 3l-1 8 2 10M15 3l1 8-2 10M8 11h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'},
  {id:'shoulders', name:'Shoulders', color:'#b77dff', icon:'<circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 19c0-4 2-7 4-8h8c2 1 4 4 4 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}
];
const APP_VERSION = '4.0';
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
  shoulders: [{id:'front', name:'Front', desc:'Front delts · pressing'}, {id:'side', name:'Side', desc:'Side delts · width'}, {id:'rear', name:'Rear', desc:'Rear delts & upper back'}]
};
/* Default plans: 'Name|sets|minReps|maxReps|restSeconds' per phase -> group -> focus */
const PLAN_DEFS = {
  bulk: {
    back: {upper:['Pull-Up|4|5|8|180','Lat Pulldown|4|6|8|150','Wide-Grip Seated Row|4|6|8|150','Barbell Shrug|4|6|8|120','Rear Delt Fly|3|10|12|90'],
      mid:['Barbell Row|5|5|8|180','Chest-Supported T-Bar Row|4|6|8|150','Seated Cable Row|4|6|8|120','Single-Arm DB Row|4|6|8|120'],
      lower:['Deadlift|5|3|5|240','Rack Pull|4|4|6|180','Good Morning|4|6|8|150','Back Extension|3|8|10|90']},
    chest: {upper:['Incline Bench Press|5|4|6|180','Incline DB Press|4|6|8|150','Landmine Press|3|6|8|120','Incline Machine Press|3|6|8|120'],
      mid:['Bench Press|5|4|6|180','DB Bench Press|4|6|8|150','Machine Chest Press|3|6|8|120','Cable Fly|3|8|10|90'],
      lower:['Decline Bench Press|5|4|6|180','Dips|4|6|8|150','Decline DB Press|4|6|8|120','Bench Press|3|5|6|180']},
    legs: {quads:['Back Squat|5|4|6|240','Hack Squat|4|6|8|180','Leg Press|4|6|8|150','Bulgarian Split Squat|3|6|8|120'],
      hamstrings:['Romanian Deadlift|4|5|8|180','Good Morning|4|6|8|150','Leg Curl|4|6|8|90','Nordic Curl|3|4|6|120'],
      glutes:['Hip Thrust|5|5|8|150','Bulgarian Split Squat|4|6|8|120','Romanian Deadlift|4|6|8|150','Walking Lunge|3|8|10|90'],
      calves:['Calf Raise|5|6|10|90','Seated Calf Raise|4|8|10|90','Leg Press Calf Raise|4|8|12|90']},
    shoulders: {front:['Overhead Press|5|4|6|180','Seated DB Press|4|6|8|150','Arnold Press|3|6|8|120','Front Raise|3|8|10|90'],
      side:['Seated DB Press|4|6|8|150','Upright Row|4|6|8|120','Lateral Raise|4|8|12|90','Cable Lateral Raise|3|8|12|90'],
      rear:['Rear Delt Fly|4|8|12|90','Face Pull|4|8|12|90','Reverse Pec Deck|3|8|12|90','DB Shrug|4|6|8|120']}
  },
  cut: {
    back: {upper:['Lat Pulldown|4|10|12|75','Wide-Grip Seated Row|3|12|15|60','Straight-Arm Pulldown|3|12|15|45','Rear Delt Fly|3|15|20|45','Face Pull|3|15|20|45'],
      mid:['Seated Cable Row|4|10|12|75','Single-Arm DB Row|3|10|12|60','Chest-Supported T-Bar Row|3|10|12|75','Machine Row|3|12|15|60','Straight-Arm Pulldown|3|12|15|45'],
      lower:['Back Extension|4|12|15|60','Good Morning|3|10|12|75','Rack Pull|3|8|10|90','Reverse Hyper|3|12|15|60','Seated Cable Row|3|12|15|60']},
    chest: {upper:['Incline DB Press|4|10|12|75','Incline Machine Press|3|12|15|60','Low-to-High Cable Fly|3|15|20|45','Landmine Press|3|12|15|60'],
      mid:['Machine Chest Press|4|10|12|75','DB Bench Press|3|10|12|75','Pec Deck|3|15|20|45','Cable Fly|3|15|20|45','Push-Up|3|15|20|45'],
      lower:['Dips|4|10|15|60','Decline DB Press|3|10|12|75','High-to-Low Cable Fly|3|15|20|45','Machine Chest Press|3|12|15|60']},
    legs: {quads:['Leg Press|4|12|15|75','Hack Squat|3|10|12|90','Leg Extension|4|15|20|45','Walking Lunge|3|12|15|60','Goblet Squat|3|12|15|60'],
      hamstrings:['Leg Curl|4|12|15|45','Seated Leg Curl|3|12|15|45','Romanian Deadlift|3|10|12|75','Nordic Curl|3|6|10|60'],
      glutes:['Hip Thrust|4|10|15|60','Cable Kickback|3|15|20|45','Hip Abduction|3|15|20|45','Walking Lunge|3|12|15|60','Bulgarian Split Squat|3|10|12|60'],
      calves:['Calf Raise|4|15|20|45','Seated Calf Raise|4|15|20|45','Single-Leg Calf Raise|3|12|15|30','Leg Press Calf Raise|3|15|20|45']},
    shoulders: {front:['Seated DB Press|4|10|12|75','Arnold Press|3|10|12|60','Machine Shoulder Press|3|12|15|60','Front Raise|3|12|15|45'],
      side:['Lateral Raise|4|15|20|45','Cable Lateral Raise|3|12|15|45','Machine Lateral Raise|3|15|20|45','Upright Row|3|12|15|60'],
      rear:['Reverse Pec Deck|4|15|20|45','Face Pull|3|15|20|45','Rear Delt Cable Fly|3|15|20|45','Rear Delt Fly|3|15|20|45','DB Shrug|3|12|15|45']}
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
/** fallback targets for an exercise with no plan entry in a phase (custom ones keep their own sets/reps) */
function fallbackItem(phase, ex){
  const [sets, min, max, rest] = PHASES[phase].fallback;
  return ex && ex.sets ? {exId: ex.id, sets: ex.sets, min: ex.min, max: ex.max, rest: ex.rest || rest} : {exId: ex.id, sets, min, max, rest};
}
/** Build {focusId: [items], all: [items]} for one phase+group, reusing pool exercises by name. */
function buildPlan(phase, gid, pool, skipNames){
  const plan = {};
  const getEx = name => {
    let e = pool.find(x => lc(x.name) === lc(name));
    if (!e) {
      if (skipNames && skipNames.has(lc(name))) return null;
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
/** make sure every pool exercise appears in each phase's 'All' list */
function syncAll(d){
  for (const ph of Object.keys(PHASES)) for (const g of GROUPS) {
    const plan = d.plans[ph][g.id], ids = new Set(d.exercises[g.id].map(x => x.id));
    for (const k of Object.keys(plan)) plan[k] = plan[k].filter(i => ids.has(i.exId));
    for (const e of d.exercises[g.id]) if (!plan.all.some(i => i.exId === e.id)) plan.all.push(fallbackItem(ph, e));
    for (const f of FOCUS_META[g.id]) if (!Array.isArray(plan[f.id])) plan[f.id] = [];
  }
}
function freshDb(){
  const d = {version: 4, exercises: {}, plans: {}, phase: null, coach: {planVersion: SEED_PLAN_VERSION, banner: null}, sessions: []};
  for (const g of GROUPS) d.exercises[g.id] = [];
  for (const ph of Object.keys(PHASES)) { d.plans[ph] = {}; for (const g of GROUPS) d.plans[ph][g.id] = buildPlan(ph, g.id, d.exercises[g.id]); }
  return d;
}
/** Upgrade older data in place. Never drops sessions or exercises. */
function migrate(d){
  d.exercises = d.exercises || {};
  for (const g of GROUPS) if (!Array.isArray(d.exercises[g.id])) d.exercises[g.id] = [];
  if (!d.version || d.version < 3 || !d.plans) {
    // v1 defaults the user removed shouldn't come back
    const removed = {};
    for (const g of GROUPS) removed[g.id] = new Set(V1_NAMES[g.id].map(lc).filter(n => !d.exercises[g.id].some(x => lc(x.name) === n)));
    d.plans = {};
    for (const ph of Object.keys(PHASES)) { d.plans[ph] = {}; for (const g of GROUPS) d.plans[ph][g.id] = buildPlan(ph, g.id, d.exercises[g.id], removed[g.id]); }
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
  for (const ph of Object.keys(PHASES)) { d.plans[ph] = d.plans[ph] || {}; for (const g of GROUPS) if (!d.plans[ph][g.id]) d.plans[ph][g.id] = buildPlan(ph, g.id, d.exercises[g.id]); }
  syncAll(d);
  return d;
}
function load(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.exercises && Array.isArray(d.sessions)) {
        if (!d.version || d.version < 4) localStorage.setItem(STORE_KEY + '.backup-v' + (d.version || 1), raw); // safety copy
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
  const pool = db.exercises[gid];
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
const stacks = {workout: [{v:'home'}], journal: [{v:'journal'}], progress: [{v:'progress'}], settings: [{v:'settings'}]};
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
    progress: renderProgress, settings: renderSettings})[v.v](el, v);
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
            <div class="meta">${e.item.notes ? '🧠 ' : ''}${e.sets} × ${repsLabel(e)} · rest ${restLabel(e.rest)}${last && !done ? ` · last ${fmtNum(Math.max(...last.sets.map(s => s.w)))} lb` : ''}</div></div>
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
  if (!v.draft) {
    if (existing) v.draft = existing.sets.map(s => ({w: s.w || '', r: s.r || '', pre: false}));
    else {
      const n = Math.max(1, e.sets);
      v.draft = Array.from({length: n}, (_, i) => {
        const ls = last && (last.sets[i] || null);
        return ls ? {w: ls.w, r: ls.r, pre: true} : {w: '', r: '', pre: false};
      });
    }
  }
  const fname = focusName(v.g, v.focus);
  setHeader(e.name, `${phase ? PHASES[phase].short + ' · ' : ''}${g.name}${fname && fname !== 'All' ? ' · ' + fname : ''} · ${fmtDay(v.date)}`);
  const hintFor = i => last && last.sets[i] ? `last ${fmtNum(last.sets[i].w)}×${last.sets[i].r}` : '';
  const anyPre = v.draft.some(d => d.pre);
  const lastFocus = lastSession ? [lastSession.phase && PHASES[lastSession.phase] ? PHASES[lastSession.phase].short : '', focusName(lastSession.group, lastSession.focus, lastSession.focusName)].filter(Boolean).join(' · ') : '';
  el.innerHTML = `
    ${last ? `
    <div class="last-card" style="--c:${g.color}">
      <div class="lc-head"><span class="lc-title">Last time</span><span class="lc-date">${fmtDay(last.date, true)}${/^(Today|Yesterday)$/.test(fmtDay(last.date)) ? '' : ' · ' + daysAgo(last.date)}</span></div>
      <div class="lc-sets">${last.sets.map((s, i) => `
        <div class="lc-set"><div class="k">Set ${i + 1}</div><div class="w">${fmtNum(s.w)}<small> lb</small></div><div class="r">× ${s.r} reps</div></div>`).join('')}
      </div>
      <div class="lc-foot">Top ${fmtNum(Math.max(...last.sets.map(s => s.w)))} lb · e1RM ${fmtNum(Math.round(Math.max(...last.sets.map(s => e1rm(s.w, s.r)))))} · ${fmtNum(last.sets.reduce((a, s) => a + s.w * s.r, 0))} lb vol${lastFocus ? ' · ' + esc(lastFocus) : ''}</div>
    </div>` : `
    <div class="last-card first" style="--c:${g.color}"><div class="lc-head"><span class="lc-title">First time</span></div>
      <div class="lc-first">No history for this exercise yet. Today sets your baseline 💪</div></div>`}
    <div class="target-row" style="--c:${PHASES[tphase].color}"><div><span class="tr-lbl">Target · ${PHASES[tphase].short}</span><b>${e.sets} sets × ${repsLabel(e)} reps</b></div><div class="rest"><span class="tr-lbl">Rest</span><b>⏱ ${restLabel(e.rest)}</b></div></div>
    ${e.item && e.item.notes ? `<div class="coach-note"><span class="cn-lbl">🧠 Coach note</span>${esc(e.item.notes)}</div>` : ''}
    <div class="sets-head"><div>Set</div><div style="text-align:center">Weight</div><div style="text-align:center">Reps</div><div></div></div>
    <div id="sets">
      ${v.draft.map((s, i) => `
      <div class="set-row ${s.w !== '' ? 'filled' : ''} ${hintFor(i) ? 'has-hint' : ''}" style="--c:${g.color}">
        <div class="sn">${i + 1}</div>
        <div class="field"><input type="number" inputmode="decimal" step="any" min="0" data-i="${i}" data-k="w" value="${s.w}" class="${s.pre ? 'prefilled' : ''}" placeholder="0"><span class="unit">lb</span>${hintFor(i) ? `<span class="hint">${hintFor(i)}</span>` : ''}</div>
        <div class="field"><input type="number" inputmode="numeric" min="0" step="1" data-i="${i}" data-k="r" value="${s.r}" class="${s.pre ? 'prefilled' : ''}" placeholder="${e.max}"><span class="unit">reps</span></div>
        <button class="del-set" data-del="${i}" aria-label="Remove set"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      </div>`).join('')}
    </div>
    ${anyPre ? `<p class="note pre-note"><span class="pre-dot"></span>Dimmed values are prefilled from last time. Tap to change, or save as-is.</p>` : ''}
    <div class="btn-row"><button class="btn small" id="addSet">＋ Add set</button>${anyPre ? `<button class="btn small" id="clearPre">Clear prefill</button>` : last ? `<button class="btn small" id="copyLast">Copy last</button>` : ''}</div>
    <div class="date-chip"><span>Workout date</span><input type="date" id="dateIn" value="${v.date}" max="${todayStr()}"></div>
    <div class="btn-row" style="margin-top:18px"><button class="btn primary" id="saveBtn">${existing ? 'Update' : 'Save'} ${esc(e.name)}</button></div>
    ${existing ? `<div class="btn-row"><button class="btn small danger" id="delEntry">Delete this entry</button></div>` : ''}
    <p class="note">Blank reps count as the target (${e.max}). Sets with no weight or reps are skipped.</p>`;
  el.querySelectorAll('input[data-i]').forEach(inp => {
    inp.addEventListener('input', () => {
      const d = v.draft[+inp.dataset.i]; d[inp.dataset.k] = inp.value; d.pre = false;
      inp.closest('.set-row').querySelectorAll('input').forEach(x => x.classList.remove('prefilled'));
      inp.closest('.set-row').classList.toggle('filled', d.w !== '');
    });
    inp.addEventListener('focus', () => { if (inp.classList.contains('prefilled')) inp.select(); });
  });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { v.draft.splice(+b.dataset.del, 1); render(); });
  $('#addSet').onclick = () => { const p = v.draft[v.draft.length - 1]; v.draft.push({w: p ? p.w : '', r: p ? p.r : '', pre: false}); render(); };
  if ($('#copyLast')) $('#copyLast').onclick = () => { v.draft = last.sets.map(s => ({w: s.w, r: s.r, pre: true})); render(); };
  if ($('#clearPre')) $('#clearPre').onclick = () => { v.draft = v.draft.map(d => d.pre ? {w: '', r: '', pre: false} : d); render(); };
  $('#dateIn').onchange = ev => { if (ev.target.value) { v.date = ev.target.value; v.draft = null; render(); } };
  $('#saveBtn').onclick = () => {
    const sets = v.draft.map(s => ({w: parseFloat(s.w) || 0, r: s.r === '' ? (s.w !== '' ? e.max : 0) : (parseInt(s.r) || 0)}))
      .filter(s => s.w > 0 || s.r > 0);
    if (!sets.length) { toast('Enter a weight for at least one set'); return; }
    let s = getSession(v.date, v.g, v.focus, phase);
    if (!s) { s = {id: uid(), date: v.date, group: v.g, focus: v.focus || null, focusName: focusName(v.g, v.focus), phase: phase || null, entries: []}; db.sessions.push(s); }
    const idx = s.entries.findIndex(x => x.exId === v.exId);
    const entry = {exId: v.exId, name: e.name, sets};
    if (idx >= 0) s.entries[idx] = entry; else s.entries.push(entry);
    s.updated = Date.now();
    save();
    const best = Math.max(...sets.map(x => e1rm(x.w, x.r)));
    const prev = exerciseHistory(v.exId).filter(h => h.date !== v.date).flatMap(h => h.sets.map(x => e1rm(x.w, x.r)));
    toast(prev.length && best > Math.max(...prev) ? '🏆 New PR! Saved' : '✓ Saved');
    v.draft = null; pop();
  };
  if ($('#delEntry')) $('#delEntry').onclick = () => {
    if (!confirm(`Delete ${e.name} from this session?`)) return;
    removeEntry(session, v.exId); v.draft = null; toast('Entry deleted'); pop();
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
  const others = !e ? db.exercises[groupId].filter(x => !plan[fid].some(i => i.exId === x.id)) : [];
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
    ${e ? `<div class="btn-row"><button class="btn small danger" id="exDel">Delete exercise from ${esc(g.name)}</button></div>` : ''}
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
    if (!confirm(`Delete ${e.name} from ${g.name} (both phases, all focuses)? Past entries stay in your Journal.`)) return;
    db.exercises[groupId] = db.exercises[groupId].filter(x => x.id !== e.id);
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
      <table class="set-table">${validSets(en.sets).map((x, i) => `<tr><td>Set ${i + 1}</td><td><b>${fmtNum(x.w)} lb</b> × ${x.r}</td><td>e1RM ${fmtNum(Math.round(e1rm(x.w, x.r)))}</td></tr>`).join('')}</table>
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
let prog = {exId: null, metric: 'top', range: 'all'};
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
function renderProgress(el){
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
  $('#importBtn').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = importData;
  $('#resetEx').onclick = () => {
    let added = 0;
    for (const ph of Object.keys(PHASES)) for (const g of GROUPS) {
      const before = db.exercises[g.id].length;
      const fresh = buildPlan(ph, g.id, db.exercises[g.id]);
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
    db = freshDb(); save(); stacks.workout = [{v:'phase'}]; switchTab('workout'); toast('All data erased');
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
      db = migrate({version: d.version || 1, exercises: d.exercises, plans: d.plans, phase: d.phase === undefined ? db.phase : d.phase, coach: d.coach || db.coach, sessions: d.sessions});
      save(); render(); toast('Backup restored');
    } catch (e) { toast('That file is not a Lift Log backup'); }
    ev.target.value = '';
  };
  r.readAsText(f);
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
        const pool = db.exercises[gid];
        for (const fid of Object.keys(plan.phases[ph][gid] || {})) {
          if (!FOCUS_IDS(gid).includes(fid)) continue;
          const list = plan.phases[ph][gid][fid];
          if (!Array.isArray(list)) continue;
          const items = [];
          for (const p of list) {
            if (!p || typeof p !== 'object') continue;
            let ex = p.id ? pool.find(x => x.id === p.id) : null;
            if (!ex && p.name) ex = pool.find(x => lc(x.name) === lc(p.name));
            if (!ex && p.name) { ex = {id: uid(), name: String(p.name).trim().slice(0, 60)}; pool.push(ex); created++; }
            if (!ex || items.some(i => i.exId === ex.id)) continue;
            const num = (v, lo, hi, dflt) => Number.isFinite(+v) && +v >= lo && +v <= hi ? Math.round(+v) : dflt;
            const fb = PHASES[ph].fallback;
            const sets = num(p.sets, 1, 20, fb[0]);
            let min = num(p.reps && p.reps[0] !== undefined ? p.reps[0] : p.min, 1, 100, fb[1]);
            let max = num(p.reps && p.reps[1] !== undefined ? p.reps[1] : p.max, 1, 100, Math.max(min, fb[2]));
            if (max < min) [min, max] = [max, min];
            const it = {exId: ex.id, sets, min, max, rest: num(p.rest, 0, 900, fb[3])};
            if (p.notes) it.notes = String(p.notes).slice(0, 400);
            items.push(it);
          }
          const old = db.plans[ph][gid][fid] || [];
          const nameOf = id => (pool.find(x => x.id === id) || {}).name || '?';
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
    syncAll(db); // new exercises show up under All; history untouched
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
render();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { checkPhase(); Sync.retryPending(); Coach.check(); } });
window.addEventListener('online', () => { Sync.retryPending(); Coach.check(); });
Sync.retryPending();
Coach.check();
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
