import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export function Section({
  title,
  children,
  highlighted,
  collapsible,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  highlighted?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;

  return (
    <section
      className={`flex flex-col gap-2.5 border-b border-b-zinc-200 border-l-2 py-4 pr-4 pl-3.5 ${
        highlighted ? 'border-l-blue-400' : 'border-l-transparent'
      }`}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {title}
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      ) : (
        <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          {title}
        </h3>
      )}
      {shown ? children : null}
    </section>
  );
}

export function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
  displayValue,
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  displayValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700" title={hint}>
      <span className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-400">
          {displayValue ?? String(value)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-description={hint}
        className="accent-blue-600"
      />
    </label>
  );
}

export function NumberField({
  label,
  ariaLabel,
  value,
  min,
  max,
  onChange,
}: {
  label?: string;
  ariaLabel?: string;
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

  const input = (
    <input
      type="number"
      min={min}
      max={max}
      value={shown}
      aria-label={ariaLabel ?? label}
      onFocus={() => setDraft(String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(draft ?? String(value))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="field"
    />
  );

  if (label === undefined) {
    return input;
  }

  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700">
      <span>{label}</span>
      {input}
    </label>
  );
}
