import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/** Square icon-only button, always >= 44px, labelled for screen readers. */
export function IconButton({ label, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-line bg-raised p-2 text-ink transition-colors duration-200 hover:bg-surface"
      {...rest}
    >
      {children}
    </button>
  );
}
