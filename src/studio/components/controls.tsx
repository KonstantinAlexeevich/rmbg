import { useState, type ReactNode } from 'react';

export function Section({
  title,
  children,
  highlighted,
}: {
  title: string;
  children: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <section
      className={`flex flex-col gap-2.5 border-b border-zinc-200 px-4 py-4 ${
        highlighted ? 'bg-amber-50/60' : ''
      }`}
    >
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CollapsibleSection({
  title,
  children,
  highlighted,
}: {
  title: string;
  children: ReactNode;
  highlighted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`border-b border-zinc-200 ${highlighted ? 'bg-amber-50/60' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left"
      >
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {title}
        </h3>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
          />
        </svg>
      </button>
      {open && <div className="flex flex-col gap-2.5 px-4 pb-4">{children}</div>}
    </section>
  );
}

export function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums text-zinc-400">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-blue-600"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  // Черновик пока поле в фокусе: иначе промежуточный ввод затирается
  // контролируемым value / clamp'ом.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    let next = Math.round(parsed);
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    if (next !== value) onChange(next);
  };

  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={shown}
        onFocus={() => setDraft(String(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft ?? String(value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
      />
    </label>
  );
}
