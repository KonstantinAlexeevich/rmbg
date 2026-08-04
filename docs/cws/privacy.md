# Privacy Policy — PNG Maker (rmbg)

Last updated: 2026-08-04

This privacy policy applies to **PNG Maker** (repository / package name: `rmbg`): the
Chrome extension entry point and the first-party studio web application that performs
background removal.

> **Note:** Product packaging is evolving (hosted studio + thin extension). Keep this
> file aligned with the shipping architecture before store publication.

## Summary

PNG Maker removes backgrounds from images **on your device**. We do not operate a backend that receives your photos. We do not create accounts. We do not sell data.

## What is processed locally

When you open images in the studio (or send one from a page via the extension context menu), the product:

- reads the image files you choose (paste / drop / file picker), or the single image you selected with a right-click menu action;
- runs an on-device AI model to produce a cutout mask;
- stores session data (originals, masks, previews, settings) in browser storage on your machine (IndexedDB, Cache Storage, and settings storage — `localStorage` on the web studio origin; the extension keeps a small list of export names for the context menu in `chrome.storage`);
- writes downloadable files (PNG / JPEG / WebP / ZIP) only when you export or choose “Save with export”.

These materials stay on your device. They are not uploaded to our servers — we do not have such servers for image processing.

## Network use

The only intentional third-party network request for processing is a **one-time download of the model weight file** (`.onnx`) from Hugging Face (pinned commit URL, with SHA-256 verification). After a successful download the file is cached locally (Cache Storage), and normal use is offline.

During that download, Hugging Face (and its CDN) can see typical connection metadata such as your IP address, as with any HTTPS request. User images are never included in that request.

When you use the context menu on an image, the extension reads that image **in the tab you clicked** (via a short-lived script injection after your explicit menu click). If the image is hosted on another origin than the page and cannot be read without access, Chrome may ask you to allow access **only to that image host** for the import.

Executable application code (JavaScript and WebAssembly for the ONNX runtime) is shipped from the first-party studio deploy and/or the extension package. It is not loaded as remotely evaluated scripts from a third-party code CDN.

## Analytics, advertising, accounts

- No analytics SDKs
- No advertising
- No sign-in / accounts
- No tracking pixels

## Permissions (Chrome extension)

- `storage` — extension-side menu state (export id/name list) and short-lived import jobs
- `downloads` — save exports when export runs through the extension APIs
- `contextMenus` — “Add to PNG Maker” / “Save with export” on images
- `activeTab` + `scripting` — after you choose a context-menu item, temporarily access that tab to read the selected image (not used to inject scripts into sites otherwise)
- host access to the studio origin — open or focus the studio tab; content script **only on that origin** for the studio bridge
- optional host access (`http://*/*`, `https://*/*`) — requested only when needed for a specific image host after a context-menu click; not granted at install by default

The extension does **not** inject a persistent content script into arbitrary websites. The only declared content script runs on the first-party studio origin.

## Changes

If data-handling practices change, this page will be updated and users will be informed as required by the Chrome Web Store disclosure rules.

## Contact

Questions about this policy: klxshus@gmail.com
