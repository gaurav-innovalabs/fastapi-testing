/* pingTester — landing page animations (self-contained demo data). */
(function () {
  "use strict";

  /* Typing rotator in the hero headline */
  function rotator() {
    const el = document.getElementById("rotator");
    if (!el) return;
    const words = ["websites", "APIs", "servers", "databases", "cron jobs"];
    let w = 0, i = words[0].length, deleting = true;
    const tick = () => {
      const word = words[w];
      if (deleting) {
        i--;
        if (i === 0) { deleting = false; w = (w + 1) % words.length; }
      } else {
        i++;
        if (i === words[w].length) { deleting = true; el.textContent = words[w]; return setTimeout(tick, 1800); }
      }
      el.textContent = (deleting ? word : words[w]).slice(0, i);
      setTimeout(tick, deleting ? 55 : 95);
    };
    setTimeout(tick, 2200);
  }

  /* Live-looking preview of the dashboard */
  function preview() {
    const host = document.getElementById("previewRows");
    if (!host) return;
    const demo = [
      { name: "acme.com", url: "https://acme.com", base: 120, fail: 0 },
      { name: "API · /v1/health", url: "https://api.acme.com/v1/health", base: 64, fail: 0 },
      { name: "Payments", url: "https://pay.acme.com", base: 210, fail: 0.18 },
      { name: "Postgres", url: "10.0.4.12:5432", base: 9, fail: 0 },
    ];
    const COUNT = 40;
    demo.forEach((d) => {
      d.beats = [];
      for (let k = 0; k < COUNT; k++) d.beats.push(beat(d, k > 30 && k < 33 && d.fail));
    });
    function beat(d, forceDown) {
      const down = forceDown || Math.random() < d.fail * 0.25;
      return down ? { s: "down" } : { s: "up", ms: Math.round(d.base * (0.7 + Math.random() * 0.6)) };
    }
    host.innerHTML = demo.map((d, idx) => `
      <div class="mon-row" data-i="${idx}">
        <span class="status-dot"></span>
        <div><div class="mon-name">${d.name}</div><div class="mon-url">${d.url}</div></div>
        <div class="beats"></div>
        <div class="mon-ms"></div>
        <div class="mon-up"></div>
      </div>`).join("");
    const rows = host.querySelectorAll(".mon-row");
    const paint = (idx, animateLast) => {
      const d = demo[idx], row = rows[idx];
      const last = d.beats[d.beats.length - 1];
      row.querySelector(".beats").innerHTML = d.beats
        .map((b, k) => `<b class="${b.s}${animateLast && k === d.beats.length - 1 ? " new" : ""}" data-tip="${b.s === "down" ? "down" : b.ms + " ms"}"></b>`)
        .join("");
      row.querySelector(".status-dot").className = "status-dot " + (last.s === "down" ? "down" : "");
      row.querySelector(".mon-ms").textContent = last.ms ? last.ms + " ms" : "—";
      const up = (d.beats.filter((b) => b.s !== "down").length / d.beats.length) * 100;
      const upEl = row.querySelector(".mon-up");
      upEl.textContent = up.toFixed(up === 100 ? 0 : 1) + "%";
      upEl.style.color = up < 95 ? "var(--warn)" : "";
    };
    demo.forEach((_, idx) => paint(idx, false));
    let turn = 0;
    setInterval(() => {
      const idx = turn++ % demo.length;
      demo[idx].beats.push(beat(demo[idx]));
      demo[idx].beats.shift();
      paint(idx, true);
    }, 700);

    // Flatten the tilted preview as it scrolls into view
    const pv = document.getElementById("preview");
    const onScroll = () => pv.classList.toggle("flat", window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function statusDemo() {
    const el = document.getElementById("statusDemoBeats");
    if (!el) return;
    let html = "";
    for (let k = 0; k < 45; k++) html += `<b class="${k === 17 ? "degraded" : "up"}"></b>`;
    el.innerHTML = html;
  }

  /* "How it works" steps synced with an auto-typing terminal */
  function howItWorks() {
    const term = document.getElementById("term");
    const steps = document.querySelectorAll(".step");
    if (!term || !steps.length) return;
    const scripts = [
      [
        '<span class="cm"># Create a monitor</span>',
        '$ pingtester monitors create \\',
        '    --name "Checkout" --url https://shop.acme.com \\',
        '    --type keyword --keyword "Pay now" --every 30s',
        '<span class="ok">✔ Monitor created</span>  id=<span class="hl">mon_8f2c</span>',
        '<span class="ok">✔ First check queued</span> in 3 regions',
      ],
      [
        '<span class="cm"># Checks streaming in…</span>',
        '<span class="hl">us-east</span>    200 OK   <span class="ok">118 ms</span>   keyword ✔',
        '<span class="hl">eu-west</span>    200 OK   <span class="ok">164 ms</span>   keyword ✔',
        '<span class="hl">ap-south</span>   200 OK   <span class="ok">241 ms</span>   keyword ✔',
        '<span class="hl">us-east</span>    200 OK   <span class="ok">121 ms</span>   keyword ✔',
        '<span class="hl">eu-west</span>    200 OK   <span class="ok">158 ms</span>   keyword ✔',
      ],
      [
        '<span class="hl">us-east</span>    <span class="err">502 Bad Gateway</span>',
        '<span class="cm">↳ confirming from eu-west…</span>',
        '<span class="hl">eu-west</span>    <span class="err">502 Bad Gateway</span>',
        '<span class="err">✖ Incident #42 opened</span> — Checkout is DOWN',
        '→ Slack <span class="ok">#on-call</span> · SMS <span class="ok">+1 ••• 0192</span>',
        '<span class="ok">✔ Recovered after 2m 14s</span> — incident resolved',
      ],
    ];
    let current = 0, timer = null, manual = false;
    const play = (idx) => {
      current = idx;
      clearTimeout(timer);
      steps.forEach((s, k) => s.classList.toggle("active", k === idx));
      const lines = scripts[idx];
      term.innerHTML = "";
      let n = 0;
      const next = () => {
        if (n < lines.length) {
          term.innerHTML += lines[n++] + "\n";
          timer = setTimeout(next, 520);
        } else if (!manual) {
          timer = setTimeout(() => play((current + 1) % scripts.length), 2400);
        }
      };
      next();
    };
    steps.forEach((s) => s.addEventListener("click", () => {
      manual = true;
      play(parseInt(s.dataset.step, 10));
    }));
    // Start when visible
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { play(0); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(term);
  }

  document.addEventListener("DOMContentLoaded", () => {
    rotator();
    preview();
    statusDemo();
    howItWorks();
  });
})();
