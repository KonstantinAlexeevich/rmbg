# Privacy Policy — PNG Maker (rmbg)

Last updated: 2026-08-04

This privacy policy applies to **PNG Maker** (repository / package name: `rmbg`): the
Chrome extension entry point and the first-party studio web application that performs
background removal.

Product packaging: hosted first-party studio + thin MV3 extension. Permission details
match [submission.md](submission.md) and [02-architecture.md](../02-architecture.md).

## Summary

PNG Maker removes backgrounds from images **on your device**. We do not operate a backend that receives your photos. We do not create accounts. We do not sell data.

## What is processed locally

When you open images in the studio (or send one from a page via the extension context menu), the product:

- reads the image files you choose (paste / drop / file picker), or the single image you selected with a right-click menu action;
- runs an on-device AI model to produce a cutout mask;
- stores session data (originals, masks, previews, settings) in browser storage on your machine (IndexedDB, Cache Storage, and settings storage — `localStorage` on the web studio origin; the extension keeps a small list of export names for the context menu in `chrome.storage`);
- writes downloadable files (PNG / JPEG / WebP / ZIP) from the **web studio** when you export, download a card, or choose “Save without background” (silent path: process, download, do not leave the image in the studio grid).

These materials stay on your device. They are not uploaded to our servers — we do not have such servers for image processing.

## Network use

The only intentional third-party network request for processing is a **one-time download of the model weight file** (`.onnx`) from Hugging Face (pinned commit URL, with SHA-256 verification). After a successful download the file is cached locally (Cache Storage), and normal use is offline.

During that download, Hugging Face (and its CDN) can see typical connection metadata such as your IP address, as with any HTTPS request. User images are never included in that request.

When you use the context menu on an image:

- `data:` URLs are decoded in the extension service worker;
- `blob:` URLs are read with a short-lived script in the tab you clicked (`activeTab` + `scripting`);
- `http(s):` URLs may require Chrome to ask you to allow access **only to that image host**; the service worker then fetches that image after your grant.

Executable application code (JavaScript and WebAssembly for the ONNX runtime) is shipped from the first-party studio deploy. It is not loaded as remotely evaluated scripts from a third-party code CDN. The thin extension package does not ship ORT.

## Analytics, advertising, accounts

- No analytics SDKs
- No advertising
- No sign-in / accounts
- No tracking pixels

## Permissions (Chrome extension)

- `storage` — export id/name list for the context menu, remembered studio origin, and short-lived import jobs
- `contextMenus` — “Add to PNG Maker” / “Save without background” on images
- `activeTab` + `scripting` — after you choose a context-menu item, temporarily access that tab to read `blob:` images (not used to inject scripts into sites otherwise)
- required host access — **studio origin only** (dev: localhost; production: our public studio host): open or focus the studio tab; content script matches that origin only
- optional host access (`http://*/*`, `https://*/*`) — a pool Chrome can grant from; after a context-menu click the extension asks only for the **specific image host**, not for all sites at install

The extension does **not** declare `downloads`: file save runs in the web studio via the browser download / File System Access path.

The extension does **not** inject a persistent content script into arbitrary websites. The only declared content script runs on the first-party studio origin.

Model weights are fetched by the **studio page** (CORS), not via extension host permissions to Hugging Face.

## Changes

If data-handling practices change, this page will be updated and users will be informed as required by the Chrome Web Store disclosure rules.

## Contact

Questions about this policy: png.maker.studio@gmail.com
