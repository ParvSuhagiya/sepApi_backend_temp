import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';
import { Dialog } from '../../components/ui/Dialog';
import { useLeadsSession } from '../customers/session';
import { useSearchSession } from '../search/session';
import { useOptionalShortlist, useShortlist } from './shortlist';
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

/** Header entry point: count badge plus the shortlist drawer. */
export function ShortlistMenu() {
  const shortlist = useOptionalShortlist();
  const [open, setOpen] = useState(false);
  if (!shortlist) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open shortlist, ${shortlist.count} items`}
        className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
      >
        Shortlist ({shortlist.count})
      </button>
      {open ? <ShortlistDrawer onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** In-memory drawer: notes, CSV/print export, markdown summary, reset. */
export function ShortlistDrawer({ onClose }: { onClose: () => void }) {
  const shortlist = useShortlist();
  const search = useSearchSession();
  const leads = useLeadsSession();
  const [includePhones, setIncludePhones] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function resetEverything() {
    shortlist.clear();
    search.reset();
    leads.reset();
    setConfirmingReset(false);
  }

  return (
    <Dialog title={`Shortlist (${shortlist.count})`} onClose={onClose} variant="sheet">
      <div className="print-shortlist flex flex-col gap-4">
        <p className="text-xs text-muted">
          Nothing is saved on our servers. Closing this tab clears your shortlist.
        </p>
        {shortlist.items.length === 0 ? (
          <p className="text-sm text-muted">
            Your shortlist is empty. Star leads, jobs or opportunities to keep them here.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {shortlist.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="break-words text-sm font-bold text-ink">{item.title}</p>
                  <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-xs font-semibold text-muted">
                    {item.kind}
                  </span>
                </div>
                {item.subtitle ? (
                  <p className="break-words text-xs text-muted">{item.subtitle}</p>
                ) : null}
                <label
                  htmlFor={`shortlist-note-${item.id}`}
                  className="text-xs font-medium text-ink"
                >
                  Note for {item.title} (kept in this tab only)
                </label>
                <textarea
                  id={`shortlist-note-${item.id}`}
                  rows={2}
                  value={item.note}
                  onChange={(event) => shortlist.setNote(item.id, event.target.value)}
                  placeholder="e.g. call Tuesday morning"
                  className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink"
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
        )}
        {shortlist.items.length > 0 ? (
          <div className="flex flex-col gap-3 print:hidden">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={includePhones}
                onChange={(event) => setIncludePhones(event.target.checked)}
                className="h-[20px] w-[20px] accent-brand"
              />
              Include phone numbers
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv('earnrader-shortlist.csv', toCsv(shortlist.items, includePhones))
                }
              >
                Export CSV
              </Button>
              <CopyButton text={toMarkdown(shortlist.items)} label="shortlist summary" />
              <Button variant="secondary" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </div>
        ) : null}
        <div className="print:hidden">
          {confirmingReset ? (
            <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
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
      </div>
    </Dialog>
  );
}
