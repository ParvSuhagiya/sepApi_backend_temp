export default function MarketNotes({ notes }) {
  if (!notes || notes.length === 0) return null;
  return (
    <section aria-label="Market notes" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Market notes</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {notes.map((note, i) => (
          <li key={i} className="break-words">{note}</li>
        ))}
      </ul>
    </section>
  );
}
