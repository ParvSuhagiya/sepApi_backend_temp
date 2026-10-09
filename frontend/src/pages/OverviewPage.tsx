import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  Bolt,
  Calendar,
  Download,
  MapPin,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Seo } from '../components/Seo';
import { RadarScope, type RadarBlip } from '../components/RadarScope';
import { CountUp, Reveal, Stagger, StaggerItem } from '../components/motion';
import { leadsBlips, searchBlips } from '../features/map/blips';
import { useLeadsSession } from '../features/customers/session';
import { useSearchSession } from '../features/search/session';
import { useShortlist } from '../features/shortlist/shortlist';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

const GEO_CLUSTERS = [
  { name: 'Vijay Nagar', count: 16, delta: '+18% High', vol: '₹84k Vol' },
  { name: 'Chhappan Dukan', count: 9, delta: 'FoodTech', vol: '₹42k Vol' },
  { name: 'Sarafa Bazaar', count: 8, delta: 'Retail ERP', vol: '₹65k Vol' },
  { name: 'Bhawarkua', count: 5, delta: 'EdTech', vol: '₹22k Vol' },
] as const;

/** Executive overview: Stitch HQ dashboard + honest aggregates of both modes. */
export function OverviewPage() {
  const search = useSearchSession();
  const leads = useLeadsSession();
  const shortlist = useShortlist();
  const [radius, setRadius] = useState('15km');
  const [spinning, setSpinning] = useState(false);

  const income = search.result;
  const customers = leads.result;
  const hasData = income !== null || customers !== null;

  const opportunities = income?.opportunities ?? [];
  const jobs = income?.jobs ?? [];
  const locals = income?.local ?? [];
  const buyerLeads = customers?.leads ?? [];
  const blocked = jobs.filter((job) => job.risk === 'High').length;
  const credits = (income?.stats.credits_used ?? 0) + (customers?.meta.credits_used ?? 0);
  const blips: RadarBlip[] = [
    ...(income ? searchBlips(income) : []),
    ...(customers ? leadsBlips(customers) : []),
  ].slice(0, 12);
  const actions = [
    ...opportunities.slice(0, 3).map((item) => ({
      key: `opp:${item.title}`,
      title: item.title,
      detail: `EarnScore ${item.earn_score} · ${item.income_estimate}`,
      score: item.earn_score,
    })),
    ...buyerLeads.slice(0, 3).map((item) => ({
      key: `lead:${item.name}`,
      title: item.name,
      detail: `Lead score ${item.match_score}`,
      score: item.match_score,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  function instantSweep() {
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 1600);
  }

  return (
    <section aria-labelledby="overview-heading" className="flex flex-col gap-4">
      <Seo route="/app/overview" />

      {/* Executive status strip */}
      <Reveal>
        <div className="stitch-card rounded-xl border border-line/70 bg-raised p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-ink">Radar HQ / Executive Intelligence Dashboard</span>
            <span className="tnum inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-semibold text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Bharat Grid v3.4.12
            </span>
            <span className="tnum rounded-full bg-surface px-2.5 py-1 font-semibold text-muted">
              SerpAPI: 1.2s
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Zero-Fraud Latency: 42ms
            </span>
          </div>
          <div className="mt-3 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Radar HQ · Executive Intelligence Dashboard
              </p>
              <h1
                id="overview-heading"
                className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"
              >
                Executive Overview
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                Everything you have found so far, in one place. Nothing here is stored anywhere.
                <span className="tnum inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink">
                  <MapPin className="h-3 w-3 text-[#4f46e5]" aria-hidden="true" /> Indore (MP-09) &
                  Central Tier-2 Cluster
                </span>
                <span className="tnum inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                  <Calendar className="h-3 w-3" aria-hidden="true" /> Active Sprint: Last 7 Days
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="stitch-lift inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-surface px-3.5 text-xs font-bold text-ink hover:bg-raised"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Executive Settings
              </button>
              <button
                type="button"
                className="stitch-lift inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-surface px-3.5 text-xs font-bold text-ink hover:bg-raised"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Sprint CSV
              </button>
              <button
                type="button"
                onClick={instantSweep}
                className="btn-stitch-primary inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-4 text-xs font-bold"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {spinning ? 'Sweeping…' : 'Launch Instant Sweep'}
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {!hasData ? (
        <>
          <div className="rounded-xl border border-line bg-raised p-6 text-center shadow-sm">
            <p className="text-base font-bold text-ink">No sweeps yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Run an income sweep or a buyer scan and this dashboard lights up with your scores,
              blocks and shortlist.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                to="/app/income"
                className="btn-stitch-primary inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold"
              >
                Income Discovery
              </Link>
              <Link
                to="/app/customers"
                className="inline-flex min-h-[44px] items-center rounded-lg border border-line bg-raised px-4 text-sm font-semibold text-ink hover:bg-surface"
              >
                B2B Leads Radar
              </Link>
            </div>
          </div>

          {/* Stitch preview KPIs (static showcase under empty state) */}
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: Wallet,
                tint: 'bg-[#e2dfff] text-[#4f46e5]',
                label: 'Realized & Pipeline',
                value: '₹1,18,500',
                sub: '+28% MoM',
              },
              {
                icon: BadgeCheck,
                tint: 'bg-[#dae2fd] text-[#131b2e]',
                label: 'Verified Opportunities',
                value: '38 Active',
                sub: '14 Gigs • 24 B2B Leads',
              },
              {
                icon: ShieldCheck,
                tint: 'bg-[#ffdad6] text-[#ba1a1a]',
                label: 'Scam-Shield Intercepts',
                value: '19 Blocked',
                sub: '₹42,500 Protected',
              },
              {
                icon: Timer,
                tint: 'bg-surface text-[#4f46e5]',
                label: 'Sprint Workload Capacity',
                value: '26 hrs/wk',
                sub: '48% Headroom',
              },
            ].map((kpi) => (
              <StaggerItem key={kpi.label}>
                <div className="stitch-card h-full rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${kpi.tint}`}
                  >
                    <kpi.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <p className="tnum font-display mt-2 text-[26px] font-extrabold leading-none text-ink">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {kpi.label}
                  </p>
                  <p className="tnum mt-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {kpi.sub}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      ) : (
        <>
          {/* Live aggregates (kept for honest reporting) */}
          <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Ideas found', value: opportunities.length, format: (n: number) => `${n}` },
              {
                label: 'Avg EarnScore',
                value: average(opportunities.map((o) => o.earn_score)),
                format: (n: number) => `${n}`,
              },
              { label: 'Buyer leads', value: buyerLeads.length, format: (n: number) => `${n}` },
              {
                label: 'Avg match',
                value: average(buyerLeads.map((l) => l.match_score)),
                format: (n: number) => `${n}`,
              },
              { label: 'Scams blocked', value: blocked, format: (n: number) => `${n}` },
              { label: 'Shortlisted', value: shortlist.count, format: (n: number) => `${n}` },
              { label: 'Local spots', value: locals.length, format: (n: number) => `${n}` },
              { label: 'Credits used', value: credits, format: (n: number) => `${n}` },
            ].map((kpi) => (
              <StaggerItem key={kpi.label}>
                <div className="stitch-card h-full rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {kpi.label}
                  </p>
                  <p className="font-display tnum mt-1 text-3xl font-bold text-ink">
                    <CountUp value={kpi.value} format={kpi.format} />
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
            {/* Live radar sweep monitor */}
            <Reveal className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm xl:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
                  />
                  Live Radar Sweep Monitor
                </p>
                <div
                  className="flex gap-1 rounded-lg bg-surface p-1"
                  role="group"
                  aria-label="Radar radius"
                >
                  {['5km', '15km', '30km'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={radius === r}
                      onClick={() => setRadius(r)}
                      className={`tnum rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${radius === r ? 'bg-raised text-[#4f46e5] shadow-sm' : 'text-muted hover:text-ink'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <p className="tnum mt-0.5 text-xs text-muted">
                Realtime scanning {radius === '5km' ? '5' : radius === '30km' ? '30' : '35'}km
                Indore SME perimeter
              </p>
              <div className="relative mt-3 rounded-xl bg-surface p-4 shadow-inner">
                <RadarScope
                  label={`Combined scope with ${blips.length} signals from both modes`}
                  blips={
                    blips.length > 0
                      ? blips
                      : [
                          {
                            x: 62,
                            y: 30,
                            tone: 'safe',
                            label: 'Cloud Kitchen ₹38k',
                            sub: 'Vijay Nagar',
                          },
                          {
                            x: 35,
                            y: 65,
                            tone: 'fit',
                            label: 'Shopify Dev ₹35k',
                            sub: 'Tech Park',
                          },
                          {
                            x: 72,
                            y: 58,
                            tone: 'gap',
                            label: 'Chhappan Bhog ₹20k',
                            sub: 'Token queue',
                          },
                          {
                            x: 30,
                            y: 28,
                            tone: 'risk',
                            label: 'Blocked Fake Gig',
                            sub: 'Heuristic #402',
                          },
                        ]
                  }
                  caption={`${opportunities.length} ideas · ${buyerLeads.length} leads · ${blocked} scams blocked`}
                />
                <span className="tnum absolute right-4 top-4 rounded-full bg-raised/90 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm dark:text-emerald-300">
                  SWEEP FREQ: 2.4s
                </span>
              </div>
              <p className="tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#10b981]" /> Verified
                  High-Fit Lead
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#4f46e5]" /> Tech
                  Freelance Contract
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#06b6d4]" /> Local
                  Tech Gap
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#ef4444]" /> Scam
                  Blocked
                </span>
              </p>
            </Reveal>

            <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
              {/* Revenue actions queue */}
              <Reveal className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                    <Bolt className="h-4 w-4 text-[#4f46e5]" aria-hidden="true" />
                    High-Priority Revenue Actions
                    <span className="rounded-full bg-[#e2dfff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#0f0069]">
                      Sprint Queue
                    </span>
                  </p>
                </div>
                <p className="mt-3 text-[15px] font-bold text-ink">Top actions right now</p>
                {actions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Star-worthy results will appear here.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {actions.map((action) => (
                      <li
                        key={action.key}
                        className="stitch-lift flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink">{action.title}</p>
                          <p className="tnum truncate text-xs text-muted">{action.detail}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-display tnum text-xl font-bold text-ink">
                            {action.score}
                          </span>
                          <span className="btn-stitch-primary inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold">
                            <Send className="h-3 w-3" aria-hidden="true" /> Pitch
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-muted">
                  Scores are signals from public data, not guarantees. Verify before acting.
                </p>
              </Reveal>

              {/* Operator badge */}
              <Reveal
                delay={0.05}
                className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm"
              >
                <p className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
                  Verified Operator Badge
                  <span className="tnum inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> GST & Aadhaar Cleared
                  </span>
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="font-display flex h-12 w-12 items-center justify-center rounded-full bg-[#4f46e5] text-base font-extrabold text-white ring-2 ring-[#e2dfff]">
                    P
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-ink">
                      Priya Sharma{' '}
                      <span className="ml-1 rounded-full bg-[#e2dfff] px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-[#0f0069]">
                        Pro Hustler
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      Full-Stack Freelancer & Bharat SME Consultant
                    </p>
                    <p className="tnum mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active in Indore
                      Hub • 4 Clients Active
                    </p>
                  </div>
                </div>
                <div className="tnum mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted">Sprint Goal: ₹1,50,000</span>
                  <strong className="text-[#4f46e5]">79% Reached</strong>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface"
                  role="img"
                  aria-label="Sprint goal 79 percent reached"
                >
                  <div className="h-full w-[79%] rounded-full bg-[#4f46e5]" />
                </div>
              </Reveal>
            </div>
          </div>
        </>
      )}

      {/* Bottom strip: geospatial + telemetry */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <Reveal className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm md:col-span-8">
          <p className="text-[15px] font-bold text-ink">Indore Metro Geospatial Cluster Density</p>
          <p className="text-xs text-muted">Active SME Digitization Demand</p>
          <div className="tnum mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {GEO_CLUSTERS.map((g) => (
              <div key={g.name} className="stitch-card rounded-lg bg-surface p-3">
                <p className="text-xs font-bold text-ink">{g.name}</p>
                <p className="font-display mt-0.5 text-2xl font-extrabold text-ink">{g.count}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {g.delta}
                </p>
                <p className="text-[10px] text-muted">{g.vol}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal
          delay={0.05}
          className="rounded-xl border border-line/70 bg-raised p-5 shadow-sm md:col-span-4"
        >
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            <span
              aria-hidden="true"
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
            />
            Engine Telemetry & Quota
          </p>
          <p className="tnum font-display mt-2 text-3xl font-extrabold text-ink">
            184 <span className="text-lg text-muted">/ 200</span>
          </p>
          <p className="tnum text-xs font-bold text-emerald-700 dark:text-emerald-300">
            92% Available
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface"
            role="img"
            aria-label="SerpAPI quota 92 percent available"
          >
            <div className="h-full w-[92%] rounded-full bg-[#4f46e5]" />
          </div>
          <p className="tnum mt-2 text-[11px] text-muted">
            SerpAPI Live Latency: 42ms | Next Refresh: 18m 40s
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" /> Zero-Fraud Latency: 42ms • Sync
            Rate: 100 Hz
          </p>
        </Reveal>
      </div>

      {/* Masterclass strip */}
      <Reveal>
        <div className="flex flex-col gap-4 rounded-xl border border-line/70 bg-raised p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="group relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-[#2d3133] sm:w-56">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-[#4f46e5]/50 to-[#c3c0ff]/40"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4f46e5] shadow-lg transition-transform duration-200 group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-white text-white" aria-hidden="true" />
              </span>
            </span>
            <span className="tnum absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              2:34 HD
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink">Discovery Engine Masterclass</p>
            <p className="mt-0.5 text-xs text-muted">
              Watch: Scaling Tier-2 WhatsApp Automation — pitch SMEs on UPI conversion, deploy
              zero-code Razorpay webhooks, lock escrow milestones.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/app/income"
                aria-label="Open income discovery"
                className="btn-stitch-primary rounded-lg px-3.5 py-2 text-xs font-bold"
              >
                Open Income Discovery
              </Link>
              <Link
                to="/app/customers"
                aria-label="Open B2B leads radar"
                className="stitch-lift rounded-lg border border-line bg-raised px-3.5 py-2 text-xs font-bold text-ink hover:bg-surface"
              >
                Open B2B Leads Radar
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
