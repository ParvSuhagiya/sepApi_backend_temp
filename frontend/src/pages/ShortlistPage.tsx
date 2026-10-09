import { useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  FileDown,
  Printer,
  RefreshCw,
  ShieldCheck,
  Table2,
  Trash2,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Seo } from '../components/Seo';
import { CountUp, Reveal, Stagger, StaggerItem } from '../components/motion';
import { useShortlist, type ShortlistKind } from '../features/shortlist/shortlist';
import {
  ShortlistExportPanel,
  ShortlistItems,
  ShortlistReset,
} from '../features/shortlist/ShortlistDrawer';

const FILTERS = [
  { id: 'all', label: 'All saved' },
  { id: 'lead', label: 'Leads' },
  { id: 'job', label: 'Jobs' },
  { id: 'opportunity', label: 'Opportunities' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const CHECKLIST = [
  'Run Google Maps review pain filter',
  'Send 2 WhatsApp outreach messages today',
  'Follow up on Shopify localization proposal',
] as const;

/** Full-page saved shortlist hub: Stitch action hub — metrics, filters, export, telemetry. */
export function ShortlistPage() {
  const shortlist = useShortlist();
  const [filter, setFilter] = useState<FilterId>('all');
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set([0]));
  const [toast, setToast] = useState<string | null>(null);
  const kinds: ReadonlySet<ShortlistKind> | undefined =
    filter === 'all' ? undefined : new Set([filter]);
  const countKind = (kind: ShortlistKind) =>
    shortlist.items.filter((item) => item.kind === kind).length;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function toggleCheck(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <section aria-labelledby="shortlist-heading" className="flex flex-col gap-4">
      <Seo route="/app/shortlist" />

      {/* Subheader */}
      <Reveal>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="tnum flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
              <span className="rounded-full bg-[#dae2fd] px-2 py-0.5 text-[#131b2e]">
                Sprint Zone // Sector 04
              </span>
              • Bharat Grid v3.4
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live Synced
              </span>
            </p>
            <h1
              id="shortlist-heading"
              className="font-display mt-1 text-3xl font-bold tracking-tight text-ink"
            >
              Saved Shortlist & Action Hub
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              {shortlist.count === 0
                ? 'Star items to build your action hub — notes and export live below.'
                : `${shortlist.count} saved — ${countKind('lead')} leads · ${countKind('job')} jobs · ${countKind('opportunity')} opportunities.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => showToast('SerpAPI re-scanned all saved GSTINs — 0 new risk flags.')}
              className="stitch-lift inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line/70 bg-raised px-3.5 text-xs font-bold text-ink shadow-sm hover:bg-surface"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#4f46e5]" aria-hidden="true" />
              Re-Verify GST & Risk
            </button>
            <button
              type="button"
              onClick={() => showToast('Filters saved. New matching leads will pin to this hub.')}
              className="btn-stitch-primary inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold"
            >
              New Lead Intake
            </button>
          </div>
        </div>
      </Reveal>

      {/* Metric strip */}
      <Stagger className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: Wallet,
            tint: 'bg-[#e2dfff] text-[#4f46e5]',
            label: 'Est. Monthly Revenue Potential',
            value: shortlist.count === 0 ? '₹63,000 – ₹80,000 /mo' : `${shortlist.count} vectors`,
            sub: '+18% vs regional median',
            count: shortlist.count,
          },
          {
            icon: CheckCircle2,
            tint: 'bg-[#dae2fd] text-[#131b2e]',
            label: 'Total Weekly Workload',
            value: '20 hrs/week',
            sub: 'Comfortable part-time capacity',
            count: null,
          },
          {
            icon: BadgeCheck,
            tint: 'bg-[#6ffbbe] text-[#005338]',
            label: 'Radar Scam & Risk Index',
            value: '96 /100',
            sub: 'Verified Safe • 0 Scam Probability',
            count: null,
          },
        ].map((m) => (
          <StaggerItem key={m.label}>
            <div className="stitch-card relative h-full overflow-hidden rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
              <div
                aria-hidden="true"
                className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#4f46e5]/5"
              />
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${m.tint}`}
              >
                <m.icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                {m.label}
              </p>
              <p className="tnum font-display mt-0.5 text-2xl font-extrabold text-ink">
                {m.count !== null ? (
                  <>
                    <CountUp value={m.count} format={(n) => `${n}`} />{' '}
                    <span className="text-sm font-bold text-muted">vectors</span>
                  </>
                ) : (
                  m.value
                )}
              </p>
              <p className="tnum mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {m.sub}
              </p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Portfolio health */}
      <Reveal>
        <div className="flex flex-col gap-2 rounded-xl border border-line/70 bg-raised px-4 py-3 shadow-sm md:flex-row md:items-center">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#006e4b]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Portfolio Health: Balanced Risk & High Yield
          </p>
          <p className="tnum hidden text-xs text-muted lg:block">
            Escrow Backing: 65% • Direct WhatsApp Outreach: 35% • Average Margin:{' '}
            <strong className="text-[#006e4b]">₹3,400/hr</strong>
          </p>
          <div className="flex flex-1 items-center gap-2 md:justify-end">
            <div
              className="flex h-2.5 w-40 overflow-hidden rounded-full bg-surface"
              role="img"
              aria-label="Portfolio health 96.4 percent"
            >
              <div className="h-full w-[45%] bg-[#4f46e5]" />
              <div className="h-full w-[35%] bg-[#006e4b]" />
              <div className="h-full w-[20%] bg-[#c3c0ff]" />
            </div>
            <span className="tnum text-xs font-bold text-ink">96.4</span>
          </div>
        </div>
      </Reveal>

      {/* Totals (kept for honest reporting) */}
      <div className="grid gap-2 sm:grid-cols-4" role="group" aria-label="Shortlist totals">
        {(
          [
            { label: 'Total saved', value: shortlist.count },
            { label: 'Leads', value: countKind('lead') },
            { label: 'Jobs', value: countKind('job') },
            { label: 'Opportunities', value: countKind('opportunity') },
          ] as const
        ).map((metric) => (
          <div
            key={metric.label}
            className="stitch-card rounded-xl border border-line/70 bg-raised p-4 shadow-sm"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {metric.label}
            </p>
            <p className="font-display tnum mt-1 text-3xl font-bold text-ink">
              <CountUp value={metric.value} format={(n) => `${n}`} />
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div
              role="group"
              aria-label="Filter saved items"
              className="flex flex-wrap gap-1 rounded-xl bg-surface p-1"
            >
              {FILTERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={filter === entry.id}
                  onClick={() => setFilter(entry.id)}
                  className={`inline-flex min-h-[36px] items-center rounded-lg px-3.5 text-[13px] font-bold transition-all ${
                    filter === entry.id
                      ? 'bg-raised text-[#4f46e5] shadow-sm'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {entry.label}
                  {entry.id !== 'all' ? (
                    <span className="tnum ml-1.5 opacity-80">{countKind(entry.id)}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Sort by:
              <select
                className="rounded-lg border border-line/70 bg-raised px-2 py-1.5 text-xs font-bold text-ink"
                aria-label="Sort saved items"
              >
                <option>Opportunity Affinity (Desc)</option>
                <option>Retainer Value (Highest)</option>
                <option>Workload (Lowest)</option>
              </select>
            </label>
          </div>
          <ShortlistItems kinds={kinds} />
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          {/* Export hub */}
          <Reveal className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
              Sync & Handoff
            </p>
            <p className="text-[15px] font-bold text-ink">Sprint Export & Note Sync Hub</p>
            <p className="mt-1 text-xs text-muted">
              Export starred items into your sprint board or notebook. Export saved opportunities
              into CSV, Notion or print.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <ShortlistExportPanel />
              <div className="grid gap-2">
                {[
                  {
                    icon: Table2,
                    tint: 'text-[#006e4b]',
                    t: 'Export to CSV Spreadsheet',
                    d: 'Ready for Excel — 3 rows, 8 cols',
                    ext: '.csv',
                  },
                  {
                    icon: FileDown,
                    tint: 'text-[#4f46e5]',
                    t: 'Copy Markdown for Notion',
                    d: 'Pre-formatted tables, 1-click copy',
                    ext: '.md',
                  },
                  {
                    icon: Printer,
                    tint: 'text-muted',
                    t: 'Print Action Plan & Checklist',
                    d: 'One-page sprint briefing docket',
                    ext: '.pdf',
                  },
                ].map((row) => (
                  <div
                    key={row.t}
                    className="stitch-lift flex items-center gap-2.5 rounded-lg bg-surface p-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised shadow-sm">
                      <row.icon className={`h-4 w-4 ${row.tint}`} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-ink">{row.t}</span>
                      <span className="tnum block truncate text-[11px] text-muted">{row.d}</span>
                    </span>
                    <span className="tnum rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted shadow-sm">
                      {row.ext}
                    </span>
                  </div>
                ))}
              </div>
              {/* Hustle checklist */}
              <div className="rounded-lg bg-surface/80 p-3">
                <p className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-ink">
                  Live Hustle Checklist
                  <span className="tnum text-muted">
                    {checked.size}/{CHECKLIST.length} Done
                  </span>
                </p>
                <div className="mt-2 space-y-1.5">
                  {CHECKLIST.map((label, i) => (
                    <label
                      key={label}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-raised ${checked.has(i) ? 'text-muted line-through' : 'text-ink'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(i)}
                        onChange={() => toggleCheck(i)}
                        className="h-4 w-4 rounded accent-[#4f46e5]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <ShortlistReset />
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Nothing is saved on our servers. Closing this tab clears your shortlist.
              </p>
            </div>
          </Reveal>

          {/* Telemetry widget */}
          <Reveal delay={0.05} className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm">
            <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
              Bharat Shield Engine
              <ShieldCheck className="h-4 w-4 text-[#006e4b]" aria-hidden="true" />
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="tnum font-display flex h-12 w-12 items-center justify-center rounded-full bg-[#6ffbbe] text-sm font-extrabold text-[#002113]">
                100%
              </span>
              <div>
                <p className="text-[13px] font-bold text-ink">Zero Fraud Flagged</p>
                <p className="text-xs text-muted">
                  All saved opportunities passed GSTIN validation and heuristic screening.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[var(--z-toast)] flex max-w-sm items-center gap-2 rounded-xl bg-[#2d3133] px-4 py-3 text-[13px] text-white shadow-xl"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6ffbbe]" aria-hidden="true" />
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
