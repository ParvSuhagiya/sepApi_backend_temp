import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';

/** Hover/focus tooltip. The trigger keeps keyboard access via describedby. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement }) {
  const tipId = useId();
  const trigger = cloneElement(children, {
    'aria-describedby': tipId,
  } as Record<string, string>);
  return (
    <span className="group relative inline-flex max-w-full">
      {trigger}
      <span
        id={tipId}
        role="tooltip"
        className="absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-2 hidden w-max max-w-64 -translate-x-1/2 rounded-md border border-line bg-raised px-2.5 py-1.5 text-xs text-ink shadow-md group-hover:block group-focus-within:block"
      >
        {content}
      </span>
    </span>
  );
}
