# 🌊 Reef Rescue

A tiny browser game about cleaning a coral reef — and learning what happens to the plastic afterwards.

> Made for **Technica 2026** (theme: *"Dare to Dive!"*) — a 24-hour hackathon, Oct 17–18 2026.

**Play now → https://maebahesioru.github.io/reef-rescue/**

**Watch the demo (1:41) → https://youtu.be/TesxHGHug8U**

## The problem

Every year millions of tonnes of plastic reach the ocean. It drifts, sinks, and breaks into pieces that entangle wildlife and smother coral. Most people never see this — and the few who do, see it once, on a screen.

Reef Rescue makes the problem playable: you *feel* the currents, your limited air, and the animals you must not touch — and then your dive report shows where the plastic goes and what collecting it means. The goal is simple: after five dives, you understand the cleanup a little better than you did before.

## What's in the game

- **5 dive zones**, each busier and faster than the last — currents push the garbage around.
- **Collect drifting plastic** in 5 types (bottles, bags, straws, cans, ghost-net scraps), worth different points. Sweep a zone clean for a combo bonus.
- **Oxygen is your clock** — dive to clean, swim back to the surface (top of the screen) to breathe.
- **Don't touch the wildlife!** Bumping a fish, turtle or jellyfish scares it and costs you air.
- **Dive report** after every run: per-type counts, estimated collected weight, an estimated CO₂e saving, and rotating **ocean fact cards**.
- **Accessibility built in**: fully playable with the keyboard alone, Okabe–Ito colourblind-safe palette, large-text option, game-speed options (Relaxed / Normal / Brisk), reduced-motion support, and screen-reader announcements for the important events.

### Controls

| Action | Keys |
|---|---|
| Swim | `WASD` / Arrow keys — or hold the mouse / finger to steer |
| Start / advance | `SPACE` or `ENTER` (or click) |
| Pause | `P` or `ESC` |
| Sound on / off | `M` |
| Dive again (results) | `R` · Back to title: `T` |

Options (speed, text size, motion) live on the title screen and the pause menu, and are remembered between visits.

## Educational content

- The result screen shows per-type counts, estimated collected weight, an estimated CO₂e saving, and rotating **ocean fact cards**.
- Figures are approximate, drawn from commonly cited published research (UNEP, Ocean Conservancy, WEF, *Scientific Reports*). This is a game, not a scientific instrument.

## Accessibility

- Fully playable **keyboard-only** (plus optional mouse/touch steering).
- Colourblind-friendly palette (Okabe–Ito), **no screen shake**, honours `prefers-reduced-motion`.
- Large text, visible focus outlines, and a DOM-based HUD with screen-reader announcements (`aria-live`).
- No time limits on reading: the game never auto-advances a screen.

## Tech

- Vanilla **HTML + CSS + JavaScript**, one `<canvas>`, synthesised sound via **Web Audio**. Zero dependencies, zero build step, no API keys.
- All graphics are drawn in code — no image assets.
- Hosted free on **GitHub Pages**; source is this repository.

## AI credit

**Built with AI assistant assistance.** The code was written and iterated by an AI coding assistant working under human direction; the human participant set the concept, made the design and gameplay decisions, and tested the finished game. All assets are code, generated during the hackathon window.

## License

MIT — see [LICENSE](LICENSE).
