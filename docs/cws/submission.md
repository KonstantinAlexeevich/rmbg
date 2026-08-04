# Chrome Web Store — submission copy and reviewer notes

Working draft for the Developer Dashboard fields. Listing marketing text lives in [description.md](description.md). Privacy policy: [privacy.md](privacy.md).

> **Sync note (2026-08):** architecture moved to a **hosted web studio** + thin MV3
> extension ([02-architecture.md](../02-architecture.md), Р-27 in
> [08-decisions.md](../08-decisions.md)). Much of the copy below was written for
> “studio + ORT inside the ZIP”. **Rewrite before the next store submission**
> (package layout, remote-code story, host permissions for the studio origin, privacy).

Privacy policy URL (after the repo is public / this file is on `main`)

---

## Single purpose

Removes image backgrounds locally in the browser using an on-device AI model, then exports transparent or solid-color cutouts (including batch ZIP export).

---

## Remote code

**Answer in the dashboard:** No, I am not using remote code.

**Draft justification (align with final hosting before submit):**

Application JavaScript and ONNX Runtime WebAssembly ship either from the **first-party studio deploy** (`dist-web`, same origin as the studio page) or from the **extension package** (service worker / about). They are **not** evaluated from a third-party code CDN. The extension does not `eval` network scripts.

The only **third-party** network class of request is a data file: ONNX model weights (`.onnx`) from a pinned Hugging Face URL, SHA-256 verified, used only by the local runtime.

Extension CSP `connect-src` (extension pages / SW): `'self'`, `http:`, `https:` (+ HF).
Needed so the SW can fetch an image after the user grants optional access to that image
origin. CSP is not an install-time host permission.

---

## Permission justifications

### `storage`

Extension-side menu export list and short-lived import jobs (`chrome.storage.session`).
Studio settings on the web target use site `localStorage` (platform layer).

### `downloads`

File save when export runs in an extension context. Pure web studio uses browser download / File System Access.

### `contextMenus`

Right-click on images: add to studio or save with a chosen export.

### `activeTab` + `scripting`

Context-menu user gesture; `scripting` used for tab-scoped `blob:` images.

### Host permissions

**Required:** studio origin only (dev: `http://localhost:5173/*`) — focus tab + studio bridge CS.

**Optional:** `http://*/*` / `https://*/*` — on import, Chrome prompts for the **specific
image origin** (e.g. a photo CDN). Not granted for all sites at install.

**Prod:** replace localhost studio matches with the public studio origin.
---

## Data usage (Privacy practices tab)

- **Data collected from users:** none of the dashboard categories for PII / browsing history / website content. User images never leave the device.
- **Certifications:** not sold; not used for unrelated purposes; Limited Use.
- **Disclosure:** one-time model download can expose IP to Hugging Face / its CDN as connection metadata, not image content.

---

## Notes to reviewer

PNG Maker (`rmbg`) is a Manifest V3 toolbar entry that opens the first-party studio page. Background removal runs **on-device** there (Web Workers + ONNX Runtime).

1. No third-party remotely hosted app code; ORT comes from our studio origin (or historically from a full in-ZIP layout — update listing when packaging is final).
2. Single third-party data fetch: commit-pinned `.onnx` + SHA-256.
3. Content script only on the first-party studio origin (job bridge). Image import uses `activeTab`/`scripting`; optional host access is requested per image CDN origin when needed.
---

## Pre-submit technical checklist (after Р-27)

### Extension (`npm run build` → `dist/`)

| Check | Expected |
| --- | --- |
| Studio React / ORT in ZIP | No |
| SW opens `STUDIO_WEB_URL` | Yes |
| `host_permissions` for studio origin | Yes (required) |
| Permissions | `storage`, `downloads`, `contextMenus`, `activeTab`, `scripting` + optional http(s) |
| Content script | `studio-bridge.js` on studio origin only |

### Web studio (`npm run build:web` → `dist-web/`)

| Check | Expected |
| --- | --- |
| COOP/COEP at host | Yes |
| ORT under `/ort/` | Yes |
| Workers as separate module files | Yes |
| Web `numThreads` | 1 |

### Historical audit (studio-in-package era, 2026-08-03)

Reference only — package layout changed (Р-27). Full table of that day is preserved in git history of this file; results included successful COEP isolation, HF download, and GPU path smoke on unpacked `dist`.

---

## Store listing graphics

Source under [`promo/`](../../promo/). Regenerate with `node promo/render.mjs`.

| Dashboard field | File | Size |
| --- | --- | --- |
| Store icon | [`public/icons/icon-128.png`](../../public/icons/icon-128.png) | 128×128 |
| Screenshots | `promo/out/01-hero.png` … `05-privacy.png` | 1280×800 |
| Small tile | `promo/out/tile-440.png` | 440×280 |
| Marquee | `promo/out/marquee-1400.png` | 1400×560 |
