(function () {
  const C = window.GW_CONFIG;
  const S = window.GW_STORE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const $app = $("#app");
  const $tabs = $("#tabs");
  const DAY = 86400000;
  const START = new Date(C.startDate + "T00:00:00");
  const SESSION = "gwwlc-session";

  let state = { me: null, tab: "me", users: [], weighins: [], shouts: [], admin: false, boardWeek: null, boardTrack: null };

  // ---------- icons (stroke icons, 24px grid) ----------
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    feed: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.4A8 8 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4M12 2v13"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    thumbs: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8.5a6 6 0 0 1 8 0l-2.5 3a2 2 0 0 0-3 0L8 8.5Z"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eyeOff: '<path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.7 9.7 0 0 0 5.39-1.61"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24M2 2l20 20"/>',
  };
  const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const MARK = `<svg viewBox="0 0 64 64" class="mark" aria-hidden="true"><defs><linearGradient id="gwg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6f432"/><stop offset=".55" stop-color="#7ef0c2"/><stop offset="1" stop-color="#6c9bff"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#111317"/><g fill="none" stroke="url(#gwg)" stroke-linecap="round"><circle cx="32" cy="32" r="20" stroke-width="3.2" stroke-dasharray="104 22" transform="rotate(-40 32 32)"/><circle cx="32" cy="32" r="13" stroke-width="3.2" stroke-dasharray="60 22" transform="rotate(130 32 32)"/><circle cx="32" cy="32" r="6" stroke-width="3.2"/></g></svg>`;

  // Reactions are stored under their original keys; shown as icons.
  const REACTIONS = [
    { key: "👏", icon: "thumbs", label: "Props" },
    { key: "🔥", icon: "flame", label: "Fire" },
    { key: "💪", icon: "zap", label: "Strong" },
    { key: "😂", icon: "smile", label: "Ha" },
  ];

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const sign = (n) => (n > 0.04 ? "+" : n < -0.04 ? "−" : "");
  const signed = (n, unit = "") => sign(n) + fmt1(Math.abs(n)) + unit;
  const weekDate = (w) => new Date(START.getTime() + w * 7 * DAY);
  const shortDate = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const weekLabel = (w) => (w === 0 ? "Start" : "Week " + w);
  const initials = (name) => name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const hue = (name) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const avatar = (u, cls = "") => `<span class="av ${cls}" style="--h:${hue(u ? u.name : "?")}">${esc(u ? initials(u.name) : "?")}</span>`;
  // Color class for a change: accent if toward the goal, red if away, neutral if ~0.
  const tone = (score, pct) => (Math.abs(pct) < 0.05 ? "muted" : score > 0 ? "up" : "down");
  const trackName = (t) => (t === "gain" ? "Gain" : "Lose");
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "now";
    if (s < 3600) return Math.floor(s / 60) + "m";
    if (s < 86400) return Math.floor(s / 3600) + "h";
    if (s < 604800) return Math.floor(s / 86400) + "d";
    return shortDate(new Date(iso));
  };

  // Testing: add ?today=2026-12-21 to the URL to pretend it's another date.
  const TODAY_OVERRIDE = new URLSearchParams(location.search).get("today");
  const today = () => (TODAY_OVERRIDE ? new Date(TODAY_OVERRIDE + "T12:00:00") : new Date());
  function currentWeek(now = today()) {
    const days = Math.floor((now - START) / DAY);
    if (days < 0) return 0;
    return Math.min(C.weeks, Math.floor(days / 7));
  }

  function toast(msg, kind = "ok") {
    const t = $("#toast");
    t.className = "toast show" + (kind === "err" ? " err" : "");
    t.innerHTML = icon(kind === "err" ? "alert" : "check") + `<span>${esc(msg)}</span>`;
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function haptic() { if (navigator.vibrate) navigator.vibrate(8); }

  async function busy(btn, fn) {
    if (!btn) return fn();
    const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
  }

  // ---------- sheet (replaces prompt/confirm) ----------
  function sheet({ title, desc = "", body = "", actions = [], onMount }) {
    return new Promise((resolve) => {
      const scrim = document.createElement("div"); scrim.className = "scrim";
      const el = document.createElement("form"); el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
      el.innerHTML = `<div class="grab"></div><h3>${title}</h3>${desc ? `<p class="desc">${desc}</p>` : ""}${body ? `<div class="body">${body}</div>` : ""}
        <div class="actions ${actions.length === 2 ? "two" : ""}">${actions.map((a, i) => `<button type="${a.submit ? "submit" : "button"}" data-i="${i}" class="btn block ${a.kind || ""}">${a.label}</button>`).join("")}</div>`;
      document.body.append(scrim, el);
      requestAnimationFrame(() => { scrim.classList.add("open"); el.classList.add("open"); });
      const close = (val) => {
        scrim.classList.remove("open"); el.classList.remove("open");
        setTimeout(() => { scrim.remove(); el.remove(); }, 300);
        resolve(val);
      };
      const data = () => Object.fromEntries(new FormData(el));
      scrim.onclick = () => close(null);
      el.onsubmit = (e) => { e.preventDefault(); const a = actions.find((x) => x.submit); close(a ? { action: a.value, ...data() } : data()); };
      $$("button[data-i]", el).forEach((b) => { const a = actions[+b.dataset.i]; if (!a.submit) b.onclick = () => close(a.value == null ? null : { action: a.value, ...data() }); });
      if (onMount) onMount(el, close);
      const first = $("input", el); if (first) setTimeout(() => first.focus(), 320);
    });
  }
  const confirmSheet = (title, desc, label = "Confirm", kind = "primary") =>
    sheet({ title, desc, actions: [{ label: "Cancel" }, { label, kind, value: "ok", submit: true }] }).then((r) => !!r);

  // ---------- data ----------
  async function refresh() {
    [state.users, state.weighins, state.shouts] = await Promise.all([S.listUsers(), S.listWeighins(), S.listShouts()]);
    if (state.me) state.me = state.users.find((u) => u.id === state.me.id) || null;
  }
  const userById = (id) => state.users.find((u) => u.id === id);
  const activeUsers = () => state.users.filter((u) => u.active !== false);

  // ---------- stats ----------
  const entriesFor = (userId) => state.weighins.filter((w) => w.userId === userId).sort((a, b) => a.week - b.week);
  function weightAt(entries, w) { let v = null; for (const e of entries) { if (e.week <= w) v = e.weight; else break; } return v; }
  const goalSign = (u) => (u.track === "gain" ? 1 : -1);

  function personStats(u) {
    const es = entriesFor(u.id);
    const start = es.find((e) => e.week === 0) || es[0];
    if (!start) return { user: u, entries: es, hasStart: false };
    const latest = es[es.length - 1];
    const change = latest.weight - start.weight;
    const pct = (change / start.weight) * 100;
    const logged = new Set(es.map((e) => e.week));
    let streak = 0;
    const cw = currentWeek();
    for (let w = cw; w >= 0; w--) { if (logged.has(w)) streak++; else if (w !== cw) break; }
    return { user: u, entries: es, hasStart: true, start: start.weight, latest: latest.weight, latestWeek: latest.week, change, pct, score: pct * goalSign(u), lbsScore: change * goalSign(u), streak };
  }

  function weekStats(u, w) {
    const es = entriesFor(u.id);
    const cur = es.find((e) => e.week === w);
    const prev = weightAt(es, w - 1);
    if (!cur || prev == null) return null;
    const change = cur.weight - prev;
    const pct = (change / prev) * 100;
    return { user: u, change, pct, score: pct * goalSign(u), lbsScore: change * goalSign(u) };
  }

  const weeksWithData = () => [...new Set(state.weighins.map((w) => w.week))].filter((w) => w > 0).sort((a, b) => a - b);

  function ranked(track, wk) {
    const people = activeUsers().filter((u) => u.track === track);
    const rows = wk === "all"
      ? people.map(personStats).filter((p) => p.hasStart).map((p) => ({ user: p.user, pct: p.pct, change: p.change, score: p.score }))
      : people.map((u) => weekStats(u, wk)).filter(Boolean);
    return rows.sort((a, b) => b.score - a.score);
  }

  function groupStats(track) {
    const all = activeUsers().filter((u) => u.track === track);
    const people = all.map(personStats).filter((p) => p.hasStart);
    const totalLbs = people.reduce((s, p) => s + p.lbsScore, 0);
    const avgPct = people.length ? people.reduce((s, p) => s + p.score, 0) / people.length : 0;
    const cw = currentWeek();
    const loggedThisWeek = all.filter((u) => entriesFor(u.id).some((e) => e.week === cw)).length;
    const series = [];
    for (let w = 0; w <= cw; w++) {
      const vals = people.map((p) => { const v = weightAt(p.entries, w); return v == null ? null : ((v - p.start) / p.start) * 100 * goalSign(p.user); }).filter((v) => v != null);
      series.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
    }
    return { people, totalLbs, avgPct, loggedThisWeek, series, count: all.length };
  }

  function highlights(w) {
    if (w < 1) return [];
    const out = [];
    for (const track of ["lose", "gain"]) {
      const top = ranked(track, w)[0];
      if (top && top.score > 0) out.push({ icon: track === "lose" ? "flame" : "dumbbell", tone: track === "lose" ? "lime" : "blue", title: `<b>${esc(top.user.name)}</b> ${track === "lose" ? "was the top loser" : "was the top gainer"}`, sub: `${signed(top.pct, "%")} · ${signed(top.change, " lb")} in ${weekLabel(w)}` });
    }
    for (const u of activeUsers()) {
      const es = entriesFor(u.id);
      const start = (es.find((e) => e.week === 0) || es[0] || {}).weight;
      const now = es.find((e) => e.week === w);
      const before = weightAt(es, w - 1);
      if (!start || !now || before == null) continue;
      const g = goalSign(u);
      const pNow = ((now.weight - start) / start) * 100 * g;
      const pBefore = ((before - start) / start) * 100 * g;
      const hit = C.milestones.filter((m) => pBefore < m && pNow >= m).pop();
      if (hit) out.push({ icon: "target", tone: "gold", title: `<b>${esc(u.name)}</b> crossed ${hit}% ${u.track === "gain" ? "gained" : "lost"}`, sub: "Milestone unlocked" });
    }
    const perfect = activeUsers().filter((u) => { const wk = new Set(entriesFor(u.id).map((e) => e.week)); for (let i = 0; i <= w; i++) if (!wk.has(i)) return false; return true; });
    if (perfect.length && w >= 2) {
      const first = (u) => esc(u.name.split(/\s+/)[0]);
      const names = perfect.length <= 3 ? perfect.map((u) => `<b>${first(u)}</b>`).join(", ") : `<b>${perfect.length} members</b>`;
      out.push({ icon: "calendar", tone: "", title: `${names} ${perfect.length === 1 ? "has" : "have"} perfect attendance`, sub: perfect.length > 3 ? perfect.map(first).join(", ") : `Every weigh-in through ${weekLabel(w)}` });
    }
    return out;
  }

  // ---------- charts ----------
  function areaChart(points, { unit = "", height = 150, id = "c" } = {}) {
    const pts = points.map((v, i) => ({ i, v })).filter((p) => p.v != null);
    if (pts.length < 2) return `<div class="empty"><span class="icon-btn">${icon("up")}</span>The trend line appears after the second weigh-in.</div>`;
    const W = 340, H = height, L = 34, R = 10, T = 18, B = 22;
    const vs = pts.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    const pad = Math.max((hi - lo) * 0.15, 0.5); lo -= pad; hi += pad;
    const maxI = Math.max(points.length - 1, 1);
    const x = (i) => L + (i / maxI) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const line = pts.map((p, k) => (k ? "L" : "M") + x(p.i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
    const area = line + ` L${x(pts[pts.length - 1].i).toFixed(1)} ${H - B} L${x(pts[0].i).toFixed(1)} ${H - B} Z`;
    const grid = [0, 0.5, 1].map((f) => lo + (hi - lo) * f);
    const step = Math.ceil(points.length / 6);
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Trend chart">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
      ${grid.map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text x="${L - 8}" y="${y(g) + 3}" class="tick" text-anchor="end">${fmt1(g)}</text>`).join("")}
      ${points.map((_, i) => (i % step === 0 || i === points.length - 1 ? `<text x="${x(i)}" y="${H - 4}" class="tick" text-anchor="middle">${i === 0 ? "S" : "W" + i}</text>` : "")).join("")}
      <path d="${area}" fill="url(#${id})"/>
      <path d="${line}" class="line"/>
      ${pts.map((p) => `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="${p === last ? 4.5 : 3}" class="pt ${p === last ? "last" : ""}"/>`).join("")}
      <text x="${Math.min(Math.max(x(last.i), L + 20), W - R - 4)}" y="${Math.max(y(last.v) - 12, 10)}" class="val" text-anchor="${x(last.i) > W - 60 ? "end" : "middle"}">${fmt1(last.v)}${unit}</text>
    </svg>`;
  }

  function ring(frac, big, small) {
    const r = 40, c = 2 * Math.PI * r;
    return `<div class="ring"><svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="${r}" fill="none" stroke-width="7" class="track"/><circle cx="46" cy="46" r="${r}" fill="none" stroke-width="7" class="bar" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - Math.max(0, Math.min(1, frac)))}"/></svg><div class="lbl"><b class="num">${big}</b><small>${small}</small></div></div>`;
  }
  const animateRings = () => requestAnimationFrame(() => $$(".ring .bar").forEach((b) => (b.style.strokeDashoffset = b.dataset.off)));

  // ---------- shell ----------
  const TABS = [["me", "home", "Home"], ["board", "trophy", "Ranks"], ["group", "users", "Group"], ["shout", "feed", "Feed"]];

  function render() {
    const inApp = !!state.me && !state.admin;
    document.body.classList.toggle("no-tabs", !inApp);
    document.body.classList.toggle("track-gain", !!state.me && state.me.track === "gain" && !state.admin);
    $tabs.classList.toggle("hidden", !inApp);
    $("#brand").innerHTML = MARK + "<span>Good Wood</span>";
    $("#topRight").innerHTML = state.admin
      ? `<span class="pill warn">${icon("shield", "sm")}Commissioner</span>`
      : state.me ? `<button class="me-btn" id="meBtn" aria-label="Account">${avatar(state.me, "sm")}</button>` : "";
    const mb = $("#meBtn"); if (mb) mb.onclick = accountSheet;
    $tabs.innerHTML = TABS.map(([k, ic, l]) => `<button data-tab="${k}" class="${state.tab === k ? "active" : ""}" aria-label="${l}">${icon(ic)}<span>${l}</span></button>`).join("");
    $$("button", $tabs).forEach((b) => (b.onclick = () => { if (state.tab !== b.dataset.tab) { haptic(); state.tab = b.dataset.tab; render(); window.scrollTo({ top: 0 }); } }));

    if (state.admin) renderAdmin();
    else if (!state.me) renderLogin();
    else ({ me: renderMe, board: renderBoard, group: renderGroup, shout: renderFeed }[state.tab])();
    animateRings();
  }

  async function accountSheet() {
    const u = state.me;
    await sheet({
      title: `<div class="row" style="gap:14px">${avatar(u, "lg")}<div><div>${esc(u.name)}</div><div class="eyebrow" style="margin-top:4px">${trackName(u.track)} track</div></div></div>`,
      body: `<button type="button" class="menu-item" id="mPin">${icon("key")}Change PIN</button><button type="button" class="menu-item danger" id="mOut">${icon("logout")}Log out</button>`,
      actions: [{ label: "Close" }],
      onMount: (el, close) => {
        $("#mPin", el).onclick = () => { close(null); setTimeout(changePin, 320); };
        $("#mOut", el).onclick = () => { close(null); localStorage.removeItem(SESSION); S.logout && S.logout(); state.me = null; state.tab = "me"; render(); };
      },
    });
  }

  async function changePin() {
    const r = await sheet({
      title: "Change PIN", desc: "Use at least 4 digits. You'll use it next time you log in.",
      body: `<label class="field"><span>New PIN</span><input class="input" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" required autocomplete="new-password"></label>`,
      actions: [{ label: "Cancel" }, { label: "Save PIN", kind: "primary", value: "ok", submit: true }],
    });
    if (!r) return;
    try { await S.updateUser(state.me.id, { pin: r.pin }); toast("PIN updated"); } catch (e) { toast(e.message, "err"); }
  }

  // ---------- login ----------
  function renderLogin() {
    const before = today() < START;
    $app.innerHTML = `
      <section class="login-hero">
        ${MARK}
        <h1>Good Wood<span>Weight Loss Challenge</span></h1>
        <p>${before ? `Starts ${START.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}` : `${weekLabel(currentWeek())} of ${C.weeks} · in progress`}</p>
        ${before ? `<div class="countdown" id="cd"></div>` : ""}
      </section>
      <form id="loginForm" class="card stack" style="--i:1; margin-top:22px" autocomplete="on">
        <label class="field"><span>Name</span><input class="input" name="name" autocomplete="username" autocapitalize="words" required placeholder="Your name"></label>
        <label class="field"><span>PIN</span><input class="input" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password" required placeholder="••••"></label>
        <button class="btn primary block">Log in</button>
        <p class="dim" style="font-size:12px;text-align:center">Your PIN comes from the commissioner.</p>
      </form>
      ${installCard()}
      <p style="text-align:center;margin:22px 0 8px"><a href="#" id="adminLink" class="link">${icon("shield", "sm")}Commissioner access</a></p>`;
    if (before) tickCountdown();
    $("#loginForm").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await busy($("button", e.target), async () => {
        try {
          const u = await S.login(f.get("name"), f.get("pin"));
          localStorage.setItem(SESSION, u.id); state.me = u; state.tab = "me"; await refresh(); haptic(); render(); toast(`Welcome back, ${u.name.split(/\s+/)[0]}`);
        } catch (err) { toast(err.message, "err"); }
      });
    };
    $("#adminLink").onclick = (e) => { e.preventDefault(); adminGate(); };
  }

  function tickCountdown() {
    const el = $("#cd"); if (!el) return;
    const ms = Math.max(0, START - new Date());
    const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    el.innerHTML = [[d, "Days"], [h, "Hrs"], [m, "Min"], [s, "Sec"]].map(([v, l]) => `<div><b>${String(v).padStart(2, "0")}</b><small>${l}</small></div>`).join("");
    clearTimeout(tickCountdown._t); tickCountdown._t = setTimeout(tickCountdown, 1000);
  }

  function installCard() {
    if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "";
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return `<section class="card install" style="--i:2">
      <span class="icon-btn">${icon("share")}</span>
      <div><b>Install on your phone</b><p>${ios ? "In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>." : "In your browser menu, tap <b>Install app</b> or <b>Add to Home screen</b>."}</p></div>
    </section>`;
  }

  // ---------- home ----------
  function renderMe() {
    const u = state.me;
    const p = personStats(u);
    const cw = currentWeek();
    const thisEntry = p.entries.find((e) => e.week === cw);
    const lastEntry = p.entries.filter((e) => e.week < cw).pop();
    const goalWord = u.track === "gain" ? "gained" : "lost";
    const points = [];
    for (let w = 0; w <= Math.max(cw, p.latestWeek || 0); w++) { const e = p.entries.find((x) => x.week === w); points.push(e ? e.weight : null); }
    const board = ranked(u.track, "all");
    const rankIdx = board.findIndex((x) => x.user.id === u.id);

    $app.innerHTML = `<div class="stack">
      ${p.hasStart ? `
      <section class="card hero" style="--i:0">
        <div class="hero-main">
          <div>
            <div class="eyebrow">Total change</div>
            <div class="hero-num num ${tone(p.score, p.pct)}">${sign(p.pct)}${fmt1(Math.abs(p.pct))}<small>%</small></div>
            <div class="hero-sub"><b class="num">${fmt1(Math.abs(p.change))} lb</b> ${p.lbsScore >= 0 ? goalWord : (u.track === "gain" ? "lost" : "gained")}${rankIdx >= 0 ? ` · Rank <b class="num">${rankIdx + 1}</b> of ${board.length}` : ""}</div>
          </div>
          ${ring(cw / C.weeks, cw === 0 ? "S" : cw, `of ${C.weeks} wks`)}
        </div>
      </section>` : `
      <section class="card hero" style="--i:0">
        <div class="eyebrow">Welcome, ${esc(u.name)}</div>
        <div class="hero-num" style="font-size:30px;letter-spacing:-.03em;margin-top:10px">Log your starting weight</div>
        <div class="hero-sub">It sets your baseline. Only you and the commissioner can see it.</div>
      </section>`}

      <form id="wForm" class="card" style="--i:1">
        <div class="card-head">
          <div><div class="card-title">${cw === 0 ? "Starting weigh-in" : weekLabel(cw) + " weigh-in"}</div><div class="muted" style="font-size:13px;margin-top:2px">${cw === 0 ? shortDate(START) : "Week of " + shortDate(weekDate(cw))}</div></div>
          ${thisEntry ? `<span class="pill accent">${icon("check", "sm")}Logged</span>` : `<span class="pill warn live"><span class="dot"></span>Due</span>`}
        </div>
        <div class="weigh">
          <button type="button" class="step" data-step="-0.2" aria-label="Decrease">${icon("minus")}</button>
          <div class="weigh-input"><input name="weight" type="number" step="0.1" min="50" max="700" inputmode="decimal" placeholder="${lastEntry ? fmt1(lastEntry.weight) : "000.0"}" value="${thisEntry ? fmt1(thisEntry.weight) : ""}" aria-label="Weight in pounds"><span>lb</span></div>
          <button type="button" class="step" data-step="0.2" aria-label="Increase">${icon("plus")}</button>
        </div>
        <button class="btn primary block">${thisEntry ? "Update weigh-in" : "Save weigh-in"}</button>
        ${lastEntry ? `<p class="hint">Last: <span class="num">${fmt1(lastEntry.weight)} lb</span> (${weekLabel(lastEntry.week)})</p>` : ""}
      </form>

      ${p.hasStart ? `
      <div class="tiles">
        <div class="tile" style="--i:2"><div class="eyebrow">Start</div><b class="num">${fmt1(p.start)}<small>lb</small></b></div>
        <div class="tile" style="--i:3"><div class="eyebrow">Current</div><b class="num">${fmt1(p.latest)}<small>lb</small></b></div>
        <div class="tile" style="--i:4"><div class="eyebrow">Streak</div><b class="num">${p.streak}<small>${p.streak === 1 ? "wk" : "wks"}</small></b></div>
      </div>
      <section class="card" style="--i:5">
        <div class="card-head"><div class="card-title">Weight trend</div><span class="pill">${icon(u.track === "gain" ? "up" : "down", "sm")}${trackName(u.track)} track</span></div>
        ${areaChart(points, { id: "meC" })}
      </section>
      <section class="card" style="--i:6">
        <div class="card-head"><div class="card-title">History</div><span class="muted" style="font-size:12px;display:flex;align-items:center;gap:6px">${icon("eyeOff", "sm")}Private</span></div>
        <ul class="list">
          ${p.entries.slice().reverse().map((e) => {
            const prev = weightAt(p.entries, e.week - 1);
            const d = prev == null ? null : e.weight - prev;
            const cls = d == null || Math.abs(d) < 0.05 ? "" : d * goalSign(u) > 0 ? "good" : "bad";
            return `<li><div class="grow"><div style="font-weight:600">${weekLabel(e.week)}</div><div class="muted" style="font-size:12px">${shortDate(weekDate(e.week))}</div></div><span class="num" style="font-weight:600">${fmt1(e.weight)} lb</span><span class="delta ${cls}">${d == null ? "Base" : signed(d)}</span></li>`;
          }).join("")}
        </ul>
      </section>` : ""}
    </div>`;

    const input = $("input[name=weight]");
    $$("[data-step]").forEach((b) => (b.onclick = () => {
      const base = parseFloat(input.value) || parseFloat(input.placeholder) || 0;
      if (!base) return input.focus();
      input.value = fmt1(base + parseFloat(b.dataset.step)); haptic();
    }));
    $("#wForm").onsubmit = async (e) => {
      e.preventDefault();
      const v = parseFloat(input.value);
      if (!(v > 50 && v < 700)) { toast("Enter your weight in pounds", "err"); return input.focus(); }
      if (lastEntry && Math.abs(v - lastEntry.weight) / lastEntry.weight > 0.06) {
        const ok = await confirmSheet("Double-check that number", `That's <b class="num">${signed(v - lastEntry.weight, " lb")}</b> since ${weekLabel(lastEntry.week).toLowerCase()}. Save <b class="num">${fmt1(v)} lb</b>?`, "Save it");
        if (!ok) return;
      }
      await busy($("button.primary", e.target), async () => {
        try { await S.upsertWeighin(u.id, cw, v); await refresh(); haptic(); toast(thisEntry ? "Weigh-in updated" : "Weigh-in saved"); render(); }
        catch (err) { toast(err.message, "err"); }
      });
    };
  }

  // ---------- leaderboard ----------
  function renderBoard() {
    const weeks = weeksWithData();
    if (state.boardTrack == null) state.boardTrack = state.me.track;
    if (state.boardWeek == null || (state.boardWeek !== "all" && !weeks.includes(state.boardWeek))) state.boardWeek = weeks.length ? weeks[weeks.length - 1] : "all";
    const wk = state.boardWeek, track = state.boardTrack;
    document.body.classList.toggle("track-gain", track === "gain");
    const rows = ranked(track, wk);
    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.pct)), 0.1);
    const podium = rows.length >= 3 ? rows.slice(0, 3) : [];
    const rest = podium.length ? rows.slice(3) : rows;
    const row = (r, i) => `<div class="rank-row ${r.user.id === state.me.id ? "me" : ""}">
        <span class="rk">${String(i + 1).padStart(2, "0")}</span>${avatar(r.user)}
        <div style="min-width:0"><div class="nm">${esc(r.user.name)}</div><div class="meter"><i class="${r.score < 0 && Math.abs(r.pct) >= 0.05 ? "neg" : ""}" style="width:${Math.max(4, (Math.abs(r.pct) / maxAbs) * 100)}%"></i></div></div>
        <div class="v"><b class="num ${tone(r.score, r.pct)}">${signed(r.pct, "%")}</b><small class="num">${signed(r.change, " lb")}</small></div>
      </div>`;
    const pod = (r, place, i) => r ? `<div class="pod p${place}" style="--i:${i}">${avatar(r.user, place === 1 ? "lg" : "")}<div class="nm">${esc(r.user.name)}</div><div class="pc num ${tone(r.score, r.pct)}">${signed(r.pct, "%")}</div><div class="base">${place}</div></div>` : "";

    $app.innerHTML = `<div class="stack">
      <section class="card" style="--i:0">
        <div class="seg" data-pos="${track === "gain" ? 1 : 0}"><span class="thumb"></span>
          <button data-track="lose" class="${track === "lose" ? "on" : ""}">${icon("down", "sm")}Lose</button>
          <button data-track="gain" class="${track === "gain" ? "on" : ""}">${icon("up", "sm")}Gain</button>
        </div>
        <div class="chips">
          ${weeks.slice().reverse().map((w) => `<button class="chip ${wk === w ? "on" : ""}" data-week="${w}">Week ${w}</button>`).join("")}
          <button class="chip ${wk === "all" ? "on" : ""}" data-week="all">Overall</button>
        </div>
      </section>
      <section class="card" style="--i:1">
        <div class="card-head"><div class="card-title">${wk === "all" ? "Overall standings" : weekLabel(wk) + " results"}</div><span class="eyebrow">${rows.length} ranked</span></div>
        ${rows.length ? `
          ${podium.length ? `<div class="podium">${pod(podium[1], 2, 1)}${pod(podium[0], 1, 0)}${pod(podium[2], 3, 2)}</div>` : ""}
          ${rest.length ? `<div style="margin-top:${podium.length ? 16 : 0}px">${rest.map((r) => row(r, rows.indexOf(r))).join("")}</div>` : ""}
        ` : `<div class="empty"><span class="icon-btn">${icon("trophy")}</span>${wk === "all" ? "Rankings appear once starting weights are in." : "No weigh-ins for this week yet."}</div>`}
        <p class="note">${icon("info", "sm")}Ranked by % ${track === "gain" ? "gained" : "lost"}${wk === "all" ? " since the start" : " vs. the previous weigh-in"}, so every body size competes evenly.</p>
      </section>
    </div>`;
    $$("[data-track]").forEach((b) => (b.onclick = () => { if (state.boardTrack !== b.dataset.track) { haptic(); state.boardTrack = b.dataset.track; render(); } }));
    $$("[data-week]").forEach((b) => (b.onclick = () => { haptic(); state.boardWeek = b.dataset.week === "all" ? "all" : +b.dataset.week; render(); }));
  }

  // ---------- group ----------
  function renderGroup() {
    const cw = currentWeek();
    const L = groupStats("lose"), G = groupStats("gain");
    const before = today() < START;
    const daysLeft = Math.max(0, Math.ceil((weekDate(C.weeks) - today()) / DAY));
    const block = (g, track, i) => `
      <section class="card ${track === "gain" ? "gain-scope" : ""}" style="--i:${i}${track === "gain" ? ";--accent:var(--gain)" : ";--accent:var(--lose)"}">
        <div class="card-head">
          <div class="track-tag card-title"><span class="sw" style="background:var(--accent)"></span>${trackName(track)} track</div>
          <span class="eyebrow">${g.count} ${g.count === 1 ? "member" : "members"}</span>
        </div>
        <div class="tiles">
          <div class="tile"><div class="eyebrow">Total</div><b class="num up">${fmt1(Math.max(g.totalLbs, 0))}<small>lb</small></b></div>
          <div class="tile"><div class="eyebrow">Avg</div><b class="num">${fmt1(g.avgPct)}<small>%</small></b></div>
          <div class="tile"><div class="eyebrow">Logged</div><b class="num">${g.loggedThisWeek}<small>/${g.count}</small></b></div>
        </div>
        <div class="eyebrow" style="margin:18px 0 8px">Avg % ${track === "gain" ? "gained" : "lost"} by week</div>
        ${areaChart(g.series, { unit: "%", id: "g" + track, height: 130 })}
      </section>`;
    const missing = activeUsers().filter((u) => !entriesFor(u.id).some((e) => e.week === cw));
    $app.innerHTML = `<div class="stack">
      <section class="card" style="--i:0">
        <div class="row between"><div><div class="eyebrow">${before ? "Pre-season" : "Season progress"}</div><div class="card-title" style="font-size:22px;margin-top:6px">${cw === 0 ? "Starting weigh-in" : weekLabel(cw)} <span class="muted" style="font-weight:500">/ ${C.weeks}</span></div></div>
          <div style="text-align:right"><div class="eyebrow">${before ? "Starts" : "Days left"}</div><div class="card-title num" style="font-size:22px;margin-top:6px">${before ? shortDate(START) : daysLeft}</div></div></div>
        <div class="progress"><i style="width:${(cw / C.weeks) * 100}%"></i></div>
      </section>
      ${block(L, "lose", 1)}
      ${G.count ? block(G, "gain", 2) : ""}
      ${missing.length ? `<section class="card" style="--i:3"><div class="card-head"><div class="card-title">Still to weigh in</div><span class="pill warn"><span class="dot"></span>${missing.length}</span></div><div class="av-stack">${missing.map((u) => `<span class="av-tag">${avatar(u, "sm")}${esc(u.name)}</span>`).join("")}</div></section>` : `<section class="card" style="--i:3"><div class="row">${icon("check")}<span>Everyone has weighed in for ${cw === 0 ? "the start" : weekLabel(cw).toLowerCase()}.</span></div></section>`}
    </div>`;
  }

  // ---------- feed ----------
  function renderFeed() {
    const weeks = weeksWithData();
    const latest = weeks[weeks.length - 1];
    const hls = latest ? highlights(latest) : [];
    const others = activeUsers().filter((u) => u.id !== state.me.id);
    const feed = state.shouts.slice().sort((a, b) => b.at.localeCompare(a.at));
    $app.innerHTML = `<div class="stack">
      ${hls.length ? `<section class="card" style="--i:0"><div class="card-head"><div class="card-title">${weekLabel(latest)} highlights</div><span class="pill accent">${icon("sparkle", "sm")}Auto</span></div>
        ${hls.map((h) => `<div class="hl"><span class="ic ${h.tone}">${icon(h.icon)}</span><div><div class="t">${h.title}</div><div class="s num">${h.sub}</div></div></div>`).join("")}</section>` : ""}
      <form id="shForm" class="card composer" style="--i:1">
        <div class="row">${avatar(state.me)}<div class="grow"><select class="input" name="to" aria-label="Recipient"><option value="">Shout-out to everyone</option>${others.map((u) => `<option value="${u.id}">Shout-out to ${esc(u.name)}</option>`).join("")}</select></div></div>
        <textarea class="input" name="text" maxlength="280" rows="2" placeholder="Give someone credit for their week…" required></textarea>
        <div class="row between"><span class="dim num" style="font-size:12px" id="cc">0/280</span><button class="btn primary sm" style="height:40px;padding:0 16px">${icon("send", "sm")}Post</button></div>
      </form>
      <section class="card" style="--i:2">
        <div class="card-head"><div class="card-title">Shout-outs</div><span class="eyebrow">${feed.length}</span></div>
        ${feed.length ? feed.map((s) => {
          const f = userById(s.fromId), t = userById(s.toId);
          return `<article class="post">${avatar(f)}<div style="min-width:0">
            <div class="meta"><b>${esc(f ? f.name : "Former member")}</b>${t ? `${icon("chevron", "sm")}<b>${esc(t.name)}</b>` : ""}<span class="dim">· ${ago(s.at)}</span></div>
            <div class="body">${esc(s.text)}</div>
            <div class="reacts">${REACTIONS.map((r) => { const l = (s.reactions || {})[r.key] || []; return `<button class="react ${l.includes(state.me.id) ? "on" : ""}" data-sh="${s.id}" data-e="${r.key}" aria-label="${r.label}">${icon(r.icon)}${l.length ? `<span class="num">${l.length}</span>` : ""}</button>`; }).join("")}</div>
          </div></article>`;
        }).join("") : `<div class="empty"><span class="icon-btn">${icon("feed")}</span>No shout-outs yet. Start the trash talk.</div>`}
      </section>
    </div>`;
    const ta = $("textarea[name=text]");
    ta.oninput = () => ($("#cc").textContent = ta.value.length + "/280");
    $("#shForm").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const text = String(f.get("text")).trim(); if (!text) return;
      await busy($("button.primary", e.target), async () => {
        try { await S.addShout(state.me.id, f.get("to") || null, text); await refresh(); haptic(); toast("Posted"); render(); }
        catch (err) { toast(err.message, "err"); }
      });
    };
    $$("[data-sh]").forEach((b) => (b.onclick = async () => {
      haptic(); b.classList.toggle("on");
      try { await S.react(b.dataset.sh, state.me.id, b.dataset.e); await refresh(); render(); } catch (err) { toast(err.message, "err"); }
    }));
  }

  // ---------- commissioner ----------
  async function adminGate() {
    let has;
    try { has = await S.hasAdmin(); } catch (e) { return toast(e.message, "err"); }
    const r = await sheet({
      title: has ? "Commissioner access" : "Set up commissioner access",
      desc: has ? "Enter the commissioner passcode." : "Choose a passcode. You'll use it to add people, reset PINs and fix weigh-ins.",
      body: `<label class="field"><span>Passcode</span><input class="input" name="pass" type="password" minlength="4" required autocomplete="current-password"></label>`,
      actions: [{ label: "Cancel" }, { label: has ? "Enter" : "Create passcode", kind: "primary", value: "ok", submit: true }],
    });
    if (!r) return;
    try {
      if (!has) await S.setAdmin(r.pass);
      else if (!(await S.checkAdmin(r.pass))) return toast("Wrong passcode", "err");
      state.admin = true; await refresh(); render(); window.scrollTo({ top: 0 });
    } catch (e) { toast(e.message, "err"); }
  }

  function renderAdmin() {
    const cw = currentWeek();
    const maxW = Math.max(cw, ...state.weighins.map((x) => x.week), 0);
    const cols = Array.from({ length: maxW + 1 }, (_, i) => i);
    $app.innerHTML = `<div class="stack">
      <section class="card" style="--i:0"><div class="row between"><div><div class="eyebrow">Control room</div><div class="card-title" style="font-size:20px;margin-top:4px">Commissioner</div></div><button class="btn ghost sm" id="adExit">${icon("logout", "sm")}Exit</button></div></section>

      <form id="addUser" class="card" style="--i:1">
        <div class="card-head"><div class="card-title">Add a participant</div>${icon("userPlus")}</div>
        <label class="field"><span>Name (used to log in)</span><input class="input" name="name" required autocapitalize="words" autocomplete="off"></label>
        <div class="row" style="margin-top:12px">
          <label class="field grow" style="margin:0"><span>Track</span><select class="input" name="track"><option value="lose">Lose</option><option value="gain">Gain</option></select></label>
          <label class="field grow" style="margin:0"><span>PIN</span><input class="input" name="pin" inputmode="numeric" pattern="[0-9]*" minlength="4" required autocomplete="off"></label>
        </div>
        <button class="btn primary block" style="margin-top:14px">Add participant</button>
      </form>

      <section class="card people" style="--i:2">
        <div class="card-head"><div class="card-title">Participants</div><span class="eyebrow">${activeUsers().length} active</span></div>
        ${state.users.length ? `<ul class="list">${state.users.map((u) => `<li style="${u.active === false ? "opacity:.45" : ""}">${avatar(u)}<div class="grow"><div style="font-weight:600">${esc(u.name)}</div><div class="muted" style="font-size:12px">${trackName(u.track)} track${u.active === false ? " · removed" : ""}</div></div><button class="icon-btn" data-edit="${u.id}" aria-label="Edit ${esc(u.name)}">${icon("chevron")}</button></li>`).join("")}</ul>`
          : `<div class="empty"><span class="icon-btn">${icon("users")}</span>No one yet. Add your first participant above.</div>`}
      </section>

      <section class="card" style="--i:3">
        <div class="card-head"><div class="card-title">Weigh-in grid</div><span class="eyebrow">lb</span></div>
        <p class="muted" style="font-size:13px;margin:-6px 0 12px">Tap any cell to add, fix, or clear a weight.</p>
        ${state.users.length ? `<div class="grid-wrap"><table class="wgrid"><tr><th></th>${cols.map((w) => `<th>${w === 0 ? "Start" : "W" + w}</th>`).join("")}</tr>
          ${state.users.map((u) => `<tr><td>${esc(u.name)}</td>${cols.map((w) => { const e = state.weighins.find((x) => x.userId === u.id && x.week === w); return `<td><button class="cell ${e ? "" : "empty"}" data-u="${u.id}" data-w="${w}">${e ? fmt1(e.weight) : "—"}</button></td>`; }).join("")}</tr>`).join("")}
        </table></div>` : `<p class="dim" style="font-size:13px">Add participants first.</p>`}
      </section>

      <section class="card" style="--i:4">
        <div class="card-head"><div class="card-title">Shout-out moderation</div><span class="eyebrow">${state.shouts.length}</span></div>
        ${state.shouts.length ? `<ul class="list">${state.shouts.slice().reverse().map((s) => `<li>${avatar(userById(s.fromId), "sm")}<div class="grow" style="font-size:13px"><b>${esc((userById(s.fromId) || {}).name || "?")}</b> <span class="muted">${esc(s.text)}</span></div><button class="icon-btn" data-delsh="${s.id}" aria-label="Delete">${icon("trash", "sm")}</button></li>`).join("")}</ul>` : `<p class="dim" style="font-size:13px">Nothing to moderate.</p>`}
      </section>

      <section class="card" style="--i:5">
        <div class="card-head"><div class="card-title">Backup</div></div>
        <div class="row"><button class="btn ghost grow" id="exp">${icon("download", "sm")}Export</button><label class="btn ghost grow">${icon("upload", "sm")}Import<input id="imp" type="file" accept="application/json" hidden></label></div>
        ${C.backend === "local" ? `<div class="row" style="margin-top:10px"><button class="btn ghost grow sm" id="demo">Load demo data</button><button class="btn ghost grow sm danger" id="wipe">Wipe all data</button></div>` : ""}
      </section>
    </div>`;

    $("#adExit").onclick = async () => { state.admin = false; S.exitAdmin && S.exitAdmin(); await refresh(); render(); window.scrollTo({ top: 0 }); };
    $("#addUser").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await busy($("button.primary", e.target), async () => {
        try { await S.addUser({ name: String(f.get("name")).trim(), track: f.get("track"), pin: f.get("pin") }); await refresh(); toast(`${String(f.get("name")).trim()} added`); render(); }
        catch (err) { toast(err.message, "err"); }
      });
    };
    $$("[data-edit]").forEach((b) => (b.onclick = () => editPerson(userById(b.dataset.edit))));
    $$(".cell").forEach((b) => (b.onclick = () => editCell(b.dataset.u, +b.dataset.w)));
    $$("[data-delsh]").forEach((b) => (b.onclick = async () => {
      if (!(await confirmSheet("Delete this shout-out?", "This can't be undone.", "Delete", "danger"))) return;
      try { await S.deleteShout(b.dataset.delsh); await refresh(); toast("Deleted"); render(); } catch (e) { toast(e.message, "err"); }
    }));
    $("#exp").onclick = async () => {
      const blob = new Blob([JSON.stringify(await S.exportAll(), null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `good-wood-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    };
    $("#imp").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (!(await confirmSheet("Replace all data?", "Importing a backup overwrites every participant, weigh-in and shout-out.", "Import", "danger"))) return;
      try { await S.importAll(JSON.parse(await file.text())); await refresh(); toast("Backup imported"); render(); } catch (err) { toast(err.message, "err"); }
    };
    const demo = $("#demo");
    if (demo) demo.onclick = async () => { await loadDemo(); await refresh(); toast("Demo data loaded. PIN is 1234"); render(); };
    const wipe = $("#wipe");
    if (wipe) wipe.onclick = async () => {
      if (!(await confirmSheet("Wipe everything?", "Deletes all local data on this device.", "Wipe", "danger"))) return;
      await S.reset(); state.admin = false; state.me = null; localStorage.removeItem(SESSION); await refresh(); render();
    };
  }

  async function editPerson(u) {
    const r = await sheet({
      title: `<div class="row" style="gap:14px">${avatar(u, "lg")}<div>${esc(u.name)}</div></div>`,
      body: `<label class="field"><span>Track</span><select class="input" name="track"><option value="lose" ${u.track === "lose" ? "selected" : ""}>Lose</option><option value="gain" ${u.track === "gain" ? "selected" : ""}>Gain</option></select></label>
             <label class="field"><span>New PIN (leave blank to keep)</span><input class="input" name="pin" inputmode="numeric" pattern="[0-9]*" minlength="4" autocomplete="off"></label>`,
      actions: [
        { label: u.active === false ? "Restore participant" : "Remove participant", kind: u.active === false ? "ghost" : "ghost danger", value: "toggle" },
        { label: "Save changes", kind: "primary", value: "save", submit: true },
      ],
    });
    if (!r) return;
    try {
      if (r.action === "toggle") {
        if (u.active !== false && !(await confirmSheet(`Remove ${esc(u.name)}?`, "They'll be hidden from rankings and can't log in. Their data is kept and you can restore them.", "Remove", "danger"))) return;
        await S.updateUser(u.id, { active: u.active === false }); toast(u.active === false ? "Restored" : "Removed");
      } else {
        const patch = {};
        if (r.track !== u.track) patch.track = r.track;
        if (r.pin) patch.pin = r.pin;
        if (!Object.keys(patch).length) return;
        await S.updateUser(u.id, patch); toast(patch.pin ? "Saved. Share the new PIN with them." : "Saved");
      }
      await refresh(); render();
    } catch (e) { toast(e.message, "err"); }
  }

  async function editCell(uid, w) {
    const u = userById(uid);
    const e = state.weighins.find((x) => x.userId === uid && x.week === w);
    const r = await sheet({
      title: `${esc(u.name)} · ${weekLabel(w)}`,
      desc: e ? `Currently <b class="num">${fmt1(e.weight)} lb</b>` : "No weight logged yet.",
      body: `<div class="weigh-input"><input name="weight" type="number" step="0.1" min="50" max="700" inputmode="decimal" value="${e ? fmt1(e.weight) : ""}" placeholder="000.0" required><span>lb</span></div>`,
      actions: e ? [{ label: "Clear", kind: "ghost danger", value: "clear" }, { label: "Save", kind: "primary", value: "save", submit: true }]
                 : [{ label: "Cancel" }, { label: "Save", kind: "primary", value: "save", submit: true }],
    });
    if (!r) return;
    try {
      if (r.action === "clear") await S.deleteWeighin(e.id);
      else { const v = parseFloat(r.weight); if (!(v > 50 && v < 700)) return toast("Enter a weight in pounds", "err"); await S.upsertWeighin(uid, w, v); }
      await refresh(); toast("Updated"); render();
    } catch (err) { toast(err.message, "err"); }
  }

  async function loadDemo() {
    const people = [["Bryan Babb", "lose", 228], ["Mike Torres", "lose", 245], ["Tony", "lose", 212], ["Dave Kim", "lose", 260], ["Chris", "lose", 198], ["Jake Miller", "gain", 168], ["Luis", "gain", 155]];
    const weeks = Math.max(currentWeek(), 4);
    const existing = await S.listUsers();
    for (const [name, track, start] of people) {
      const u = existing.find((x) => x.name === name) || (await S.addUser({ name, track, pin: "1234" }));
      let w = start;
      for (let k = 0; k <= weeks; k++) {
        if (k > 0) w += (track === "gain" ? 1 : -1) * (Math.random() * 3 - 0.6);
        if (k > 0 && Math.random() < 0.12) continue;
        await S.upsertWeighin(u.id, k, Math.round(w * 10) / 10);
      }
    }
    const us = await S.listUsers();
    await S.addShout(us[0].id, us[1].id, "Big week. Keep it rolling.");
    await S.addShout(us[2].id, null, "Meal prep Sunday paying off. Who's in for a Saturday hike?");
  }

  // ---------- boot ----------
  window.addEventListener("unhandledrejection", (e) => toast((e.reason && e.reason.message) || "Something went wrong", "err"));
  (async () => {
    S.exitAdmin && S.exitAdmin();
    await refresh();
    const id = localStorage.getItem(SESSION);
    if (id) state.me = userById(id) || null;
    render();
  })().catch((err) => { toast(err.message, "err"); render(); });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
