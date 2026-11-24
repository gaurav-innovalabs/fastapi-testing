# pingTester — front end

A static, dependency-free front end for **pingTester**, an uptime-monitoring product.
It is front-end only for now: there is no backend wiring yet.

## Run it

Any static file server works. From the repo root:

```bash
python3 -m http.server 5173 --directory frontend
# open http://localhost:5173
```

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Landing page: hero with typing headline and a live dashboard preview, logo marquee, animated stats, feature cards, "how it works" with a terminal that types itself, testimonials, FAQ, CTA |
| `pricing.html` | Four plans with a monthly/yearly toggle, comparison table, billing FAQ |
| `login.html`, `signup.html` | Form validation, password-strength meter, mock social login |
| `dashboard.html` | Monitors list with live heartbeat bars, KPIs, search and filters, create/edit/pause/delete monitors, detail drawer with response-time chart, incident list and check log, alert-channel toggles, profile settings |
| `status.html` | Public status page built from the same monitors: overall banner, 90-check uptime bars, incident history, subscribe form |
| `404.html` | Not-found page |

## How the data works (no backend yet)

`assets/js/store.js` is the only data layer. It keeps the session, monitors and
alert-channel preferences in `localStorage` and **simulates** check results in the
browser every few seconds. When the FastAPI endpoints exist, replace the functions
in `PT.session` and `PT.store` with API calls; the page scripts only talk to those
two objects.

`dashboard.html` requires a session: without one, `dashboard.js` redirects to
`login.html` (any email/password, or the demo Google/GitHub buttons, signs you in).
That guard is the place to add a real session check once auth exists.

Use **Settings → Reset demo data** in the dashboard to restore the sample monitors.

## Structure

```
frontend/
  *.html
  assets/css/style.css   all styles and animations
  assets/js/store.js     session + monitor store + check simulator
  assets/js/main.js      shared nav/footer, scroll reveal, counters, FAQ, toasts, tooltips
  assets/js/landing.js   landing-page animations
  assets/js/auth.js      login / signup forms
  assets/js/dashboard.js dashboard app
  assets/js/status.js    public status page
```
