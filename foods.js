/* Search, scale, and serving labels for the bundled food library (foods-data.js). */
(function (root) {
  'use strict';
  function foodNorm(s) {
    return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9.%]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function foodDist(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 1) return 2;
    const m = a.length, n = b.length;
    let prev = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
      }
      prev = cur;
    }
    return prev[n];
  }
  function tokenHit(hay, words, token) {
    if (hay.includes(token)) return 'exact';
    if (token.length < 5) return '';
    for (let i = 0; i < words.length; i++) {
      if (foodDist(words[i], token) <= 1) return 'fuzzy';
    }
    return '';
  }
  function foodScore(query, food) {
    const name = foodNorm(food.name);
    const hay = foodNorm(food.name + ' ' + (food.aka || '') + ' ' + (food.cat || ''));
    const words = hay.split(' ');
    if (!query) return food.pop ? 50 : 1;
    const tokens = query.split(' ');
    let fuzzy = false;
    for (let i = 0; i < tokens.length; i++) {
      const hit = tokenHit(hay, words, tokens[i]);
      if (!hit) return 0;
      if (hit === 'fuzzy') fuzzy = true;
    }
    let score = fuzzy ? 40 : 100;
    if (name.startsWith(query)) score += 70;
    else if (name.includes(query)) score += 30;
    if (food.pop) score += 12;
    const at = name.indexOf(tokens[0]);
    if (at > 0) score -= Math.min(20, at);
    return score;
  }
  function foodSearch(query, list) {
    const src = list || root.FOOD_DB || [];
    const q = foodNorm(query);
    const scored = [];
    for (let i = 0; i < src.length; i++) {
      const s = foodScore(q, src[i]);
      if (s > 0) scored.push({food: src[i], s: s, i: i});
    }
    scored.sort((a, b) => b.s - a.s || a.food.name.localeCompare(b.food.name) || a.i - b.i);
    const out = new Array(scored.length);
    for (let i = 0; i < scored.length; i++) out[i] = scored[i].food;
    return out;
  }
  function foodScale(food, mult) {
    const m = Number(mult);
    const factor = Number.isFinite(m) && m > 0 ? m : 0;
    const r1 = n => Math.round((Number(n) || 0) * factor * 10) / 10;
    return {p: r1(food.p), c: r1(food.c), f: r1(food.f), kcal: Math.round((Number(food.kcal) || 0) * factor)};
  }
  function foodQty(food, mult) {
    const m = Math.round(Number(mult) * 100) / 100;
    if (!Number.isFinite(m) || m <= 0 || Math.abs(m - 1) < 0.001) return food.srv;
    const label = String(m);
    return label + ' × ' + food.srv;
  }
  root.foodNorm = foodNorm;
  root.foodSearch = foodSearch;
  root.foodScale = foodScale;
  root.foodQty = foodQty;
})(typeof globalThis !== 'undefined' ? globalThis : this);
