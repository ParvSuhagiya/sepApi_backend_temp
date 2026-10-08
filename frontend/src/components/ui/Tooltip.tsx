import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';

/** Hover/focus tooltip. The trigger keeps keyboard access via describedby. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement }) {
  const tipId = useId();
  const trigger = cloneElement(children, {
    'aria-describedby': tipId,
  } as Record<string, string>);
  return (
    <span className="group relative inline-flex">
      {trigger}
      <span
        id={tipId}
        role="tooltip"
        className="invisible absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-2 w-max max-w-64 -translate-x-1/2 rounded-md border border-line bg-raised px-2.5 py-1.5 text-xs text-ink shadow-md group-hover:visible group-focus-within:visible"
      >
        {content}
      </span>
    </span>
  );
}
