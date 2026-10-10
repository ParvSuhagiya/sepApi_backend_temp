import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Copy,
  Lightbulb,
  Map as MapIcon,
  MessageSquare,
  Rocket,
  Send,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Reveal, Stagger, StaggerItem } from '../components/motion';
import { Seo } from '../components/Seo';
import type { ApiError } from '../api/errors';
import { useLeadsSession } from '../features/customers/session';
import { LeadsInspector } from '../features/customers/LeadsInspector';
import { LeadsProgress, LeadsResultsSkeleton } from '../features/customers/LeadsProgress';
import { LeadsResults } from '../features/customers/LeadsResults';
import { OfferForm } from '../features/customers/OfferForm';

function LeadsError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-tone-red-border/30 bg-tone-red-bg/10 p-5 shadow-md"
    >
      <p className="text-sm font-semibold text-ink">{error.message}</p>
      {error.requestId ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          Support code:{' '}
          <code className="rounded-lg bg-surface px-2 py-1 font-mono">{error.requestId}</code>
          <CopyButton text={error.requestId} label="support code" />
        </p>
      ) : null}
      <div>
        <Button variant="secondary" onClick={onRetry}>
          Retry search
        </Button>
      </div>
    </div>
  );
}

const PRESETS = [
  'Restaurant POS & Bot',
  'Gym Follow-ups',
  'Salon Automation',
  'Dental Reminders',
] as const;

const SAMPLE_LEADS = [
  {
    name: 'Chhappan Bhog Express & Sweets',
    fit: '96% Fit Score',
    meta: '2.4 km away • New Palasia',
    tags: 'Quick Service Sweets & Snacks • 14 Counter Staff • ₹12L est. monthly turnover',
    pain: '“Food is delicious but took 45 mins due to manual paper token counter slips during evening rush.”',
    rating: '2.0 Star Rating',
    pitch:
      'Introduce 1-click QR WhatsApp digital token dispenser on counter tables to eliminate 70% of counter congestion.',
    icebreaker:
      '“Do your staff struggle to balance Zomato phone calls while managing counter billing between 7–10 PM?”',
    contact: 'Rajesh Agarwal (Owner)',
    message:
      '“Namaste Rajesh ji, Chhappan Bhog ke weekend rush mein manual bill delays dekhe. Humne Sarafa ke 2 outlets ke liye WhatsApp direct QR billing setup kiya hai jisse wait time 10 min ho gaya. Kya hum kal 5-min quick demo schedule kar sakte hain?”',
  },
  {
    name: "Gold's FitZone Gym & Wellness Center",
    fit: '89% Fit Score',
    meta: '4.8 km away • Vijay Nagar Sector-B',
    tags: 'Premium Strength & CrossFit • 420 Active Members • ₹6.5L est. recurring MRR',
    pain: '“Members complain about forgotten quarterly renewal reminders and missed fees, leading to embarrassing lockouts at front turnstiles.”',
    rating: '3.1 Avg Friction',
    pitch:
      'Implement automated Razorpay WhatsApp renewal links 3 days before expiry to recover an estimated 22% of dropped subscriptions.',
    icebreaker: null,
    contact: 'Vikram Solanki • WhatsApp Verified',
    message: null,
  },
] as const;

/** Customer-mode page: Stitch B2B leads radar — cluster strip, parameterizer, ranked matches. */
export function CustomersPage() {
  const session = useLeadsSession();
  const loading = session.status === 'loading';
  const [preset, setPreset] = useState(0);
  const [filter, setFilter] = useState(0);
  const hasResults = session.status === 'success' && session.result;

  function editAndRerun() {
    const field = document.getElementById('offer-text');
    if (!field) return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    field.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    field.focus({ preventScroll: true });
  }

  return (
    <section aria-labelledby="customers-heading" className="flex flex-col gap-6">
      <Seo route="/app/customers" />

      {/* Cluster status strip */}
      <Reveal>
        <div className="er-card flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <span id="customers-heading">Cluster: Indore Commercial Zone (MP-09)</span>
            <span className="tnum rounded-full bg-[#6ffbbe] px-2 py-0.5 text-[11px] font-bold text-[#002113]">
              Active Mesh 98.4%
            </span>
          </p>
          <p className="tnum flex items-center gap-2 text-xs text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live SerpAPI Maps Telemetry: Scraped 14m ago
            <button type="button" className="font-bold text-brand hover:underline">
              Engine Config
            </button>
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* LEFT control panel */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-4">
          <Reveal>
            <div className="er-card">
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                    <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-brand" />
                    Offer Parameterizer
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Configure product vector embedding to discover high-urgency SME buyers.
                  </p>
                </div>
                <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              </div>

              {/* AI badge */}
              <p className="tnum mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/8 px-2.5 py-1.5 text-[11px] font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                AI Semantic Vector Match Active
                <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                  BERT-v3
                </span>
              </p>

              {/* Form */}
              <div className="mt-4 border-t border-line pt-4">
                <OfferForm loading={loading} onSubmit={session.run} />
              </div>
            </div>
          </Reveal>


          {/* Market benchmark */}
          <Reveal delay={0.05}>
            <div className="er-card">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[15px] font-bold text-ink">Market Benchmark</p>
                <span className="tnum rounded-full bg-[#6ffbbe] px-2 py-0.5 text-[11px] font-bold text-[#002113]">
                  High Opportunity
                </span>
              </div>
              <p className="mb-4 text-xs text-muted">
                Competitor density & pricing matrix for quick-service WhatsApp tools in Indore Urban.
              </p>
              <dl className="tnum space-y-3 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">
                    Local Vendor Density{' '}
                    <strong className="block text-ink">2 Existing Vendors</strong>
                  </dt>
                  <dd className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold text-ink">
                    Low Saturation
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">
                    Avg Market Pricing <strong className="block text-ink">₹2,500 /mo</strong>
                  </dt>
                  <dd className="text-right text-[11px]">
                    <strong className="text-emerald-600">+40% Margin Edge</strong>
                    <span className="block text-muted">You are 40% cheaper</span>
                  </dd>
                </div>
              </dl>
              <div className="mt-4 rounded-lg bg-surface p-3 text-xs text-muted">
                <strong className="text-ink">Key Positioning Advantage:</strong> Zero-hardware
                phone-based setup. Incumbents demand bulky thermal print servers costing ₹22,000
                upfront.
              </div>
              <div className="tnum mt-3 flex items-end justify-between">
                <p className="text-[11px] font-bold text-ink">
                  SME Tech Conversion Index{' '}
                  <span className="text-base">73.8 / 100</span>{' '}
                  <span className="text-emerald-600">↑4.2%</span>
                </p>
              </div>
              <svg
                viewBox="0 0 120 28"
                className="mt-2 h-8 w-full"
                role="img"
                aria-label="Conversion index trending up"
              >
                <path
                  d="M0 20 L20 18 L40 22 L60 12 L80 15 L100 8 L120 4"
                  fill="none"
                  stroke="var(--er-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M0 20 L20 18 L40 22 L60 12 L80 15 L100 8 L120 4 L120 28 L0 28 Z"
                  fill="var(--er-accent)"
                  opacity="0.1"
                />
              </svg>
            </div>
          </Reveal>

          <p className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-xs text-ink">
            <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Pro Hustle Tip:</strong> Outreach between 3:30 PM & 5:30 PM (before dinner
              rush) yields 3.2x higher founder replies.
            </span>
          </p>

          <LeadsInspector result={session.result} />
        </div>

        {/* RIGHT leads intelligence */}
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
          <Reveal>
            <div className="er-card flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-lg font-bold text-ink">
                  Ranked Buyer Matches{' '}
                  <span className="tnum ml-1 rounded-full bg-indigo-100 px-2 py-0.5 align-middle text-[11px] font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                    Indore Hub
                  </span>
                </p>
                <p className="tnum mt-1 text-xs text-muted">
                  48 nodes parsed via Google Maps API •{' '}
                  <strong className="text-ink">12 verified immediate hotspots detected</strong>
                </p>
              </div>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter buyer matches"
              >
                {['High Fit (90%+)', 'Verified Pain Points', 'Immediate Outreach Ready'].map(
                  (label, i) => (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={filter === i}
                      onClick={() => setFilter(i)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                        filter === i
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-surface text-muted hover:text-ink'
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </Reveal>

          {/* Density map strip */}
          <Reveal>
            <div className="er-card">
              <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
                <MapIcon aria-hidden="true" className="h-4 w-4 text-brand" />
                Indore Commercial Density Radar
                <span className="tnum ml-auto hidden text-[11px] font-medium text-muted sm:block">
                  Low Friction • High Wait Delay
                </span>
              </p>
              <div className="relative h-36 overflow-hidden rounded-xl bg-gradient-to-br from-[#2d3133] via-[#4f46e5]/40 to-[#006e4b]/40">
                <div aria-hidden="true" className="stitch-ambient left-8 top-4 h-24 w-24 bg-[#4f46e5]/50" />
                <div aria-hidden="true" className="stitch-ambient bottom-0 right-10 h-20 w-20 bg-[#6ffbbe]/30" />
                <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5">
                  {[
                    { n: 'Chhappan Dukan (6 Leads) 96% Demand', dot: 'bg-red-500' },
                    { n: 'Sarafa Bazaar (4 Leads) Night Hotspot', dot: 'bg-brand' },
                    { n: 'Vijay Nagar (5 Leads) High Ticket', dot: 'bg-emerald-500' },
                  ].map((h) => (
                    <span
                      key={h.n}
                      className="tnum inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur"
                    >
                      <span aria-hidden="true" className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${h.dot} opacity-60`} />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${h.dot}`} />
                      </span>
                      {h.n}
                    </span>
                  ))}
                </div>
                <span className="tnum absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Lat: 22.7196° N • Long: 75.8577° E
                </span>
              </div>
            </div>
          </Reveal>

          {loading ? (
            <>
              <LeadsProgress retrying={session.retrying} />
              <LeadsResultsSkeleton />
            </>
          ) : null}
          {session.status === 'error' && session.error ? (
            <LeadsError error={session.error} onRetry={session.retry} />
          ) : null}
          {hasResults ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <LeadsResults onEdit={editAndRerun} />
            </motion.div>
          ) : (
            <Stagger className="flex flex-col gap-4">
              {SAMPLE_LEADS.map((lead) => (
                <StaggerItem key={lead.name}>
                  <article className="er-card-hover rounded-xl">
                    {/* Lead header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-cyan-500 text-sm font-extrabold text-white">
                          {lead.name.charAt(0)}
                          <span
                            aria-hidden="true"
                            className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                            title="Open now"
                          />
                        </span>
                        <div>
                          <h3 className="text-[15px] font-bold text-ink">{lead.name}</h3>
                          <p className="tnum mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                            <span className="rounded-full bg-[#6ffbbe] px-2 py-0.5 font-bold text-[#002113]">
                              {lead.fit}
                            </span>
                            {lead.meta}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Save ${lead.name}`}
                        className="stitch-lift rounded-lg bg-surface p-2 text-muted hover:text-ink transition-colors"
                      >
                        <Star className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Tags */}
                    <p className="tnum mt-2.5 text-xs text-muted">{lead.tags}</p>

                    {/* Pain signal */}
                    <div className="mt-3 rounded-xl bg-red-50/60 p-3 dark:bg-red-500/10">
                      <p className="er-label mb-1">Real customer pain signal (scraped via Google Maps)</p>
                      <p className="tnum text-xs font-bold text-ink">{lead.rating}</p>
                      <p className="mt-1 text-[13px] italic text-ink leading-relaxed">{lead.pain}</p>
                    </div>

                    {/* Strategic pitch */}
                    <div className="mt-3 rounded-xl bg-surface p-3 text-[13px]">
                      <p>
                        <strong className="text-brand">Strategic pitch angle:</strong>{' '}
                        <span className="text-muted">{lead.pitch}</span>
                      </p>
                      {lead.icebreaker ? (
                        <p className="mt-2">
                          <strong className="text-ink">Battle-tested icebreaker:</strong>{' '}
                          <span className="text-muted">{lead.icebreaker}</span>
                        </p>
                      ) : null}
                    </div>

                    {/* WhatsApp outreach */}
                    {lead.message ? (
                      <div className="mt-3 rounded-xl border border-line bg-surface/60 p-3.5">
                        <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink">
                          <Send className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                          Integrated WhatsApp Outreach Studio
                          <span className="rounded-full bg-raised px-2 py-0.5 text-[10px] font-semibold text-muted">
                            Hinglish Persona
                          </span>
                          <span className="tnum text-[11px] font-semibold text-muted">
                            Target: {lead.contact}
                          </span>
                        </p>
                        <p className="tnum mt-2.5 rounded-lg bg-raised p-2.5 font-mono text-xs leading-relaxed text-ink">
                          {lead.message}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-stitch-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
                          >
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Send via WhatsApp Web
                          </button>
                          <button
                            type="button"
                            className="stitch-lift inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-xs font-bold text-ink shadow-sm"
                          >
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy Pitch Script
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn-stitch-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold"
                        >
                          <Rocket className="h-3.5 w-3.5" aria-hidden="true" /> Launch WhatsApp Outreach
                        </button>
                        <span className="tnum text-[11px] text-muted">Owner: {lead.contact}</span>
                      </div>
                    )}
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          )}

          {/* Pagination */}
          <div className="tnum flex items-center justify-between rounded-xl border border-line bg-raised px-4 py-2.5 text-xs text-muted">
            <span>Showing 3 of 15 Scored Businesses in Indore Metro</span>
            <span className="flex items-center gap-1" role="group" aria-label="Lead pages">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-label={`Page ${p}`}
                  aria-current={p === 1 ? 'page' : undefined}
                  className={`h-7 w-7 rounded-md text-xs font-bold ${p === 1 ? 'bg-brand/10 text-brand shadow-sm' : 'hover:bg-surface'}`}
                >
                  {p}
                </button>
              ))}
              <span aria-hidden="true">…</span>
              <button
                type="button"
                aria-label="Page 5"
                className="h-7 w-7 rounded-md text-xs font-bold hover:bg-surface"
              >
                5
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
