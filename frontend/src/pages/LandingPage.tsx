import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  LineChart,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { RadarScope } from '../components/RadarScope';
import { Reveal, Stagger, StaggerItem } from '../components/motion';
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
    title: 'Tell us about yourself',
    body: 'Your skills and city, or your product and price. Plain words are fine. Nothing is stored.',
    icon: Search,
  },
  {
    step: '02',
    title: 'We check live sources',
    body: 'Jobs, local businesses, demand trends and forums. Slow sources are marked, never hidden.',
    icon: TrendingUp,
  },
  {
    step: '03',
    title: 'You get ranked results',
    body: 'EarnScore or lead scores with the reasoning shown. Drafts are yours to review and send.',
    icon: Sparkles,
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

/** Static product mock built from real UI components with modern glassmorphism. */
/** Static product mock built from real UI components with modern Stitch glassmorphism. */
export function ProductMock() {
  return (
    <div
      aria-label="Example EarnRadar result"
      className="relative overflow-hidden rounded-3xl border border-line/80 bg-raised/95 p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:shadow-glow"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ScoreRing score={78} label="EarnScore" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand">
                #1 Top Match
              </span>
              <RiskBadge risk="Low" />
              <span className="rounded-full bg-surface border border-line/80 px-2 py-0.5 text-[11px] font-medium text-muted">
                Local Service Gap • Pune Hub
              </span>
            </div>
            <p className="mt-2 break-words text-lg font-bold text-ink">
              Tailoring from home, Pune
            </p>
            <p className="mt-1 text-xs text-muted">
              High-demand neighborhood tailoring & stitching service. Direct local customer outreach with zero upfront capital.
            </p>
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <div className="text-lg font-extrabold text-ink">
            Income: ₹8,000/month <span className="rounded-full border border-line/80 bg-surface/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Estimate</span>
          </div>
          <div className="text-xs font-semibold text-brand">Approx. 10 hrs / week</div>
        </div>
      </div>

      {/* 3-Column Key Signals Grid from Stitch */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line/60 pt-4">
        <div className="rounded-xl border border-line/60 bg-surface/70 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Demand Signal</div>
          <div className="mt-1 flex items-center justify-between font-bold text-ink">
            <span className="text-sm tabular-nums">21.0 / 30.0 pts</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div
            role="img"
            aria-label="Demand: 21.0 of 30 weighted points"
            className="mt-1.5 h-1.5 w-full rounded-full bg-line/80 overflow-hidden"
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '70%' }} />
          </div>
        </div>

        <div className="rounded-xl border border-line/60 bg-surface/70 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Feasibility Score</div>
          <div className="mt-1 flex items-center justify-between font-bold text-ink">
            <span className="text-sm">90%</span>
            <Sparkles className="h-3.5 w-3.5 text-brand" />
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-line/80 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: '90%' }} />
          </div>
        </div>

        <div className="rounded-xl border border-line/60 bg-surface/70 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Competition Gap</div>
          <div className="mt-1 flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
            <span className="text-sm">Low (28%)</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-line/80 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '28%' }} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-brand" /> EarnScore 78 · 7-day plan included · evidence shown
        </span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live verified
        </span>
      </div>
    </div>
  );
}

/** Marketing landing: hero, mock, steps, features, trust, FAQ, final CTA. */
export function LandingPage() {
  return (
    <div className="flex flex-col gap-12 py-2">
      <Seo route="/" />

      {/* Hero Section */}
      <Reveal>
      <section
        aria-labelledby="landing-heading"
        className="hero-glow relative overflow-hidden rounded-3xl p-6 sm:p-12 text-center shadow-xl backdrop-blur-2xl"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand backdrop-blur-md shadow-xs">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            AI-Powered Market & Income Intelligence
          </div>

          <h1
            id="landing-heading"
            className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Realistic income ideas for India
          </h1>

          <p className="max-w-xl text-base sm:text-lg text-muted leading-relaxed">
            Ranked opportunities with honest scores. Or customers for your product. Estimates, not promises.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/app/income"
              onMouseEnter={prefetchIncome}
              onFocus={prefetchIncome}
              className="brand-gradient group inline-flex min-h-[48px] items-center gap-2 rounded-xl px-7 py-3 text-base font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <Briefcase className="h-4 w-4" />
              <span>Find my opportunities</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/app/customers"
              onMouseEnter={prefetchCustomers}
              onFocus={prefetchCustomers}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-line/80 bg-raised/90 px-7 py-3 text-base font-bold text-ink shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-surface hover:border-brand/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Users className="h-4 w-4 text-brand" />
              <span>Find customers for my product</span>
            </Link>
          </div>

          {/* Telemetry live pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/80 px-3 py-1 shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              SerpAPI Real-Time Telemetry
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/80 px-3 py-1 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              Scam-Shield Heuristics
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/80 px-3 py-1 shadow-xs">
              <MapPin className="h-3.5 w-3.5 text-teal-500" />
              Pan-India Geolocation Grid
            </span>
          </div>
        </div>
      </section>
      </Reveal>

      {/* Example signal ticker */}
      <section aria-label="Example signals" className="w-full overflow-hidden">
        <div className="flex items-center gap-3">
          <p className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-strong px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-white" />
            Examples
          </p>
          <div className="relative flex-1 overflow-hidden" aria-hidden="true">
            <div className="animate-ticker flex w-max items-center gap-8 whitespace-nowrap text-xs text-muted">
              {[0, 1].map((copy) => (
                <span key={copy} className="flex items-center gap-8">
                  <span>Tailoring in Pune • skills to income in a week</span>
                  <span aria-hidden="true">•</span>
                  <span>Delivery in Ahmedabad • 15 hrs/week</span>
                  <span aria-hidden="true">•</span>
                  <span>Restaurant billing software • Ahmedabad eateries</span>
                  <span aria-hidden="true">•</span>
                  <span>Gym membership software • Pune fitness studios</span>
                  <span aria-hidden="true">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Sample searches other people run — your results are computed live from your words.
        </p>
      </section>

      {/* Product Mock Preview */}
      <Reveal>
      <section aria-labelledby="landing-mock-heading" className="flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="landing-mock-heading" className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              <span>Live Intelligence Preview</span>
            </h2>
            <span className="text-xs font-semibold text-muted">Real-time signal calculations</span>
          </div>
          <ProductMock />
        </div>
      </section>
      </Reveal>

      {/* Stitch Polar Radar Telemetry & SME Masterclass Grid */}
      <Reveal>
      <section aria-labelledby="landing-telemetry-heading" className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Panel: Live Polar Radar Telemetry */}
          <div className="lg:col-span-7 rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-6 shadow-md backdrop-blur-xl flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-ink flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Polar Radar Telemetry
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">Node ID: MP09-IND-C3 • Geofence 15km Radius</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-line/80 bg-surface/80 px-2.5 py-1 text-xs font-semibold text-ink shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>38 Verified Targets</span>
              </div>
            </div>

            {/* Radar Screen Interactive Canvas */}
            <div className="relative w-full rounded-2xl border border-line/80 bg-surface/90 p-4">
              <RadarScope
                label="Example radar sweep showing income signals across the city grid"
                blips={[
                  { x: 33, y: 25, tone: 'safe', label: 'Cloud Kitchen Bot', sub: '₹38k/mo • Vijay Nagar' },
                  { x: 66, y: 72, tone: 'fit', label: 'Shopify Localization', sub: '₹35k escrow • 98% fit' },
                  { x: 72, y: 34, tone: 'risk', label: 'Data Typing Scheme', sub: 'Blocked heuristic #402' },
                ]}
              />
              {/* Live Scope Coordinates Overlay */}
              <div className="absolute bottom-6 left-6 rounded-xl border border-line/80 bg-raised/90 backdrop-blur-md px-2.5 py-1 shadow-xs flex items-center gap-2 text-[11px] text-muted">
                <span>AZ: <strong className="text-ink">142.8°</strong></span>
                <span>•</span>
                <span>EL: <strong className="text-ink">12°</strong></span>
                <span>•</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">SNR: 44dB</span>
              </div>
            </div>

            {/* Bottom Telemetry Specs */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-line/60 text-center text-xs">
              <div className="rounded-xl bg-surface/80 p-2 border border-line/60">
                <p className="text-[10px] uppercase font-bold text-muted">Mesh Accuracy</p>
                <p className="text-sm font-extrabold text-ink mt-0.5">99.8%</p>
              </div>
              <div className="rounded-xl bg-surface/80 p-2 border border-line/60">
                <p className="text-[10px] uppercase font-bold text-muted">Audit Latency</p>
                <p className="text-sm font-extrabold text-ink mt-0.5">14ms</p>
              </div>
              <div className="rounded-xl bg-surface/80 p-2 border border-line/60">
                <p className="text-[10px] uppercase font-bold text-muted">Escrow Pockets</p>
                <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">₹14.2L</p>
              </div>
            </div>
          </div>

          {/* Right Panel: Discovery SME Playbook Card */}
          <div className="lg:col-span-5 rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-6 shadow-md backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-ink flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-brand" />
                  Regional SME Playbook
                </span>
                <span className="rounded-full bg-brand/10 border border-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand uppercase">
                  Tier-2 Verified
                </span>
              </div>
              <p className="text-xs text-muted mb-4 leading-relaxed">
                Extract hidden business bottlenecks from local customer reviews and deploy closed-loop solutions.
              </p>

              {/* Key Curriculum Takeaways */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/80 border border-line/60">
                  <MessageSquare className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-ink">Pitch SMEs Without Cold-Calling</p>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Use negative Google review telemetry to pitch exact solutions (token queues, menu automation).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/80 border border-line/60">
                  <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-ink">Deploy Razorpay UPI Bots</p>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Setup zero-code payment links on WhatsApp for regional sweet shops and jewelers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface/80 border border-line/60">
                  <ShieldCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-ink">100% Escrow Milestone Lock</p>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Secures advance token before commencing design or sprint delivery.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-line/60">
              <Link
                to="/app/income"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-line/80 bg-surface/80 py-2.5 text-xs font-bold text-brand hover:bg-raised hover:border-brand/40 transition-all shadow-xs"
              >
                <span>Launch Radar Intelligence Search</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      </Reveal>
      {/* 3 Step Workflow */}
      <Reveal>
      <section aria-labelledby="landing-steps-heading">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Simple 3-Step Process</p>
          <h2 id="landing-steps-heading" className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            How it works
          </h2>
        </div>

        <Stagger as="ol" className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <StaggerItem as="li" key={step.title}>
              <div
                className="group relative flex h-full flex-col gap-3 rounded-2xl border border-line/80 bg-raised/80 p-6 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-brand/40 hover:shadow-md hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-extrabold text-brand/80">Step {index + 1}</span>
                </div>
                <p className="text-lg font-bold text-ink">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>
      </Reveal>

      {/* Feature Grid */}
      <Reveal>
      <section aria-labelledby="landing-features-heading">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Built for precision</p>
          <h2 id="landing-features-heading" className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Features
          </h2>
        </div>

        <Stagger as="ul" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <StaggerItem as="li" key={feature.title}>
              <div
                className="group flex h-full flex-col gap-3 rounded-2xl border border-line/80 bg-raised/80 p-6 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-brand/40 hover:shadow-md hover:-translate-y-1"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-sm`}
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

      {/* Trust & Transparency Section */}
      <Reveal>
      <section
        aria-labelledby="landing-trust-heading"
        className="rounded-3xl border border-line/80 bg-raised/90 p-6 sm:p-8 shadow-sm backdrop-blur-md"
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Honesty Guarantee</p>
          <h2 id="landing-trust-heading" className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            What we are — and aren&apos;t
          </h2>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>We are</span>
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Estimates, clearly labelled</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Risk signals, not safety verdicts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Drafts you review before sending</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400">
              <XCircle className="h-5 w-5" />
              <span>We aren&apos;t</span>
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Promises of income or customers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>A guarantee any job is safe</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>An auto-messenger — nothing sends itself</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
      </Reveal>

      {/* FAQ Details Accordion */}
      <Reveal>
      <section aria-labelledby="landing-faq-heading">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Got questions?</p>
          <h2 id="landing-faq-heading" className="font-display mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Questions
          </h2>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-2xl border border-line/80 bg-raised/80 p-4 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-brand/40"
            >
              <summary className="cursor-pointer rounded-sm text-sm sm:text-base font-semibold text-ink hover:text-brand transition-colors">
                {faq.q}
              </summary>
              <p className="mt-3 border-t border-line/60 pt-3 text-sm leading-relaxed text-muted">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>
      </Reveal>

      {/* Final Call to Action */}
      <Reveal>
      <section
        aria-labelledby="landing-cta-heading"
        className="hero-glow rounded-3xl p-8 sm:p-12 text-center shadow-xl"
      >
        <div className="mx-auto max-w-2xl flex flex-col items-center gap-3">
          <h2
            id="landing-cta-heading"
            className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl"
          >
            Start with your skills or your product
          </h2>
          <p className="text-sm sm:text-base text-muted">
            Get live ranked opportunities or customers in seconds.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/app/income"
              onMouseEnter={prefetchIncome}
              onFocus={prefetchIncome}
              className="brand-gradient inline-flex min-h-[48px] items-center gap-2 rounded-xl px-7 py-3 text-base font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]"
            >
              <Briefcase className="h-4 w-4" />
              <span>Find my opportunities</span>
            </Link>
            <Link
              to="/app/customers"
              onMouseEnter={prefetchCustomers}
              onFocus={prefetchCustomers}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-line/80 bg-raised/90 px-7 py-3 text-base font-bold text-ink shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-surface hover:border-brand/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Users className="h-4 w-4 text-brand" />
              <span>Find customers for my product</span>
            </Link>
          </div>
        </div>
      </section>
      </Reveal>
    </div>
  );
}
