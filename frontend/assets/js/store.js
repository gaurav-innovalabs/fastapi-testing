/* pingTester — front-end only data layer.
 * There is no backend yet: sessions and monitors live in localStorage and
 * check results are simulated in the browser. Swap these functions for API
 * calls once the FastAPI endpoints exist. */
(function () {
  "use strict";

  const PT = (window.PT = window.PT || {});
  const KEY_SESSION = "pt_session";
  const KEY_MONITORS = "pt_monitors";
  const MAX_BEATS = 90;

  const read = (k, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage full or disabled */ }
  };

  /* ---------- Session (mock auth) ---------- */
  PT.session = {
    get: () => read(KEY_SESSION, null),
    set: (user) => write(KEY_SESSION, user),
    clear: () => localStorage.removeItem(KEY_SESSION),
  };

  /* ---------- Monitors ---------- */
  const uid = () => Math.random().toString(36).slice(2, 10);

  // Per-monitor behaviour for the simulator: base latency and failure odds.
  function profileFor(m) {
    if (m.type === "ping") return { base: 18, jitter: 14, fail: 0.001 };
    if (m.type === "port") return { base: 35, jitter: 20, fail: 0.002 };
    return { base: m.flaky ? 420 : 140, jitter: m.flaky ? 380 : 90, fail: m.flaky ? 0.025 : 0.003 };
  }

  function makeBeat(m, t) {
    if (m.paused) return { t, s: "paused", ms: null };
    const p = profileFor(m);
    // Outages come in streaks: if the last beat was down, likely stay down.
    const last = m.beats && m.beats[m.beats.length - 1];
    const stayDown = last && last.s === "down" && Math.random() < 0.55;
    if (stayDown || Math.random() < p.fail) return { t, s: "down", ms: null };
    const ms = Math.max(4, Math.round(p.base + (Math.random() - 0.3) * p.jitter));
    const s = ms > (m.type === "http" || m.type === "keyword" ? 800 : 200) ? "degraded" : "up";
    return { t, s, ms };
  }

  function seed(m) {
    const now = Date.now();
    m.beats = [];
    for (let i = MAX_BEATS; i > 0; i--) m.beats.push(makeBeat(m, now - i * m.interval * 1000));
    m.status = m.beats[m.beats.length - 1].s;
    return m;
  }

  const DEFAULTS = [
    { name: "Marketing site", url: "https://pingtester.dev", type: "http", interval: 60 },
    { name: "Public API", url: "https://api.pingtester.dev/health", type: "http", interval: 30 },
    { name: "Checkout service", url: "https://shop.example.com/checkout", type: "keyword", interval: 60, keyword: "Pay now", flaky: true },
    { name: "Primary database", url: "db.internal.example.com:5432", type: "port", interval: 30 },
    { name: "Edge gateway", url: "203.0.113.10", type: "ping", interval: 15 },
    { name: "Docs", url: "https://docs.pingtester.dev", type: "http", interval: 300, paused: true },
  ];

  function freshMonitors() {
    return DEFAULTS.map((d) =>
      seed({ id: uid(), regions: ["us-east", "eu-west", "ap-south"], incidents: [], created: Date.now(), ...d })
    );
  }

  let monitors = read(KEY_MONITORS, null);
  if (!Array.isArray(monitors) || monitors.length === 0 && !read("pt_emptied", false)) {
    monitors = freshMonitors();
    write(KEY_MONITORS, monitors);
  }

  const listeners = new Set();
  const emit = (evt) => listeners.forEach((fn) => fn(evt));

  // Keep several open tabs (dashboard + status page) in sync.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY_MONITORS) return;
    const next = read(KEY_MONITORS, null);
    if (Array.isArray(next)) { monitors = next; emit({ type: "tick" }); }
  });

  PT.store = {
    all: () => monitors,
    get: (id) => monitors.find((m) => m.id === id),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    add(data) {
      const m = seed({
        id: uid(), regions: ["us-east"], incidents: [], created: Date.now(), paused: false, ...data,
      });
      monitors.unshift(m);
      this.save();
      emit({ type: "add", monitor: m });
      return m;
    },
    update(id, patch) {
      const m = this.get(id);
      if (!m) return;
      Object.assign(m, patch);
      if ("paused" in patch) m.status = patch.paused ? "paused" : "up";
      this.save();
      emit({ type: "update", monitor: m });
    },
    remove(id) {
      monitors = monitors.filter((m) => m.id !== id);
      write("pt_emptied", monitors.length === 0);
      this.save();
      emit({ type: "remove", id });
    },
    reset() {
      monitors = freshMonitors();
      write("pt_emptied", false);
      this.save();
      emit({ type: "reset" });
    },
    save: () => write(KEY_MONITORS, monitors),

    /* Derived metrics */
    uptime(m) {
      const live = m.beats.filter((b) => b.s !== "paused");
      if (!live.length) return null;
      return (live.filter((b) => b.s !== "down").length / live.length) * 100;
    },
    avgMs(m) {
      const v = m.beats.filter((b) => b.ms != null);
      return v.length ? Math.round(v.reduce((a, b) => a + b.ms, 0) / v.length) : null;
    },
    lastMs(m) {
      for (let i = m.beats.length - 1; i >= 0; i--) if (m.beats[i].ms != null) return m.beats[i].ms;
      return null;
    },

    /* One simulated check per active monitor. */
    tick() {
      const now = Date.now();
      monitors.forEach((m) => {
        if (m.paused) return;
        const prev = m.status;
        const beat = makeBeat(m, now);
        m.beats.push(beat);
        if (m.beats.length > MAX_BEATS) m.beats.shift();
        m.status = beat.s;
        if (prev !== "down" && beat.s === "down") {
          m.incidents.unshift({ start: now, end: null, cause: m.type === "keyword" ? `Keyword "${m.keyword || ""}" not found` : "Connection timed out" });
          emit({ type: "down", monitor: m });
        } else if (prev === "down" && beat.s !== "down") {
          if (m.incidents[0] && !m.incidents[0].end) m.incidents[0].end = now;
          emit({ type: "recovered", monitor: m });
        }
        m.incidents = m.incidents.slice(0, 20);
      });
      this.save();
      emit({ type: "tick" });
    },
    start(ms) {
      if (this._timer) return;
      this._timer = setInterval(() => this.tick(), ms || 3000);
    },
  };

  PT.fmt = {
    uptime: (v) => (v == null ? "—" : v.toFixed(v === 100 ? 0 : 2) + "%"),
    ms: (v) => (v == null ? "—" : v + " ms"),
    time: (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    ago(t) {
      const s = Math.round((Date.now() - t) / 1000);
      if (s < 60) return s + "s ago";
      if (s < 3600) return Math.round(s / 60) + "m ago";
      if (s < 86400) return Math.round(s / 3600) + "h ago";
      return Math.round(s / 86400) + "d ago";
    },
    duration(ms) {
      const s = Math.round(ms / 1000);
      if (s < 60) return s + "s";
      const m = Math.floor(s / 60);
      return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
    },
  };

  /* Heartbeat bar markup shared by the dashboard, preview and status page. */
  PT.beatsHtml = function (beats, count) {
    const slice = beats.slice(-count);
    const pad = Math.max(0, count - slice.length);
    let html = "";
    for (let i = 0; i < pad; i++) html += `<b class="empty"></b>`;
    slice.forEach((b) => {
      const label = b.s === "paused" ? "paused" : b.s === "down" ? "down" : `${b.ms} ms`;
      html += `<b class="${b.s}" data-tip="${PT.fmt.time(b.t)} · ${label}"></b>`;
    });
    return html;
  };
})();
