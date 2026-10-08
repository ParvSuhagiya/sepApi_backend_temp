import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'dialog' | 'sheet';
}

const FOCUSABLE =
  'a[href], button:not([disabled]):not([tabindex="-1"]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Modal dialog (or bottom sheet) with focus trap and Esc to close. */
export function Dialog({ title, onClose, children, variant = 'dialog' }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => {
      (previousFocus.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const panelClass =
    variant === 'sheet'
      ? 'fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl'
      : 'fixed left-1/2 top-1/2 max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl';

  return (
    <>
      {/* Mouse-only dismiss affordance; keyboard users get Esc and trapped focus. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 z-[var(--z-dialog)] cursor-default bg-slate-950/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${panelClass} z-[var(--z-dialog)] border border-line bg-raised p-5 shadow-lg`}
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-3 text-sm text-ink">{children}</div>
      </div>
    </>
  );
}
