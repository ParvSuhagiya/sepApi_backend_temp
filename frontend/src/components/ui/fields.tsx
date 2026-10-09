import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-line/80 bg-raised/90 px-3.5 py-2.5 text-base text-ink shadow-sm placeholder:text-muted/60 transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20';

const prefixedInputClass =
  'mt-1.5 w-full rounded-xl border border-line/80 bg-raised/90 py-2.5 pl-8 pr-3.5 text-base text-ink shadow-sm placeholder:text-muted/60 transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20';

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const parts: string[] = [];
  if (error) parts.push(`${id}-error`);
  if (hint) parts.push(`${id}-hint`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-tone-red-fg flex items-center gap-1 animate-reveal">
      <span>●</span> {error}
    </p>
  );
}

export function FieldHint({ id, hint }: { id: string; hint?: string }) {
  if (!hint) return null;
  return (
    <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
      {hint}
    </p>
  );
}

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'prefix'>,
    FieldProps {
  /** Non-interactive adornment rendered inside the field (e.g. a ₹ prefix). */
  prefix?: ReactNode;
}

export function Input({ id, label, error, hint, prefix, ...rest }: InputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-semibold text-muted"
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          className={`${prefix ? prefixedInputClass : inputClass} ${
            error ? 'border-tone-red-border focus:ring-rose-500/20' : ''
          }`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          {...rest}
        />
      </div>
      <FieldError id={id} error={error} />
      <FieldHint id={id} hint={hint} />
    </div>
  );
}

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>,
    FieldProps {
  maxLength?: number;
}

export function Textarea({ id, label, error, hint, maxLength, value, ...rest }: TextareaProps) {
  const count = typeof value === 'string' ? value.length : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">
          {label}
        </label>
        {typeof maxLength === 'number' && (
          <p className="mt-1 text-xs text-muted" aria-live="off">
            {count}/{maxLength} characters
          </p>
        )}
      </div>
      <textarea
        id={id}
        className={`${inputClass} resize-y min-h-[90px] ${
          error ? 'border-tone-red-border focus:ring-rose-500/20' : ''
        }`}
        maxLength={maxLength}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      />
      <FieldError id={id} error={error} />
      <FieldHint id={id} hint={hint} />
    </div>
  );
}

interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>,
    FieldProps {}

export function NumberField(props: NumberFieldProps) {
  return <Input type="number" inputMode="numeric" {...props} />;
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'>,
    FieldProps {
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function Select({ id, label, error, hint, options, ...rest }: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        className={`${inputClass} ${
          error ? 'border-tone-red-border focus:ring-rose-500/20' : ''
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={id} error={error} />
      <FieldHint id={id} hint={hint} />
    </div>
  );
}
