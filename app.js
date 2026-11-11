'use strict';
/* ---------- Data ---------- */
const STORE_KEY = 'liftlog.v1';
const GROUPS = [
  {id:'back', name:'Back', color:'#4f8cff', icon:'<path d="M12 3v18M7 6c-2 3-3 7-2 12M17 6c2 3 3 7 2 12M8 10h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'},
  {id:'chest', name:'Chest', color:'#ff6b35', icon:'<path d="M4 8c2-2 6-2 8 0 2-2 6-2 8 0v5c0 3-3 5-8 5s-8-2-8-5V8zM12 8v10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'},
  {id:'legs', name:'Legs', color:'#3ddc97', icon:'<path d="M9 3l-1 8 2 10M15 3l1 8-2 10M8 11h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'},
  {id:'shoulders', name:'Shoulders', color:'#b77dff', icon:'<circle cx="12" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 19c0-4 2-7 4-8h8c2 1 4 4 4 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'}
];
const ex = (name, sets, min, max) => ({name, sets, min, max});
const DEFAULTS = {
  back: [ex('Lat Pulldown',3,8,12), ex('Barbell Row',4,6,8), ex('Seated Cable Row',3,8,12), ex('Pull-Up',3,6,10), ex('Single-Arm DB Row',3,8,12), ex('Rear Delt Fly',3,12,15), ex('Straight-Arm Pulldown',3,12,15)],
  chest: [ex('Bench Press',4,6,8), ex('Incline DB Press',3,8,12), ex('Machine Chest Press',3,8,12), ex('Cable Fly',3,12,15), ex('Dips',3,8,12), ex('Pec Deck',3,12,15)],
  legs: [ex('Back Squat',4,6,8), ex('Romanian Deadlift',3,8,10), ex('Leg Press',3,10,12), ex('Leg Curl',3,10,15), ex('Leg Extension',3,12,15), ex('Walking Lunge',3,10,12), ex('Calf Raise',4,12,15)],
  shoulders: [ex('Overhead Press',4,6,8), ex('Seated DB Press',3,8,12), ex('Lateral Raise',4,12,15), ex('Face Pull',3,12,15), ex('Reverse Pec Deck',3,12,15), ex('Front Raise',3,10,12), ex('DB Shrug',3,10,12)]
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function defaultExercises(){
  const out = {};
  for (const g of GROUPS) out[g.id] = DEFAULTS[g.id].map(e => ({id: uid(), ...e}));
  return out;
}
function load(){
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d && d.exercises && Array.isArray(d.sessions)) {
      for (const g of GROUPS) if (!Array.isArray(d.exercises[g.id])) d.exercises[g.id] = [];
      return d;
    }
  } catch (e) {}
  return {version:1, exercises: defaultExercises(), sessions: []};
}
let db = load();
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
save();
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
function getSession(date, group){ return db.sessions.find(s => s.date === date && s.group === group); }
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
function lastEntry(exId, beforeDate){
  const h = exerciseHistory(exId).filter(h => h.date < beforeDate);
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
  ({home: renderHome, group: renderGroup, log: renderLog, journal: renderJournal, session: renderSession,
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
  el.innerHTML = `
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
          <div class="gmeta">${last ? 'Last: ' + daysAgo(last.date) : db.exercises[g.id].length + ' exercises'}</div>
        </button>`;}).join('')}
    </div>`;
  el.querySelectorAll('.group-card').forEach(b => b.addEventListener('click', () => push({v:'group', g: b.dataset.g, date: todayStr()})));
}

/* ---------- Workout: Group (exercise list) ---------- */
function renderGroup(el, v){
  const g = groupOf(v.g), list = db.exercises[g.id];
  const session = getSession(v.date, g.id);
  const doneIds = new Set(session ? session.entries.filter(e => validSets(e.sets).length).map(e => e.exId) : []);
  setHeader(g.name, v.date === todayStr() ? `Today · ${doneIds.size}/${list.length} done` : fmtDay(v.date),
    `<button class="text-btn" id="editBtn">${v.editing ? 'Done' : 'Edit'}</button>`);
  el.innerHTML = `
    <div class="list">
      ${list.map((e, i) => {
        const last = lastEntry(e.id, v.date + '~');
        const done = doneIds.has(e.id);
        return `<div class="row" role="button" data-id="${e.id}" style="--c:${g.color}">
          <div class="badge-num">${i + 1}</div>
          <div class="main"><div class="name">${esc(e.name)}</div>
            <div class="meta">${e.sets} sets × ${repsLabel(e)} reps${last && !done ? ` · last ${fmtNum(Math.max(...last.sets.map(s => s.w)))} lb` : ''}</div></div>
          ${v.editing
            ? `<button class="mini-btn" data-act="up" data-id="${e.id}" aria-label="Move up">↑</button><button class="mini-btn" data-act="edit" data-id="${e.id}">Edit</button>`
            : done ? `<span class="pill done">✓ Done</span>` : `<svg class="chev" width="20" height="20" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`}
        </div>`;}).join('')}
    </div>
    <div class="btn-row"><button class="btn small" id="addEx">＋ Add exercise</button></div>
    ${session && !v.editing ? `<div class="btn-row"><button class="btn small" id="viewSession">View today's session</button></div>` : ''}`;
  $('#editBtn').onclick = () => { v.editing = !v.editing; render(); };
  $('#addEx').onclick = () => exerciseSheet(g.id, null);
  if ($('#viewSession')) $('#viewSession').onclick = () => { switchTab('journal'); push({v:'session', id: session.id}); };
  el.querySelectorAll('.row').forEach(r => r.addEventListener('click', ev => {
    const act = ev.target.closest('[data-act]');
    if (act) {
      ev.stopPropagation();
      const idx = list.findIndex(x => x.id === act.dataset.id);
      if (act.dataset.act === 'edit') exerciseSheet(g.id, list[idx]);
      if (act.dataset.act === 'up' && idx > 0) { [list[idx-1], list[idx]] = [list[idx], list[idx-1]]; save(); render(); }
      return;
    }
    if (v.editing) { exerciseSheet(g.id, list.find(x => x.id === r.dataset.id)); return; }
    push({v:'log', g: g.id, exId: r.dataset.id, date: v.date});
  }));
}

/* ---------- Workout: Log an exercise ---------- */
function renderLog(el, v){
  const g = groupOf(v.g);
  const found = findExercise(v.exId);
  const session = getSession(v.date, v.g);
  const existing = session && session.entries.find(e => e.exId === v.exId);
  const e = found ? found.ex : {name: existing ? existing.name : 'Exercise', sets: 3, min: 8, max: 12};
  const last = lastEntry(v.exId, v.date);
  if (!v.draft) {
    v.draft = existing
      ? existing.sets.map(s => ({w: s.w || '', r: s.r || ''}))
      : Array.from({length: e.sets}, (_, i) => ({w: '', r: ''}));
  }
  setHeader(e.name, `${g.name} · ${fmtDay(v.date)}`);
  const hintFor = i => last && last.sets[i] ? `last ${fmtNum(last.sets[i].w)}×${last.sets[i].r}` : '';
  el.style.setProperty('--c', g.color);
  el.innerHTML = `
    <div class="target" style="--c:${g.color}">
      <div><div class="lbl">Target</div><div class="big">${e.sets} × ${repsLabel(e)}</div><div class="lbl" style="margin-top:2px">sets × reps</div></div>
      <div class="last">${last ? `Last time · ${fmtDay(last.date)}<b>${esc(setsStr(last.sets))}</b>` : 'First time logging<b>Go get it 💪</b>'}</div>
    </div>
    <div class="sets-head"><div>Set</div><div style="text-align:center">Weight</div><div style="text-align:center">Reps</div><div></div></div>
    <div id="sets">
      ${v.draft.map((s, i) => `
      <div class="set-row ${s.w !== '' ? 'filled' : ''} ${hintFor(i) ? 'has-hint' : ''}" style="--c:${g.color}">
        <div class="sn">${i + 1}</div>
        <div class="field"><input type="number" inputmode="decimal" step="any" min="0" data-i="${i}" data-k="w" value="${s.w}" placeholder="${last && last.sets[i] ? fmtNum(last.sets[i].w) : '0'}"><span class="unit">lb</span>${hintFor(i) ? `<span class="hint">${hintFor(i)}</span>` : ''}</div>
        <div class="field"><input type="number" inputmode="numeric" min="0" step="1" data-i="${i}" data-k="r" value="${s.r}" placeholder="${e.max}"><span class="unit">reps</span></div>
        <button class="del-set" data-del="${i}" aria-label="Remove set"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      </div>`).join('')}
    </div>
    <div class="btn-row"><button class="btn small" id="addSet">＋ Add set</button>${last ? `<button class="btn small" id="copyLast">Copy last</button>` : ''}</div>
    <div class="date-chip"><span>Workout date</span><input type="date" id="dateIn" value="${v.date}" max="${todayStr()}"></div>
    <div class="btn-row" style="margin-top:18px"><button class="btn primary" id="saveBtn">${existing ? 'Update' : 'Save'} ${esc(e.name)}</button></div>
    ${existing ? `<div class="btn-row"><button class="btn small danger" id="delEntry">Delete this entry</button></div>` : ''}
    <p class="note">Leave reps blank to use the target (${e.max}). Empty sets are skipped.</p>`;
  el.querySelectorAll('input[data-i]').forEach(inp => inp.addEventListener('input', () => {
    v.draft[+inp.dataset.i][inp.dataset.k] = inp.value;
    inp.closest('.set-row').classList.toggle('filled', v.draft[+inp.dataset.i].w !== '');
  }));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { v.draft.splice(+b.dataset.del, 1); render(); });
  $('#addSet').onclick = () => { const p = v.draft[v.draft.length - 1]; v.draft.push({w: p ? p.w : '', r: p ? p.r : ''}); render(); };
  if ($('#copyLast')) $('#copyLast').onclick = () => { v.draft = last.sets.map(s => ({w: s.w, r: s.r})); render(); };
  $('#dateIn').onchange = ev => { if (ev.target.value) { v.date = ev.target.value; v.draft = null; render(); } };
  $('#saveBtn').onclick = () => {
    const sets = v.draft.map(s => ({w: parseFloat(s.w) || 0, r: s.r === '' ? (s.w !== '' ? e.max : 0) : (parseInt(s.r) || 0)}))
      .filter(s => s.w > 0 || s.r > 0);
    if (!sets.length) { toast('Enter a weight for at least one set'); return; }
    let s = getSession(v.date, v.g);
    if (!s) { s = {id: uid(), date: v.date, group: v.g, entries: []}; db.sessions.push(s); }
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
function exerciseSheet(groupId, e){
  openSheet(`<h2>${e ? 'Edit exercise' : 'New exercise'}</h2>
    <label class="form-label">Name</label><input class="text-input" id="exName" value="${e ? esc(e.name) : ''}" placeholder="e.g. T-Bar Row" autocomplete="off">
    <div class="three" style="margin-top:4px">
      <div><label class="form-label">Sets</label><input class="text-input" id="exSets" type="number" inputmode="numeric" value="${e ? e.sets : 3}"></div>
      <div><label class="form-label">Min reps</label><input class="text-input" id="exMin" type="number" inputmode="numeric" value="${e ? e.min : 8}"></div>
      <div><label class="form-label">Max reps</label><input class="text-input" id="exMax" type="number" inputmode="numeric" value="${e ? e.max : 12}"></div>
    </div>
    <div class="btn-row" style="margin-top:20px"><button class="btn primary" id="exSave">${e ? 'Save changes' : 'Add exercise'}</button></div>
    ${e ? `<div class="btn-row"><button class="btn small danger" id="exDel">Remove from ${groupOf(groupId).name}</button></div>` : ''}
    <div class="btn-row"><button class="btn small" id="exCancel">Cancel</button></div>
    ${e ? '<p class="note">Removing an exercise keeps its past entries in your Journal.</p>' : ''}`);
  if (!e) setTimeout(() => $('#exName').focus(), 250);
  $('#exCancel').onclick = closeSheet;
  $('#exSave').onclick = () => {
    const name = $('#exName').value.trim();
    if (!name) { toast('Give it a name'); return; }
    const sets = Math.max(1, Math.min(20, parseInt($('#exSets').value) || 3));
    let min = Math.max(1, parseInt($('#exMin').value) || 8), max = Math.max(1, parseInt($('#exMax').value) || min);
    if (max < min) [min, max] = [max, min];
    if (e) Object.assign(e, {name, sets, min, max});
    else db.exercises[groupId].push({id: uid(), name, sets, min, max});
    save(); closeSheet(); render(); toast(e ? 'Updated' : 'Exercise added');
  };
  if ($('#exDel')) $('#exDel').onclick = () => {
    if (!confirm(`Remove ${e.name}?`)) return;
    db.exercises[groupId] = db.exercises[groupId].filter(x => x.id !== e.id);
    save(); closeSheet(); render(); toast('Removed');
  };
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
      <div class="session-top"><span class="dot" style="--c:${g.color}"></span><span class="gname">${g.name}</span><span class="vol">${fmtDay(s.date)}</span></div>
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
  setHeader(g.name, fmtDay(s.date, true));
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
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => push({v:'log', g: s.group, exId: b.dataset.edit, date: s.date}));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const en = s.entries.find(x => x.exId === b.dataset.del);
    if (!confirm(`Delete ${en.name} from this workout?`)) return;
    removeEntry(s, en.exId); toast('Entry deleted');
    if (!db.sessions.includes(s)) pop(); else render();
  });
  $('#addMore').onclick = () => push({v:'group', g: s.group, date: s.date});
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
    <div class="section-title">Backup</div>
    <div class="set-group">
      <button class="set-item" id="exportBtn"><span class="grow">Export backup<span class="sub">${lastBackup ? 'Last backup ' + daysAgo(lastBackup) : 'Never backed up'} · saves a .json file</span></span>⬇︎</button>
      <button class="set-item" id="importBtn"><span class="grow">Import backup<span class="sub">Restore from a .json file</span></span>⬆︎</button>
    </div>
    <input type="file" id="fileIn" accept="application/json,.json" class="hidden">
    <p class="note">Your data lives only on this phone. iOS can clear web-app storage if the app goes unused for a long time, so export a backup now and then (save it to Files or iCloud Drive).</p>
    <div class="section-title">Exercises</div>
    <div class="set-group">
      ${GROUPS.map(g => `<button class="set-item" data-g="${g.id}"><span class="dot" style="--c:${g.color}"></span><span class="grow">${g.name}<span class="sub">${db.exercises[g.id].length} exercises · tap to edit</span></span>›</button>`).join('')}
      <button class="set-item" id="resetEx"><span class="grow">Restore default exercises<span class="sub">Adds back any missing defaults</span></span></button>
    </div>
    <div class="section-title">Data</div>
    <div class="set-group">
      <div class="set-item" style="font-weight:500"><span class="grow">Workouts logged</span><span style="color:var(--muted)">${db.sessions.length}</span></div>
      <button class="set-item red" id="wipe"><span class="grow">Erase all data</span></button>
    </div>
    <p class="note">Install: open in Safari → Share → <b>Add to Home Screen</b>. Est. 1RM uses the Epley formula.</p>`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { switchTab('workout'); push({v:'group', g: b.dataset.g, date: todayStr(), editing: true}); });
  $('#exportBtn').onclick = exportData;
  $('#importBtn').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = importData;
  $('#resetEx').onclick = () => {
    let added = 0;
    for (const g of GROUPS) for (const d of DEFAULTS[g.id])
      if (!db.exercises[g.id].some(x => x.name.toLowerCase() === d.name.toLowerCase())) { db.exercises[g.id].push({id: uid(), ...d}); added++; }
    save(); render(); toast(added ? `Added ${added} exercise${added > 1 ? 's' : ''}` : 'All defaults present');
  };
  $('#wipe').onclick = () => {
    if (!confirm('Erase ALL workouts and exercises? This cannot be undone.')) return;
    if (!confirm('Really erase everything? Export a backup first if unsure.')) return;
    db = {version: 1, exercises: defaultExercises(), sessions: []}; save(); render(); toast('All data erased');
  };
}
async function exportData(){
  const json = JSON.stringify({app: 'liftlog', exported: new Date().toISOString(), ...db}, null, 2);
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
      db = {version: 1, exercises: d.exercises, sessions: d.sessions};
      for (const g of GROUPS) if (!Array.isArray(db.exercises[g.id])) db.exercises[g.id] = [];
      save(); render(); toast('Backup restored');
    } catch (e) { toast('That file is not a Lift Log backup'); }
    ev.target.value = '';
  };
  r.readAsText(f);
}

/* ---------- Boot ---------- */
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
