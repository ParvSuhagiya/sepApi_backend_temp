import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  // Gradient reserved for the primary CTA only (see index.css contrast note).
  primary: 'brand-gradient text-white shadow-md hover:brightness-110',
  secondary: 'border border-line bg-raised text-ink hover:bg-surface',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-tone-red-bg text-tone-red-fg hover:brightness-110',
};

/** Full-width-friendly button; always >= 44px tall, with loading state. */
export function Button({ variant = 'primary', loading = false, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-semibold transition-[filter,background-color] duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]}`}
      {...rest}
    >
      {loading && <Spinner label="" />}
      {children}
    </button>
  );
}
