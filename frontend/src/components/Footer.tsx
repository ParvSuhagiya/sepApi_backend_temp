import { Link } from 'react-router-dom';
import { useHealth } from '../api/hooks';

export function Footer() {
  const { data, isError, isPending } = useHealth();

  const dot = isPending
    ? { color: 'var(--er-muted)', label: 'Checking…' }
    : isError || !data?.ok
      ? { color: 'var(--er-danger)', label: 'API unreachable' }
      : { color: 'var(--er-success)', label: `API online${data?.version ? ` · v${data.version}` : ''}` };

  return (
    <footer
      style={{
        borderTop: '1px solid var(--er-line)',
        background: 'var(--er-raised)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 32,
        }}
      >
        {/* Brand */}
        <div style={{ gridColumn: 'span 2' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 12 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'var(--er-accent)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ER
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--er-ink)', letterSpacing: '-0.01em' }}>
              EarnRadar
            </span>
          </Link>
          <p style={{ fontSize: 13, color: 'var(--er-muted)', lineHeight: 1.65, maxWidth: 240, margin: '0 0 14px' }}>
            Income discovery and B2B lead intelligence for Tier 2/3 India, with built-in fraud protection.
          </p>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--er-muted)',
              padding: '4px 10px',
              borderRadius: 99,
              border: '1px solid var(--er-line)',
              background: 'var(--er-surface)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot.color, display: 'inline-block' }} />
            {dot.label}
          </span>
        </div>

        {/* Product links */}
        <nav aria-label="Product">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--er-ink)', marginBottom: 12 }}>Product</p>
          {[
            { to: '/app/income',    label: 'Income Discovery' },
            { to: '/app/customers', label: 'B2B Leads' },
            { to: '/app/shortlist', label: 'Shortlist' },
            { to: '/how-it-works',  label: 'How it works' },
          ].map((l) => (
            <Link key={l.to} to={l.to} style={{ display: 'block', fontSize: 13, color: 'var(--er-muted)', textDecoration: 'none', marginBottom: 8, transition: 'color .15s' }}
              onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--er-ink)'; }}
              onMouseOut={(e)  => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--er-muted)'; }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Legal links */}
        <nav aria-label="Legal">
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--er-ink)', marginBottom: 12 }}>Legal</p>
          {[
            { to: '/privacy',          label: 'Privacy Policy' },
            { to: '/terms',            label: 'Terms of Service' },
            { to: '/responsible-use',  label: 'Responsible Use' },
          ].map((l) => (
            <Link key={l.to} to={l.to} style={{ display: 'block', fontSize: 13, color: 'var(--er-muted)', textDecoration: 'none', marginBottom: 8 }}
              onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--er-ink)'; }}
              onMouseOut={(e)  => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--er-muted)'; }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--er-line)',
          padding: '14px 24px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <p style={{ fontSize: 12, color: 'var(--er-muted)', margin: 0 }}>
          © 2025 EarnRadar · Income estimates, not promises
        </p>
        <p style={{ fontSize: 12, color: 'var(--er-muted)', margin: 0 }}>
          DPDP Act (2023) Compliant · Zero auto-send
        </p>
      </div>
    </footer>
  );
}
