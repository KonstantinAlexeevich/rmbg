# Chrome Web Store — submission copy and reviewer notes

Working draft for the Developer Dashboard fields. Listing marketing text lives in [description.md](description.md). Privacy policy: [privacy.md](privacy.md).

Privacy policy URL (after the repo is public / this file is on `main`)

---

## Single purpose

Removes image backgrounds locally in the browser using an on-device AI model, then exports transparent or solid-color cutouts (including batch ZIP export).

---

## Remote code

**Answer in the dashboard:** No, I am not using remote code.

**Justification if a reviewer asks / if the form requires a note:**

All executable logic (JavaScript and the ONNX Runtime WebAssembly files) is bundled inside the extension package. The extension does **not** fetch or evaluate remote scripts.

The only network fetch is a data file: ONNX model weights (`.onnx`) from a pinned Hugging Face URL. Weights are verified with a fixed SHA-256 digest before use and are interpreted only by the bundled ONNX Runtime. Per Chrome Web Store MV3 guidance, fetching remote resources that are not used to evaluate logic (for example images or similar data) is allowed; `.onnx` here is treated as model data, not remotely hosted code. The same pattern is used by published Transformers.js-based extensions that keep the runtime local and download model assets at runtime.

`connect-src` in the extension CSP is limited to `'self'`, `https://huggingface.co`, `https://*.hf.co`, and `https://*.aws.cdn.hf.co`.

---

## Permission justifications

### `storage`

Stores user preferences, export presets, model-cache metadata, and (via IndexedDB / Cache Storage APIs used from the studio page) local session artefacts so the studio can restore work and avoid re-downloading the model.

### `downloads`

Saves exported images and ZIP archives when the user explicitly exports. No automatic downloads of unrelated content.

### Host permissions

None. Model weights are fetched with `fetch(..., { mode: 'cors' })` without `host_permissions`. Keep it that way: host permissions push items into deeper review.

---

## Data usage (Privacy practices tab)

- **Data collected from users:** none of the dashboard categories for PII / browsing history / website content / etc. User images never leave the device.
- **Certifications:** not sold; not used for unrelated purposes; Limited Use compliance.
- **Disclosure to keep consistent with the privacy policy:** the one-time model download can expose the user’s IP to Hugging Face / its CDN. That is connection metadata for a weight file, not collection of image content by the developer.

---

## Notes to reviewer

PNG Maker (package `rmbg`) is a Manifest V3 studio that removes backgrounds **on-device**.

1. **No remotely hosted code.** JS and ORT `.wasm` / `.mjs` ship in the package under `assets/` and `ort/`. Workers are separate module files created with `new Worker(new URL(..., import.meta.url), { type: 'module' })`, not blob-URL workers.
2. **Single network class of request:** one-time download of `.onnx` weights from a commit-pinned Hugging Face URL, then SHA-256 check, then Cache Storage. User images are never uploaded.
3. **Minimal permissions:** only `storage` and `downloads`. No `tabs`, no content scripts, no broad host access.
4. **CSP:** `script-src 'self' 'wasm-unsafe-eval'` (required for WebAssembly); `connect-src` narrowed to Hugging Face / HF CDN hosts used for the weight file.
5. **Known `new Function(` string in the built worker / ORT glue:** comes from the official `onnxruntime-web` embind helper inside the bundled runtime. It is not used to load remote code; under the extension CSP such dynamic evaluation cannot pull network scripts. See the post-build check in `scripts/copy-ort-assets.mjs`.

Happy to clarify any path in the ZIP package.

---

## Pre-submit technical checklist (2026-08-03)

### Bundle audit (`npm run build` → `dist/`)

| Check | Result |
| --- | --- |
| `eval(` in JS bundles | Not found |
| `createObjectURL(new Blob([` worker pattern | Not found |
| Workers as separate hashed files | Yes (`assets/segmentation.worker-*.js`, `assets/export.worker-*.js`) |
| ORT loaded from package via `chrome.runtime.getURL('ort/')` | Yes |
| `new Function(` | Present only in ORT embind glue (segmentation worker + `ort/*.mjs`) — documented exception |
| External script / CDN imports for runtime | Not found |
| Manifest permissions | `storage`, `downloads` only |
| Package size (without `.onnx` weights) | ~24 MB (dominated by `ort-wasm-simd-threaded.asyncify.wasm`) |

### Network / isolation (as far as automatable without loading unpacked Chrome)

| Check | Result |
| --- | --- |
| HF resolve with `Origin: chrome-extension://…` | HTTP 302, `Access-Control-Allow-Origin` reflects the extension Origin |
| HF CDN (`us.aws.cdn.hf.co`) after redirect | `Access-Control-Allow-Origin: *` on ranged GET |
| Manifest COEP / COOP | `require-corp` + `same-origin` (enables `crossOriginIsolated` for SharedArrayBuffer / threaded WASM) |
| `fetch` uses `mode: 'cors'` | Yes (`src/core/inference/model-loader.ts`) |

**Manual smoke test — done (2026-08-03):** loaded `dist` as an unpacked extension in a clean profile, opened the studio via the toolbar icon.

| Check | Result |
| --- | --- |
| `crossOriginIsolated` on the studio page | `true` |
| `navigator.gpu` / backend badge | WebGPU detected, badge shows GPU |
| First-run model download | Single request to `huggingface.co/SacredNoir/isnet-general-use-onnx/resolve/<pinned-commit>/isnet-general-use.onnx` (fp32 variant, matches WebGPU path) |
| Downloaded file SHA-256 / size | `4c56bbc21588459dda11efba5a4a8ee163969da109ae170fb1988c1c2ea4a90a`, 176 213 804 bytes — matches the pinned reference in [07-build.md](../07-build.md) |
| Cache Storage after download | `rmbg-models` cache holds exactly the one weight file; no other origins touched |
| Storage quota | `navigator.storage.estimate()` — 176 MB used of ~10.9 GB quota |
| UI render | Empty state, header (logo + GPU badge), Edge refinement / Exports panel all render as specified in [06-ui.md](../06-ui.md) |

Not re-verified in this pass: `crossOriginIsolated` inside the segmentation worker itself (CDP session to the nested ORT thread-pool workers stalled; the main-thread isolation being `true` combined with a successful WebGPU warm-up is strong indirect evidence, but worth a direct check with real DevTools before submission if time allows).

---

## Store listing graphics

Source templates and assets live under [`promo/`](../../promo/). Regenerate with `node promo/render.mjs` (headless Chrome + `sips`). Upload the files from `promo/out/`.

| Dashboard field | File | Size |
| --- | --- | --- |
| Store icon | [`public/icons/icon-128.png`](../../public/icons/icon-128.png) | 128×128 |
| Screenshot 1 | `promo/out/01-hero.png` | 1280×800 |
| Screenshot 2 | `promo/out/02-edges.png` | 1280×800 |
| Screenshot 3 | `promo/out/03-canvas.png` | 1280×800 |
| Screenshot 4 | `promo/out/04-presets.png` | 1280×800 |
| Screenshot 5 | `promo/out/05-privacy.png` | 1280×800 |
| Small promo tile | `promo/out/tile-440.png` | 440×280 |
| Marquee promo tile | `promo/out/marquee-1400.png` | 1400×560 |

All rendered PNGs are opaque (no alpha), square-corner full-bleed, matching CWS image rules.
