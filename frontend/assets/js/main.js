/* pingTester — shared UI: nav, footer, reveal animations, toasts, tooltips. */
(function () {
  "use strict";

  const PT = (window.PT = window.PT || {});

  PT.logo = `<a href="index.html" class="logo" aria-label="pingTester home">
      <span class="logo-mark"><span class="ring"></span><span class="dot"></span></span>
      <span>ping<span class="grad-text">Tester</span></span></a>`;

  const NAV_LINKS = [
    ["index.html#features", "Features", "features"],
    ["index.html#how", "How it works", "how"],
    ["pricing.html", "Pricing", "pricing"],
    ["status.html", "Status", "status"],
    ["index.html#faq", "FAQ", "faq"],
  ];

  function renderNav() {
    const el = document.querySelector("[data-nav]");
    if (!el) return;
    const page = document.body.dataset.page || "";
    const signedIn = PT.session && PT.session.get();
    const links = NAV_LINKS.map(
      ([href, label, key]) => `<a href="${href}" class="${key === page ? "active" : ""}">${label}</a>`
    ).join("");
    const cta = signedIn
      ? `<a href="dashboard.html" class="btn btn-primary btn-sm">Open dashboard</a>`
      : `<a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
         <a href="signup.html" class="btn btn-primary btn-sm">Start free</a>`;
    el.className = "nav";
    el.innerHTML = `
      <div class="container nav-inner">
        ${PT.logo}
        <nav class="nav-links" aria-label="Primary">${links}</nav>
        <div class="nav-cta">${cta}
          <button class="burger" aria-label="Toggle menu" aria-expanded="false"><span></span></button>
        </div>
      </div>
      <div class="mobile-menu">${links}${signedIn ? "" : `<a href="login.html">Log in</a>`}</div>`;
    const burger = el.querySelector(".burger");
    burger.addEventListener("click", () => {
      const open = el.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    el.querySelectorAll(".mobile-menu a").forEach((a) =>
      a.addEventListener("click", () => el.classList.remove("open"))
    );
    const onScroll = () => el.classList.toggle("scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const el = document.querySelector("[data-footer]");
    if (!el) return;
    const year = new Date().getFullYear();
    el.innerHTML = `
      <div class="container">
        <div class="foot-grid">
          <div>
            ${PT.logo}
            <p class="muted" style="margin-top:1rem;font-size:.9rem;max-width:300px">
              Uptime, latency and SSL monitoring for teams who would rather hear about an outage from us than from their customers.
            </p>
          </div>
          <div><h5>Product</h5><ul>
            <li><a href="index.html#features">Features</a></li>
            <li><a href="pricing.html">Pricing</a></li>
            <li><a href="status.html">Status pages</a></li>
            <li><a href="dashboard.html">Dashboard</a></li></ul></div>
          <div><h5>Monitors</h5><ul>
            <li><a href="index.html#features">HTTP(S)</a></li>
            <li><a href="index.html#features">Ping / ICMP</a></li>
            <li><a href="index.html#features">TCP port</a></li>
            <li><a href="index.html#features">Keyword</a></li></ul></div>
          <div><h5>Resources</h5><ul>
            <li><a href="index.html#faq">FAQ</a></li>
            <li><a href="index.html#how">Getting started</a></li>
            <li><a href="404.html">API docs</a></li>
            <li><a href="404.html">Changelog</a></li></ul></div>
          <div><h5>Company</h5><ul>
            <li><a href="404.html">About</a></li>
            <li><a href="404.html">Blog</a></li>
            <li><a href="404.html">Privacy</a></li>
            <li><a href="404.html">Terms</a></li></ul></div>
        </div>
        <div class="foot-bottom">
          <span>© ${year} pingTester. All rights reserved.</span>
          <a href="status.html" class="sys-status" data-sys-status><span class="status-dot"></span> <span>All systems operational</span></a>
        </div>
      </div>`;
  }

  /* Footer badge mirrors the monitors' overall state (and status.html's banner). */
  function paintSysStatus() {
    const el = document.querySelector("[data-sys-status]");
    if (!el || !PT.store) return;
    const [cls, text] = {
      ok: ["", "All systems operational"],
      degraded: ["degraded", "Some services degraded"],
      down: ["down", "Service outage"],
      none: ["paused", "No active monitors"],
    }[PT.store.overall()];
    el.querySelector(".status-dot").className = "status-dot " + cls;
    el.lastElementChild.textContent = text;
  }

  /* Scroll reveal */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((i) => io.observe(i));
  }

  /* Animated counters: <span data-count="99.99" data-decimals="2" data-suffix="%"> */
  function initCounters() {
    const els = document.querySelectorAll("[data-count]");
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const prefix = el.dataset.prefix || "";
      const dur = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toLocaleString(undefined, {
          minimumFractionDigits: dec, maximumFractionDigits: dec,
        }) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) return els.forEach(run);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  /* Cursor-following glow on cards */
  function initCardGlow() {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* FAQ accordion */
  function initFaq() {
    document.querySelectorAll(".faq-item").forEach((item) => {
      const q = item.querySelector(".faq-q");
      const a = item.querySelector(".faq-a");
      q.setAttribute("aria-expanded", "false");
      q.addEventListener("click", () => {
        const open = !item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach((o) => {
          if (o !== item) {
            o.classList.remove("open");
            o.querySelector(".faq-a").style.maxHeight = "0px";
            o.querySelector(".faq-q").setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("open", open);
        q.setAttribute("aria-expanded", String(open));
        a.style.maxHeight = open ? a.scrollHeight + "px" : "0px";
      });
    });
  }

  /* Toasts */
  PT.toast = function (msg, kind) {
    let host = document.querySelector(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="status-dot ${kind || ""}"></span><span></span>`;
    t.lastChild.textContent = msg;
    host.appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      t.addEventListener("animationend", () => t.remove());
    }, 3200);
  };

  /* Tooltips for heartbeat bars: any element with data-tip */
  function initTooltips() {
    const tip = document.createElement("div");
    tip.className = "tooltip";
    document.body.appendChild(tip);
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-tip]");
      if (!t) return;
      tip.textContent = t.dataset.tip;
      tip.classList.add("show");
    });
    document.addEventListener("pointermove", (e) => {
      if (!tip.classList.contains("show")) return;
      const x = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + "px";
      tip.style.top = e.clientY - 38 + "px";
    });
    document.addEventListener("pointerout", (e) => {
      if (e.target.closest("[data-tip]")) tip.classList.remove("show");
    });
  }

  PT.escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  document.addEventListener("DOMContentLoaded", () => {
    renderNav();
    renderFooter();
    paintSysStatus();
    if (PT.store) PT.store.subscribe((e) => { if (e.type === "tick") paintSysStatus(); });
    initReveal();
    initCounters();
    initCardGlow();
    initFaq();
    initTooltips();
  });
})();
