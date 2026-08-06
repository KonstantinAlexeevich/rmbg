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
  const iconUrl = assetUrl('icons/icon-128.png');

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900" lang="en">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,#dbeafe_0%,transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <a href={studioUrl} className="inline-flex items-center gap-3 text-zinc-900">
            <img src={iconUrl} alt="" width={32} height={32} className="h-8 w-8" aria-hidden />
            <span className="text-lg font-bold tracking-tight">PNG Maker</span>
          </a>
          <a
            href={studioUrl}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to studio
          </a>
        </header>

        <main className="flex flex-1 flex-col gap-12 py-12">
          <section className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">About</h1>
            <p className="text-sm text-zinc-500">Version {version}</p>
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight">Privacy</h2>
              <p className="text-xs text-zinc-500">Last updated: 2026-08-04</p>
            </div>
            <div className="flex max-w-prose flex-col gap-3 text-sm leading-relaxed text-zinc-700">
              <p>
                PNG Maker removes backgrounds <strong>on your device</strong>. Photos are not
                uploaded to our servers — we do not have servers for image processing. Session data
                stays in browser storage on your machine. Exports are saved only when you download
                them.
              </p>
              <p>
                The only network step for processing is a one-time download of the AI model from
                Hugging Face. After that, normal use is offline. During the download, Hugging Face
                can see typical connection metadata (such as your IP); your images are never sent.
              </p>
              <p>No analytics, advertising, or accounts.</p>
              <p>
                Questions:{' '}
                <a href="mailto:png.maker.studio@gmail.com" className={linkClass}>
                  png.maker.studio@gmail.com
                </a>
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-zinc-200/80 pt-10">
            <h2 className="text-lg font-semibold tracking-tight">Model</h2>
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-zinc-800">
                <span className="font-medium">{modelLicense.name}</span>
                <span className="text-zinc-500"> · {modelLicense.license}</span>
              </p>
              <p className="text-zinc-600">
                <a
                  href={modelLicense.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  DIS
                </a>
                {' · '}
                <a
                  href={modelLicense.onnxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  ONNX on Hugging Face
                </a>
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-zinc-200/80 pt-10">
            <h2 className="text-lg font-semibold tracking-tight">Open source</h2>
            <ul className="divide-y divide-zinc-200/80 border-y border-zinc-200/80">
              {runtimeLicenses.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm"
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
    </div>
  );
}
