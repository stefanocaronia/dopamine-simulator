# Dopamine Simulator — ADHD vs Neurotypical

An interactive, educational simulation of a dopamine synapse. Watch vesicles fuse, dopamine molecules diffuse across the cleft, bind D2 receptors, get pulled back by DAT1 transporters, recycled by VMAT2 or destroyed by COMT and MAO. Flip between an **ADHD** and a **neurotypical** synapse, play with stimulus, caffeine, methylphenidate, exercise and sleep debt, and read what is happening in real time.

**Live demo:** `https://<user>.github.io/dopamine-simulator/` *(to be enabled, see [Publishing](#publishing-on-github-pages))*

> This is a didactic model, not a quantitative one. Everything is slowed down about 100× to be visible and several mechanisms are simplified on purpose. The biological fidelity notes, written for the authors and for the biologists reviewing the model, are in [docs/fedelta-biologica.md](docs/fedelta-biologica.md) (Italian).

## Features
- Presynaptic axon terminal with vesicle pool, SNAP25 active zone, VMAT2 recycling and mitochondrial MAO
- Synaptic cleft with DAT1 reuptake transporters and a few roaming COMT enzymes (an explicit metaphor: real COMT is mostly intracellular)
- Three receiving neurons with D2 receptors and a ring gauge showing signal against the activation threshold
- ADHD vs neurotypical parameter sets (receptor count, DAT1 density and speed, COMT activity, recycling share)
- Interventions: caffeine (adenosine A2A antagonist), methylphenidate (DAT1 blocker), exercise, sleep; a sleep debt that grows with time awake; reservoir depletion
- Live "state toasts" explaining what is going on (brain mode, stimulus level, reservoir trend, interventions, sleep debt, depletion, pause)
- A colored tooltip on every element, on the canvas and in the controls, with live numbers
- Italian and English UI, auto-detected and switchable (`?lang=en`)
- No build step, no dependencies: plain HTML, CSS and JavaScript. Works from a double-click on `index.html`

## Controls
| Control | Effect |
|---|---|
| ADHD / Neurotypical | Switches the parameter set |
| Stimulus | Novelty, challenge, fear: sets the impulse frequency and the release rate |
| Time | Simulation speed, 1× to 8× |
| ☕ Caffeine | 25 s: D2 respond more (threshold −20%), release +10%, masks half of the sleep-debt penalty |
| 💊 Methylphenidate | 30 s: DAT1 blocked, 85% of reuptake attempts fail |
| 🏃 Exercise | 12 s: gentle release at low vesicle cost, faster synthesis |
| 💤 Sleep | Reset: clears the sleep debt, refills the reservoir |
| ⏸ / space bar | Pause and resume |

## How the model works
1. The stimulus sets the rate of vesicle fusion, up to 30 per second. Each fusion costs 0.05% of the reservoir; synthesis refills 0.2% per second.
2. A released molecule diffuses (Brownian motion plus drift) toward the receiving membrane and is attracted by free D2 receptors.
3. Near the presynaptic membrane, DAT1 reuptake catches it with probability 0.94 (ADHD) or 0.78 (neurotypical); methylphenidate cuts that by 85%.
4. Recaptured dopamine is recycled by VMAT2 (55% ADHD, 75% neurotypical) or destroyed by MAO. In the cleft, COMT occasionally destroys what it touches, and every molecule is gone after 2 s anyway.
5. Each D2 binding adds 0.5 to the neuron's signal, which decays with a 0.6 s half-life. Above the threshold (0.8) the neuron is "receptive". Sleep debt, which grows with time awake, raises the threshold and shortens the half-life; caffeine lowers the threshold.

All parameters live at the top of [js/model.js](js/model.js).

## Biological fidelity
The overall flow is faithful: impulses → fusion → cleft → receptors, with reuptake, recycling and degradation as alternative fates of the same molecule. The ADHD differences follow the classical hypotheses of the literature rather than settled facts. Remaining compromises, in order of importance:

1. No presynaptic **D2 autoreceptors**, so sustained stimulation does not self-limit.
2. No **tonic** baseline release: at zero stimulus nothing is released, while real dopamine neurons fire at about 4 Hz all the time.
3. One region only. In the striatum DAT dominates clearance; in the prefrontal cortex COMT and the noradrenaline transporter NET matter more. A region selector is on the roadmap.
4. The "more DAT in ADHD" setting is the classical hypothesis; PET studies on never-medicated patients disagree.

The full table with references is in [docs/fedelta-biologica.md](docs/fedelta-biologica.md). Corrections from biologists are welcome: open an issue.

## Run locally
Open `index.html` in a browser, or serve the folder with any static server:

```bash
python -m http.server 8080
```

then visit http://localhost:8080/.

## Project structure
```
index.html          markup; texts are injected by the i18n layer
css/style.css       styles
js/util.js          small helpers
js/i18n.js          T(key, params), language detection and switching
js/model.js         parameters, state, geometry, simulation step (no DOM)
js/render.js        canvas drawing, sprites, trails
js/ui.js            toasts, tooltips, hit-testing, controls, HUD
js/main.js          bootstrap and animation loop
i18n/it.js, en.js   translation dictionaries
docs/               development guide and biological fidelity notes
.github/workflows/  GitHub Pages deployment
```

## Localization
Italian is the source language. To add a language, copy `i18n/it.js` to `i18n/xx.js`, translate the values (keep keys, HTML tags and `{placeholders}`), include the file in `index.html`, add a button in the header and the code in `LANGS` in `js/i18n.js`. Details in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Publishing on GitHub Pages
The workflow in `.github/workflows/pages.yml` deploys the repository root on every push to `main`. One-time setup: Settings → Pages → Source: **GitHub Actions**. Then put the URL at the top of this file and in the `footer` string of the dictionaries.

## Contributing
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) describes the architecture, the conventions, how to test and what is still open.

## License
Not chosen yet.
