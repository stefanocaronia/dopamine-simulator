# Dopamine Simulator — handoff for contributors and AI coding assistants

Read this first. It says what the project is, how the code is organised, how to run and test it, which conventions to keep, and what is still open.

## 1. What this is
An educational browser simulation of a dopaminergic synapse that compares an ADHD and a neurotypical parameter set. Plain HTML/CSS/JS, no build step, no dependencies. It must keep working both from `file://` (double-click on `index.html`) and from GitHub Pages. The UI is in Italian (source language) and English.

Author: Stefano Caronia. Built with Claude Code: v1 in March 2026, v2 and v3 on 2026-09-07.

The simulation is a **didactic model**, not a quantitative one. Any change to the biology must be recorded in `docs/fedelta-biologica.md`, which is the note we keep for ourselves and for the biologists who review the model.

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
.claude/launch.json  local preview server config for Claude Code (gitignored)
```
Load order in `index.html` matters: util → i18n dictionaries → i18n → model → render → ui → main.

## 3. Architecture
- Classic scripts sharing one global scope. Top-level `let`/`const`/functions declared in one file are visible in the others. Nothing runs at load time except `main.js`, so cross-file references are safe. Keep it that way: no top-level calls in the other files.
- State lives in `model.js`. `render.js` reads it and only writes the trails buffer. `ui.js` reads it and calls model commands: `setMode`, `resetSim`, `startCaffeine`, `startExercise`, `togglePause`. `model.js` never touches the DOM.
- Geometry (`PRE`, `CLEFT`, `POST`, `SNAP`, `VMAT_Z`, `MAO_Z`, `TERM`) is computed by `setGeometry(w, h)` and shared by simulation, drawing and hit-testing; `postGeom(i)` returns the geometry of the receiving cells.
- Time: `dt` is real seconds capped at 0.05; `sdt = dt × speedMul` drives the model. Caffeine and exercise timers run in real seconds on purpose. The COMT kill probability is frame-rate independent: `1 − (1 − comtRate)^(sdt·60)`.
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
| COMT kill rate (per frame at 60 fps, times speed) | 0.04 | 0.015 |
| VMAT2 recycling share | 55% | 75% |

Constants: reservoir 100 units; release rate = stimulus × 30 per second (+15 with exercise); cost 0.05 per release (0.02 with exercise); synthesis 0.2 per second; a molecule lives 2 s in the cleft; each binding adds 0.5 signal; threshold 0.8; half-life 0.6 s; sleep debt grows by (0.0015 + stimulus × 0.007) per second, raises the threshold by ×(1 + 1.5 × debt) and divides the half-life by (1 + 1.2 × debt); caffeine blocks 0.85 − 0.4 × debt of reuptake for 25 s; exercise lasts 12 s.

## 5. Running and testing
- Any static server from the repo root (`python -m http.server 8080`), or open `index.html` directly.
- Claude Code Browser pane: `.claude/launch.json` defines the `dopamine-simulator` server. Things learned the hard way:
  - Reload with a cache-buster (`?v=N`): `http.server` responses get cached by the pane.
  - The pane throttles `requestAnimationFrame` while you `wait`, so the simulation looks frozen. Drive it from `javascript_tool`: `for(let i=0;i<600;i++)update(1/60); render(); renderToasts();`
  - Change controls through events: `const el=$('stimulus'); el.value=80; el.dispatchEvent(new Event('input'));` and `setMode('normal')`.
  - Simulate hover: `canvas.dispatchEvent(new MouseEvent('mousemove',{clientX,clientY,bubbles:true})); updateHover(); render();`
  - The console keeps errors from previous page loads: compare the reported line with the current file before chasing ghosts.
  - Screenshots taken after scrolling can come back black; use a tall viewport (`resize_window`) instead.
- Sanity numbers (ADHD vs neurotypical, 30 simulated seconds at 2×): fraction of time with receptive neurons ≈ 0.01 vs 0.41 at 20% stimulus, 0.16 vs 0.84 at 40%, 0.82 vs 0.97 at 70%.
- Performance target: under 1 ms per frame (update + render) with 500 particles. Measured 0.5–0.75 ms.
- Manual checklist after a change: both languages, both brain modes, caffeine and exercise toasts, depletion (stimulus 100% at 8× for a minute), pause, tooltip on a DAT1 and on a receiving cell, mobile width (375 px).

## 6. Conventions
- Keep the model logic unchanged unless the change is intentional biology; then update `docs/fedelta-biologica.md` and the toasts and tooltips that describe it.
- Every visible string goes in `i18n/it.js` (source) and `i18n/en.js`. Never hardcode text in JS or HTML.
- Colors come from `C` in `model.js`; keyword classes `.c-*` in the CSS.
- Identifiers in English; comments may be in Italian.
- Commit messages in English, imperative mood. Commits generated with Claude end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Line endings are LF (`.gitattributes`).

## 7. Adding a language
1. Copy `i18n/it.js` to `i18n/xx.js`, change `I18N.it` to `I18N.xx`, translate the values only. Keep keys, HTML tags, classes and `{placeholders}`.
2. Add `<script src="i18n/xx.js"></script>` in `index.html` before `js/i18n.js`, and a button `<button data-lang="xx">XX</button>` in the header.
3. Add `'xx'` to `LANGS` and a locale tag to `LOCALE` in `js/i18n.js` (used for number formatting).
Suggested order: es, fr, de, pt.

## 8. Roadmap and open items
- [ ] Choose a license; create the GitHub repository; enable Pages; put the URL in README and in the `footer` strings
- [ ] Screenshots or a short GIF for the README (`docs/screenshots/`)
- [ ] Localization: es, fr, de, pt
- [ ] Biology, see `docs/fedelta-biologica.md`: rename caffeine to methylphenidate or remodel caffeine as A2A antagonism (lower threshold / higher D2 affinity); rename MAO-B to MAO; presynaptic D2 autoreceptors (release inhibition when cleft dopamine is high); tonic baseline release at zero stimulus; COMT weight depending on region
- [ ] Optional: region selector (striatum vs prefrontal cortex) changing DAT, COMT and NET weights
- [ ] Optional: docked-vesicle animation on release; D1 receptors
- [ ] Accessibility: keyboard access to tooltips, reduced-motion mode

## 9. History
- v1, March 2026: single-file prototype `come-funziona-la-dopamina.html` (first commit)
- v2, 2026-09-07: visual rewrite (axon terminal, ring gauges, sprite glow, trails, toasts, tooltips, in-canvas rates), same model; fixes for the zero-size layout crash and the frame-rate-dependent COMT and toast timers
- v3, 2026-09-07: split into modules, i18n (it/en), documentation, moved out of `holistic-dna-analyzer` into its own repository

Earlier single-file versions can be retrieved with `git show <commit>:come-funziona-la-dopamina.html`.
