import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

const inputClass =
  'mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 text-base text-ink placeholder:text-muted';

const prefixedInputClass =
  'mt-1 w-full rounded-md border border-line bg-raised py-2 pl-8 pr-3 text-base text-ink placeholder:text-muted';

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const parts: string[] = [];
  if (error) parts.push(`${id}-error`);
  if (hint) parts.push(`${id}-hint`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${id}-error`} className="mt-1 text-sm text-tone-red-fg">
      {error}
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
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted"
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          className={prefix ? prefixedInputClass : inputClass}
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
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        className={inputClass}
        maxLength={maxLength}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      />
      {typeof maxLength === 'number' && (
        <p className="mt-1 text-xs text-muted" aria-live="off">
          {count}/{maxLength} characters
        </p>
      )}
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
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        className={inputClass}
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
