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
js/i18n.js          T(key, params), fmtN/fmt1, detectLang/applyI18n/setLang, LANG_META (code, name, locale, dir), language menu
js/model.js         parameters (MODES, constants, colors C), state, geometry, update() — no DOM access
js/render.js        canvas: resizeCanvas(), sprite cache, trails buffer, all draw*() functions
js/ui.js            toasts, tooltips (TIPS), hit-test and hover, HUD, controls (initUI)
js/main.js          bootstrap and requestAnimationFrame loop
i18n/*.js           dictionaries registered on window.I18N (it, en, es, fr, de, pt, ru, zh, ja, ko, ar); it.js is the source of truth
docs/fedelta-biologica.md   biological fidelity report (Italian)
.github/workflows/pages.yml GitHub Pages deployment on every push to main
```
Load order in `index.html` matters: util → i18n dictionaries → i18n → model → render → ui → main.

## 3. Architecture
- Classic scripts sharing one global scope. Top-level `let`/`const`/functions declared in one file are visible in the others. Nothing runs at load time except `main.js`, so cross-file references are safe. Keep it that way: no top-level calls in the other files.
- State lives in `model.js`. `render.js` reads it and only writes the trails buffer. `ui.js` reads it and calls model commands: `setMode`, `resetSim`, `startCaffeine`, `startMph`, `startExercise`, `toggleScroll`, `togglePause`. `model.js` never touches the DOM.
- Geometry (`PRE`, `CLEFT`, `POST`, `SNAP`, `VMAT_Z`, `MAO_Z`, `TERM`) is computed by `setGeometry(w, h)` and shared by simulation, drawing and hit-testing; `postGeom(i)` returns the geometry of the receiving cells.
- Time: `dt` is real seconds capped at 0.05; `sdt = dt × speedMul` drives the model. Caffeine, methylphenidate and exercise timers run in real seconds on purpose. The COMT kill probability is frame-rate independent: `1 − (1 − comtRate)^(sdt·60)`.
- Rendering: glow through cached sprites (no per-particle `shadowBlur`); trails through a persistence canvas faded each frame with `destination-out` (long jumps leave a dot, not a line); a hover highlight; every label goes through `T()`.
- Toasts: `buildToasts()` returns the list for the current frame; `renderToasts()` reconciles DOM nodes by key, so text updates do not re-trigger the entry animation. The reservoir trend uses a slow average (about 2 s), a value sampled once per second and a hysteresis state (`trendState`) to avoid flicker.
- Tooltips: `TIPS[key]()` returns `{t, c, b}`; canvas elements are found by `hitTest(mx, my)`; UI elements carry `data-tip="key"`; on touch a tap shows the tip for 4 s.
- i18n: every visible text goes through `T()`; strings may contain HTML (`<b>`, `<i class="c-*">`) and `{placeholders}`. Missing keys fall back to English, then Italian. Language resolution: `?lang=xx` → `localStorage` key `dopa.lang` → `navigator.language` → `it`. `applyI18n()` also sets `dir` (Arabic is right-to-left; the CSS uses logical properties such as `inset-inline-start` where it matters, and the canvas stays left-to-right).
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
- **Caffeine** (25 s): adenosine A2A antagonism. Threshold × 0.8, release × 1.10, and it halves the sleep-debt penalty on the threshold (`perceivedDebt()`): the Sleep bar shows the perceived debt solid and the masked share hatched. No effect on DAT1. When it wears off with debt above 20%, a 5 s "caffeine worn off" toast shows the perceived debt jumping back.
- **Methylphenidate** (30 s): DAT1 block. 85% of reuptake attempts fail, transporters move at 0.3× speed. Simulated side effects: sleep debt grows ×1.5 while active; less reuptake means less recycling (emergent); after the dose a 15 s rebound with DAT1 speed ×1.3.
- **Exercise** (12 s): +15 releases/s at 0.02 cost each, synthesis +0.5/s (reduced by sleep debt).
- **Easy rewards** (toggle, formerly "scrolling"): one burst of 12 releases per simulated second at 0.03 cost each (cue-triggered, low effort). While on, D2 sensitivity `d2Sens` drops by 0.02/s down to 0.3; off, it recovers by 0.004/s. The effective receptor count per neuron is `round(d2Count × d2Sens)` (min 2) and `rebuildReceptors()` runs whenever it changes, so receptors visibly disappear and return. A "D2 tolerance" toast stays while `d2Sens < 0.92`.
- **Sleep**: reset of debt, reservoir, cleft and counters; tolerance recovers only +0.1.
- **Sleep debt** grows with time awake at 0.0055 per simulated second (full in about 3 minutes), independent of the stimulus. It raises the threshold by ×(1 + 1.5 × perceived debt) and divides the signal half-life by (1 + 1.2 × debt).
- **Tonic release**: 3 releases/s always present (`TONIC_RATE`, cost `TONIC_COST` = 0.03 per vesicle), multiplied by `releaseMult()` like the stimulus-driven release. It gives caffeine and methylphenidate something to act on at low stimulus.
- **Pages**: `showPage()` in ui.js toggles the three `section.pg` blocks; `#mech`/`#bio` in the URL hash deep-link to the text pages; the main loop skips update/render while a text page is shown. Text pages are built by `renderDocs()` from dictionary keys `<prefix>.lead`, `<prefix>.N.t`, `<prefix>.N.b`; `{fig:name}` tokens are replaced by the SVG infographics of `js/figures.js` (labels via `fig.*` keys).
- **Settings**: `loadSettings()`/`saveSettings()` keep brain, age, stimulus and time scale in `localStorage` (`dopa.settings`); the language has its own key `dopa.lang`.
- **Age** (5–100, reference 30): `ageFactor()` scales both the baseline D2 count and the release rate (stimulus-driven and tonic), +1% per year below 30, −6% per decade above 30 (floor 0.5). Receptor count alone barely changed the outcome (free dopamine seeks free receptors), so the release side is what makes the slider visible.
- **Depletion**: below `DEPLETE_FROM` = 20% of the reserve, `supply()` scales every release (stimulus, tonic, easy-reward bursts) linearly down to 0, so an empty reserve really silences the synapse instead of releasing at full rate whenever it creeps above 1%.
- **D2 count**: `baseD2()` = d2Count × ageFactor, `effectiveD2()` = baseD2 × d2Sens (min 2). The D2 bar in the Brain card is full at `D2_MAX` = 15 (neurotypical at 5 years) with a tick at baseD2; the label shows effectiveD2.
- **Substances** (`SUBST` in model.js, one dose per click, real-time timers; while the effect lasts `d2Sens` drops by `des` per real second):
  - Nicotine: extra release +10/s and ×1.30 for 20 s, then ×0.85 for 15 s (dip); sleep debt ×1.2; D2 −1%/s.
  - Cannabis: extra release +6/s and ×1.15 for 40 s, then synthesis ×0.7 for 60 s; D2 −0.4%/s.
  - Alcohol: extra release +9/s and ×1.25 for 30 s, then threshold ×1.2 for 30 s; sleep debt ×1.3 during and after; D2 −0.8%/s.
  - Cocaine: DAT1 block 95%, speed ×0.3 and extra release +14/s for 20 s, then DAT1 speed ×1.5 and threshold ×1.3 for 20 s; sleep debt ×2; D2 −2.5%/s.
  The extra release (`boost`) is independent of the stimulus, so the substances act even at rest; easy rewards stay at 12 cheap releases/s. Desensitization (`des`, in real seconds) runs for as long as the effect lasts, so one dose costs 16% (cannabis) to 50% (cocaine) of the receptors, and the bar visibly drops while the toast is up.
  Effects compose through `releaseMult()`, `datBlock()`, `datSpeedMult()`, `threshMult()`, `sleepMult()`, `synthMult()`; methylphenidate and caffeine go through the same functions.

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
2. Add `<script src="i18n/xx.js"></script>` in `index.html` before `js/i18n.js`.
3. Add `{code:'xx', name:'<native name>', locale:'xx-XX', dir:'ltr'|'rtl'}` to `LANG_META` in `js/i18n.js`. The locale drives number formatting (use `ar-u-nu-latn` style tags to keep Latin digits).
4. Add a `<symbol id="flag-xx" viewBox="0 0 3 2">` to the SVG sprite at the top of `index.html` (simple shapes, no external images: the page must work offline).
5. Run the consistency check below; the menu builds itself from `LANG_META`.

Consistency check (node): load every dictionary and compare keys, `{placeholders}`, HTML tags and classes against `it`; all languages must have the same keys (253 in v3.5). The script used for v3.5 lives outside the repo; it loads `i18n/*.js` with a fake `window`, compares each language with `it` and lists the keys used by `T('...')` and `data-i18n`.

## 8. Roadmap and open items
- [ ] Screenshots or a short GIF for the README (`docs/screenshots/`)
- [ ] Native review of the machine-assisted translations (es, fr, de, pt, ru, zh, ja, ko, ar)
- [ ] Biology, see `docs/fedelta-biologica.md`: presynaptic D2 autoreceptors (release inhibition when cleft dopamine is high); true phasic bursts (trains of impulses) distinct from the tonic rate; region selector (striatum vs prefrontal cortex) changing DAT, COMT and NET weights; "raw materials" (diet, iron) as a synthesis multiplier and chronic stress (short-term release boost, long-term D2 loss) as new environmental factors
- [ ] Scrolling refinements: variable-reward schedule, cue learning (anticipation bursts before the reward), a visible D2 sensitivity gauge
- [ ] Optional: docked-vesicle animation on release; D1 receptors
- [ ] Accessibility: keyboard access to tooltips, reduced-motion mode

## 9. History
- v1, March 2026: single-file prototype `come-funziona-la-dopamina.html` (first commit)
- v2, 2026-09-07: visual rewrite (axon terminal, ring gauges, sprite glow, trails, toasts, tooltips, in-canvas rates), same model; fixes for the zero-size layout crash and the frame-rate-dependent COMT and toast timers
- v3, 2026-09-07: split into modules, i18n (it/en), documentation, own repository
- v3.1, 2026-09-07: biology corrections: caffeine as A2A antagonist, methylphenidate as DAT blocker, COMT weight reduced and declared a metaphor, MAO label, sleep debt grows with time awake
- v3.2, 2026-09-07: perceived vs real sleep debt in the Sleep bar, caffeine crash toast, methylphenidate side effects and rebound, compulsive scrolling with D2 tolerance
- v3.3, 2026-09-08: new header (logo, larger title, language dropdown with flags aligned to the content), grid layout, nine more languages (es, fr, de, pt, ru, zh, ja, ko, ar with RTL), footer with GitHub and coffee links, repository published on GitHub with Pages
- v3.4, 2026-09-08: D2 receptor bar with baseline tick, age slider, "easy rewards" and "tolerance" wording, "ADHD medication" button, larger recycle/degrade icons, reservoir moved to the Brain card, Substances card (nicotine, cannabis, alcohol, cocaine) with after-effects and per-dose D2 cost
- v3.5, 2026-09-08: footer with GitHub and heart icons, yellow full-height tick on the D2 bar, three pages (Simulation, How it works with SVG infographics and glossary, Model vs reality), notice that all values are indicative, wider layout with icon-left buttons, cards regrouped (Interventions: caffeine, medication, exercise, sleep; Addictions: easy rewards and substances), neurotypical by default and settings saved in localStorage, D2 bar with a fixed full scale (15), tonic background release, substances with stimulus-independent extra release and continuous D2 desensitization while the effect lasts (shown live in the substance toast), averaged receptive-neuron count, canvas cues (caffeine halo, barred DAT1, exercise tint, moving threshold tick), sleep also ends caffeine/medication/exercise, all texts rewritten for non-biologists and re-translated

Earlier single-file versions can be retrieved with `git show <commit>:come-funziona-la-dopamina.html`.
