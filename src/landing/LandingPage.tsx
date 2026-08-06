import { ArrowRight, Layers, Shield, Sparkles } from 'lucide-react';
import { assetUrl } from '../platform/assets';
import { aboutWebPath, studioWebPath } from '../platform/studio-url';
import { detectLocale, type Locale } from '../shared/messages';

type Copy = {
  title: string;
  tagline: string;
  lead: string;
  points: { icon: 'local' | 'batch' | 'edge'; title: string; body: string }[];
  openStudio: string;
  about: string;
};

const copy: Record<Locale, Copy> = {
  en: {
    title: 'PNG Maker',
    tagline: 'Remove the background. Keep the photo.',
    lead: 'PNG Maker is a background remover for a transparent PNG with a clear background. Drop images into the studio, get a transparent PNG or a solid color backdrop. Everything runs in your browser; photos never leave the device.',
    points: [
      {
        icon: 'local',
        title: 'On your device',
        body: 'After a one-time model download, it works offline.',
      },
      {
        icon: 'batch',
        title: 'One file or a batch',
        body: 'Drop many images, set one canvas size, export a ZIP.',
      },
      {
        icon: 'edge',
        title: 'Simple edge tweaks',
        body: 'Threshold, contract, and feather if the cut needs a little help.',
      },
    ],
    openStudio: 'Open studio',
    about: 'Privacy & licenses',
  },
  ru: {
    title: 'PNG Maker',
    tagline: 'Убрать фон. Оставить фото.',
    lead: 'Киньте картинки в студию — получите прозрачные PNG или однотонный фон. Всё считается в браузере, фото никуда не уходят.',
    points: [
      {
        icon: 'local',
        title: 'На устройстве',
        body: 'После одноразовой загрузки модели можно работать офлайн.',
      },
      {
        icon: 'batch',
        title: 'Один файл или пачка',
        body: 'Много картинок, один размер холста, ZIP на выходе.',
      },
      {
        icon: 'edge',
        title: 'Простые края',
        body: 'Порог, сжатие и размытие — если вырезу нужна лёгкая правка.',
      },
    ],
    openStudio: 'Открыть студию',
    about: 'Конфиденциальность и лицензии',
  },
};

const pointIcon = {
  local: Shield,
  batch: Layers,
  edge: Sparkles,
} as const;

export function LandingPage() {
  const locale = detectLocale();
  const t = copy[locale];
  const iconUrl = assetUrl('icons/icon-128.png');

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-50 text-zinc-900" lang={locale}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#dbeafe_0%,transparent_55%),radial-gradient(ellipse_50%_40%_at_100%_100%,#e4e4e7_0%,transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex items-center gap-3">
          <img src={iconUrl} alt="" width={40} height={40} className="h-10 w-10" aria-hidden />
          <span className="text-xl font-bold tracking-tight sm:text-2xl">{t.title}</span>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-10 py-12 sm:gap-12">
          <section className="flex flex-col gap-5 sm:gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
              <div className="flex max-w-xl flex-col gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  {t.tagline}
                </h1>
                <p className="text-base leading-relaxed text-zinc-600 text-pretty sm:text-lg">
                  {t.lead}
                </p>
              </div>

              <CutoutPreview />
            </div>

            <div>
              <a
                href={studioWebPath()}
                className="inline-flex items-center gap-2 rounded-(--radius-control) bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                {t.openStudio}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </section>

          <ul className="grid gap-5 border-t border-zinc-200/80 pt-8 sm:grid-cols-3 sm:gap-6">
            {t.points.map((point) => {
              const Icon = pointIcon[point.icon];
              return (
                <li key={point.title} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Icon className="h-4 w-4 text-blue-600" aria-hidden />
                    {point.title}
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-600">{point.body}</p>
                </li>
              );
            })}
          </ul>
        </main>

        <footer className="border-t border-zinc-200/80 pt-5 text-sm text-zinc-500">
          <a
            href={aboutWebPath()}
            className="underline-offset-2 hover:text-zinc-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t.about}
          </a>
        </footer>
      </div>
    </div>
  );
}

/** Decorative before → cutout cue; CSS only. */
function CutoutPreview() {
  return (
    <div
      className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0 sm:h-40 sm:w-40"
      aria-hidden
    >
      <div className="absolute inset-0 rotate-[-6deg] rounded-2xl bg-zinc-200/80 shadow-sm" />
      <div className="checkerboard absolute inset-2 rotate-[4deg] overflow-hidden rounded-2xl shadow-md ring-1 ring-zinc-300/60">
        <div
          className="absolute inset-x-[18%] inset-y-[14%] rounded-[45%_45%_40%_40%/55%_55%_38%_38%] bg-gradient-to-b from-sky-300 to-blue-600"
          style={{
            boxShadow: '0 8px 20px rgb(37 99 235 / 0.25)',
          }}
        />
      </div>
    </div>
  );
}
