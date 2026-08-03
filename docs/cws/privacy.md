# Privacy Policy — PNG Maker (rmbg)

Last updated: 2026-08-03

This privacy policy applies to the Chrome extension published as **PNG Maker** (repository / package name: `rmbg`).

## Summary

PNG Maker removes backgrounds from images **on your device**. We do not operate a backend that receives your photos. We do not create accounts. We do not sell data.

## What the extension processes locally

When you open images in the studio, the extension:

- reads the image files you choose (or paste / drop);
- runs an on-device AI model to produce a cutout mask;
- stores session data (originals, masks, previews, settings) in browser storage on your machine (IndexedDB and `chrome.storage.local`);
- writes downloadable files (PNG / JPEG / WebP / ZIP) only when you export.

These materials stay on your device. They are not uploaded to our servers — we do not have such servers for image processing.

## Network use

The only intentional network request the extension makes is a **one-time download of the model weight file** (`.onnx`) from Hugging Face (pinned commit URL, with SHA-256 verification). After a successful download the file is cached locally (Cache Storage), and normal use is offline.

During that download, Hugging Face (and its CDN) can see typical connection metadata such as your IP address, as with any HTTPS request. User images are never included in that request.

Executable code (JavaScript and WebAssembly for the ONNX runtime) is shipped **inside the extension package**. It is not loaded from the network.

## Analytics, advertising, accounts

- No analytics SDKs
- No advertising
- No sign-in / accounts
- No tracking pixels

## Permissions

- `storage` — save preferences, export presets, and model-cache metadata locally
- `downloads` — save exported images and ZIP archives when you ask

The extension does not use host permissions to read arbitrary websites, and it does not inject content scripts into web pages.

## Changes

If data-handling practices change, this page will be updated and users will be informed as required by the Chrome Web Store disclosure rules.

## Contact

Questions about this policy: open an issue in the public repository  
https://github.com/KonstantinAlexeevich/rmbg
