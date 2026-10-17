# 🌊 Reef Rescue

A tiny browser game about cleaning a coral reef — and learning what happens to the plastic afterwards.

> Made for **Technica 2026** (theme: *"Dare to Dive!"*) — a 24-hour hackathon, Oct 17–18 2026.

## Play

- **Live demo:** https://maebahesioru.github.io/reef-rescue/ *(GitHub Pages — enabled at release)*
- **Local:** open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

No build step, no dependencies, no API keys.

## How to play

1. **Collect drifting plastic** — currents get stronger and the water gets busier every level.
2. **Watch your O₂ gauge** — dive to clean, swim back to the surface (top of the screen) to breathe.
3. **Don't touch the wildlife!** Bumping a fish, turtle or jellyfish scares it and costs you oxygen.
4. **Clear all 5 zones** to restore the reef. Your dive report shows what you collected and the estimated impact.

### Controls

| Action | Keys |
|---|---|
| Swim | `WASD` / Arrow keys — or hold the mouse / finger to steer |
| Start / advance | `SPACE` or `ENTER` (or click) |
| Pause | `P` or `ESC` |
| Sound on / off | `M` |
| Dive again (results) | `R` · Back to title: `T` |

## Educational content

- The result screen shows per-type counts, estimated collected weight, an estimated CO₂e saving, and rotating **ocean fact cards**.
- Figures are approximate, drawn from commonly cited published research (UNEP, Ocean Conservancy, WEF, *Scientific Reports*). This is a game, not a scientific instrument.

## Accessibility

- Fully playable **keyboard-only** (plus optional mouse/touch steering).
- Colourblind-friendly palette (Okabe–Ito), **no screen shake**, honours `prefers-reduced-motion`.
- Large text, visible focus outlines, and a DOM-based HUD with screen-reader announcements (`aria-live`).

## Tech

- Vanilla **HTML + CSS + JavaScript**, one `<canvas>`, synthesised sound via **Web Audio**. Zero dependencies.
- All graphics are drawn in code — no image assets.

## Credits

- Built with **AI assistant assistance** (design + code); concept, direction, and testing by a human.
- Made for Technica 2026. This project is not cross-submitted to any other hackathon.

## License

MIT — see [LICENSE](LICENSE).
