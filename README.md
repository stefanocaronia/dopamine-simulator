# Dopamine Simulator

An interactive, educational simulation of a dopamine synapse. Watch vesicles fuse, dopamine molecules diffuse across the cleft, bind D2 receptors, get pulled back by DAT1 transporters, recycled by VMAT2 or destroyed by COMT and MAO. Flip between a **neurotypical** and an **ADHD** synapse, play with stimulus, age, caffeine, medication, exercise, sleep debt, easy rewards and substances, and read what is happening in real time. Two more pages explain the mechanism (with infographics and a glossary) and list what the model simplifies and why.

**Live demo:** https://stefanocaronia.github.io/dopamine-simulator/

> This is a didactic model, not a quantitative one. Everything is slowed down about 100× to be visible and several mechanisms are simplified on purpose. The biological fidelity notes, written for the authors and for the biologists reviewing the model, are in [docs/fedelta-biologica.md](docs/fedelta-biologica.md) (Italian).

## Features
- Three pages: the simulation, "How it works" (short sections, six SVG infographics, a glossary with the same colour code as the simulation) and "Model vs reality" (element-by-element fidelity table, main compromises, references)
- Presynaptic axon terminal with vesicle pool, SNAP25 active zone, VMAT2 recycling and mitochondrial MAO; tonic background release plus stimulus-driven release
- Synaptic cleft with DAT1 reuptake transporters and a few roaming COMT enzymes (an explicit metaphor: real COMT is mostly intracellular)
- Three receiving neurons with D2 receptors and a ring gauge showing signal against the activation threshold
- ADHD vs neurotypical parameter sets (receptor count, DAT1 density and speed, COMT activity, recycling share)
- Interventions: caffeine (adenosine A2A antagonist that masks part of the sleep debt), methylphenidate (DAT1 blocker, with its side effects and end-of-dose rebound), exercise, sleep; a sleep debt that grows with time awake; reservoir depletion
- Easy rewards (scrolling, gaming, gambling…): cheap cue-triggered dopamine bursts that light the neurons up while D2 receptors visibly disappear from the membrane (tolerance), then recover slowly once you stop
- Substances: nicotine, cannabis, alcohol and cocaine, each with its acute effect, its after-effect (dip, slowed synthesis, hangover, crash) and a per-dose cost in D2 receptors
- A D2 receptor bar with a baseline tick (brain type × age) and an age slider from 5 to 100 years
- Live "state toasts" explaining what is going on (brain mode, stimulus level with the average number of receptive neurons, reserve trend, interventions, sleep debt, depletion, pause)
- Visual cues on the canvas for every intervention: orange halo on the D2 with caffeine, barred DAT1 with methylphenidate or cocaine, greenish terminal during exercise, a threshold tick that moves on the ring gauge with sleep debt, caffeine and after-effects
- Settings (brain, age, stimulus, time scale, language) are remembered in `localStorage`
- A colored tooltip on every element, on the canvas and in the controls, with live numbers
- Eleven UI languages (Italian, English, Spanish, French, German, Portuguese, Russian, Chinese, Japanese, Korean, Arabic with right-to-left layout), auto-detected and switchable from the header or with `?lang=xx`. Italian is the source; the others are machine-assisted translations and welcome native review
- No build step, no dependencies: plain HTML, CSS and JavaScript. Works from a double-click on `index.html`

## Controls
| Control | Effect |
|---|---|
| Neurotypical / ADHD | Switches the parameter set (neurotypical by default) |
| Stimulus | Novelty, challenge, fear: sets the impulse frequency and the release rate |
| Time | Simulation speed, 1× to 8× |
| Age | 5–100 years: scales the baseline number of D2 receptors and the release rate (+1% per year under 30, −6% per decade over 30) |
| ☕ Caffeine | 25 s: D2 respond more (threshold −20%), release +10%, masks half of the sleep-debt penalty (hatched in the Sleep bar); the masked debt comes back when it wears off |
| 💊 ADHD medication | Methylphenidate, 30 s: DAT1 blocked, 85% of reuptake attempts fail; costs: less recycling, sleep debt ×1.5, 15 s rebound with faster DAT1 afterwards |
| 🏃 Exercise | 12 s: gentle release at low vesicle cost, faster synthesis |
| 📱 Easy rewards | Toggle: a burst of 12 cheap releases every second; D2 sensitivity drops to 30% and recovers slowly once off (in the Addictions card together with the substances) |
| 💤 Sleep | Reset: clears the sleep debt, refills the reservoir; D2 tolerance recovers only 10% |
| 🚬 Nicotine | 20 s: extra release +10/s (plus +30% of the stimulus-driven release), then a 15 s dip (−15%); sleep debt ×1.2; −8% D2 per dose |
| 🌿 Cannabis | 40 s: extra release +6/s (plus +15%), then synthesis ×0.7 for 60 s; −5% D2 per dose |
| 🍷 Alcohol | 30 s: extra release +9/s (plus +25%), then hangover (threshold +20% for 30 s); sleep debt ×1.3; −8% D2 per dose |
| ❄️ Cocaine | 20 s: DAT1 blocked 95% and extra release +14/s, then crash (DAT1 ×1.5, threshold +30% for 20 s); sleep debt ×2; −20% D2 per dose |
| ⏸ / space bar | Pause and resume |

## How the model works
1. A tonic background of 3 releases per second is always present; the stimulus adds up to 30 per second. Each fusion costs 0.05% of the reserve (0.03% for the tonic ones); synthesis refills 0.2% per second. Below 20% of the reserve the release rate drops in proportion (depletion).
2. A released molecule diffuses (Brownian motion plus drift) toward the receiving membrane and is attracted by free D2 receptors.
3. Near the presynaptic membrane, DAT1 reuptake catches it with probability 0.94 (ADHD) or 0.78 (neurotypical); methylphenidate cuts that by 85%.
4. Recaptured dopamine is recycled by VMAT2 (55% ADHD, 75% neurotypical) or destroyed by MAO. In the cleft, COMT occasionally destroys what it touches, and every molecule is gone after 2 s anyway.
5. Each D2 binding adds 0.5 to the neuron's signal, which decays with a 0.6 s half-life. Above the threshold (0.8) the neuron is "receptive". Sleep debt, which grows with time awake, raises the threshold and shortens the half-life; caffeine lowers the threshold.
6. Easy rewards downregulate D2 receptors: the number of receptors per neuron shrinks with exposure (down to 30%), so the same stimulus no longer makes the neurons receptive, and only more of the same does. Receptors return slowly once it stops. Substances add stimulus-independent release and cost receptors per dose.
7. "Receptive" does not mean "activated": dopamine makes the receiving neuron ready to respond to its other inputs. The D2 count per neuron is base (brain type × age) × sensitivity; the bar in the Brain card is full at 15, the maximum of the simulation.

All parameters live at the top of [js/model.js](js/model.js).

## Biological fidelity
The overall flow is faithful: impulses → fusion → cleft → receptors, with reuptake, recycling and degradation as alternative fates of the same molecule. The ADHD differences follow the classical hypotheses of the literature rather than settled facts. Remaining compromises, in order of importance:

1. No presynaptic **D2 autoreceptors**, so sustained stimulation does not self-limit.
2. Tonic and phasic activity are simplified: the background release is just a lower rate, not a different firing mode.
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
js/figures.js       SVG infographics for the "How it works" page (labels via T())
i18n/*.js           translation dictionaries (it is the source; 11 languages)
docs/               development guide and biological fidelity notes
.github/workflows/  GitHub Pages deployment
```

## Localization
Italian is the source language. To add a language, copy `i18n/it.js` to `i18n/xx.js`, translate the values (keep keys, HTML tags and `{placeholders}`), include the file in `index.html`, add an entry to `LANG_META` in `js/i18n.js` and a `#flag-xx` symbol to the SVG sprite at the top of `index.html`. Details in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Corrections to the existing translations are very welcome.

## Publishing on GitHub Pages
The workflow in `.github/workflows/pages.yml` deploys the repository root on every push to `main` (Settings → Pages → Source: **GitHub Actions**).

## Contributing
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) describes the architecture, the conventions, how to test and what is still open.

## License
[MIT](LICENSE) © 2026 Stefano Caronia. Use it, modify it, fork it, embed it in your own material: just keep the copyright and license notice, which is how the original author stays credited.
