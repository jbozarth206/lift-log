/* Lift Log · MyChart (Epic) SMART on FHIR standalone patient launch with PKCE (public client).
 * Shared by index.html (app) and callback.html (OAuth redirect). No build step.
 * Tokens are kept ONLY in localStorage key 'liftlog.mychart' and are never exported or synced. */
(function (root) {
  const CONN_KEY = 'liftlog.mychart';          // {endpointId, env, name, fhirBase, tokenUrl, clientId, accessToken, expiresAt, refreshToken, patient, scope, connectedAt, patientName}
  const PENDING_KEY = 'liftlog.mychart.pending'; // PKCE verifier + state while the user is at MyChart
  const cfg = () => root.MYCHART_CONFIG || {endpoints: [], clientIds: {}};
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const randStr = n => b64url(crypto.getRandomValues(new Uint8Array(n)));
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };
  const isPlaceholder = id => !id || /^PASTE_/.test(id);

  const MyChart = {
    CONN_KEY, PENDING_KEY,
    config: cfg,
    endpoints(){ return cfg().endpoints || []; },
    endpoint(id){ return this.endpoints().find(e => e.id === id) || null; },
    clientIdFor(ep){ return ep ? (cfg().clientIds || {})[ep.env] : null; },
    configured(ep){ return !isPlaceholder(this.clientIdFor(ep)); },
    redirectUri(){ return new URL(cfg().redirectPath || 'callback.html', location.href).href.split('?')[0].split('#')[0]; },
    get conn(){ return read(CONN_KEY); },
    setConn(c){ if (c) localStorage.setItem(CONN_KEY, JSON.stringify(c)); else localStorage.removeItem(CONN_KEY); },
    /** 'none' | 'connected' | 'expired' */
    status(){
      const c = this.conn;
      if (!c) return 'none';
      if (!c.accessToken) return 'expired';
      return Date.now() < (c.expiresAt || 0) - 30000 ? 'connected' : 'expired';
    },
    async discover(fhirBase){
      const res = await fetch(fhirBase.replace(/\/$/, '') + '/.well-known/smart-configuration', {headers: {Accept: 'application/json'}});
      if (!res.ok) throw new Error('SMART discovery failed (' + res.status + ')');
      const j = await res.json();
      if (!j.authorization_endpoint || !j.token_endpoint) throw new Error('SMART discovery missing endpoints');
      return j;
    },
    async pkce(){
      const verifier = randStr(48);
      const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      return {verifier, challenge};
    },
    /** Build the authorize URL and remember PKCE state. Returns the URL (caller navigates). */
    async beginAuth(endpointId){
      const ep = this.endpoint(endpointId || cfg().defaultEndpoint);
      if (!ep) throw new Error('Unknown endpoint');
      const clientId = this.clientIdFor(ep);
      if (isPlaceholder(clientId)) throw new Error('not-configured');
      const sc = await this.discover(ep.fhirBase);
      const {verifier, challenge} = await this.pkce();
      const state = randStr(24), redirectUri = this.redirectUri();
      localStorage.setItem(PENDING_KEY, JSON.stringify({state, verifier, endpointId: ep.id, env: ep.env, name: ep.name, fhirBase: ep.fhirBase,
        tokenUrl: sc.token_endpoint, clientId, redirectUri, created: Date.now()}));
      const q = new URLSearchParams({response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: cfg().scopes,
        state, aud: ep.fhirBase, code_challenge: challenge, code_challenge_method: 'S256'});
      return sc.authorization_endpoint + (sc.authorization_endpoint.includes('?') ? '&' : '?') + q.toString();
    },
    async connect(endpointId){ location.assign(await this.beginAuth(endpointId)); },
    /** Called on callback.html. Exchanges ?code for tokens. Returns {ok:true} or {ok:false, error}. */
    async handleCallback(search){
      const p = new URLSearchParams(search);
      const pending = read(PENDING_KEY);
      if (p.get('error')) { localStorage.removeItem(PENDING_KEY); return {ok: false, error: p.get('error_description') || p.get('error')}; }
      const code = p.get('code'), state = p.get('state');
      if (!code) return {ok: false, error: 'No authorization code in the redirect.'};
      if (!pending || pending.state !== state) return {ok: false, error: 'state-mismatch'};
      if (Date.now() - pending.created > 30 * 60 * 1000) { localStorage.removeItem(PENDING_KEY); return {ok: false, error: 'The sign-in took too long. Please connect again.'}; }
      const body = new URLSearchParams({grant_type: 'authorization_code', code, redirect_uri: pending.redirectUri, client_id: pending.clientId, code_verifier: pending.verifier});
      let res, j;
      try {
        res = await fetch(pending.tokenUrl, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'}, body});
        j = await res.json().catch(() => ({}));
      } catch (e) { return {ok: false, error: 'Network error while finishing sign-in.'}; }
      localStorage.removeItem(PENDING_KEY);
      if (!res.ok || !j.access_token) return {ok: false, error: j.error_description || j.error || ('Token request failed (' + res.status + ')')};
      if (!j.patient) return {ok: false, error: 'MyChart did not return a patient. Make sure you pick your own record.'};
      this.setConn({endpointId: pending.endpointId, env: pending.env, name: pending.name, fhirBase: pending.fhirBase, tokenUrl: pending.tokenUrl,
        clientId: pending.clientId, accessToken: j.access_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000,
        refreshToken: j.refresh_token || null, patient: j.patient, scope: j.scope || '', connectedAt: new Date().toISOString()});
      return {ok: true};
    },
    /** Public clients normally get no refresh token from Epic; used only if one was issued. */
    async refresh(){
      const c = this.conn;
      if (!c || !c.refreshToken) return false;
      try {
        const res = await fetch(c.tokenUrl, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json'},
          body: new URLSearchParams({grant_type: 'refresh_token', refresh_token: c.refreshToken, client_id: c.clientId})});
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.access_token) { this.setConn({...c, accessToken: null, refreshToken: null}); return false; }
        this.setConn({...c, accessToken: j.access_token, expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000, refreshToken: j.refresh_token || c.refreshToken});
        return true;
      } catch (e) { return false; }
    },
    async ensureToken(){
      if (this.status() === 'connected') return true;
      return this.refresh();
    },
    async get(url){
      const c = this.conn;
      const res = await fetch(url, {headers: {Authorization: 'Bearer ' + c.accessToken, Accept: 'application/fhir+json'}});
      if (res.status === 401) { this.setConn({...c, accessToken: null}); const e = new Error('expired'); e.code = 'expired'; throw e; }
      if (!res.ok) { const e = new Error('FHIR ' + res.status); e.status = res.status; throw e; }
      return res.json();
    },
    /** Follow Bundle "next" links (Epic pages large searches). */
    async searchAll(first, maxPages = 40){
      const out = [];
      let url = first, n = 0;
      while (url && n++ < maxPages) {
        const b = await this.get(url);
        for (const e of b.entry || []) if (e.resource) out.push(e.resource);
        const next = (b.link || []).find(l => l.relation === 'next');
        url = next && next.url ? next.url : null;
      }
      return out;
    },
    /** Fetch lab Observations (+ DiagnosticReports for panel names). Returns {observations, reports, patientName}. */
    async fetchLabs(){
      if (!(await this.ensureToken())) { const e = new Error('expired'); e.code = 'expired'; throw e; }
      const c = this.conn, base = c.fhirBase.replace(/\/$/, ''), pid = encodeURIComponent(c.patient);
      const observations = (await this.searchAll(`${base}/Observation?patient=${pid}&category=laboratory&_count=200`)).filter(r => r.resourceType === 'Observation');
      let reports = [];
      try { reports = (await this.searchAll(`${base}/DiagnosticReport?patient=${pid}&category=LAB&_count=100`)).filter(r => r.resourceType === 'DiagnosticReport'); }
      catch (e) { if (e.code === 'expired') throw e; /* optional API; ignore if not granted */ }
      let patientName = c.patientName || '';
      if (!patientName) {
        try { const pt = await this.get(`${base}/Patient/${pid}`); const n = (pt.name || []).find(x => x.use === 'official') || (pt.name || [])[0]; patientName = n ? (n.text || [...(n.given || []), n.family].filter(Boolean).join(' ')) : ''; }
        catch (e) { if (e.code === 'expired') throw e; }
        if (patientName) this.setConn({...this.conn, patientName});
      }
      return {observations, reports, patientName};
    },
    disconnect(){ this.setConn(null); localStorage.removeItem(PENDING_KEY); }
  };

  /* ---------- FHIR → Lift Log lab result parsing (pure, testable) ---------- */
  const LOINC = 'http://loinc.org';
  const FLAG_MAP = {H: 'H', HH: 'HH', HU: 'H', L: 'L', LL: 'LL', LU: 'L', A: 'A', AA: 'A', N: null, '>': 'H', '<': 'L', POS: 'A', DET: 'A'};
  const numOr = v => (typeof v === 'number' && isFinite(v)) ? v : (v != null && v !== '' && isFinite(+v) ? +v : null);
  /** local calendar date of an ISO datetime (keeps date-only strings as-is) */
  function localDate(s){
    if (!s) return null;
    if (/^\d{4}-\d\d-\d\d$/.test(s)) return s;
    if (/^\d{4}-\d\d$/.test(s)) return s + '-01';
    if (/^\d{4}$/.test(s)) return s + '-01-01';
    const d = new Date(s); if (isNaN(d)) return String(s).slice(0, 10);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function parseRangeText(t){
    if (!t) return {};
    const s = String(t).replace(/,/g, '');
    let m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/);
    if (m) return {low: +m[1], high: +m[2]};
    m = s.match(/(?:<=?|≤|less than|up to)\s*(\d+(?:\.\d+)?)/i); if (m) return {high: +m[1]};
    m = s.match(/(?:>=?|≥|greater than)\s*(\d+(?:\.\d+)?)/i); if (m) return {low: +m[1]};
    return {};
  }
  function codeOf(cc){
    const codings = (cc && cc.coding) || [];
    const l = codings.find(c => c.system === LOINC && c.code);
    return {code: l ? l.code : null, name: (cc && cc.text) || (l && l.display) || (codings.find(c => c.display) || {}).display || 'Result'};
  }
  function valueOf(o){
    if (o.valueQuantity) { const q = o.valueQuantity; return {value: numOr(q.value), unit: q.unit || q.code || '', text: q.comparator ? `${q.comparator}${q.value}` : ''}; }
    if (o.valueString != null) { const n = String(o.valueString).trim().match(/^([<>]=?)?\s*(-?\d+(?:\.\d+)?)$/); return {value: n && !n[1] ? +n[2] : null, unit: '', text: String(o.valueString)}; }
    if (o.valueCodeableConcept) return {value: null, unit: '', text: o.valueCodeableConcept.text || ((o.valueCodeableConcept.coding || [])[0] || {}).display || ''};
    if (o.valueInteger != null) return {value: o.valueInteger, unit: '', text: ''};
    if (o.valueBoolean != null) return {value: null, unit: '', text: o.valueBoolean ? 'Positive' : 'Negative'};
    if (o.valueRatio) return {value: null, unit: '', text: `${(o.valueRatio.numerator || {}).value}:${(o.valueRatio.denominator || {}).value}`};
    if (o.dataAbsentReason) return {value: null, unit: '', text: o.dataAbsentReason.text || ((o.dataAbsentReason.coding || [])[0] || {}).display || 'No value'};
    return {value: null, unit: '', text: ''};
  }
  function flagOf(interp, value, lo, hi){
    for (const cc of interp || []) for (const c of cc.coding || []) if (c.code && c.code.toUpperCase() in FLAG_MAP) return FLAG_MAP[c.code.toUpperCase()];
    const t = ((interp || [])[0] || {}).text || '';
    if (/high/i.test(t)) return 'H'; if (/low/i.test(t)) return 'L'; if (/abnormal/i.test(t)) return 'A';
    if (value != null && hi != null && value > hi) return 'H';
    if (value != null && lo != null && value < lo) return 'L';
    return null;
  }
  function rangeOf(rr){
    const r = (rr || [])[0]; if (!r) return {low: null, high: null, text: ''};
    let low = r.low ? numOr(r.low.value) : null, high = r.high ? numOr(r.high.value) : null;
    if (low == null && high == null && r.text) { const p = parseRangeText(r.text); low = p.low ?? null; high = p.high ?? null; }
    return {low, high, text: r.text || ''};
  }
  /** Observation (Labs) → array of Lift Log results (components become their own rows). */
  function parseObservation(o, reportOf){
    if (!o || o.resourceType !== 'Observation') return [];
    if (['entered-in-error', 'cancelled', 'registered'].includes(o.status)) return [];
    const date = localDate(o.effectiveDateTime || (o.effectivePeriod && o.effectivePeriod.start) || o.effectiveInstant || o.issued);
    if (!date) return [];
    const reportId = (reportOf && reportOf[o.id]) || null;
    const one = (id, cc, src, rr, interp, noteText) => {
      const {code, name} = codeOf(cc), v = valueOf(src), r = rangeOf(rr);
      if (v.value == null && !v.text) return null;
      return {id, date, code, name, value: v.value, unit: v.unit, refLow: r.low, refHigh: r.high, flag: flagOf(interp, v.value, r.low, r.high),
        text: [v.text, noteText].filter(Boolean).join(' · '), reportId,
        ...(r.text && r.low == null && r.high == null ? {refText: r.text} : {}), ...(o.status && o.status !== 'final' ? {status: o.status} : {})};
    };
    const note = (o.note || []).map(n => n.text).filter(Boolean).join(' ');
    const out = [];
    const main = one(o.id, o.code, o, o.referenceRange, o.interpretation, note);
    if (main) out.push(main);
    (o.component || []).forEach((c, i) => { const r = one(`${o.id}#${i}`, c.code, c, c.referenceRange || o.referenceRange, c.interpretation); if (r) out.push(r); });
    return out;
  }
  /** DiagnosticReport list → {obsId: reportId} and {reportId: {name, date}} */
  function indexReports(reports){
    const reportOf = {}, info = {};
    for (const r of reports || []) {
      info[r.id] = {name: codeOf(r.code).name, date: localDate(r.effectiveDateTime || (r.effectivePeriod && r.effectivePeriod.start) || r.issued)};
      for (const ref of r.result || []) { const m = String(ref.reference || '').match(/Observation\/([^/?#]+)/); if (m) reportOf[m[1]] = r.id; }
    }
    return {reportOf, info};
  }
  /** Merge parsed results into existing ones. Dedupe by FHIR id; also matches same marker+date+value
   *  (Epic may re-issue Observation ids) so re-imports never duplicate. Returns {results, added, updated}. */
  function mergeResults(existing, incoming){
    const list = (existing || []).slice();
    const byId = new Map(list.map((r, i) => [r.id, i]));
    const sig = r => [r.code || String(r.name).toLowerCase(), r.date, r.value ?? r.text, r.unit].join('|');
    const bySig = new Map(list.map((r, i) => [sig(r), i]));
    let added = 0, updated = 0;
    for (const r of incoming) {
      let i = byId.has(r.id) ? byId.get(r.id) : bySig.get(sig(r));
      if (i === undefined) { list.push(r); byId.set(r.id, list.length - 1); bySig.set(sig(r), list.length - 1); added++; }
      else if (JSON.stringify(list[i]) !== JSON.stringify(r)) { list[i] = r; byId.set(r.id, i); updated++; }
    }
    list.sort((a, b) => b.date.localeCompare(a.date) || String(a.name).localeCompare(String(b.name)));
    return {results: list, added, updated};
  }
  MyChart.parse = {parseObservation, indexReports, mergeResults, localDate, parseRangeText};
  root.MyChart = MyChart;
  if (typeof module !== 'undefined') module.exports = MyChart;
})(typeof window !== 'undefined' ? window : globalThis);
