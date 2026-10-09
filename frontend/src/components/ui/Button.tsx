import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  // Radiant gradient for primary CTA with subtle shadow glow
  primary:
    'brand-gradient text-white shadow-md shadow-indigo-500/20 hover:shadow-glow hover:brightness-110 active:scale-[0.98]',
  secondary:
    'border border-line/80 bg-raised text-ink shadow-sm hover:bg-surface hover:border-brand/30 hover:shadow active:scale-[0.98]',
  ghost: 'text-ink hover:bg-surface/80 active:scale-[0.98]',
  danger:
    'bg-tone-red-bg text-tone-red-fg shadow-sm hover:brightness-110 active:scale-[0.98]',
};

/** Full-width-friendly button; always >= 44px tall, with loading state and micro-interactions. */
export function Button({ variant = 'primary', loading = false, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner label="" />}
      {children}
    </button>
  );
}
