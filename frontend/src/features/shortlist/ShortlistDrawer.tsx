import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Download, Printer, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { Dialog } from '../../components/ui/Dialog';
import { useLeadsSession } from '../customers/session';
import { useSearchSession } from '../search/session';
import { useOptionalShortlist, useShortlist, type ShortlistKind } from './shortlist';
import { toCsv, toMarkdown } from './shortlistExport';

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function triggerConfetti() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.getContext('2d')) return;
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#14b8a6', '#f59e0b'],
      disableForReducedMotion: true,
    });
  } catch {
    // Ignore
  }
}

/** Header entry point: count badge plus the shortlist drawer. */
export function ShortlistMenu() {
  const shortlist = useOptionalShortlist();
  const [open, setOpen] = useState(false);
  if (!shortlist) return null;
  const count = shortlist.count;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open shortlist, ${count} items`}
        className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-all duration-150 active:scale-95 ${
          count > 0
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm'
            : 'border-line/80 bg-raised/80 text-muted hover:text-ink hover:bg-surface'
        }`}
      >
        <Star
          className={`h-4 w-4 ${
            count > 0 ? 'fill-amber-500 text-amber-500' : 'text-muted'
          }`}
        />
        <span>Shortlist ({count})</span>
      </button>
      {open ? <ShortlistDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Filterable saved-items list with per-item notes. Export/reset live elsewhere. */
export function ShortlistItems({ kinds }: { kinds?: ReadonlySet<ShortlistKind> }) {
  const shortlist = useShortlist();
  const visible = kinds
    ? shortlist.items.filter((item) => kinds.has(item.kind))
    : shortlist.items;
  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted">
        {kinds
          ? 'Nothing saved under this filter yet.'
          : 'Your shortlist is empty. Star leads, jobs or opportunities to keep them here.'}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {visible.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-2 rounded-2xl border border-line/80 bg-surface/80 p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="break-words text-sm font-bold text-ink">{item.title}</p>
            <span className="rounded-full border border-line/80 bg-raised px-2.5 py-0.5 text-xs font-semibold text-muted">
              {item.kind}
            </span>
          </div>
          {item.subtitle ? (
            <p className="break-words text-xs text-muted">{item.subtitle}</p>
          ) : null}
          <label
            htmlFor={`shortlist-note-${item.id}`}
            className="text-xs font-medium text-ink mt-1"
          >
            Note for {item.title} (kept in this tab only)
          </label>
          <textarea
            id={`shortlist-note-${item.id}`}
            rows={2}
            value={item.note}
            onChange={(event) => shortlist.setNote(item.id, event.target.value)}
            placeholder="e.g. call Tuesday morning"
            className="w-full rounded-xl border border-line/80 bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <div>
            <Button
              variant="secondary"
              onClick={() =>
                shortlist.toggle({
                  id: item.id,
                  kind: item.kind,
                  title: item.title,
                  subtitle: item.subtitle,
                  phone: item.phone,
                })
              }
            >
              Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Export actions: phones checkbox, CSV download, markdown copy, print. */
export function ShortlistExportPanel() {
  const shortlist = useShortlist();
  const [includePhones, setIncludePhones] = useState(false);

  function handleCsvExport() {
    triggerConfetti();
    downloadCsv('earnrader-shortlist.csv', toCsv(shortlist.items, includePhones));
  }

  if (shortlist.items.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 print:hidden">
      <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={includePhones}
          onChange={(event) => setIncludePhones(event.target.checked)}
          className="h-4 w-4 rounded accent-brand"
        />
        Include phone numbers
      </label>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="secondary" onClick={handleCsvExport}>
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
        <CopyButton text={toMarkdown(shortlist.items)} label="shortlist summary" />
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          <span>Print</span>
        </Button>
      </div>
    </div>
  );
}

/** Danger-zone reset with confirmation. Clears shortlist plus both result sets. */
export function ShortlistReset() {
  const shortlist = useShortlist();
  const search = useSearchSession();
  const leads = useLeadsSession();
  const [confirmingReset, setConfirmingReset] = useState(false);

  function resetEverything() {
    shortlist.clear();
    search.reset();
    leads.reset();
    setConfirmingReset(false);
  }

  return (
    <div className="print:hidden">
      {confirmingReset ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">
            Clear the shortlist and both result sets from memory?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={resetEverything}>
              Clear everything
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingReset(false)}>
              Keep everything
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirmingReset(true)}>
          Reset everything
        </Button>
      )}
    </div>
  );
}

/** In-memory shortlist body: notes, CSV/print export, markdown summary, reset. */
export function ShortlistBody() {
  const shortlist = useShortlist();
  return (
    <div className="print-shortlist flex flex-col gap-5">
      <p className="text-xs text-muted">
        Nothing is saved on our servers. Closing this tab clears your shortlist.
      </p>

      <ShortlistItems />
      {shortlist.items.length > 0 ? <ShortlistExportPanel /> : null}
      <ShortlistReset />
    </div>
  );
}

/** In-memory drawer: notes, CSV/print export, markdown summary, reset. */
export function ShortlistDrawer({ onClose }: { onClose: () => void }) {
  const shortlist = useShortlist();
  return (
    <Dialog title={`Shortlist (${shortlist.count})`} onClose={onClose} variant="sheet">
      <ShortlistBody />
    </Dialog>
  );
}
