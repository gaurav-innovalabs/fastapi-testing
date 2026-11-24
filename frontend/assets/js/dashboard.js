/* pingTester — dashboard (monitors, incidents, alert channels, settings). */
(function () {
  "use strict";
  const PT = window.PT;
  const S = PT.store;
  const esc = PT.escape;
  const ROW_BEATS = 45;

  let filter = "all";
  let query = "";
  let openId = null;   // monitor shown in the drawer
  let editId = null;   // monitor being edited in the modal

  const $ = (sel) => document.querySelector(sel);
  const ICON = {
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  };
  const TYPE_LABEL = { http: "HTTP", keyword: "Keyword", ping: "Ping", port: "Port" };
  const statusLabel = (s) => ({ up: "Up", down: "Down", degraded: "Degraded", paused: "Paused" }[s] || s);

  /* ---------- User ---------- */
  function renderUser() {
    const u = PT.session.get();
    const name = u ? u.name : "Guest";
    $("#userName").textContent = name;
    $("#userPlan").textContent = u ? `${u.plan.charAt(0).toUpperCase() + u.plan.slice(1)} plan` : "Demo mode";
    $("#userAvatar").textContent = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    $("#pfName").value = u ? u.name : "";
    $("#pfEmail").value = u ? u.email : "";
    if (u && u.tz) $("#pfTz").value = u.tz;
  }

  /* ---------- Routing between views ---------- */
  function route() {
    const view = (location.hash || "#monitors").slice(1);
    const target = document.getElementById("view-" + view) ? view : "monitors";
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + target));
    document.querySelectorAll(".side-nav [data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === target));
    if (target === "incidents") renderIncidents();
  }

  /* ---------- Monitors list ---------- */
  function matches(m) {
    if (query && !(m.name + " " + m.url).toLowerCase().includes(query)) return false;
    if (filter === "all") return true;
    if (filter === "up") return m.status === "up" || m.status === "degraded";
    return m.status === filter;
  }

  function rowHtml(m) {
    return `<div class="mon-row" data-id="${m.id}" tabindex="0" role="button" aria-label="Open ${esc(m.name)}">
        <span class="status-dot"></span>
        <div><div class="mon-name">${esc(m.name)}</div><div class="mon-url">${TYPE_LABEL[m.type] || ""} · ${esc(m.url)}</div></div>
        <div class="beats"></div>
        <div class="mon-ms"></div>
        <div class="mon-up"></div>
        <span class="icon-btn" aria-hidden="true">${ICON.more}</span>
      </div>`;
  }

  function paintRow(row, m, animate) {
    row.querySelector(".status-dot").className = "status-dot " + (m.status === "up" ? "" : m.status);
    const beats = row.querySelector(".beats");
    beats.innerHTML = PT.beatsHtml(m.beats, ROW_BEATS);
    if (animate && !m.paused && beats.lastElementChild) beats.lastElementChild.classList.add("new");
    row.querySelector(".mon-ms").textContent = m.paused ? "paused" : PT.fmt.ms(S.lastMs(m));
    const up = S.uptime(m);
    const upEl = row.querySelector(".mon-up");
    upEl.textContent = PT.fmt.uptime(up);
    upEl.style.color = up == null ? "var(--dim)" : up < 95 ? "var(--down)" : up < 99 ? "var(--warn)" : "";
  }

  function renderList() {
    const list = $("#monList");
    const items = S.all().filter(matches);
    if (!S.all().length) {
      list.innerHTML = `<div class="empty"><p style="font-size:1.1rem;color:var(--text);margin-bottom:.4rem">No monitors yet</p><p>Create your first monitor to start tracking uptime.</p><button class="btn btn-primary" style="margin-top:1.2rem" onclick="document.getElementById('newMonitorBtn').click()">+ New monitor</button></div>`;
    } else if (!items.length) {
      list.innerHTML = `<div class="empty">No monitors match this filter.</div>`;
    } else {
      list.innerHTML = items.map(rowHtml).join("");
      list.querySelectorAll(".mon-row").forEach((row, i) => {
        row.style.animationDelay = i * 40 + "ms";
        paintRow(row, S.get(row.dataset.id), false);
      });
    }
    renderKpis();
  }

  function updateRows() {
    const list = $("#monList");
    const visible = S.all().filter(matches).map((m) => m.id);
    const shown = [...list.querySelectorAll(".mon-row")].map((r) => r.dataset.id);
    // Status changes can move a monitor in/out of the active filter.
    if (visible.join() !== shown.join()) return renderList();
    list.querySelectorAll(".mon-row").forEach((row) => paintRow(row, S.get(row.dataset.id), true));
    renderKpis();
  }

  function renderKpis() {
    const all = S.all();
    const count = (fn) => all.filter(fn).length;
    $("#kpiUp").textContent = count((m) => m.status === "up" || m.status === "degraded");
    $("#kpiDown").textContent = count((m) => m.status === "down");
    $("#kpiPaused").textContent = count((m) => m.paused);
    const ups = all.map(S.uptime).filter((v) => v != null);
    $("#kpiUptime").textContent = ups.length ? PT.fmt.uptime(ups.reduce((a, b) => a + b, 0) / ups.length) : "—";
    $("#countAll").textContent = all.length;
    $("#countInc").textContent = all.reduce((n, m) => n + m.incidents.filter((i) => !i.end).length, 0);
    $("#lastUpdated").textContent = "Live · updated " + PT.fmt.time(Date.now());
  }

  /* ---------- Incidents ---------- */
  function renderIncidents() {
    const rows = [];
    S.all().forEach((m) => m.incidents.forEach((i) => rows.push({ m, i })));
    rows.sort((a, b) => b.i.start - a.i.start);
    $("#incidentList").innerHTML = rows.length
      ? rows.map(({ m, i }) => `
        <div class="incident">
          <span class="status-dot ${i.end ? "" : "down"}"></span>
          <div style="flex:1">
            <strong>${esc(m.name)}</strong> ${i.end ? '<span class="chip up">Resolved</span>' : '<span class="chip down">Ongoing</span>'}
            <small>${esc(i.cause)} · started ${PT.fmt.ago(i.start)}${i.end ? " · lasted " + PT.fmt.duration(i.end - i.start) : ""}</small>
          </div>
        </div>`).join("")
      : `<div class="empty" style="border:0">🎉 No incidents. Everything has been up.</div>`;
  }

  /* ---------- Detail drawer ---------- */
  function chartSvg(m) {
    const pts = m.beats.slice(-60);
    const W = 500, H = 180, P = 28;
    const vals = pts.map((b) => b.ms).filter((v) => v != null);
    const max = Math.max(50, ...vals) * 1.15;
    const step = (W - P) / Math.max(1, pts.length - 1);
    let d = "", pen = false, downs = "";
    pts.forEach((b, k) => {
      const x = P + k * step;
      if (b.ms == null) {
        pen = false;
        if (b.s === "down") downs += `<rect x="${x - step / 2}" y="0" width="${step}" height="${H - 18}" fill="rgba(239,68,68,.15)"/>`;
        return;
      }
      const y = (H - 18) - (b.ms / max) * (H - 28);
      d += (pen ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
      pen = true;
    });
    const grid = [0.25, 0.5, 0.75, 1].map((f) => {
      const y = (H - 18) - f * (H - 28);
      return `<line class="grid-line" x1="${P}" x2="${W}" y1="${y}" y2="${y}"/><text x="0" y="${y + 3}">${Math.round(max * f)}</text>`;
    }).join("");
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${downs}<path class="line" d="${d}"/>
      <text x="${P}" y="${H - 2}">${pts[0] ? PT.fmt.time(pts[0].t) : ""}</text><text x="${W - 50}" y="${H - 2}">now</text></svg>`;
  }

  function renderDrawer() {
    const m = openId && S.get(openId);
    const dr = $("#drawer");
    if (!m) return closeDrawer();
    const inc = m.incidents.slice(0, 5);
    const log = m.beats.slice(-15).reverse();
    dr.innerHTML = `
      <div class="drawer-head">
        <div>
          <h2><span class="status-dot ${m.status === "up" ? "" : m.status}"></span>${esc(m.name)}</h2>
          <div class="mon-url" style="margin-top:.3rem">${TYPE_LABEL[m.type]} · ${esc(m.url)} · every ${m.interval}s</div>
        </div>
        <button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>
      </div>
      <div style="display:flex;gap:.5rem;margin-bottom:1.2rem;flex-wrap:wrap">
        <span class="chip ${m.status}">${statusLabel(m.status)}</span>
        <span style="flex:1"></span>
        <button class="btn btn-ghost btn-sm" data-act="pause">${m.paused ? "▶ Resume" : "⏸ Pause"}</button>
        <button class="btn btn-ghost btn-sm" data-act="edit">Edit</button>
        <button class="btn btn-danger btn-sm" data-act="delete">Delete</button>
      </div>
      <div class="mini-kpis">
        <div><span>Uptime</span><strong>${PT.fmt.uptime(S.uptime(m))}</strong></div>
        <div><span>Avg response</span><strong>${PT.fmt.ms(S.avgMs(m))}</strong></div>
        <div><span>Last check</span><strong>${PT.fmt.ms(S.lastMs(m))}</strong></div>
      </div>
      <div class="panel" style="margin-bottom:1rem"><h3>Response time</h3>${chartSvg(m)}</div>
      <div class="panel" style="margin-bottom:1rem"><h3>Recent incidents</h3>
        ${inc.length ? inc.map((i) => `<div class="incident"><span class="status-dot ${i.end ? "" : "down"}"></span><div>${esc(i.cause)}<small>${PT.fmt.ago(i.start)}${i.end ? " · " + PT.fmt.duration(i.end - i.start) : " · ongoing"}</small></div></div>`).join("") : '<p class="muted" style="font-size:.88rem">No incidents recorded.</p>'}
      </div>
      <div class="panel"><h3>Check log</h3><div class="log">
        ${log.map((b) => `<div><span>${PT.fmt.time(b.t)}</span><span style="color:${b.s === "down" ? "var(--down)" : b.s === "degraded" ? "var(--warn)" : b.s === "paused" ? "var(--dim)" : "var(--up)"}">${b.s.toUpperCase()}</span><span>${b.ms != null ? b.ms + " ms" : b.s === "down" ? "timeout" : "—"} · ${esc(m.regions[0] || "us-east")}</span></div>`).join("")}
      </div></div>`;
  }

  function openDrawer(id) {
    openId = id;
    renderDrawer();
    $("#drawer").classList.add("show");
    $("#overlay").classList.add("show");
  }
  function closeDrawer() {
    openId = null;
    $("#drawer").classList.remove("show");
    if (!$("#monitorModal").classList.contains("show")) $("#overlay").classList.remove("show");
  }

  /* ---------- Modal ---------- */
  function syncTypeFields() {
    const t = $("#mType").value;
    $("#mKeywordField").style.display = t === "keyword" ? "" : "none";
    const label = { http: "URL", keyword: "URL", ping: "Hostname or IP", port: "Host:port" }[t];
    const ph = { http: "https://example.com", keyword: "https://example.com", ping: "203.0.113.10", port: "db.example.com:5432" }[t];
    $("#mUrlLabel").textContent = label;
    $("#mUrl").placeholder = ph;
  }

  function openModal(m) {
    editId = m ? m.id : null;
    $("#modalTitle").textContent = m ? "Edit monitor" : "New monitor";
    $("#modalSubmit").textContent = m ? "Save changes" : "Create monitor";
    $("#mType").value = m ? m.type : "http";
    $("#mName").value = m ? m.name : "";
    $("#mUrl").value = m ? m.url : "";
    $("#mKeyword").value = m && m.keyword ? m.keyword : "";
    $("#mInterval").value = String(m ? m.interval : 60);
    $("#mRegion").value = m ? m.regions[0] : "us-east";
    document.querySelectorAll("#monitorModal .input").forEach((i) => i.classList.remove("invalid"));
    document.querySelectorAll("#monitorModal .err-msg").forEach((e) => (e.textContent = ""));
    syncTypeFields();
    $("#overlay").classList.add("show");
    $("#monitorModal").classList.add("show");
    setTimeout(() => $("#mName").focus(), 50);
  }
  function closeModal() {
    $("#monitorModal").classList.remove("show");
    if (!openId) $("#overlay").classList.remove("show");
  }

  function validTarget(type, v) {
    if (type === "http" || type === "keyword") {
      try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch (_) { return false; }
    }
    if (type === "port") return /^[\w.-]+:\d{1,5}$/.test(v);
    return /^[\w.-]+$/.test(v);
  }

  function submitModal(e) {
    e.preventDefault();
    const type = $("#mType").value;
    const fields = { name: $("#mName"), url: $("#mUrl"), keyword: $("#mKeyword") };
    const fail = (el, msg) => {
      el.classList.add("invalid");
      el.closest(".field").querySelector(".err-msg").textContent = msg;
      return false;
    };
    Object.values(fields).forEach((el) => { el.classList.remove("invalid"); el.closest(".field").querySelector(".err-msg").textContent = ""; });
    let ok = true;
    const name = fields.name.value.trim();
    const url = fields.url.value.trim();
    if (!name) ok = fail(fields.name, "Give your monitor a name");
    if (!validTarget(type, url)) ok = fail(fields.url, type === "port" ? "Use host:port, e.g. db.example.com:5432" : type === "ping" ? "Enter a hostname or IP" : "Enter a full URL starting with http:// or https://");
    if (type === "keyword" && !fields.keyword.value.trim()) ok = fail(fields.keyword, "Enter the text that must appear");
    if (!ok) return;

    const data = {
      type, name, url,
      keyword: type === "keyword" ? fields.keyword.value.trim() : undefined,
      interval: parseInt($("#mInterval").value, 10),
      regions: [$("#mRegion").value],
    };
    if (editId) {
      S.update(editId, data);
      PT.toast(`Saved "${name}"`);
    } else {
      S.add(data);
      PT.toast(`Monitor "${name}" created — first check running`);
    }
    closeModal();
    renderList();
    if (openId) renderDrawer();
  }

  /* ---------- Alert channels ---------- */
  const CHANNELS = [
    ["Email", "Alerts to your inbox", true],
    ["Slack", "Post to a channel", false],
    ["Discord", "Post via webhook", false],
    ["Microsoft Teams", "Post to a channel", false],
    ["SMS", "Text your on-call phone", false],
    ["Telegram", "Message a bot or group", false],
    ["Webhook", "POST JSON to any URL", false],
    ["PagerDuty", "Trigger an incident", false],
  ];
  function renderChannels() {
    const saved = JSON.parse(localStorage.getItem("pt_channels") || "null") || {};
    $("#channelGrid").innerHTML = CHANNELS.map(([name, desc, def]) => {
      const on = name in saved ? saved[name] : def;
      return `<div class="card" style="padding:1.3rem">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0">${name}</h3>
          <button class="switch ${on ? "on" : ""}" role="switch" aria-checked="${on}" aria-label="Toggle ${name}" data-channel="${name}"></button>
        </div>
        <p style="margin-top:.4rem">${desc}</p></div>`;
    }).join("");
    $("#channelGrid").querySelectorAll("[data-channel]").forEach((sw) =>
      sw.addEventListener("click", () => {
        const on = sw.classList.toggle("on");
        sw.setAttribute("aria-checked", String(on));
        const cur = JSON.parse(localStorage.getItem("pt_channels") || "null") || {};
        cur[sw.dataset.channel] = on;
        localStorage.setItem("pt_channels", JSON.stringify(cur));
        PT.toast(`${sw.dataset.channel} alerts ${on ? "enabled" : "disabled"}`, on ? "" : "paused");
      })
    );
  }

  /* ---------- Wire up ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("[data-logo]").innerHTML = PT.logo;
    renderUser();
    renderList();
    renderChannels();
    route();
    window.addEventListener("hashchange", route);

    $("#search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); renderList(); });
    $("#filterTabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      filter = b.dataset.filter;
      $("#filterTabs").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      renderList();
    });
    $("#monList").addEventListener("click", (e) => {
      const row = e.target.closest(".mon-row");
      if (row) openDrawer(row.dataset.id);
    });
    $("#monList").addEventListener("keydown", (e) => {
      const row = e.target.closest(".mon-row");
      if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDrawer(row.dataset.id); }
    });

    $("#drawer").addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]");
      if (!act) return;
      const m = S.get(openId);
      if (act.dataset.act === "close") return closeDrawer();
      if (!m) return;
      if (act.dataset.act === "pause") {
        S.update(m.id, { paused: !m.paused });
        PT.toast(`${m.name} ${m.paused ? "paused" : "resumed"}`, m.paused ? "paused" : "");
        renderList(); renderDrawer();
      } else if (act.dataset.act === "edit") {
        openModal(m);
      } else if (act.dataset.act === "delete") {
        if (confirm(`Delete "${m.name}"? Its history will be lost.`)) {
          S.remove(m.id);
          PT.toast(`Deleted "${m.name}"`, "down");
          closeDrawer(); renderList();
        }
      }
    });

    $("#newMonitorBtn").addEventListener("click", () => openModal(null));
    $("#mType").addEventListener("change", syncTypeFields);
    $("#monitorModal").addEventListener("submit", submitModal);
    $("#monitorModal [data-close]").addEventListener("click", closeModal);
    $("#overlay").addEventListener("click", () => { closeModal(); closeDrawer(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if ($("#monitorModal").classList.contains("show")) closeModal(); else closeDrawer();
    });

    $("#profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const u = PT.session.get() || { plan: "free" };
      PT.session.set({ ...u, name: $("#pfName").value.trim() || "Guest", email: $("#pfEmail").value.trim(), tz: $("#pfTz").value });
      renderUser();
      PT.toast("Profile saved");
    });
    $("#resetDemo").addEventListener("click", () => { S.reset(); renderList(); PT.toast("Demo data reset"); });
    $("#logoutBtn").addEventListener("click", () => { PT.session.clear(); location.href = "login.html"; });

    S.subscribe((evt) => {
      if (evt.type === "tick") {
        updateRows();
        if (openId) renderDrawer();
        if (location.hash === "#incidents") renderIncidents();
      } else if (evt.type === "down") {
        PT.toast(`🔴 ${evt.monitor.name} is down`, "down");
      } else if (evt.type === "recovered") {
        PT.toast(`🟢 ${evt.monitor.name} is back up`);
      }
    });
    S.start(3000);
  });
})();
