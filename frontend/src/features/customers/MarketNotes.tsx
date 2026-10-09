/** Competitor market notes, with an explicit label when pricing is unknown. */
export function MarketNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) {
    return <p className="text-sm text-muted">No competitor notes for this search.</p>;
  }
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
      {notes.map((note) => (
        <li key={note} className="break-words">
          {note.trim().toLowerCase() === 'price not found' ? (
            <span>
              <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">
                Price not found
              </span>{' '}
              Competitor pricing wasn&apos;t found in public results.
            </span>
          ) : (
            note
          )}
        </li>
      ))}
    </ul>
  );
}
