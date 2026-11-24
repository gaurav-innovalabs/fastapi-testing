/* pingTester — mock login / signup (front-end only; no real authentication). */
(function () {
  "use strict";
  const PT = window.PT;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(input, msg) {
    const err = input.closest(".field").querySelector(".err-msg");
    input.classList.toggle("invalid", !!msg);
    if (err) err.textContent = msg || "";
    if (msg) {
      // restart the shake animation
      input.style.animation = "none";
      void input.offsetWidth;
      input.style.animation = "";
    }
    return !msg;
  }

  function strength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }

  function submitting(btn, on, label) {
    btn.disabled = on;
    btn.innerHTML = on ? `<span class="spinner"></span> ${label}` : btn.dataset.label;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authForm");
    if (!form) return;
    const mode = form.dataset.mode; // "login" | "signup"
    const btn = form.querySelector("button[type=submit]");
    btn.dataset.label = btn.innerHTML;

    const pw = form.querySelector("#password");
    const meter = form.querySelector(".pw-meter i");
    if (meter) {
      pw.addEventListener("input", () => {
        const s = strength(pw.value);
        const colors = ["#ef4444", "#ef4444", "#f59e0b", "#22d3ee", "#22c55e"];
        meter.style.width = (pw.value ? Math.max(1, s) * 25 : 0) + "%";
        meter.style.background = colors[s];
        const label = document.getElementById("pwLabel");
        if (label) label.textContent = pw.value ? ["Too weak", "Weak", "Okay", "Good", "Strong"][s] : "";
      });
    }

    const plan = new URLSearchParams(location.search).get("plan");
    const planNote = document.getElementById("planNote");
    if (plan && planNote) planNote.textContent = `You're signing up for the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan.`;

    form.querySelectorAll(".input").forEach((i) => i.addEventListener("input", () => setError(i, "")));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = form.querySelector("#email");
      const name = form.querySelector("#name");
      let ok = true;
      if (name) ok = setError(name, name.value.trim() ? "" : "Please enter your name") && ok;
      ok = setError(email, EMAIL_RE.test(email.value.trim()) ? "" : "Enter a valid email address") && ok;
      if (mode === "signup") {
        ok = setError(pw, pw.value.length >= 8 ? "" : "Use at least 8 characters") && ok;
        const terms = form.querySelector("#terms");
        if (!terms.checked) { ok = false; PT.toast("Please accept the terms to continue", "down"); }
      } else {
        ok = setError(pw, pw.value ? "" : "Enter your password") && ok;
      }
      if (!ok) return;

      submitting(btn, true, mode === "signup" ? "Creating account…" : "Signing in…");
      setTimeout(() => {
        const display = name ? name.value.trim() : email.value.split("@")[0];
        PT.session.set({ name: display, email: email.value.trim(), plan: plan || "free" });
        location.href = "dashboard.html";
      }, 900);
    });

    document.querySelectorAll("[data-social]").forEach((b) =>
      b.addEventListener("click", () => {
        PT.session.set({ name: "Demo User", email: "demo@pingtester.dev", plan: plan || "free" });
        PT.toast(`Signed in with ${b.dataset.social} (demo)`);
        setTimeout(() => (location.href = "dashboard.html"), 600);
      })
    );
  });
})();
