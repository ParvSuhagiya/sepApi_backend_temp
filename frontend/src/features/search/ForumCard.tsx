interface ForumItem {
  title: string;
  link: string;
  snippet: string;
}

/** Whole-card external link to a forum discussion, with the source host shown. */
export function ForumCard({ item }: { item: ForumItem }) {
  let host = item.link;
  try {
    host = new URL(item.link).hostname.replace(/^www\./, '');
  } catch {
    /* Keep the raw link text when parsing fails. */
  }
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-line bg-raised p-4 shadow-sm hover:bg-surface"
    >
      <p className="break-words text-base font-bold text-ink">{item.title}</p>
      <p className="mt-1 break-words text-sm text-muted">{item.snippet}</p>
      <p className="mt-2 text-xs text-muted">
        {host}
        <span className="sr-only"> (opens in new tab)</span>
      </p>
    </a>
  );
}
