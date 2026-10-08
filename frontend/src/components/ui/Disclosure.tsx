import type { ReactNode } from 'react';

/** Styled native disclosure. Content stays in the DOM when closed. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-md bg-surface p-3" open={defaultOpen || undefined}>
      <summary className="cursor-pointer rounded-sm text-sm font-semibold text-ink">
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
