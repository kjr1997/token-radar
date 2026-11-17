// Token Radar dashboard: renders window.RADAR (written by main.ts from the
// same board.json the gate checks) with no fetch and no network.
// Views: the pre-token board (ranked by impliedValue in lib/model.ts) and the
// Live tokens tab (protocols whose token already trades, at market value).
// Hash routes, for screenshots and deep links: #detail=<slug> opens one
// protocol, #filter=watchlist shows the watchlist only, #tab=live opens Live.
(function () {
  'use strict';
  var D = window.RADAR;
  var wlSet = new Set();
  (D.watchlist || []).forEach(function (s) { wlSet.add(s); });

  var $ = function (id) { return document.getElementById(id); };
  var rowsEl = $('rows'), detailEl = $('detail'), countEl = $('count');

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n > 0 ? 'pos' : n < 0 ? 'neg' : '') + '">' + s + '</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 365) return (n / 365).toFixed(1) + 'y';
    return n + 'd';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---- header stats -------------------------------------------------------
  var top = D.rows[0];
  $('stats').innerHTML =
    '<div class="stat"><b>' + D.board_size + '</b><span>board rows</span></div>' +
    '<div class="stat"><b>' + D.watchlist_size + '</b><span>watchlist covered</span></div>' +
    '<div class="stat"><b>' + D.early_size + '</b><span>early finds</span></div>' +
    '<div class="stat"><b>' + money(top ? top.implied_value_usd : 0) + '</b><span>top implied value</span></div>';
  $('asof').textContent = D.as_of + ' (snapshot)';

  // ---- filter controls ----------------------------------------------------
  var cats = {}, chains = {};
  D.rows.forEach(function (r) {
    if (r.category) cats[r.category] = 1;
    r.chains.forEach(function (c) { chains[c] = 1; });
  });
  Object.keys(cats).sort().forEach(function (c) {
    $('cat').appendChild(new Option(c, c));
  });
  Object.keys(chains).sort().forEach(function (c) {
    $('chain').appendChild(new Option(c, c));
  });

  var state = { tab: 'board', q: '', cat: '', chain: '', scope: 'all', sort: 'implied', sel: null };

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = D.rows.filter(function (r) {
      if (state.scope === 'watchlist' && !wlSet.has(r.slug)) return false;
      if (state.scope === 'early' && wlSet.has(r.slug)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0) return false;
      return true;
    });
    var by = {
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
      name: function (a, b) { return a.name < b.name ? -1 : 1; },
    }[state.sort] || function (a, b) { return a.rank - b.rank; };
    return list.slice().sort(by);
  }

  function badge(r) {
    return wlSet.has(r.slug)
      ? '<span class="badge wl">WATCHLIST</span>'
      : '<span class="badge early">EARLY</span>';
  }

  function renderBoard() {
    var list = filtered();
    countEl.textContent = 'Showing ' + list.length + ' of ' + D.rows.length + ' board rows' +
      (state.scope === 'watchlist' ? ' — the full 40-protocol watchlist' : '') + '.';
    if (!list.length) {
      rowsEl.innerHTML = '<tr><td colspan="8" class="empty">No protocols match this filter. Reset the filters to see the whole board.</td></tr>';
      return;
    }
    rowsEl.innerHTML = list.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b>' + badge(r) + '<br><span style="color:var(--mut);font-size:12px">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 2).join(', ') || '—') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num imp">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
  }

  function renderLive() {
    countEl.textContent = D.live.length + ' largest live-token protocols, at the market\u2019s own value — never ranked against the pre-token board.';
    rowsEl.innerHTML = D.live.map(function (r) {
      return '<tr data-slug="">' +
        '<td class="rank">—</td>' +
        '<td><b>' + esc(r.name) + '</b><br><span style="color:var(--mut);font-size:12px">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 2).join(', ') || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">—</td>' +
        '<td class="num imp">' + money(r.mcap_usd) + ' mcap</td></tr>';
    }).join('');
  }

  // ---- detail view --------------------------------------------------------
  function renderDetail(r) {
    if (!r) {
      var t = D.rows[0];
      detailEl.innerHTML = '<h2>Pick a protocol</h2><p class="meta">Click any row to see its model breakdown and farm plan.</p>' +
        (t ? '<p>Start with the top of the board: <b>' + esc(t.name) + '</b>, implied value ' + money(t.implied_value_usd) + ' on ' + money(t.tvl_usd) + ' TVL.</p>' : '');
      return;
    }
    var base = Math.round(r.tvl_usd * D.model.base_multiple);
    detailEl.innerHTML =
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="meta">Rank #' + r.rank + ' · ' + esc(r.category || 'No category') + ' · ' + esc(r.chains.join(', ') || '—') + badge(r) + '</p>' +
      '<div class="big">' + money(r.implied_value_usd) + ' <small>implied value</small></div>' +
      '<div class="kv">' +
      '<div><span>TVL</span>' + money(r.tvl_usd) + '</div>' +
      '<div><span>7-day change</span>' + pct(r.change_7d) + '</div>' +
      '<div><span>Age (no token recorded)</span>' + age(r.age_days) + '</div>' +
      '<div><span>Listed</span>' + esc(r.listed_at || '—') + '</div>' +
      '</div>' +
      '<h3>Model breakdown</h3>' +
      '<table><tbody>' +
      '<tr><td>Base: TVL × ' + D.model.base_multiple + '</td><td class="num">' + money(base) + '</td></tr>' +
      '<tr><td>Growth × ' + r.growth_multiplier.toFixed(2) + ' (' + (r.change_7d === null ? 'no 7d figure' : r.change_7d.toFixed(1) + '%') + ')</td><td class="num">× ' + r.growth_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Maturity × ' + r.maturity_multiplier.toFixed(2) + ' (' + age(r.age_days) + ')</td><td class="num">× ' + r.maturity_multiplier.toFixed(2) + '</td></tr>' +
      '<tr><td>Chains × ' + r.chain_multiplier.toFixed(2) + ' (' + r.chains.length + ' chains)</td><td class="num">× ' + r.chain_multiplier.toFixed(2) + '</td></tr>' +
      '</tbody></table>' +
      '<h3>How to farm it</h3><ol>' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol>' +
      '<p class="note">“Pre-token” means this snapshot records no token for ' + esc(r.name) + ' — no market cap, no CoinGecko id, no symbol. That is the record, not proof it has none. The implied value is this radar\u2019s own claim, not a prediction that a token will be issued, or when.</p>';
  }

  function render() {
    if (state.tab === 'live') { renderLive(); }
    else { renderBoard(); }
    if (state.tab === 'board') renderDetail(state.sel ? findRow(state.sel) : null);
    else detailEl.innerHTML = '<h2>Live tokens</h2><p class="meta">These protocols already have a token that trades, so they sit outside the ranking. Their market cap is the market\u2019s value, not an implied one — a launch that already happened needs no radar.</p>';
  }

  function findRow(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }

  // ---- events -------------------------------------------------------------
  rowsEl.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr || !tr.getAttribute('data-slug')) return;
    state.sel = tr.getAttribute('data-slug');
    render();
    detailEl.scrollIntoView({ block: 'nearest' });
  });
  document.querySelectorAll('#board th').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-k');
      var map = { rank: 'implied', name: 'name', tvl: 'tvl', growth: 'growth', age: 'age', implied: 'implied' };
      if (map[k]) { state.sort = map[k]; $('sort').value = map[k]; render(); }
    });
  });
  function bind(id, fn) { $(id).addEventListener('input', fn); $(id).addEventListener('change', fn); }
  bind('q', function () { state.q = $('q').value; render(); });
  bind('cat', function () { state.cat = $('cat').value; render(); });
  bind('chain', function () { state.chain = $('chain').value; render(); });
  bind('scope', function () { state.scope = $('scope').value; render(); });
  bind('sort', function () { state.sort = $('sort').value; render(); });
  $('reset').addEventListener('click', function () {
    state.q = ''; state.cat = ''; state.chain = ''; state.scope = 'all'; state.sort = 'implied'; state.sel = null;
    $('q').value = ''; $('cat').value = ''; $('chain').value = ''; $('scope').value = 'all'; $('sort').value = 'implied';
    render();
  });
  $('tab-board').addEventListener('click', function () { setTab('board'); });
  $('tab-live').addEventListener('click', function () { setTab('live'); });
  function setTab(t) {
    state.tab = t;
    $('tab-board').classList.toggle('active', t === 'board');
    $('tab-live').classList.toggle('active', t === 'live');
    render();
  }

  // ---- hash routes ----------------------------------------------------------
  var h = window.location.hash || '';
  var m;
  if ((m = h.match(/tab=live/))) setTab('live');
  if ((m = h.match(/filter=watchlist/))) { state.scope = 'watchlist'; $('scope').value = 'watchlist'; }
  if ((m = h.match(/filter=early/))) { state.scope = 'early'; $('scope').value = 'early'; }
  if ((m = h.match(/detail=([A-Za-z0-9_-]+)/))) { var r = findRow(m[1]); if (r) state.sel = r.slug; }

  render();
  window.__shotReady = true;
})();
