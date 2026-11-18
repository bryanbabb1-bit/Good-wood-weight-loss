(function () {
  const C = window.GW_CONFIG;
  const S = window.GW_STORE;
  const $app = document.getElementById("app");
  const $tabs = document.getElementById("tabs");
  const $who = document.getElementById("whoami");
  const DAY = 86400000;
  const START = new Date(C.startDate + "T00:00:00");
  const SESSION = "gwwlc-session";

  let state = { me: null, tab: "me", users: [], weighins: [], shouts: [], admin: false, boardWeek: null, boardTrack: "lose" };

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const signed = (n, unit = "") => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt1(Math.abs(n)) + unit;
  const weekDate = (w) => new Date(START.getTime() + w * 7 * DAY);
  const shortDate = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const weekLabel = (w) => (w === 0 ? "Start" : "Week " + w);

  // Testing: add ?today=2026-12-21 to the URL to pretend it's another date.
  const TODAY_OVERRIDE = new URLSearchParams(location.search).get("today");
  const today = () => (TODAY_OVERRIDE ? new Date(TODAY_OVERRIDE + "T12:00:00") : new Date());

  function currentWeek(now = today()) {
    const days = Math.floor((now - START) / DAY);
    if (days < 0) return 0;
    return Math.min(C.weeks, Math.floor(days / 7));
  }

  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add("hidden"), 2400);
  }

  async function refresh() {
    [state.users, state.weighins, state.shouts] = await Promise.all([S.listUsers(), S.listWeighins(), S.listShouts()]);
    if (state.me) state.me = state.users.find((u) => u.id === state.me.id) || null;
  }

  const userById = (id) => state.users.find((u) => u.id === id);
  const activeUsers = () => state.users.filter((u) => u.active !== false);

  // ---------- stats ----------
  function entriesFor(userId) {
    return state.weighins.filter((w) => w.userId === userId).sort((a, b) => a.week - b.week);
  }

  // Weight at or before week w (carry forward), or null.
  function weightAt(entries, w) {
    let v = null;
    for (const e of entries) { if (e.week <= w) v = e.weight; else break; }
    return v;
  }

  // Positive score = progress in the person's goal direction.
  const goalSign = (u) => (u.track === "gain" ? 1 : -1);

  function personStats(u) {
    const es = entriesFor(u.id);
    const start = es.find((e) => e.week === 0) || es[0];
    if (!start) return { user: u, entries: es, hasStart: false };
    const latest = es[es.length - 1];
    const change = latest.weight - start.weight;
    const pct = (change / start.weight) * 100;
    const loggedWeeks = new Set(es.map((e) => e.week));
    let streak = 0;
    for (let w = currentWeek(); w >= 0; w--) { if (loggedWeeks.has(w)) streak++; else if (w !== currentWeek()) break; }
    return {
      user: u, entries: es, hasStart: true, start: start.weight, latest: latest.weight, latestWeek: latest.week,
      change, pct, score: pct * goalSign(u), lbsScore: change * goalSign(u), streak,
    };
  }

  // Change during week w: weight at w vs. last weight before w.
  function weekStats(u, w) {
    const es = entriesFor(u.id);
    const cur = es.find((e) => e.week === w);
    const prev = weightAt(es, w - 1);
    const start = (es.find((e) => e.week === 0) || es[0] || {}).weight;
    if (!cur || prev == null || !start) return null;
    const change = cur.weight - prev;
    return { user: u, change, pct: (change / prev) * 100, score: ((change / prev) * 100) * goalSign(u), lbsScore: change * goalSign(u), totalPct: ((cur.weight - start) / start) * 100 };
  }

  function weeksWithData() {
    return [...new Set(state.weighins.map((w) => w.week))].filter((w) => w > 0).sort((a, b) => a - b);
  }

  function groupStats(track) {
    const people = activeUsers().filter((u) => u.track === track).map(personStats).filter((p) => p.hasStart);
    const totalLbs = people.reduce((s, p) => s + p.lbsScore, 0);
    const avgPct = people.length ? people.reduce((s, p) => s + p.score, 0) / people.length : 0;
    const cw = currentWeek();
    const loggedThisWeek = people.filter((p) => p.entries.some((e) => e.week === cw)).length;
    // Average cumulative % by week, for the group chart.
    const series = [];
    for (let w = 0; w <= Math.max(cw, 0); w++) {
      const vals = people.map((p) => { const v = weightAt(p.entries, w); return v == null ? null : ((v - p.start) / p.start) * 100 * goalSign(p.user); }).filter((v) => v != null);
      series.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
    }
    return { people, totalLbs, avgPct, loggedThisWeek, series, count: activeUsers().filter((u) => u.track === track).length };
  }

  function autoShouts(w) {
    if (w < 1) return [];
    const out = [];
    for (const track of ["lose", "gain"]) {
      const ranked = activeUsers().filter((u) => u.track === track).map((u) => weekStats(u, w)).filter(Boolean).sort((a, b) => b.score - a.score);
      if (ranked[0] && ranked[0].score > 0) {
        out.push({ icon: track === "lose" ? "🔥" : "💪", text: `${track === "lose" ? "Biggest loser" : "Top gainer"} of ${weekLabel(w)}: <b>${esc(ranked[0].user.name)}</b> (${signed(ranked[0].pct, "%")}, ${signed(ranked[0].change, " lbs")})` });
      }
    }
    // Milestones crossed this week
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
      if (hit) out.push({ icon: "🎯", text: `<b>${esc(u.name)}</b> hit ${hit}% ${u.track === "gain" ? "gained" : "down"}!` });
    }
    // Perfect attendance
    const streakers = activeUsers().filter((u) => { const wk = new Set(entriesFor(u.id).map((e) => e.week)); for (let i = 0; i <= w; i++) if (!wk.has(i)) return false; return true; });
    if (streakers.length && w >= 2) out.push({ icon: "📅", text: `Perfect attendance through ${weekLabel(w)}: ${streakers.map((u) => `<b>${esc(u.name)}</b>`).join(", ")}` });
    return out;
  }

  // ---------- chart ----------
  function lineChart(points, { height = 140, unit = "", goodUp = false } = {}) {
    const pts = points.map((v, i) => ({ i, v })).filter((p) => p.v != null);
    if (pts.length < 2) return `<div class="muted small center pad">Chart appears after your second weigh-in.</div>`;
    const W = 320, H = height, P = 26;
    const vs = pts.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
    const maxI = Math.max(points.length - 1, 1);
    const x = (i) => P + (i / maxI) * (W - P - 8);
    const y = (v) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 8 - 20);
    const path = pts.map((p, k) => (k ? "L" : "M") + x(p.i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">
      <line x1="${P}" x2="${W - 8}" y1="${y(lo)}" y2="${y(lo)}" class="axis"/>
      <text x="2" y="${y(hi) + 4}" class="tick">${fmt1(hi)}</text>
      <text x="2" y="${y(lo) + 4}" class="tick">${fmt1(lo)}</text>
      <path d="${path}" class="line"/>
      ${pts.map((p) => `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="3" class="dot"/>`).join("")}
      <text x="${Math.min(x(last.i), W - 40)}" y="${Math.max(y(last.v) - 8, 10)}" class="lbl">${fmt1(last.v)}${unit}</text>
      <text x="${P}" y="${H - 4}" class="tick">Start</text>
      <text x="${W - 8}" y="${H - 4}" class="tick" text-anchor="end">Wk ${points.length - 1}</text>
    </svg>`;
  }

  // ---------- views ----------
  function render() {
    $tabs.classList.toggle("hidden", !state.me);
    $who.innerHTML = state.me ? `${esc(state.me.name)} · <a href="#" id="logout">log out</a>` : "";
    const lo = document.getElementById("logout");
    if (lo) lo.onclick = (e) => { e.preventDefault(); localStorage.removeItem(SESSION); state.me = null; render(); };
    $tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));

    if (state.admin) return renderAdmin();
    if (!state.me) return renderLogin();
    ({ me: renderMe, board: renderBoard, group: renderGroup, shout: renderShouts }[state.tab])();
    window.scrollTo(0, 0);
  }

  function renderLogin() {
    const before = today() < START;
    $app.innerHTML = `
      <section class="card hero">
        <h1>${esc(C.name)}</h1>
        <p class="muted">${before ? `Kicks off ${shortDate(START)}. Enter your starting weight that day.` : `${weekLabel(currentWeek())} of ${C.weeks}`}</p>
      </section>
      <form id="loginForm" class="card">
        <label>Name<input name="name" autocomplete="username" required></label>
        <label>PIN<input name="pin" type="password" inputmode="numeric" autocomplete="current-password" required></label>
        <button class="primary">Log in</button>
        <p class="muted small">Your PIN comes from the commissioner.</p>
      </form>
      <p class="center"><a href="#" id="adminLink" class="muted small">Commissioner</a></p>
      ${installHint()}`;
    document.getElementById("loginForm").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const u = await S.login(f.get("name"), f.get("pin"));
        localStorage.setItem(SESSION, u.id); state.me = u; state.tab = "me"; await refresh(); render();
      } catch (err) { toast(err.message); }
    };
    document.getElementById("adminLink").onclick = (e) => { e.preventDefault(); adminGate(); };
  }

  function installHint() {
    if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "";
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return `<section class="card install small">
      <b>Add to your home screen</b><br>
      ${ios ? "In Safari, tap Share ⬆️ then <b>Add to Home Screen</b>." : "In Chrome, tap ⋮ then <b>Add to Home screen</b> (or <b>Install app</b>)."}
    </section>`;
  }

  function renderMe() {
    const u = state.me;
    const p = personStats(u);
    const cw = currentWeek();
    const thisEntry = p.entries.find((e) => e.week === cw);
    const goalWord = u.track === "gain" ? "gained" : "lost";
    const points = [];
    for (let w = 0; w <= Math.max(cw, p.latestWeek || 0); w++) { const e = p.entries.find((x) => x.week === w); points.push(e ? e.weight : null); }
    const myRank = (() => {
      const ranked = activeUsers().filter((x) => x.track === u.track).map(personStats).filter((x) => x.hasStart).sort((a, b) => b.score - a.score);
      const i = ranked.findIndex((x) => x.user.id === u.id);
      return i >= 0 ? `${i + 1} of ${ranked.length}` : "–";
    })();

    $app.innerHTML = `
      <section class="card">
        <div class="row between"><h2>${weekLabel(cw)} weigh-in</h2><span class="pill ${u.track}">${u.track === "gain" ? "Gain track 💪" : "Lose track 🔥"}</span></div>
        <p class="muted small">${cw === 0 ? `Starting weight, ${shortDate(START)}` : `Week of ${shortDate(weekDate(cw))}`}${thisEntry ? ` · logged ${fmt1(thisEntry.weight)} lbs` : ""}</p>
        <form id="wForm" class="row">
          <input name="weight" type="number" step="0.1" min="50" max="700" inputmode="decimal" placeholder="lbs" value="${thisEntry ? thisEntry.weight : ""}" required>
          <button class="primary">${thisEntry ? "Update" : "Save"}</button>
        </form>
      </section>
      ${p.hasStart ? `
      <section class="stats3">
        <div class="stat"><div class="big ${p.score >= 0 ? "good" : "bad"}">${signed(p.pct, "%")}</div><div class="muted small">total</div></div>
        <div class="stat"><div class="big">${fmt1(Math.abs(p.change))}</div><div class="muted small">lbs ${p.lbsScore >= 0 ? goalWord : u.track === "gain" ? "lost" : "gained"}</div></div>
        <div class="stat"><div class="big">${myRank}</div><div class="muted small">rank</div></div>
      </section>
      <section class="card">
        <h3>Your weight</h3>
        ${lineChart(points, { unit: "" })}
        <div class="row between small muted"><span>Start ${fmt1(p.start)}</span><span>Now ${fmt1(p.latest)}</span><span>🔁 ${p.streak} wk streak</span></div>
      </section>
      <section class="card">
        <h3>History</h3>
        <table class="tbl">
          <tr><th>Week</th><th>Weight</th><th>Change</th></tr>
          ${p.entries.slice().reverse().map((e) => { const prev = weightAt(p.entries, e.week - 1); return `<tr><td>${weekLabel(e.week)}</td><td>${fmt1(e.weight)}</td><td>${prev == null ? "–" : signed(e.weight - prev)}</td></tr>`; }).join("")}
        </table>
        <p class="muted small">Only you and the commissioner see your actual weight. Everyone else sees % and lbs changed.</p>
      </section>` : `<section class="card muted">Enter your starting weight to get on the board.</section>`}
      <section class="card">
        <h3>PIN</h3>
        <form id="pinForm" class="row"><input name="pin" type="password" inputmode="numeric" placeholder="New PIN" minlength="4" required><button>Change</button></form>
      </section>`;

    document.getElementById("wForm").onsubmit = async (e) => {
      e.preventDefault();
      const v = parseFloat(new FormData(e.target).get("weight"));
      if (!(v > 50 && v < 700)) return toast("Enter a weight in lbs");
      const prev = p.entries.filter((x) => x.week < cw).pop();
      if (prev && Math.abs(v - prev.weight) / prev.weight > 0.08 && !confirm(`That's a ${fmt1(Math.abs(v - prev.weight))} lb change since last time. Save it?`)) return;
      await S.upsertWeighin(u.id, cw, v); await refresh(); toast("Weigh-in saved ✅"); render();
    };
    document.getElementById("pinForm").onsubmit = async (e) => {
      e.preventDefault();
      await S.updateUser(u.id, { pin: new FormData(e.target).get("pin") }); toast("PIN changed"); e.target.reset();
    };
  }

  function renderBoard() {
    const weeks = weeksWithData();
    if (state.boardWeek == null) state.boardWeek = weeks.length ? weeks[weeks.length - 1] : "all";
    const wk = state.boardWeek;
    const track = state.boardTrack;
    let rows;
    if (wk === "all") {
      rows = activeUsers().filter((u) => u.track === track).map(personStats).filter((p) => p.hasStart).map((p) => ({ user: p.user, pct: p.pct, change: p.change, score: p.score }));
    } else {
      rows = activeUsers().filter((u) => u.track === track).map((u) => weekStats(u, wk)).filter(Boolean);
    }
    rows.sort((a, b) => b.score - a.score);
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || i + 1;
    $app.innerHTML = `
      <section class="card">
        <div class="seg">${["lose", "gain"].map((t) => `<button data-track="${t}" class="${t === track ? "on" : ""}">${t === "lose" ? "Lose 🔥" : "Gain 💪"}</button>`).join("")}</div>
        <div class="chips">
          <button data-week="all" class="${wk === "all" ? "on" : ""}">Overall</button>
          ${weeks.slice().reverse().map((w) => `<button data-week="${w}" class="${wk === w ? "on" : ""}">Wk ${w}</button>`).join("")}
        </div>
      </section>
      <section class="card">
        <h3>${wk === "all" ? "Overall" : weekLabel(wk)} · ${track === "lose" ? "Lose track" : "Gain track"}</h3>
        ${rows.length ? `<ol class="board">${rows.map((r, i) => `
          <li class="${r.user.id === state.me.id ? "me" : ""}">
            <span class="rank">${medal(i)}</span>
            <span class="name">${esc(r.user.name)}</span>
            <span class="val ${r.score >= 0 ? "good" : "bad"}">${signed(r.pct, "%")}</span>
            <span class="sub muted">${signed(r.change, " lbs")}</span>
          </li>`).join("")}</ol>` : `<p class="muted">No weigh-ins yet.</p>`}
        <p class="muted small">Ranked by percent change${track === "gain" ? " gained" : " lost"}, so it's fair across body sizes.</p>
      </section>`;
    $app.querySelectorAll("[data-track]").forEach((b) => (b.onclick = () => { state.boardTrack = b.dataset.track; render(); }));
    $app.querySelectorAll("[data-week]").forEach((b) => (b.onclick = () => { state.boardWeek = b.dataset.week === "all" ? "all" : +b.dataset.week; render(); }));
  }

  function renderGroup() {
    const L = groupStats("lose"), G = groupStats("gain");
    const cw = currentWeek();
    const block = (g, track) => `
      <section class="card">
        <h3>${track === "lose" ? "Lose track 🔥" : "Gain track 💪"} <span class="muted small">${g.count} people</span></h3>
        <div class="stats3">
          <div class="stat"><div class="big good">${fmt1(Math.max(g.totalLbs, 0))}</div><div class="muted small">lbs ${track === "lose" ? "lost" : "gained"}</div></div>
          <div class="stat"><div class="big">${fmt1(g.avgPct)}%</div><div class="muted small">avg ${track === "lose" ? "lost" : "gained"}</div></div>
          <div class="stat"><div class="big">${g.loggedThisWeek}/${g.count}</div><div class="muted small">logged ${weekLabel(cw).toLowerCase()}</div></div>
        </div>
        <p class="muted small">Average % ${track === "lose" ? "lost" : "gained"} by week</p>
        ${lineChart(g.series, { unit: "%" })}
      </section>`;
    const missing = activeUsers().filter((u) => !entriesFor(u.id).some((e) => e.week === cw));
    $app.innerHTML = `
      <section class="card hero">
        <h2>${weekLabel(cw)} of ${C.weeks}</h2>
        <p class="muted">${today() < START ? `Starts ${shortDate(START)}` : `Ends ${shortDate(weekDate(C.weeks))}`}</p>
      </section>
      ${block(L, "lose")}
      ${G.count ? block(G, "gain") : ""}
      ${missing.length ? `<section class="card"><h3>Still need to weigh in</h3><p>${missing.map((u) => esc(u.name)).join(", ")}</p></section>` : ""}`;
  }

  function renderShouts() {
    const weeks = weeksWithData();
    const latest = weeks[weeks.length - 1];
    const auto = latest ? autoShouts(latest) : [];
    const others = activeUsers().filter((u) => u.id !== state.me.id);
    const feed = state.shouts.slice().sort((a, b) => b.at.localeCompare(a.at));
    const EMO = ["👏", "🔥", "💪", "😂"];
    $app.innerHTML = `
      ${auto.length ? `<section class="card"><h3>${weekLabel(latest)} highlights</h3><ul class="auto">${auto.map((a) => `<li><span>${a.icon}</span><span>${a.text}</span></li>`).join("")}</ul></section>` : ""}
      <form id="shForm" class="card">
        <h3>Give a shout-out</h3>
        <select name="to"><option value="">Everyone</option>${others.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select>
        <textarea name="text" maxlength="280" rows="2" placeholder="Crushed it this week…" required></textarea>
        <button class="primary">Post</button>
      </form>
      <section class="card">
        ${feed.length ? feed.map((s) => { const f = userById(s.fromId), t = userById(s.toId); return `
          <div class="shout">
            <div class="small muted">${esc(f ? f.name : "?")}${t ? ` → <b>${esc(t.name)}</b>` : ""} · ${new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
            <div>${esc(s.text)}</div>
            <div class="reacts">${EMO.map((e) => { const l = (s.reactions || {})[e] || []; return `<button data-sh="${s.id}" data-e="${e}" class="${l.includes(state.me.id) ? "on" : ""}">${e}${l.length ? " " + l.length : ""}</button>`; }).join("")}</div>
          </div>`; }).join("") : `<p class="muted">No shout-outs yet. Be the first.</p>`}
      </section>`;
    document.getElementById("shForm").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await S.addShout(state.me.id, f.get("to") || null, f.get("text").trim()); await refresh(); render();
    };
    $app.querySelectorAll("[data-sh]").forEach((b) => (b.onclick = async () => { await S.react(b.dataset.sh, state.me.id, b.dataset.e); await refresh(); render(); }));
  }

  // ---------- admin ----------
  async function adminGate() {
    const has = await S.hasAdmin();
    $app.innerHTML = `
      <form id="adForm" class="card">
        <h2>Commissioner</h2>
        <p class="muted small">${has ? "Enter the commissioner passcode." : "First time: set a commissioner passcode."}</p>
        <input name="pass" type="password" required minlength="4" placeholder="Passcode">
        <button class="primary">${has ? "Enter" : "Set passcode"}</button>
        <button type="button" id="adBack">Back</button>
      </form>`;
    document.getElementById("adBack").onclick = () => render();
    document.getElementById("adForm").onsubmit = async (e) => {
      e.preventDefault();
      const pass = new FormData(e.target).get("pass");
      if (!has) await S.setAdmin(pass);
      else if (!(await S.checkAdmin(pass))) return toast("Wrong passcode");
      state.admin = true; await refresh(); render();
    };
  }

  function renderAdmin() {
    const cw = currentWeek();
    const weekCols = []; for (let w = 0; w <= Math.max(cw, ...state.weighins.map((x) => x.week), 0); w++) weekCols.push(w);
    $app.innerHTML = `
      <section class="card row between"><h2>Commissioner</h2><button id="adExit">Exit</button></section>
      <form id="addUser" class="card">
        <h3>Add a participant</h3>
        <input name="name" placeholder="Name (what they log in with)" required>
        <div class="row">
          <select name="track"><option value="lose">Lose track</option><option value="gain">Gain track</option></select>
          <input name="pin" placeholder="PIN" inputmode="numeric" minlength="4" required>
        </div>
        <button class="primary">Add</button>
      </form>
      <section class="card">
        <h3>Participants (${state.users.length})</h3>
        <table class="tbl">
          <tr><th>Name</th><th>Track</th><th></th></tr>
          ${state.users.map((u) => `<tr class="${u.active === false ? "muted" : ""}">
            <td>${esc(u.name)}</td>
            <td><select data-track-u="${u.id}"><option value="lose" ${u.track === "lose" ? "selected" : ""}>Lose</option><option value="gain" ${u.track === "gain" ? "selected" : ""}>Gain</option></select></td>
            <td class="nowrap"><button data-pin="${u.id}" class="sm">PIN</button> <button data-act="${u.id}" class="sm">${u.active === false ? "Restore" : "Remove"}</button></td>
          </tr>`).join("")}
        </table>
      </section>
      <section class="card scroll-x">
        <h3>All weigh-ins (lbs)</h3>
        <p class="muted small">Tap a cell to add or fix a weight. Clear it to delete.</p>
        <table class="tbl grid">
          <tr><th>Name</th>${weekCols.map((w) => `<th>${w === 0 ? "Start" : "W" + w}</th>`).join("")}</tr>
          ${state.users.map((u) => `<tr><td>${esc(u.name)}</td>${weekCols.map((w) => { const e = state.weighins.find((x) => x.userId === u.id && x.week === w); return `<td><button class="cell" data-u="${u.id}" data-w="${w}">${e ? fmt1(e.weight) : "·"}</button></td>`; }).join("")}</tr>`).join("")}
        </table>
      </section>
      <section class="card">
        <h3>Shout-outs</h3>
        ${state.shouts.slice().reverse().map((s) => `<div class="row between small"><span>${esc((userById(s.fromId) || {}).name)}: ${esc(s.text)}</span><button data-delsh="${s.id}" class="sm">Delete</button></div>`).join("") || `<p class="muted small">None yet.</p>`}
      </section>
      <section class="card">
        <h3>Backup</h3>
        <div class="row"><button id="exp">Export JSON</button><label class="btn">Import<input id="imp" type="file" accept="application/json" hidden></label></div>
        ${C.backend === "local" ? `<button id="demo" class="sm">Load demo data</button> <button id="wipe" class="sm danger">Wipe all data</button>` : ""}
      </section>`;

    document.getElementById("adExit").onclick = () => { state.admin = false; render(); };
    document.getElementById("addUser").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try { await S.addUser({ name: f.get("name").trim(), track: f.get("track"), pin: f.get("pin") }); await refresh(); toast("Added"); render(); }
      catch (err) { toast(err.message); }
    };
    $app.querySelectorAll("[data-track-u]").forEach((s) => (s.onchange = async () => { await S.updateUser(s.dataset.trackU, { track: s.value }); await refresh(); toast("Track updated"); }));
    $app.querySelectorAll("[data-pin]").forEach((b) => (b.onclick = async () => { const p = prompt("New PIN for " + userById(b.dataset.pin).name); if (p) { await S.updateUser(b.dataset.pin, { pin: p }); toast("PIN reset"); } }));
    $app.querySelectorAll("[data-act]").forEach((b) => (b.onclick = async () => { const u = userById(b.dataset.act); await S.updateUser(u.id, { active: u.active === false }); await refresh(); render(); }));
    $app.querySelectorAll(".cell").forEach((b) => (b.onclick = async () => {
      const u = b.dataset.u, w = +b.dataset.w;
      const e = state.weighins.find((x) => x.userId === u && x.week === w);
      const v = prompt(`${userById(u).name}, ${weekLabel(w)} (lbs)`, e ? e.weight : "");
      if (v === null) return;
      if (v.trim() === "") { if (e) await S.deleteWeighin(e.id); }
      else if (parseFloat(v) > 50) await S.upsertWeighin(u, w, parseFloat(v));
      await refresh(); render();
    }));
    $app.querySelectorAll("[data-delsh]").forEach((b) => (b.onclick = async () => { await S.deleteShout(b.dataset.delsh); await refresh(); render(); }));
    document.getElementById("exp").onclick = async () => {
      const blob = new Blob([JSON.stringify(await S.exportAll(), null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "gwwlc-backup.json"; a.click();
    };
    document.getElementById("imp").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      await S.importAll(JSON.parse(await file.text())); await refresh(); toast("Imported"); render();
    };
    const demo = document.getElementById("demo");
    if (demo) demo.onclick = async () => { await loadDemo(); await refresh(); toast("Demo data loaded (PIN 1234)"); render(); };
    const wipe = document.getElementById("wipe");
    if (wipe) wipe.onclick = async () => { if (confirm("Delete everything?")) { await S.reset(); state.admin = false; state.me = null; localStorage.removeItem(SESSION); await refresh(); render(); } };
  }

  async function loadDemo() {
    const people = [["Bryan", "lose", 228], ["Mike", "lose", 245], ["Tony", "lose", 212], ["Dave", "lose", 260], ["Chris", "lose", 198], ["Jake", "gain", 168], ["Luis", "gain", 155]];
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
    await S.addShout(us[0].id, us[1].id, "Big week, keep it rolling 💪");
  }

  // ---------- boot ----------
  $tabs.querySelectorAll("button").forEach((b) => (b.onclick = () => { state.tab = b.dataset.tab; render(); }));
  (async () => {
    await refresh();
    const id = localStorage.getItem(SESSION);
    if (id) state.me = userById(id) || null;
    render();
  })();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
