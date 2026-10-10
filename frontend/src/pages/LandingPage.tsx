import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Shield, TrendingUp, Zap } from 'lucide-react';
import { Seo } from '../components/Seo';

function prefetchIncome()    { void import('../pages/HomePage'); }
function prefetchCustomers() { void import('../pages/CustomersPage'); }

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Smart Income Matching',
    desc: 'Describe your skills and available hours. We scan thousands of opportunities and rank them by fit, earning potential, and competition level.',
  },
  {
    icon: Shield,
    title: 'Built-in Scam Protection',
    desc: '26 fraud heuristics check every listing automatically. Suspicious opportunities are flagged before they reach you — no upfront deposits, ever.',
  },
  {
    icon: Zap,
    title: 'Ready-to-send Outreach',
    desc: 'Get a personalized WhatsApp message draft for each lead. Edit it, then send from your own phone. Nothing auto-sends.',
  },
] as const;

const HOW = [
  { n: '1', t: 'Tell us your skills', d: 'Enter your weekly hours, what you can do, and your city.' },
  { n: '2', t: 'We search everything', d: 'Jobs, local businesses, and freelance gigs — all in one scan.' },
  { n: '3', t: 'Pick your best lead', d: 'Every result is scored, verified, and comes with an action plan.' },
] as const;

export function LandingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Seo route="/" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: '1px solid var(--er-line)',
          padding: '80px 24px 72px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Live badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 99,
              border: '1px solid var(--er-line)',
              background: 'var(--er-raised)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--er-muted)',
              marginBottom: 28,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--er-success)',
                display: 'inline-block',
                animation: 'er-pulse 2s ease-in-out infinite',
              }}
            />
            Live · Indore, Bhopal, Lucknow + remote
          </span>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--er-ink)',
              margin: '0 0 20px',
            }}
          >
            Find real income
            <br />
            <span style={{ color: 'var(--er-accent)' }}>from your skills</span>
          </h1>

          <p
            style={{
              fontSize: 17,
              color: 'var(--er-muted)',
              lineHeight: 1.65,
              margin: '0 0 36px',
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            EarnRadar scans jobs, local businesses, and freelance markets to surface
            verified income opportunities — with fraud protection built in.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'center',
            }}
          >
            <Link
              to="/app/income"
              onMouseEnter={prefetchIncome}
              aria-label="Find income opportunities"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                background: 'var(--er-accent)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all .15s ease',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--er-accent-dark)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--er-accent)';
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
              }}
            >
              Find Income Opportunities
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/app/customers"
              onMouseEnter={prefetchCustomers}
              aria-label="Find B2B leads"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: 10,
                background: 'var(--er-raised)',
                color: 'var(--er-ink)',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid var(--er-line)',
                transition: 'all .15s ease',
              }}
            >
              Find B2B Leads
            </Link>
          </div>

          {/* Trust line */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '6px 20px',
              marginTop: 28,
            }}
          >
            {[
              '200 free credits',
              '99.2% fraud blocked',
              'No card required',
            ].map((t) => (
              <span
                key={t}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: 'var(--er-muted)',
                  fontWeight: 500,
                }}
              >
                <CheckCircle size={13} color="var(--er-success)" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section
        style={{
          padding: '64px 24px',
          background: 'var(--er-surface)',
          borderBottom: '1px solid var(--er-line)',
        }}
      >
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <p className="er-overline" style={{ textAlign: 'center', marginBottom: 10 }}>How it works</p>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--er-ink)',
              margin: '0 0 48px',
            }}
          >
            Three steps to your first lead
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {HOW.map((step) => (
              <div key={step.n} className="er-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--er-accent-bg)',
                    color: 'var(--er-accent)',
                    fontSize: 16,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {step.n}
                </span>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--er-ink)', margin: 0 }}>{step.t}</p>
                <p style={{ fontSize: 14, color: 'var(--er-muted)', margin: 0, lineHeight: 1.6 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section style={{ padding: '64px 24px', borderBottom: '1px solid var(--er-line)' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <p className="er-overline" style={{ textAlign: 'center', marginBottom: 10 }}>What you get</p>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--er-ink)',
              margin: '0 0 48px',
            }}
          >
            Everything in one place
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="er-card-hover"
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div className="er-icon-wrap er-icon-brand">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--er-ink)', margin: '0 0 6px' }}>{f.title}</p>
                    <p style={{ fontSize: 14, color: 'var(--er-muted)', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── What we are/aren't ───────────────────────────────── */}
      <section
        style={{
          padding: '64px 24px',
          background: 'var(--er-surface)',
          borderBottom: '1px solid var(--er-line)',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p className="er-overline" style={{ textAlign: 'center', marginBottom: 10 }}>Transparency</p>
          <h2
            style={{
              textAlign: 'center',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--er-ink)',
              margin: '0 0 36px',
            }}
          >
            Honest about what we are
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div
              className="er-card"
              style={{ borderColor: 'rgba(5,150,105,.2)', background: 'var(--er-success-bg)' }}
            >
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--er-success)', marginBottom: 12 }}>✓ We are</p>
              {['Income estimates, clearly labelled', 'Risk signals — not safety guarantees', 'Draft messages you approve before sending'].map((t) => (
                <p key={t} style={{ fontSize: 13, color: 'var(--er-ink)', margin: '0 0 8px', lineHeight: 1.5 }}>
                  · {t}
                </p>
              ))}
            </div>
            <div
              className="er-card"
              style={{ borderColor: 'rgba(220,38,38,.2)', background: 'var(--er-danger-bg)' }}
            >
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--er-danger)', marginBottom: 12 }}>✗ We aren't</p>
              {['Guaranteed income promises', 'A safety certificate for any job', 'An auto-messaging bot'].map((t) => (
                <p key={t} style={{ fontSize: 13, color: 'var(--er-ink)', margin: '0 0 8px', lineHeight: 1.5 }}>
                  · {t}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: '72px 24px',
          background: 'var(--er-ink)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#fff',
              margin: '0 0 16px',
            }}
          >
            Start finding income today
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.55)', margin: '0 0 32px', lineHeight: 1.6 }}>
            200 free credits. No card needed. Results in seconds.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/app/income"
              onMouseEnter={prefetchIncome}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                borderRadius: 10,
                background: 'var(--er-accent)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Zap size={16} />
              Get started free
            </Link>
            <Link
              to="/how-it-works"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                borderRadius: 10,
                background: 'rgba(255,255,255,.1)',
                color: 'rgba(255,255,255,.85)',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,.12)',
              }}
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
