# Chrome Web Store promo graphics

HTML templates rendered to exact CWS sizes with headless Chrome.
Studio UI frames in `captures/` are refreshed automatically from the live web studio.

## Outputs (`promo/out/`)

| File | Size | Slot |
| --- | --- | --- |
| `01-hero.png` | 1280×800 | Screenshot 1 — bulk flow: mixed-format photos → studio → uniform cutouts |
| `02-edges.png` | 1280×800 | Screenshot 2 — before/after split |
| `03-canvas.png` | 1280×800 | Screenshot 3 — canvas size / padding / transparent vs solid |
| `04-presets.png` | 1280×800 | Screenshot 4 — export ZIP modal |
| `05-context.png` | 1280×800 | Screenshot 5 — right-click Save without background |
| `tile-440.png` | 440×280 | Small promo tile (required) |
| `marquee-1400.png` | 1400×560 | Marquee promo tile (optional) |

All outputs are opaque 24-bit PNG. If a template ever introduces transparency the
renderer writes a `.jpg` alongside it — upload that one instead, CWS rejects alpha.

## Regenerate

Prerequisites: Chromium for Playwright once (`npx playwright install chromium`), and a
warm model cache (first capture downloads ONNX into `promo/.pw-profile/`).

```bash
# Studio must be reachable (script reuses http://localhost:5173/studio or starts dev:web)
npm run promo          # capture UI + cutouts, then render templates → promo/out/
npm run promo:capture  # only refresh promo/captures/ and promo/samples/out/
npm run promo:render   # only HTML templates → promo/out/
```

Override studio URL with `STUDIO_URL`. Set `SKIP_SERVER=1` to fail if the studio is down
instead of spawning Vite. Chrome for the HTML renderer: `CHROME_PATH` (default macOS app).

## Source assets

- `samples/in/` — original photos (mixed aspect ratios); checked in
- `samples/out/` — cutouts (500×500 transparent PNG); refreshed by `promo:capture`
- `captures/` — studio screenshots at 1280×800 @2× (`studio.png`, `before-after.png`,
  `export.png`) plus sidebar crop (`menu-solid.png`); refreshed by `promo:capture`
- `promo/.pw-profile/` — Playwright profile (gitignored) so the model stays cached

Capture seeds four exports (`500px 1:1`, `Original`, `720p`, `Shop white`) and
injects a slightly denser grid (`minmax(200px)`) so cards read better at CWS scale.

## Cropping a capture

The studio is 1280×800 with large idle regions, so a screenshot scaled to fit the
promo frame leaves the UI text unreadable. `.win` in `templates/common.css` stacks
vertical slices of a capture instead: each `.win-slice` picks a band (`--y`, `--h`
in capture CSS px) and they render as one continuous window, so empty middles get
dropped and the rest is shown larger. `--k` is display px per capture CSS px —
above 1 the capture is zoomed past 1:1, which is what keeps the export panel in
`03-canvas` legible. `--x` / `--w` narrow the visible column the same way.

Retune those CSS variables only when the studio layout changes enough that a slice
misses its target (sidebar width, export settings height, etc.).
