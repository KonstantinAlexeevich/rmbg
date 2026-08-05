import { ArrowLeft } from 'lucide-react';
import { assetUrl } from '../platform/assets';
import { appVersion, isExtension } from '../platform/env';
import { studioPageUrl, studioWebPath } from '../platform/studio-url';
import { modelLicense, runtimeLicenses } from './licenseEntries';

const linkClass =
  'text-blue-600 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

export function AboutPage() {
  const version = appVersion();
  // extension: absolute STUDIO_WEB_URL; web: /studio (не лендинг /)
  const studioUrl = isExtension ? studioPageUrl() : studioWebPath();
  const iconUrl = assetUrl('icons/icon-32.png');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900" lang="en">
      <header className="border-b border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <a href={studioUrl} className="btn-ghost shrink-0">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to PNG Maker
          </a>
          <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <img
              src={iconUrl}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6"
              aria-hidden
            />
            PNG Maker
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-8">
        <section className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">About</h1>
          <p className="text-sm text-zinc-500">Version {version}</p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-900">Privacy policy</h2>
          <div className="flex flex-col gap-4 rounded-(--radius-surface) border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-700">
            <p className="text-xs text-zinc-500">Last updated: 2026-08-03</p>
            <p>
              This privacy policy applies to the Chrome extension published as{' '}
              <strong>PNG Maker</strong> (repository / package name:{' '}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">rmbg</code>).
            </p>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">Summary</h3>
              <p>
                PNG Maker removes backgrounds from images <strong>on your device</strong>. We do
                not operate a backend that receives your photos. We do not create accounts. We do
                not sell data.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">
                What the extension processes locally
              </h3>
              <p>When you open images in the studio, the extension:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>reads the image files you choose (or paste / drop);</li>
                <li>runs an on-device AI model to produce a cutout mask;</li>
                <li>
                  stores session data (originals, masks, previews, settings) in browser storage on
                  your machine (IndexedDB and{' '}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                    chrome.storage.local
                  </code>
                  );
                </li>
                <li>
                  writes downloadable files (PNG / JPEG / WebP / ZIP) only when you export.
                </li>
              </ul>
              <p>
                These materials stay on your device. They are not uploaded to our servers — we do
                not have such servers for image processing.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">Network use</h3>
              <p>
                The only intentional network request the extension makes is a{' '}
                <strong>one-time download of the model weight file</strong> (
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">.onnx</code>) from
                Hugging Face (pinned commit URL, with SHA-256 verification). After a successful
                download the file is cached locally (Cache Storage), and normal use is offline.
              </p>
              <p>
                During that download, Hugging Face (and its CDN) can see typical connection
                metadata such as your IP address, as with any HTTPS request. User images are never
                included in that request.
              </p>
              <p>
                Executable code (JavaScript and WebAssembly for the ONNX runtime) is shipped{' '}
                <strong>inside the extension package</strong>. It is not loaded from the network.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">
                Analytics, advertising, accounts
              </h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>No analytics SDKs</li>
                <li>No advertising</li>
                <li>No sign-in / accounts</li>
                <li>No tracking pixels</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">Permissions</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">storage</code> — menu
                  export list and short-lived import jobs
                </li>
                <li>
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">contextMenus</code> —
                  “Add to PNG Maker” / “Save without background” on images
                </li>
                <li>
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">activeTab</code> +{' '}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">scripting</code> — read
                  the selected image after a context-menu click
                </li>
              </ul>
              <p>
                Required host access is only the studio origin (open/focus tab + bridge).
                Optional host access is requested for a specific image CDN when you use the
                context menu. File downloads run in the web studio (browser download / File
                System Access), not via a{' '}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">downloads</code>{' '}
                permission. The only declared content script runs on the studio origin.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">Changes</h3>
              <p>
                If data-handling practices change, this page will be updated and users will be
                informed as required by the Chrome Web Store disclosure rules.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-zinc-900">Contact</h3>
              <p>
                Questions about this policy, open an issue: klxshus@gmail.com
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-zinc-900">Model</h2>
          <div className="rounded-(--radius-surface) border border-zinc-200 bg-white p-4">
            <p className="text-sm font-medium text-zinc-900">
              {modelLicense.name}{' '}
              <span className="font-normal text-zinc-500">({modelLicense.license})</span>
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-600">
              <li>
                <a
                  href={modelLicense.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  DIS (Xuebin Qin et al.)
                </a>
              </li>
              <li>
                <a
                  href={modelLicense.onnxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  ONNX export on Hugging Face
                </a>
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Model weights are not bundled with the extension. They are downloaded once at
              runtime from Hugging Face (commit-pinned URL), verified with SHA-256, and cached
              locally.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-zinc-900">Runtime</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-(--radius-surface) border border-zinc-200 bg-white">
            {runtimeLicenses.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {entry.name}
                </a>
                <span className="shrink-0 text-zinc-500">{entry.license}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
