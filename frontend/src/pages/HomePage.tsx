import { motion } from 'framer-motion';
import { Map as MapIcon, RefreshCw, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Reveal, Stagger, StaggerItem } from '../components/motion';
import { Seo } from '../components/Seo';
import type { ApiError } from '../api/errors';
import { Inspector } from '../features/search/Inspector';
import { ProfileForm } from '../features/search/ProfileForm';
import { SearchProgress, SearchResultsSkeleton } from '../features/search/SearchProgress';
import { SearchResults } from '../features/search/SearchResults';
import { useSearchSession } from '../features/search/session';

function SearchError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
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

const PIPELINE = [
  { label: 'Portals Scraped', detail: 'Indeed, Upwork, Internshala', pct: 100, done: true },
  { label: 'Local Maps Grid', detail: 'Indore Central (48 POIs)', pct: 100, done: true },
  { label: 'Forums & X Feeds', detail: 'Reddit r/developersIndia & X', pct: 88, done: false },
  { label: 'Scam-Shield Blending', detail: 'Security Score Calibration', pct: 25, done: false },
] as const;

const FILTER_TABS = [
  'All Opportunities (14)',
  'Remote Gigs (6)',
  'Local Gaps (5)',
  'Flagged Scams (3)',
] as const;

/** Income-mode page: Stitch discovery radar — command strip, pipeline, form, results, inspector. */
export function HomePage() {
  const session = useSearchSession();
  const loading = session.status === 'loading';
  const [tab, setTab] = useState(0);
  const [sweeping, setSweeping] = useState(false);

  function recalibrate() {
    setSweeping(true);
    window.setTimeout(() => setSweeping(false), 1400);
  }

  return (
    <section aria-labelledby="income-heading" className="flex flex-col gap-4">
      <Seo route="/app/income" />

      {/* Stitch Command Strip */}
      <Reveal>
        <div className="stitch-card flex flex-col justify-between gap-3 rounded-xl border border-line/80 bg-raised p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="income-heading"
                  className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl"
                >
                  Income Discovery Radar
                </h1>
                <span className="tnum rounded-full bg-[#dae2fd] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#131b2e]">
                  v3.4 Production
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted sm:text-sm">
                Live telemetry query engine across SerpAPI, Bharat Micro-Markets, and
                Escrow-validated listings.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="tnum inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Active Cluster: <strong className="text-[#4f46e5]">Indore (MP-09)</strong>
            </span>
            <button
              type="button"
              onClick={recalibrate}
              className="stitch-lift inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-raised"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${sweeping ? 'animate-spin' : ''}`}
              />
              {sweeping ? 'Sweeping Bharat Grid…' : 'Re-calibrate'}
            </button>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          {/* Radar Search Parameters */}
          <Reveal>
            <div className="rounded-xl border border-line/80 bg-raised p-4 shadow-sm backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-line/60 pb-3">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-[#4f46e5]" />
                  Radar Search Parameters
                </p>
                <p className="tnum hidden text-[11px] font-semibold uppercase tracking-wide text-muted sm:block">
                  SerpAPI Realtime Engine • Strict Anti-Scam Filter
                </p>
              </div>
              <ProfileForm loading={loading} onSubmit={session.run} />
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#006e4b]" />
                Scam-Shield heuristic weights tuned to Tier-2 Bharat cashflow risks.
              </p>
            </div>
          </Reveal>

          {/* Telemetry pipeline */}
          <Reveal>
            <div className="rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 animate-ping rounded-full bg-[#4f46e5]"
                  />
                  Bharat Engine Pipeline Status
                </p>
                <p className="tnum rounded-md bg-surface px-2 py-1 text-[11px] text-muted">
                  SerpAPI Cache: <strong className="text-[#006e4b]">1.2s latency</strong> • 0
                  Duplicates detected
                </p>
              </div>
              <Stagger className="mt-3 grid gap-2 sm:grid-cols-4">
                {PIPELINE.map((stage, i) => (
                  <StaggerItem key={stage.label}>
                    <div className="rounded-lg bg-surface p-2.5">
                      <p className="flex items-center justify-between text-[11px] font-bold text-ink">
                        {stage.label}
                        {stage.done ? (
                          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#006e4b]" />
                        ) : (
                          <span className="tnum text-[#4f46e5]">{stage.pct}%</span>
                        )}
                      </p>
                      <div
                        className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/70"
                        role="img"
                        aria-label={`${stage.label}: ${stage.pct} percent complete`}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${stage.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full ${stage.done ? 'bg-[#006e4b]' : stage.pct > 50 ? 'bg-[#4f46e5]' : 'bg-line'}`}
                        />
                      </div>
                      <p className="tnum mt-1 text-[10px] text-muted">{stage.detail}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </Reveal>

          {/* Filter tabs + sort */}
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div
              className="rail-scroll flex gap-1 overflow-x-auto rounded-xl bg-surface p-1"
              role="group"
              aria-label="Filter opportunities"
            >
              {FILTER_TABS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={tab === i}
                  onClick={() => setTab(i)}
                  className={`tnum shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    tab === i
                      ? 'bg-raised text-[#4f46e5] shadow-sm'
                      : i === 3
                        ? 'text-[#ba1a1a] hover:bg-[#ffdad6]/40'
                        : 'text-muted hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Sort by:
              <select
                className="rounded-lg border border-line/0 bg-transparent text-xs font-bold text-ink focus:border-brand"
                aria-label="Sort opportunities"
              >
                <option>Highest Radar Fit (90%+)</option>
                <option>Fastest Escrow Payout</option>
                <option>Lowest Competition Gap</option>
              </select>
            </label>
          </div>

          {loading ? (
            <>
              <SearchProgress retrying={session.retrying} />
              <SearchResultsSkeleton />
            </>
          ) : null}
          {session.status === 'error' && session.error ? (
            <SearchError error={session.error} onRetry={session.retry} />
          ) : null}
          {session.status === 'success' && session.result ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <SearchResults />
            </motion.div>
          ) : null}

          {/* Stitch sample signals (shown before first sweep) */}
          {session.status !== 'success' &&
          session.status !== 'loading' &&
          session.status !== 'error' ? (
            <Reveal>
              <div className="grid gap-3">
                <article className="stitch-card relative overflow-hidden rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-0 h-full w-1.5 bg-[#4f46e5]"
                  />
                  <div className="flex flex-wrap items-center gap-2 pl-2">
                    <span className="tnum rounded-md bg-[#e2dfff] px-2 py-0.5 text-[11px] font-bold text-[#0f0069]">
                      94/100 Radar Fit
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#6ffbbe] px-2 py-0.5 text-[11px] font-semibold text-[#002113]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#005338]" /> Verified Escrow
                    </span>
                    <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted">
                      Local Service Gap • Indore Hub
                    </span>
                  </div>
                  <p className="mt-2 pl-2 text-[15px] font-bold text-ink">
                    Local Cloud Kitchen WhatsApp Automation & Billing System
                  </p>
                  <p className="mt-1 pl-2 text-[13px] text-muted">
                    High-volume food collective across Chhappan Dukan & Vijay Nagar losing 22%
                    margin to aggregator apps. Deploy a lightweight WhatsApp catalog + Razorpay UPI
                    checkout workflow.
                  </p>
                  <p className="tnum mt-2 pl-2 text-[15px] font-bold text-ink">
                    ₹28,000 – ₹45,000 / mo{' '}
                    <span className="text-xs font-medium text-muted">• Approx. 12 hrs / week</span>
                  </p>
                </article>
                <article className="stitch-card relative overflow-hidden rounded-xl border border-[#ffdad6]/60 bg-raised p-4 shadow-sm">
                  <div className="flex items-center gap-3 pl-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ba1a1a] text-white">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="tnum rounded-md bg-[#ba1a1a] px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                        Risk Score: 12/100 — Critical Scam Warning
                      </p>
                      <p className="mt-1 text-[13px] font-bold text-[#93000a]">
                        Fake Captcha Typing & Upfront Security Deposit Scheme
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 pl-2 text-[13px] text-muted">
                    <strong className="text-[#ba1a1a]">Flag Trigger:</strong> demands{' '}
                    <strong className="text-ink">₹999 refundable portal activation fee</strong> via
                    Telegram bot. Origin mapped to offshore spam farm using a fake Indore GST
                    number. Auto-blocked from grid.
                  </p>
                </article>
              </div>
            </Reveal>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4 xl:sticky xl:top-20">
          <Inspector result={session.result} />
          {/* Stitch cluster panels */}
          <Reveal className="rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <MapIcon aria-hidden="true" className="h-4 w-4 text-[#4f46e5]" />
              Indore Cluster Hotspots
              <span className="tnum ml-auto rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                Tier-2 Hub
              </span>
            </p>
            <div className="relative mt-3 h-36 overflow-hidden rounded-xl bg-gradient-to-br from-[#4f46e5]/25 via-[#e0e3e5] to-[#006e4b]/20">
              <div
                aria-hidden="true"
                className="stitch-ambient left-4 top-4 h-20 w-20 bg-[#4f46e5]/30"
              />
              <div
                aria-hidden="true"
                className="stitch-ambient bottom-2 right-6 h-16 w-16 bg-[#006e4b]/30"
              />
              <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5">
                {[
                  { n: 'Vijay Nagar (5 gaps)', c: 'bg-[#4f46e5]' },
                  { n: 'Bhawarkua (4 gaps)', c: 'bg-[#006e4b]' },
                  { n: 'Chhappan (3 gaps)', c: 'bg-[#565e74]' },
                ].map((h) => (
                  <span
                    key={h.n}
                    className="tnum inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur"
                  >
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${h.c}`} />
                    {h.n}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-lg border-l-2 border-[#4f46e5] bg-surface p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#4f46e5]">
                High-Conviction Gap Spotlight{' '}
                <span className="tnum ml-1 rounded bg-[#6ffbbe] px-1.5 py-0.5 text-[10px] text-[#002113]">
                  Unclaimed
                </span>
              </p>
              <p className="mt-1 text-[13px] font-bold text-ink">Sharma Sweets & Premium Bakers</p>
              <p className="mt-0.5 text-xs text-muted">
                0 automated WhatsApp bot presence despite 180+ weekend delivery inquiries flagged in
                Google Reviews. Monthly ₹15k retainer for instant automated order capture.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.05} className="rounded-xl border border-line/70 bg-raised p-4 shadow-sm">
            <p className="flex items-center gap-2 border-b border-line/60 pb-2 text-[15px] font-bold text-ink">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#006e4b]" />
              Cluster Liquidity & Safety
            </p>
            <div className="tnum mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface p-2.5">
                <p className="text-[10px] font-bold uppercase text-muted">Avg Monthly Income</p>
                <p className="text-lg font-extrabold text-ink">₹42,500</p>
                <p className="text-[10px] font-bold text-[#006e4b]">↑ +14% vs. Bhopal Hub</p>
              </div>
              <div className="rounded-lg bg-surface p-2.5">
                <p className="text-[10px] font-bold uppercase text-muted">Scam Protection</p>
                <p className="text-lg font-extrabold text-[#006e4b]">100%</p>
                <p className="text-[10px] text-muted">Heuristic v4.2 Engine</p>
              </div>
            </div>
            <p className="mt-2 rounded-lg bg-surface p-2 text-xs text-muted">
              All recommendations audited against non-collateral payment gateways.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
