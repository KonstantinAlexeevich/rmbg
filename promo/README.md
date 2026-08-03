# Chrome Web Store promo graphics

HTML templates rendered to exact CWS sizes with headless Chrome.

## Outputs (`promo/out/`)

| File | Size | Slot |
| --- | --- | --- |
| `01-hero.png` / `.jpg` | 1280×800 | Screenshot 1 — bulk flow |
| `02-edges.png` / `.jpg` | 1280×800 | Screenshot 2 — before/after edges |
| `03-sidebar.png` / `.jpg` | 1280×800 | Screenshot 3 — layout / export settings |
| `04-presets.png` / `.jpg` | 1280×800 | Screenshot 4 — export ZIP modal |
| `05-privacy.png` / `.jpg` | 1280×800 | Screenshot 5 — empty studio / on-device |
| `tile-440.png` / `.jpg` | 440×280 | Small promo tile (required) |

Prefer the JPEG when the PNG still has an alpha channel — CWS wants 24-bit PNG or JPEG, no transparency.

## Regenerate

```bash
node promo/render.mjs
```

Requires Google Chrome at the default macOS path (override with `CHROME_PATH`).

## Source assets

- `samples/in/` — original photos (mixed aspect ratios)
- `samples/out/` — cutouts exported from the extension (500×500 transparent PNG)
- `captures/` — studio screenshots at 1280×800 @2× (`studio.png`, `before-after.png`, `bulk-export.png`, `empty.png`) plus tall sidebar crop (`menu.png`)
- Prefer DevTools node / device screenshots (no browser chrome, no macOS window shadow)

To refresh cutouts: load `dist/` unpacked → drop `samples/in/` → Amazon 1:1 preset (500×500, transparent, 10% pad) → Export ZIP → copy PNGs into `samples/out/`.
