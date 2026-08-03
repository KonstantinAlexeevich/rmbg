# Chrome Web Store promo graphics

HTML templates rendered to exact CWS sizes with headless Chrome.

## Outputs (`promo/out/`)

| File | Size | Slot |
| --- | --- | --- |
| `01-hero.png` | 1280×800 | Screenshot 1 — bulk flow: mixed-format photos → studio → uniform cutouts |
| `02-edges.png` | 1280×800 | Screenshot 2 — before/after split |
| `03-canvas.png` | 1280×800 | Screenshot 3 — canvas size / padding / transparent vs solid |
| `04-presets.png` | 1280×800 | Screenshot 4 — export ZIP modal |
| `05-privacy.png` | 1280×800 | Screenshot 5 — batch running locally / on-device |
| `tile-440.png` | 440×280 | Small promo tile (required) |
| `marquee-1400.png` | 1400×560 | Marquee promo tile (optional) |

All outputs are opaque 24-bit PNG. If a template ever introduces transparency the
renderer writes a `.jpg` alongside it — upload that one instead, CWS rejects alpha.

## Regenerate

```bash
node promo/render.mjs
```

Requires Google Chrome at the default macOS path (override with `CHROME_PATH`).

## Source assets

- `samples/in/` — original photos (mixed aspect ratios)
- `samples/out/` — cutouts exported from the extension (500×500 transparent PNG)
- `captures/` — studio screenshots at 1280×800 @2× (`studio.png`, `progress.png`,
  `before-after.png`, `export.png`) plus a tall sidebar node crop (`menu-solid.png`,
  287×916). `empty.png` and `menu-exports.png` are kept as spares — no template reads them.
- Prefer DevTools node / device screenshots (no browser chrome, no macOS window shadow)

To refresh cutouts: load `dist/` unpacked → drop `samples/in/` → Amazon 1:1 preset (500×500, transparent, 10% pad) → Export ZIP → copy PNGs into `samples/out/`.

## Cropping a capture

The studio is 1280×800 with large idle regions, so a screenshot scaled to fit the
promo frame leaves the UI text unreadable. `.win` in `templates/common.css` stacks
vertical slices of a capture instead: each `.win-slice` picks a band (`--y`, `--h`
in capture CSS px) and they render as one continuous window, so empty middles get
dropped and the rest is shown larger. `--k` is display px per capture CSS px —
above 1 the capture is zoomed past 1:1, which is what keeps the export panel in
`03-canvas` legible. `--x` / `--w` narrow the visible column the same way.
