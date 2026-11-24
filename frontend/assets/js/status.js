/* pingTester — public status page, built from the same monitors as the dashboard. */
(function () {
  "use strict";
  const PT = window.PT;
  const S = PT.store;
  const esc = PT.escape;
  const BARS = 90;

  function render() {
    const all = S.all().filter((m) => !m.paused);
    const down = all.filter((m) => m.status === "down");
    const slow = all.filter((m) => m.status === "degraded");

    const banner = document.getElementById("banner");
    const dot = document.getElementById("bannerDot");
    const text = document.getElementById("bannerText");
    if (!all.length) {
      banner.className = "status-banner warn";
      dot.className = "status-dot degraded";
      text.textContent = "No active monitors to report on";
    } else if (down.length) {
      banner.className = "status-banner bad";
      dot.className = "status-dot down";
      text.textContent = down.length === 1 ? `${down[0].name} is experiencing an outage` : `${down.length} services are experiencing outages`;
    } else if (slow.length) {
      banner.className = "status-banner warn";
      dot.className = "status-dot degraded";
      text.textContent = "Some services are responding slowly";
    } else {
      banner.className = "status-banner ok";
      dot.className = "status-dot";
      text.textContent = "All systems operational";
    }

    document.getElementById("services").innerHTML = all.length
      ? all.map((m) => `
        <div class="svc">
          <div class="svc-head">
            <span>${esc(m.name)}</span>
            <span class="chip ${m.status}">${m.status === "up" ? "Operational" : m.status === "down" ? "Outage" : "Degraded"}</span>
          </div>
          <div class="beats">${PT.beatsHtml(m.beats, BARS)}</div>
          <div class="svc-foot"><span>${BARS} checks ago</span><span>${PT.fmt.uptime(S.uptime(m))} uptime</span><span>Now</span></div>
        </div>`).join("")
      : `<div class="empty" style="border:0">Add monitors in the <a href="dashboard.html" style="color:var(--up)">dashboard</a> to see them here.</div>`;

    const hist = [];
    S.all().forEach((m) => m.incidents.forEach((i) => hist.push({ m, i })));
    hist.sort((a, b) => b.i.start - a.i.start);
    document.getElementById("history").innerHTML = hist.length
      ? hist.slice(0, 10).map(({ m, i }) => `
        <div class="incident">
          <span class="status-dot ${i.end ? "" : "down"}"></span>
          <div><strong>${esc(m.name)} — ${i.end ? "Resolved" : "Investigating"}</strong>
          <small>${esc(i.cause)} · ${new Date(i.start).toLocaleString()}${i.end ? " · " + PT.fmt.duration(i.end - i.start) : ""}</small></div>
        </div>`).join("")
      : `<p class="muted" style="font-size:.9rem">No incidents reported.</p>`;

    document.getElementById("statusUpdated").textContent = "Last updated " + PT.fmt.time(Date.now());
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    S.subscribe((e) => { if (e.type === "tick") render(); });
    S.start(4000);
    document.getElementById("subscribe").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("subEmail");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        input.classList.add("invalid");
        return PT.toast("Enter a valid email address", "down");
      }
      input.classList.remove("invalid");
      input.value = "";
      PT.toast("Subscribed — you'll hear from us when something happens");
    });
  });
})();
