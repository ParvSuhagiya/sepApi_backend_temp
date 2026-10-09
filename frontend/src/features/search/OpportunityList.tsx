import { useMemo, useState } from 'react';
import type { Opportunity } from '../../api/schemas';
import { Dialog } from '../../components/ui/Dialog';
import { OpportunityCard, TYPE_META } from './OpportunityCard';

type SortKey = 'earn' | 'type';
type TypeFilter = 'all' | Opportunity['type'];

const TYPE_ORDER: ReadonlyArray<Opportunity['type']> = [
  'job',
  'freelance',
  'local business',
  'online selling',
  'content',
];

const MAX_COMPARE = 3;

function sortOpportunities(list: Opportunity[], sort: SortKey): Opportunity[] {
  const copy = [...list];
  if (sort === 'type') {
    copy.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  } else {
    copy.sort((a, b) => b.earn_score - a.earn_score);
  }
  return copy;
}

function CompareSheet({
  items,
  onClose,
}: {
  items: Opportunity[];
  onClose: () => void;
}) {
  return (
    <Dialog title={`Compare ${items.length} opportunities`} onClose={onClose} variant="sheet">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Side-by-side comparison of selected opportunities</caption>
        <thead>
          <tr>
            <th scope="col" className="p-2 text-left font-semibold text-muted">
              <span className="sr-only">Metric</span>
            </th>
            {items.map((item) => (
              <th key={item.title} scope="col" className="break-words p-2 text-left font-bold text-ink">
                {item.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-line">
            <th scope="row" className="p-2 text-left font-medium text-muted">
              EarnScore
            </th>
            {items.map((item) => (
              <td key={item.title} className="p-2 tabular-nums text-ink">
                {item.earn_score}
              </td>
            ))}
          </tr>
          <tr className="border-t border-line">
            <th scope="row" className="p-2 text-left font-medium text-muted">
              Type
            </th>
            {items.map((item) => (
              <td key={item.title} className="p-2 text-ink">
                {item.type}
              </td>
            ))}
          </tr>
          <tr className="border-t border-line">
            <th scope="row" className="p-2 text-left font-medium text-muted">
              Income estimate
            </th>
            {items.map((item) => (
              <td key={item.title} className="break-words p-2 text-ink">
                {item.income_estimate}
              </td>
            ))}
          </tr>
          <tr className="border-t border-line">
            <th scope="row" className="p-2 text-left font-medium text-muted">
              7-day plan steps
            </th>
            {items.map((item) => (
              <td key={item.title} className="p-2 tabular-nums text-ink">
                {item.plan_7_days.length}
              </td>
            ))}
          </tr>
          <tr className="border-t border-line">
            <th scope="row" className="p-2 text-left font-medium text-muted">
              Evidence items
            </th>
            {items.map((item) => (
              <td key={item.title} className="p-2 text-ink">
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {item.evidence.map((line) => (
                    <li key={line} className="break-words">
                      {line}
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Dialog>
  );
}

/** Sorted, filterable opportunity list with a 3-way compare sheet. */
export function OpportunityList({ opportunities }: { opportunities: Opportunity[] }) {
  const [sort, setSort] = useState<SortKey>('earn');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const visibleTypes = useMemo(
    () => TYPE_ORDER.filter((type) => opportunities.some((item) => item.type === type)),
    [opportunities],
  );
  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? opportunities : opportunities.filter((item) => item.type === filter);
    return sortOpportunities(filtered, sort);
  }, [opportunities, filter, sort]);

  const selectedItems = useMemo(
    () => visible.filter((item) => selected.includes(item.title)),
    [visible, selected],
  );

  function toggleCompare(title: string, checked: boolean) {
    setSelected((prev) => {
      if (checked) {
        if (prev.includes(title) || prev.length >= MAX_COMPARE) return prev;
        return [...prev, title];
      }
      return prev.filter((item) => item !== title);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="opportunity-sort" className="text-sm font-medium text-ink">
          Sort by
        </label>
        <select
          id="opportunity-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          className="min-h-[44px] rounded-md border border-line bg-raised px-3 text-sm font-medium text-ink"
        >
          <option value="earn">EarnScore</option>
          <option value="type">Income type</option>
        </select>
        <div role="group" aria-label="Filter by income type" className="flex flex-wrap gap-2">
          {(['all', ...visibleTypes] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold ${
                filter === type
                  ? 'border-brand-strong bg-brand-strong text-white'
                  : 'border-line bg-raised text-ink hover:bg-surface'
              }`}
            >
              {type === 'all' ? 'All types' : (TYPE_META[type]?.label ?? type)}
            </button>
          ))}
        </div>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex min-h-[44px] items-center rounded-md bg-brand-strong px-4 text-sm font-semibold text-white"
          >
            Compare ({selected.length})
          </button>
        ) : null}
      </div>
      {selected.length >= MAX_COMPARE ? (
        <p className="text-sm text-muted">Compare holds up to {MAX_COMPARE} opportunities.</p>
      ) : null}
      <div className="flex flex-col gap-4">
        {visible.map((item, index) => (
          <OpportunityCard
            key={`${item.title}-${index}`}
            rank={index + 1}
            opportunity={item}
            compareChecked={selected.includes(item.title)}
            compareDisabled={!selected.includes(item.title) && selected.length >= MAX_COMPARE}
            onCompareChange={(checked) => toggleCompare(item.title, checked)}
          />
        ))}
      </div>
      {sheetOpen && selectedItems.length > 0 ? (
        <CompareSheet items={selectedItems} onClose={() => setSheetOpen(false)} />
      ) : null}
    </div>
  );
}
