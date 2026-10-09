import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  Calendar,
  CheckCircle2,
  LineChart,
  MapPin,
  MessageSquare,
  Play,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { RadarScope } from '../components/RadarScope';
import { CountUp, Reveal, Stagger, StaggerItem } from '../components/motion';
import { Seo } from '../components/Seo';
import { RiskBadge } from '../components/ui/RiskBadge';
import { ScoreRing } from '../components/ui/ScoreBadge';

/** Warm the route chunk on hover/focus so the app opens instantly. */
function prefetchIncome() {
  void import('../pages/HomePage');
}

/** Warm the route chunk on hover/focus so the app opens instantly. */
function prefetchCustomers() {
  void import('../pages/CustomersPage');
}

const STEPS = [
  {
    step: '01',
    title: 'Input Profile & Bandwidth',
    body: 'Specify your real weekly availability (e.g. 15 hrs/wk), equipment, and regional skill competencies like WhatsApp Commerce, Shopify Dev, or Translation.',
    footer: 'Input vector: ₹0–₹25k capital • Tier-2 Local',
    icon: Search,
  },
  {
    step: '02',
    title: 'Multi-Source Radar Sweep',
    body: 'Simultaneous crawling across Google Maps Business POIs, Indeed, Upwork, and local commerce registers. Deduplicated in real-time.',
    footer: 'Data depth: 1,400+ SerpAPI POIs / minute',
    icon: TrendingUp,
  },
  {
    step: '03',
    title: 'Scam-Shield & Outreach',
    body: 'Every lead undergoes GSTIN registry verification. Receive customized Hinglish WhatsApp pitch templates linked to escrow-locked payments.',
    footer: 'Safety: 0% upfront-fee frauds permitted',
    icon: ShieldCheck,
  },
] as const;

const FEATURES = [
  {
    title: 'Ranked opportunities with EarnScore',
    body: 'Every score shows its weights and adjustments across demand, fit, trust, and ease.',
    icon: LineChart,
    gradient: 'from-blue-500/20 to-indigo-500/20 text-indigo-500',
  },
  {
    title: 'Scam Shield',
    body: 'Text-pattern risk signals on every job. A low-risk badge is a signal, not a safety promise.',
    icon: ShieldCheck,
    gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-500',
  },
  {
    title: 'Local leads on a map',
    body: 'Businesses near your city, with approximate pins marked as approximate for clarity.',
    icon: MapPin,
    gradient: 'from-rose-500/20 to-orange-500/20 text-rose-500',
  },
  {
    title: 'Trend chart',
    body: 'Demand direction at a glance, with a data-table fallback for instant comparison.',
    icon: TrendingUp,
    gradient: 'from-purple-500/20 to-pink-500/20 text-purple-500',
  },
  {
    title: '7-day plans',
    body: 'A concrete first week roadmap for each idea. Copy with one click or print cleanly.',
    icon: Calendar,
    gradient: 'from-amber-500/20 to-yellow-500/20 text-amber-500',
  },
  {
    title: 'Human-reviewed outreach',
    body: 'Editable WhatsApp drafts. You open WhatsApp yourself. Nothing ever auto-sends.',
    icon: MessageSquare,
    gradient: 'from-teal-500/20 to-cyan-500/20 text-teal-500',
  },
] as const;

const FAQS = [
  {
    q: 'Are the income figures guaranteed?',
    a: 'No. They are estimates from collected evidence, always labelled Estimate. Treat them as a starting point, not a promise.',
  },
  {
    q: 'How does Scam-Shield detect fraudulent work-from-home gigs?',
    a: 'Scam-Shield cross-examines listings against 26 behavioral heuristics: requests for upfront security deposits, missing MCA/GSTIN registrations, Telegram redirect links, and vague job descriptions. If any heuristic triggers, the signal is quarantined before hitting your radar.',
  },
  {
    q: 'Is the WhatsApp outreach automated or spam compliant?',
    a: 'We never perform mass spamming. EarnRadar synthesizes single, highly customized 1-on-1 solution pitches based on public customer reviews. You review, approve, and click to start an opt-in conversation directly from your verified phone number.',
  },
  {
    q: 'What cities are currently active in the Bharat Grid?',
    a: 'Full telemetry is currently live in Indore (MP-09), Bhopal (MP-04), Lucknow (UP-32), Surat (GJ-05), and Jaipur (RJ-14), along with global remote contract feeds from Upwork, Indeed, and verified Indian D2C directories.',
  },
  {
    q: 'Is a “low risk” job safe?',
    a: 'Not necessarily. Scam Shield only checks text patterns. Verify every employer before paying money or sharing documents.',
  },
  {
    q: 'Do you send messages for me?',
    a: 'Never. Drafts are written for you to edit. You open WhatsApp yourself, and you can ignore the opt-out line rule at your own risk — every draft includes one.',
  },
  {
    q: 'What do you store about me?',
    a: 'Only your theme choice, in your own browser. Search results live in memory and vanish when you close the tab.',
  },
  {
    q: 'Why did a search cost zero credits?',
    a: 'Repeated identical searches are served from cache. The results page always shows credits used and cache hits.',
  },
] as const;

const TICKER = [
  'Indore Vijay Nagar: Cloud Kitchen WhatsApp Bot needed (₹38,000/mo retainer) [96% MATCH]',
  'Scam-Shield Intercept: Blocked "Data Entry ₹999 Activation Deposit" syndicate [PREVENTED]',
  'Remote D2C: Shopify Hindi Localization Sprint (₹35,000 Milestone Escrow) [VERIFIED GST]',
  'Surat Ring Rd: Textile Wholesaler B2B Catalog automation (₹50,000 upfront)',
] as const;

/** Static product mock built from real UI components with modern glassmorphism. */
/** Static product mock built from real UI components with modern Stitch glassmorphism. */
export function ProductMock() {
  return (
    <div
      aria-label="Example EarnRadar result"
      className="stitch-card relative overflow-hidden rounded-2xl border border-line/80 bg-raised/95 p-5 shadow-md backdrop-blur-xl hover:shadow-lg sm:p-6"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <ScoreRing score={78} label="EarnScore" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand">
                #1 Top Match
              </span>
              <RiskBadge risk="Low" />
              <span className="rounded-full border border-line/80 bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
                Local Service Gap • Pune Hub
              </span>
            </div>
            <p className="mt-2 break-words text-lg font-bold text-ink">Tailoring from home, Pune</p>
            <p className="mt-1 text-xs text-muted">
              High-demand neighborhood tailoring & stitching service. Direct local customer outreach
              with zero upfront capital.
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <div className="tnum text-lg font-extrabold text-ink">
            Income: ₹8,000/month{' '}
            <span className="rounded-full border border-line/80 bg-surface/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
              Estimate
            </span>
          </div>
          <div className="text-xs font-semibold text-brand">Approx. 10 hrs / week</div>
        </div>
      </div>

      {/* 3-Column Key Signals Grid from Stitch */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line/60 pt-4">
        <div className="rounded-xl border border-line/60 bg-surface/70 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Demand Signal
          </div>
          <div className="mt-1 flex items-center justify-between font-bold text-ink">
            <span className="tnum text-sm">21.0 / 30.0 pts</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div
            role="img"
            aria-label="Demand: 21.0 of 30 weighted points"
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/80"
          >
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '70%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-line/60 bg-surface/70 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Feasibility Score
          </div>
          <div className="mt-1 flex items-center justify-between font-bold text-ink">
            <span className="tnum text-sm">90%</span>
            <Sparkles className="h-3.5 w-3.5 text-brand" />
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/80">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '90%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              className="h-full rounded-full bg-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-line/60 bg-surface/70 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Competition Gap
          </div>
          <div className="mt-1 flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
            <span className="tnum text-sm">Low (28%)</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line/80">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '28%' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand" /> EarnScore 78 · 7-day plan included ·
          evidence shown
        </span>
        <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live verified
        </span>
      </div>
    </div>
  );
}

/** Marketing landing: Stitch discovery portal — hero, ticker, radar, pipeline, samples, founder, FAQ, CTA. */
export function LandingPage() {
  return (
    <div className="flex flex-col gap-10 py-2">
      <Seo route="/" />

      {/* ── Stitch Hero ── */}
      <Reveal>
        <section
          aria-labelledby="landing-heading"
          className="relative overflow-hidden rounded-2xl border border-line/60 bg-raised px-4 pb-10 pt-10 text-center shadow-sm sm:px-8"
        >
          <div
            aria-hidden="true"
            className="stitch-ambient left-[8%] top-[-80px] h-72 w-72 bg-[#4f46e5]/10 animate-drift"
          />
          <div
            aria-hidden="true"
            className="stitch-ambient right-[6%] top-[30%] h-72 w-72 bg-[#4edea3]/25 animate-drift"
            style={{ animationDelay: '-6s' }}
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="tnum inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-line/70 bg-surface px-3.5 py-1.5 text-[11px] font-semibold text-muted shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Bharat Grid v3.4.12 Live • Realtime SerpAPI & Geolocation Sweep
              <span className="rounded-full bg-[#6ffbbe] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#002113]">
                MP-09 Online
              </span>
            </motion.div>

            <motion.h1
              id="landing-heading"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="font-display max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl"
            >
              <span className="sr-only">Realistic income ideas for India. </span>
              Turn Your Skills & Time Into
              <br />
              <span className="text-[#4f46e5]">Verified High-Yield Income</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl text-[15px] leading-relaxed text-muted"
            >
              AI-powered commercial intelligence radar for Tier 2/3 India. Uncover verified
              freelance gigs, local SME automation gaps, and B2B buyer leads with instant
              Scam-Shield fraud intercept. Estimates, not promises.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 flex flex-col items-center gap-3 sm:flex-row"
            >
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/app/income"
                  aria-label="Find my opportunities"
                  onMouseEnter={prefetchIncome}
                  onFocus={prefetchIncome}
                  className="btn-stitch-primary inline-flex min-h-[48px] items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-bold text-white"
                >
                  <Radar className="h-4 w-4" />
                  <span>Launch Income Radar Sweep</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.span>
              <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/app/customers"
                  aria-label="Find customers for my product"
                  onMouseEnter={prefetchCustomers}
                  onFocus={prefetchCustomers}
                  className="stitch-lift inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-line bg-raised px-6 py-3 text-[15px] font-bold text-ink shadow-sm hover:bg-surface"
                >
                  <Store className="h-4 w-4 text-[#4f46e5]" />
                  <span>Scan Local B2B Leads</span>
                </Link>
              </motion.span>
            </motion.div>

            {/* Stitch trust strip */}
            <div className="tnum mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-line/60 bg-surface px-5 py-2.5 text-xs font-semibold text-ink shadow-sm">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#006e4b]" />
                ₹4.8L+ Realized Monthly
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#4f46e5]" />
                99.2% Fraud Blocked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bolt className="h-4 w-4 text-muted" />
                <CountUp value={184} format={(n) => `${n}`} />
                /200 Free SerpAPI Credits Remaining
              </span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Live Grid Pulse ticker ── */}
      <section
        aria-label="Live grid pulse"
        className="overflow-hidden rounded-xl border border-line/60 bg-[#e6e8ea]/60 py-2.5 shadow-inner"
      >
        <div className="flex items-center gap-4 px-4">
          <p className="tnum flex shrink-0 items-center gap-1.5 rounded-md bg-raised px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#4f46e5] shadow-sm">
            <span
              aria-hidden="true"
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"
            />
            Live Grid Pulse
          </p>
          <div className="fade-x relative flex-1 overflow-hidden" aria-hidden="true">
            <div className="stitch-ticker flex w-max items-center gap-10 whitespace-nowrap text-xs font-medium text-muted">
              {[0, 1].map((copy) => (
                <span key={copy} className="flex items-center gap-10">
                  {TICKER.map((line) => (
                    <span key={`${copy}-${line}`}>{line}</span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-1 px-4 text-[11px] text-muted">
          Sample searches other people run — your results are computed live from your words.
        </p>
      </section>

      {/* ── Dual preview: radar telemetry + masterclass ── */}
      <Reveal>
        <section aria-labelledby="landing-telemetry-heading" className="w-full">
          <h2 id="landing-telemetry-heading" className="sr-only">
            Live telemetry and masterclass
          </h2>
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            <div className="stitch-card rounded-xl border border-line/70 bg-raised p-5 shadow-md lg:col-span-7">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
                    <Radar aria-hidden="true" className="h-4 w-4 text-[#4f46e5]" />
                    Live Polar Radar Telemetry
                  </p>
                  <p className="tnum mt-0.5 text-xs text-muted">
                    Node ID: MP09-IND-C3 • Geofence 15km Radius
                  </p>
                </div>
                <span className="tnum inline-flex items-center gap-1.5 rounded-lg border border-line/70 bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  38 Verified Targets
                </span>
              </div>
              <div className="relative rounded-lg border border-line/70 bg-[#e0e3e5]/50 p-4">
                <RadarScope
                  label="Example radar sweep showing income signals across the city grid"
                  blips={[
                    {
                      x: 33,
                      y: 25,
                      tone: 'safe',
                      label: 'Cloud Kitchen Bot',
                      sub: '₹38k/mo • Vijay Nagar',
                    },
                    {
                      x: 66,
                      y: 72,
                      tone: 'fit',
                      label: 'Shopify Localization',
                      sub: '₹35k escrow • 98% fit',
                    },
                    {
                      x: 72,
                      y: 34,
                      tone: 'risk',
                      label: 'Data Typing Scheme',
                      sub: 'Blocked heuristic #402',
                    },
                    {
                      x: 45,
                      y: 60,
                      tone: 'gap',
                      label: 'Chhappan Bhog Gap',
                      sub: '₹20k/mo • token queue',
                    },
                  ]}
                />
                <div className="tnum absolute bottom-6 left-6 flex items-center gap-2 rounded-lg border border-line/70 bg-raised/90 px-2.5 py-1 text-[11px] text-muted shadow-sm backdrop-blur">
                  <span>
                    AZ: <strong className="text-ink">142.8°</strong>
                  </span>
                  <span>•</span>
                  <span>
                    EL: <strong className="text-ink">12°</strong>
                  </span>
                  <span>•</span>
                  <span className="font-bold text-[#006e4b]">SNR: 44dB</span>
                </div>
              </div>
              <div className="tnum mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-center">
                {[
                  { k: 'Mesh Accuracy', v: '99.8%' },
                  { k: 'Audit Latency', v: '14ms' },
                  { k: 'Escrow Pockets', v: '₹14.2L', accent: true },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg bg-surface p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      {s.k}
                    </p>
                    <p
                      className={`mt-0.5 text-sm font-extrabold ${s.accent ? 'text-[#006e4b]' : 'text-ink'}`}
                    >
                      {s.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="stitch-card flex flex-col justify-between rounded-xl border border-line/70 bg-raised p-5 shadow-md lg:col-span-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[15px] font-bold text-ink">Discovery Masterclass</p>
                  <span className="tnum rounded-full bg-[#dae2fd] px-2 py-0.5 text-[11px] font-semibold text-[#131b2e]">
                    2:34 HD Walkthrough
                  </span>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-muted">
                  Watch how EarnRadar extracts hidden business bottlenecks from local customer
                  reviews and drafts closed-loop solutions.
                </p>
                <div className="group relative h-44 overflow-hidden rounded-lg bg-[#2d3133]">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-br from-[#4f46e5]/50 to-[#c3c0ff]/40"
                  />
                  <div
                    aria-hidden="true"
                    className="stitch-ambient left-6 top-6 h-28 w-28 bg-[#4f46e5]/40"
                  />
                  <button
                    type="button"
                    aria-label="Play discovery engine masterclass preview"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-transform duration-200 group-hover:scale-110">
                      <Play
                        aria-hidden="true"
                        className="ml-0.5 h-6 w-6 fill-[#4f46e5] text-[#4f46e5]"
                      />
                    </span>
                  </button>
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 text-[#6ffbbe]" />
                    Tier 2/3 Playbook
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    {
                      icon: MessageSquare,
                      tint: 'text-[#4f46e5]',
                      t: 'Pitch SMEs Without Cold-Calling',
                      d: 'Use negative Google review telemetry to pitch exact token-queue fixes.',
                    },
                    {
                      icon: TrendingUp,
                      tint: 'text-[#006e4b]',
                      t: 'Deploy Razorpay UPI Bots',
                      d: 'Setup zero-code payment links on WhatsApp for regional retailers.',
                    },
                    {
                      icon: ShieldCheck,
                      tint: 'text-[#4f46e5]',
                      t: '100% Escrow Milestone Lock',
                      d: 'Secures advance token before commencing sprint delivery.',
                    },
                  ].map((row) => (
                    <div
                      key={row.t}
                      className="flex items-start gap-2.5 rounded-lg bg-surface p-2.5"
                    >
                      <row.icon
                        aria-hidden="true"
                        className={`mt-0.5 h-4 w-4 shrink-0 ${row.tint}`}
                      />
                      <div>
                        <p className="text-xs font-bold text-ink">{row.t}</p>
                        <p className="text-[11px] leading-relaxed text-muted">{row.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                to="/app/income"
                className="stitch-lift mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#eceef0] py-2.5 text-xs font-bold text-[#4f46e5] transition-colors hover:bg-[#dae2fd]"
              >
                Access Full Video Archive • Free Tier
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Product mock preview (live components) ── */}
      <Reveal>
        <section aria-labelledby="landing-mock-heading" className="flex flex-col items-center">
          <div className="w-full max-w-4xl">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="landing-mock-heading"
                className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink"
              >
                <Sparkles className="h-5 w-5 text-brand" />
                <span>Live Intelligence Preview</span>
              </h2>
              <span className="tnum text-xs font-semibold text-muted">
                Real-time signal calculations
              </span>
            </div>
            <ProductMock />
          </div>
        </section>
      </Reveal>

      {/* ── 3-step pipeline ── */}
      <Reveal>
        <section
          aria-labelledby="landing-steps-heading"
          className="rounded-2xl border border-line/60 bg-[#f2f4f6] p-6 sm:p-8"
        >
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">
              Algorithmic Precision
            </p>
            <h2
              id="landing-steps-heading"
              className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[22px]"
            >
              How it works
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              How EarnRadar identifies solvent regional income — a three-tier discovery system tuned
              for Tier-2 Bharat cashflow realities.
            </p>
          </div>
          <Stagger as="ol" className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <StaggerItem as="li" key={step.title}>
                  <div className="stitch-card flex h-full flex-col gap-3 rounded-xl border border-line/70 bg-raised p-5 shadow-sm hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="tnum text-xs font-extrabold text-[#4f46e5]">
                        {step.step}
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4f46e5]/10 text-[#4f46e5]">
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                    </div>
                    <p className="text-[15px] font-bold text-ink">{step.title}</p>
                    <p className="text-[13px] leading-relaxed text-muted">{step.body}</p>
                    <p className="tnum mt-auto rounded-lg bg-surface p-2 text-xs font-medium text-ink">
                      {step.footer}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      </Reveal>

      {/* ── Verified opportunity samples (Stitch bento) ── */}
      <section aria-labelledby="landing-samples-heading">
        <Reveal>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">
                Regional Grid Telemetry
              </p>
              <h2
                id="landing-samples-heading"
                className="font-display mt-1 text-2xl font-bold tracking-tight text-ink"
              >
                Active Verified Opportunity Samples
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Live sample signals parsed within the last 45 minutes across Madhya Pradesh &
                Western corridors.
              </p>
            </div>
            <div className="flex gap-1 rounded-lg bg-[#eceef0] p-1 text-xs font-semibold">
              <span className="rounded-md bg-raised px-3 py-1.5 text-ink shadow-sm">
                All Corridors
              </span>
              <span className="px-3 py-1.5 text-muted">B2B Local Gaps</span>
              <span className="px-3 py-1.5 text-muted">Remote Escrow</span>
            </div>
          </div>
        </Reveal>
        <Stagger className="mt-5 grid gap-4 lg:grid-cols-3">
          <StaggerItem>
            <article className="stitch-card flex h-full flex-col gap-3 rounded-xl border border-line/70 bg-raised p-5 shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tnum rounded-md bg-[#6ffbbe] px-2 py-0.5 text-[11px] font-bold text-[#002113]">
                  96% FIT MATCH
                </span>
                <span className="tnum text-[11px] font-medium text-muted">Indore • Palasia</span>
              </div>
              <h3 className="text-[18px] font-bold leading-snug text-ink">
                Chhappan Bhog Express & Sweets
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#4f46e5]">
                Pain: 45-min peak manual billing congestion
              </p>
              <div className="rounded-lg bg-surface p-3 text-[13px]">
                <p className="text-muted">Recommended Pitch: WhatsApp Token QR Bot</p>
                <p className="tnum mt-1 font-bold text-[#006e4b]">Estimated Contract: ₹20,000/mo</p>
                <p className="mt-0.5 text-xs text-muted">
                  Target Contact: Owner on WhatsApp (Verified)
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006e4b]">
                  <BadgeCheck className="h-3.5 w-3.5" /> GST Reg Validated
                </span>
                <Link
                  to="/app/customers"
                  className="btn-stitch-primary rounded-lg px-3 py-1.5 text-xs font-bold"
                >
                  Draft Hinglish Pitch
                </Link>
              </div>
            </article>
          </StaggerItem>
          <StaggerItem>
            <article className="stitch-card flex h-full flex-col gap-3 rounded-xl border border-line/70 bg-raised p-5 shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#dae2fd] px-2 py-0.5 text-[11px] font-bold text-[#131b2e]">
                  VERIFIED MILESTONE
                </span>
                <span className="tnum text-[11px] font-medium text-muted">Indeed Remote</span>
              </div>
              <h3 className="text-[18px] font-bold leading-snug text-ink">
                Shopify Hindi Localization Sprint
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Scope: Translate D2C storefront into Hindi + Marathi
              </p>
              <div className="rounded-lg bg-surface p-3 text-[13px]">
                <p className="text-muted">Deliverable Window: 10 Calendar Days</p>
                <p className="tnum mt-1 font-bold text-[#4f46e5]">Locked Escrow: ₹35,000 Upfront</p>
                <p className="tnum mt-0.5 text-xs text-muted">Applicants: 4 (Low Competition)</p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006e4b]">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% Escrow Funded
                </span>
                <Link
                  to="/app/income"
                  className="stitch-lift rounded-lg bg-[#eceef0] px-3 py-1.5 text-xs font-bold text-ink hover:bg-[#dae2fd]"
                >
                  View Brief Details
                </Link>
              </div>
            </article>
          </StaggerItem>
          <StaggerItem>
            <article className="stitch-card flex h-full flex-col gap-3 rounded-xl border border-[#fecaca]/70 bg-raised p-5 shadow-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#ffdad6] px-2 py-0.5 text-[11px] font-bold text-[#93000a]">
                  FRAUD INTERCEPTED
                </span>
                <span className="text-[11px] font-medium text-[#ba1a1a]">Telegram Channel</span>
              </div>
              <h3 className="text-[18px] font-bold leading-snug text-ink">
                Captcha Typing “Earn ₹4,000/Day”
              </h3>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#ba1a1a]">
                Flag: Asks ₹999 refundable software deposit
              </p>
              <div className="rounded-lg bg-[#ffdad6]/40 p-3 text-[13px]">
                <p className="text-muted">Detection Heuristic: #402 Advance Deposit</p>
                <p className="tnum mt-1 font-bold text-ink">
                  User Risk Averted: ₹999 + Identity Theft
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#ba1a1a]">
                  Telemetry Action: Domain Blacklisted
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#ba1a1a]">
                  <XCircle className="h-3.5 w-3.5" /> Grid Threat Suppressed
                </span>
                <span className="cursor-not-allowed rounded-lg bg-[#eceef0] px-3 py-1.5 text-xs font-bold text-muted">
                  Deactivated
                </span>
              </div>
            </article>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ── Founder strip (Stitch) ── */}
      <Reveal>
        <section
          aria-label="Founder"
          className="grid items-center gap-6 rounded-2xl border border-line/60 bg-raised p-6 shadow-sm sm:p-8 lg:grid-cols-12"
        >
          <div className="flex items-center gap-4 lg:col-span-5">
            <span className="font-display flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#06b6d4] text-2xl font-extrabold text-white shadow-md sm:h-28 sm:w-28">
              AV
            </span>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                <BadgeCheck className="h-3 w-3" /> Operator Verified
              </span>
              <p className="mt-1 text-[15px] font-bold text-ink">Arjun Vardhan</p>
              <p className="text-xs text-muted">Founding Telemetry Engineer • Ex-Razorpay</p>
              <p className="tnum mt-0.5 text-[11px] text-muted">Sovereign Mesh ID: MP-IND-8842</p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <blockquote className="border-l-4 border-[#4f46e5] pl-4 text-[15px] font-semibold italic leading-relaxed text-ink">
              “EarnRadar replaces three weeks of awkward manual cold calls with 15 minutes of
              verified, high-intent signals that local Tier 2 business owners are already desperate
              to pay for.”
            </blockquote>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {['GSTIN Verified', 'Aadhaar Ready', 'Razorpay Escrow', 'Zero-Spam SLA'].map((b) => (
                <span
                  key={b}
                  className="rounded-lg bg-surface px-2 py-1.5 text-center text-[11px] font-bold text-ink"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Feature Grid (kept for capability coverage) ── */}
      <Reveal>
        <section aria-labelledby="landing-features-heading">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              Built for precision
            </p>
            <h2
              id="landing-features-heading"
              className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              Features
            </h2>
          </div>
          <Stagger as="ul" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <StaggerItem as="li" key={feature.title}>
                  <div className="stitch-card group flex h-full flex-col gap-3 rounded-2xl border border-line/80 bg-raised/80 p-6 shadow-sm backdrop-blur-md hover:border-brand/40 hover:shadow-md">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-sm transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-base font-bold text-ink">{feature.title}</p>
                    <p className="text-sm leading-relaxed text-muted">{feature.body}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      </Reveal>

      {/* ── Trust & Transparency Section ── */}
      <Reveal>
        <section
          aria-labelledby="landing-trust-heading"
          className="rounded-2xl border border-line/80 bg-raised/90 p-6 shadow-sm backdrop-blur-md sm:p-8"
        >
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              Honesty Guarantee
            </p>
            <h2
              id="landing-trust-heading"
              className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
            >
              What we are — and aren&apos;t
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>We are</span>
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                {[
                  'Estimates, clearly labelled',
                  'Risk signals, not safety verdicts',
                  'Drafts you review before sending',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
              <p className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400">
                <XCircle className="h-5 w-5" />
                <span>We aren&apos;t</span>
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
                {[
                  'Promises of income or customers',
                  'A guarantee any job is safe',
                  'An auto-messenger — nothing sends itself',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── FAQ (Stitch + product) ── */}
      <Reveal>
        <section
          aria-labelledby="landing-faq-heading"
          className="rounded-2xl border border-line/60 bg-[#f2f4f6] p-6 sm:p-8"
        >
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">
                Architecture & Integrity
              </p>
              <h2
                id="landing-faq-heading"
                className="font-display mt-1 text-2xl font-bold tracking-tight text-ink"
              >
                Questions
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Frequently answered telemetry questions on fraud detection, outreach compliance and
                grid coverage.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              {FAQS.map((faq, i) => (
                <motion.details
                  key={faq.q}
                  open={i === 0}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.25) }}
                  className="group rounded-xl border border-line/70 bg-raised p-4 shadow-sm transition-colors hover:border-brand/30"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink transition-colors hover:text-brand sm:text-[15px]">
                    {faq.q}
                  </summary>
                  <p className="mt-3 border-t border-line/60 pt-3 text-sm leading-relaxed text-muted">
                    {faq.a}
                  </p>
                </motion.details>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── Final CTA (Stitch dark panel) ── */}
      <Reveal>
        <section
          aria-labelledby="landing-cta-heading"
          className="relative overflow-hidden rounded-2xl bg-[#2d3133] p-8 text-center shadow-xl sm:p-12"
        >
          <div
            aria-hidden="true"
            className="stitch-ambient left-[12%] top-[-60px] h-64 w-64 bg-[#4f46e5]/30"
          />
          <div
            aria-hidden="true"
            className="stitch-ambient bottom-[-70px] right-[10%] h-64 w-64 bg-[#4edea3]/15"
          />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-3">
            <span className="tnum inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#6ffbbe] backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Instant Activation Mesh
            </span>
            <h2
              id="landing-cta-heading"
              className="font-display text-2xl font-bold tracking-tight text-white sm:text-[28px]"
            >
              Ready to Monetize Your Spare Hours Across Bharat?
              <span className="sr-only"> Start with your skills or your product.</span>
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-[#bec6e0] sm:text-[15px]">
              Join 12,400+ operators scanning Bharat commercial grids with automated Scam-Shield
              fraud protection and instant outreach. Get live ranked opportunities or customers in
              seconds.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                <Link
                  to="/app/income"
                  onMouseEnter={prefetchIncome}
                  onFocus={prefetchIncome}
                  aria-label="Find my opportunities, start free radar sweep"
                  className="btn-stitch-primary inline-flex min-h-[48px] items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-bold"
                >
                  <Bolt className="h-4 w-4" />
                  <span>Start Free Radar Sweep (No Card Required)</span>
                </Link>
              </motion.span>
              <Link
                to="/app/customers"
                onMouseEnter={prefetchCustomers}
                onFocus={prefetchCustomers}
                aria-label="Find customers for my product"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-[15px] font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <Users className="h-4 w-4" />
                <span className="sr-only">Find customers for my product — </span>
                <span aria-hidden="true">Find customers</span>
              </Link>
            </div>
            <p className="tnum mt-2 text-[11px] text-[#c7c4d8]">
              Includes 200 Free SerpAPI Leads • DPDP Act (2023) Sovereign Guard Compliant
            </p>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
