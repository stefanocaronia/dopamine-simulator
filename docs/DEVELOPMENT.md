# Development guide

How the code is organised, how to run and test it, which conventions to keep, and what is still open. Written for human contributors and for AI coding assistants alike.

## 1. What this is
An educational browser simulation of a dopaminergic synapse that compares an ADHD and a neurotypical parameter set. Plain HTML/CSS/JS, no build step, no dependencies. It must keep working both from `file://` (double-click on `index.html`) and from GitHub Pages. The UI is in Italian (source language) and English.

The simulation is a **didactic model**, not a quantitative one. Any change to the biology must be recorded in `docs/fedelta-biologica.md`, the note kept for the authors and for the biologists who review the model.

## 2. Repository map
```
index.html          markup only; every visible string is injected via data-i18n attributes
css/style.css       all styles: dark neon theme, toasts, tooltip, sidebar, responsive rules
js/util.js          $, wall(), hexA()
js/i18n.js          T(key, params), fmtN/fmt1, detectLang/applyI18n/setLang, LANGS, LOCALE
js/model.js         parameters (MODES, constants, colors C), state, geometry, update() — no DOM access
js/render.js        canvas: resizeCanvas(), sprite cache, trails buffer, all draw*() functions
js/ui.js            toasts, tooltips (TIPS), hit-test and hover, HUD, controls (initUI)
js/main.js          bootstrap and requestAnimationFrame loop
i18n/it.js, en.js   dictionaries registered on window.I18N; it.js is the source of truth
docs/fedelta-biologica.md   biological fidelity report (Italian)
.github/workflows/pages.yml GitHub Pages deployment on every push to main
```
Load order in `index.html` matters: util → i18n dictionaries → i18n → model → render → ui → main.

## 3. Architecture
- Classic scripts sharing one global scope. Top-level `let`/`const`/functions declared in one file are visible in the others. Nothing runs at load time except `main.js`, so cross-file references are safe. Keep it that way: no top-level calls in the other files.
- State lives in `model.js`. `render.js` reads it and only writes the trails buffer. `ui.js` reads it and calls model commands: `setMode`, `resetSim`, `startCaffeine`, `startMph`, `startExercise`, `togglePause`. `model.js` never touches the DOM.
- Geometry (`PRE`, `CLEFT`, `POST`, `SNAP`, `VMAT_Z`, `MAO_Z`, `TERM`) is computed by `setGeometry(w, h)` and shared by simulation, drawing and hit-testing; `postGeom(i)` returns the geometry of the receiving cells.
- Time: `dt` is real seconds capped at 0.05; `sdt = dt × speedMul` drives the model. Caffeine, methylphenidate and exercise timers run in real seconds on purpose. The COMT kill probability is frame-rate independent: `1 − (1 − comtRate)^(sdt·60)`.
- Rendering: glow through cached sprites (no per-particle `shadowBlur`); trails through a persistence canvas faded each frame with `destination-out` (long jumps leave a dot, not a line); a hover highlight; every label goes through `T()`.
- Toasts: `buildToasts()` returns the list for the current frame; `renderToasts()` reconciles DOM nodes by key, so text updates do not re-trigger the entry animation. The reservoir trend uses a slow average (about 2 s), a value sampled once per second and a hysteresis state (`trendState`) to avoid flicker.
- Tooltips: `TIPS[key]()` returns `{t, c, b}`; canvas elements are found by `hitTest(mx, my)`; UI elements carry `data-tip="key"`; on touch a tap shows the tip for 4 s.
- i18n: every visible text goes through `T()`; strings may contain HTML (`<b>`, `<i class="c-*">`) and `{placeholders}`. Language resolution: `?lang=xx` → `localStorage` key `dopa.lang` → `navigator.language` → `it`.
- Robustness: `resizeCanvas()` refuses zero-size layouts and retries on the next frame; each frame runs inside try/catch so one error cannot kill the loop.

## 4. Model parameters (js/model.js)
| Parameter | ADHD | Neurotypical |
|---|---|---|
| D2 receptors per neuron | 5 | 12 |
| DAT1 count / speed | 5 / 2.0 | 3 / 0.7 |
| Reuptake probability near the membrane | 0.94 | 0.78 |
| COMT kill rate (per frame at 60 fps, times speed) | 0.012 | 0.005 |
| VMAT2 recycling share | 55% | 75% |

Constants: reservoir 100 units; release rate = stimulus × 30 per second (+15 with exercise, ×1.10 with caffeine); cost 0.05 per release (0.02 with exercise); synthesis 0.2 per second; a molecule lives 2 s in the cleft; each binding adds 0.5 signal; threshold 0.8; half-life 0.6 s.

Interventions:
- **Caffeine** (25 s): adenosine A2A antagonism. Threshold × 0.8, release × 1.10, and it halves the sleep-debt penalty on the threshold. No effect on DAT1.
- **Methylphenidate** (30 s): DAT1 block. 85% of reuptake attempts fail, transporters move at 0.3× speed.
- **Exercise** (12 s): +15 releases/s at 0.02 cost each, synthesis +0.5/s (reduced by sleep debt).
- **Sleep**: reset of debt, reservoir, cleft and counters.
- **Sleep debt** grows with time awake at 0.0055 per simulated second (full in about 3 minutes), independent of the stimulus. It raises the threshold by ×(1 + 1.5 × debt) and divides the signal half-life by (1 + 1.2 × debt).

## 5. Running and testing
- Any static server from the repo root (`python -m http.server 8080`), or open `index.html` directly.
- Manual checklist after a change: both languages, both brain modes, caffeine and methylphenidate toasts, depletion (stimulus 100% at 8× for a minute), pause, tooltip on a DAT1 and on a receiving cell, mobile width (375 px).
- Sanity numbers (ADHD vs neurotypical, 30 simulated seconds at 2×): fraction of time with receptive neurons ≈ 0.01 vs 0.41 at 20% stimulus, 0.16 vs 0.84 at 40%, 0.82 vs 0.97 at 70%. Re-measure after touching the model.
- Performance target: under 1 ms per frame (update + render) with 500 particles. Measured 0.5–0.75 ms.

### Testing with an automated browser
Useful when driving the page from a script or from an AI assistant's browser pane:
- Reload with a cache-buster (`?v=N`): `http.server` responses get cached.
- If `requestAnimationFrame` is throttled (hidden or automated tab), drive the simulation by hand from the console: `for(let i=0;i<600;i++)update(1/60); render(); renderToasts();`
- Change controls through events: `const el=$('stimulus'); el.value=80; el.dispatchEvent(new Event('input'));` and `setMode('normal')`, `setLang('en')`, `startCaffeine()`, `startMph()`.
- Simulate hover: `canvas.dispatchEvent(new MouseEvent('mousemove',{clientX,clientY,bubbles:true})); updateHover(); render();`
- The console may keep errors from previous page loads: compare the reported line with the current file before chasing ghosts.

## 6. Conventions
- Keep the model logic unchanged unless the change is intentional biology; then update `docs/fedelta-biologica.md` and the toasts and tooltips that describe it.
- Every visible string goes in `i18n/it.js` (source) and `i18n/en.js`. Never hardcode text in JS or HTML. Check the two dictionaries have the same keys and placeholders.
- Colors come from `C` in `model.js`; keyword classes `.c-*` in the CSS.
- Identifiers in English; comments may be in Italian.
- Commit messages in English, imperative mood.
- Line endings are LF (`.gitattributes`). AI-assistant instruction files (`CLAUDE.md`, `AGENTS.md`) and `.claude/` are not versioned.

## 7. Adding a language
1. Copy `i18n/it.js` to `i18n/xx.js`, change `I18N.it` to `I18N.xx`, translate the values only. Keep keys, HTML tags, classes and `{placeholders}`.
2. Add `<script src="i18n/xx.js"></script>` in `index.html` before `js/i18n.js`, and a button `<button data-lang="xx">XX</button>` in the header.
3. Add `'xx'` to `LANGS` and a locale tag to `LOCALE` in `js/i18n.js` (used for number formatting).
Suggested order: es, fr, de, pt.

## 8. Roadmap and open items
- [ ] Create the GitHub repository, enable Pages (Settings → Pages → Source: GitHub Actions), put the URL in README and in the `footer` strings
- [ ] Choose a license
- [ ] Screenshots or a short GIF for the README (`docs/screenshots/`)
- [ ] Localization: es, fr, de, pt
- [ ] Biology, see `docs/fedelta-biologica.md`: presynaptic D2 autoreceptors (release inhibition when cleft dopamine is high); tonic baseline release at zero stimulus; region selector (striatum vs prefrontal cortex) changing DAT, COMT and NET weights
- [ ] Compulsive high-reward, low-effort activities (scrolling, gaming): frequent cue-triggered bursts plus slow D2 downregulation (tolerance) and recovery; see the discussion in the fidelity notes before designing it
- [ ] Optional: docked-vesicle animation on release; D1 receptors
- [ ] Accessibility: keyboard access to tooltips, reduced-motion mode

## 9. History
- v1, March 2026: single-file prototype `come-funziona-la-dopamina.html` (first commit)
- v2, 2026-09-07: visual rewrite (axon terminal, ring gauges, sprite glow, trails, toasts, tooltips, in-canvas rates), same model; fixes for the zero-size layout crash and the frame-rate-dependent COMT and toast timers
- v3, 2026-09-07: split into modules, i18n (it/en), documentation, own repository
- v3.1, 2026-09-07: biology corrections: caffeine as A2A antagonist, methylphenidate as DAT blocker, COMT weight reduced and declared a metaphor, MAO label, sleep debt grows with time awake

Earlier single-file versions can be retrieved with `git show <commit>:come-funziona-la-dopamina.html`.
