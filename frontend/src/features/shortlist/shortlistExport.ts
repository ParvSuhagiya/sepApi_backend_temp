import type { ShortlistItem } from './shortlist';

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Shortlist as CSV. The Phone column is always present but stays empty
 * unless the user explicitly ticks "Include phone numbers".
 */
export function toCsv(items: ShortlistItem[], includePhones: boolean): string {
  const header = ['Type', 'Title', 'Details', 'Note', 'Phone'];
  const rows = items.map((item) =>
    [
      item.kind,
      item.title,
      item.subtitle,
      item.note,
      includePhones ? (item.phone ?? '') : '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

/** Shortlist as Markdown for "Copy summary". Phones stay in your clipboard only. */
export function toMarkdown(items: ShortlistItem[]): string {
  const lines = items.map(
    (item) =>
      `- **${item.title}** (${item.kind})` +
      (item.subtitle ? ` — ${item.subtitle}` : '') +
      (item.phone ? ` — ${item.phone}` : '') +
      (item.note ? ` — Note: ${item.note}` : ''),
  );
  return [
    `# Shortlist (${items.length})`,
    '',
    ...lines,
    '',
    '_Nothing is saved on our servers. Closing this tab clears your shortlist._',
  ].join('\n');
}
