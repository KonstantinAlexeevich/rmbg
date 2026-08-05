import { aboutWebPath, studioWebPath } from '../platform/studio-url';

/** Minimal route scaffold — marketing content comes later. */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-4 text-zinc-900">
      <h1 className="text-2xl font-bold tracking-tight">PNG Maker</h1>
      <p className="max-w-md text-center text-sm text-zinc-600">
        Remove image backgrounds locally in the browser.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href={studioWebPath()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Open studio
        </a>
        <a
          href={aboutWebPath()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          About
        </a>
      </div>
    </div>
  );
}
