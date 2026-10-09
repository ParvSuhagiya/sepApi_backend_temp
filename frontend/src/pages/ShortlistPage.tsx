import { Seo } from '../components/Seo';
import { useShortlist } from '../features/shortlist/shortlist';
import { ShortlistBody } from '../features/shortlist/ShortlistDrawer';

/** Full-page saved shortlist: counts, notes, export hub. Same memory store as the drawer. */
export function ShortlistPage() {
  const shortlist = useShortlist();
  const leads = shortlist.items.filter((item) => item.kind === 'lead').length;
  const jobs = shortlist.items.filter((item) => item.kind === 'job').length;
  const opportunities = shortlist.items.filter((item) => item.kind === 'opportunity').length;

  return (
    <section aria-labelledby="shortlist-heading" className="flex flex-col gap-6">
      <Seo route="/app/shortlist" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Sprint zone · Bharat Grid · Live synced
        </p>
        <h1 id="shortlist-heading" className="font-display text-3xl font-bold tracking-tight text-ink">
          Saved Shortlist & Action Hub
        </h1>
        <p className="mt-1 text-sm text-muted">
          {shortlist.count === 0
            ? 'Star items to build your action hub — notes and export live below.'
            : `${shortlist.count} saved — ${leads} leads · ${jobs} jobs · ${opportunities} opportunities.`}
        </p>
      </div>
      <ShortlistBody />
    </section>
  );
}
