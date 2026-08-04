# Chrome Web Store — submission copy and reviewer notes

Working draft for the Developer Dashboard fields. Listing marketing text lives in [description.md](description.md). Privacy policy: [privacy.md](privacy.md).

Architecture: **hosted web studio** + thin MV3 extension
([02-architecture.md](../02-architecture.md), Р-27 / Р-28 in
[08-decisions.md](../08-decisions.md)). Permissions model below matches current
`public/manifest.json` and code. Before submit: set **prod** studio origin (replace
localhost), publish privacy URL, polish listing copy for context-menu flows.

Privacy policy URL (after the repo is public / this file is on `main`)

---

## Single purpose

Removes image backgrounds locally in the browser using an on-device AI model, then exports transparent or solid-color cutouts (including batch ZIP export).

---

## Remote code

**Answer in the dashboard:** No, I am not using remote code.

Application JavaScript and ONNX Runtime WebAssembly ship from the **first-party studio
deploy** (`dist-web`, same origin as the studio page). They are **not** evaluated from a
third-party code CDN. The thin extension package contains only the service worker, studio
bridge content script, about page, and icons — no ORT, no React studio.

The only **third-party** network class of request is a data file: ONNX model weights
(`.onnx`) from a pinned Hugging Face URL, SHA-256 verified, used only by the local runtime
**on the studio origin** (page `fetch`, not extension host access to HF).

Extension page CSP is minimal (`script-src 'self'; object-src 'self'`). Image fetch after a
context-menu click is gated by optional host permissions (per image origin), not by
install-time access to the open web.

---

## Permission justifications

### `storage`

Extension-side menu export list (`menuExports`), remembered studio origin, and short-lived
import jobs (`chrome.storage.session`). Studio settings on the web target use site
`localStorage` (platform layer).

### `contextMenus`

Right-click on images: **Add to PNG Maker** (focus studio, add card) or **Save without
background** (background studio tab, silent process + download, no card left in the grid).

### `activeTab` + `scripting`

Used only after a context-menu gesture to read `blob:` images in the clicked tab via
one-shot `scripting.executeScript`. Not used to inject a persistent script into arbitrary
sites. `http(s)` images use optional host permission + service-worker `fetch` instead.

### Host permissions (required)

**Studio origin only** — required so the service worker can `tabs.query` / focus the studio
tab and so the declared content script matches that page.

| Stage | Value |
| --- | --- |
| Dev (current) | `http://localhost:5173/*` |
| Prod (before CWS) | `https://<public-studio-host>/*` |

Must stay in sync with `STUDIO_WEB_URL` and `content_scripts[].matches`.

### Optional host permissions

`http://*/*` and `https://*/*` declare the **pool** Chrome may grant from. At runtime, on
context-menu import, the extension calls `permissions.request` for the **specific image
origin** only (e.g. a photo CDN). Users are not asked for all sites at install; repeat
grants for the same origin are silent.

`downloads` is **not** requested: the hosted studio saves files via web download / File
System Access APIs.

### Content script

`studio-bridge.js` — **only** on the studio origin. Bridge for jobs and export-name sync
(`chrome.runtime` ↔ `window.postMessage`). No content script on the open web.

---

## Data usage (Privacy practices tab)

- **Data collected from users:** none of the dashboard categories for PII / browsing history / website content. User images never leave the device.
- **Certifications:** not sold; not used for unrelated purposes; Limited Use.
- **Disclosure:** one-time model download can expose IP to Hugging Face / its CDN as connection metadata, not image content.

---

## Notes to reviewer

PNG Maker (`rmbg`) is a Manifest V3 toolbar entry that opens the first-party studio page.
Background removal runs **on-device** there (Web Workers + ONNX Runtime).

1. No third-party remotely hosted app code; ORT and studio JS come from our studio origin.
2. Single third-party data fetch: commit-pinned `.onnx` + SHA-256 (from the studio page).
3. Content script only on the first-party studio origin (job bridge).
4. Image import from pages: `data:` in SW; `blob:` via `activeTab`/`scripting`; `http(s)` via
   optional host access requested per image CDN origin on context-menu click.
5. Required host permission is limited to the studio origin, not the open web.

---

## Pre-submit technical checklist

### Extension (`npm run build` → `dist/`)

| Check | Expected |
| --- | --- |
| Studio React / ORT in ZIP | No |
| SW opens `STUDIO_WEB_URL` | Yes (prod URL for store build) |
| `host_permissions` | Studio origin only (prod HTTPS, not localhost) |
| `content_scripts.matches` | Same studio origin |
| `optional_host_permissions` | `http://*/*`, `https://*/*` (runtime per-origin grant) |
| Permissions | `storage`, `contextMenus`, `activeTab`, `scripting` |
| COEP/COOP in extension ZIP | No (isolation on studio host) |
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
