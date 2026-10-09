import { Link } from 'react-router-dom';
import { Radar, ShieldCheck } from 'lucide-react';
import { Reveal } from './motion';
import { useHealth } from '../api/hooks';

/** Stitch institutional footer: brand + telemetry columns + governance. */
export function Footer() {
  const { data, isError, isPending } = useHealth();
  const status = isPending ? (
    <span className="tnum inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-muted" />
      Checking API…
    </span>
  ) : isError || !data?.ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-tone-red-border bg-tone-red-bg px-2.5 py-1 text-[11px] font-semibold text-tone-red-fg">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white" />
      API unreachable
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      API online{data?.version ? ` · v${data.version}` : null}
    </span>
  );

  return (
    <footer className="mt-12 border-t border-line bg-raised shadow-[0_-1px_8px_rgba(0,0,0,0.03)]">
      <Reveal>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col items-start gap-3 lg:col-span-2">
            <span className="flex items-center gap-2 text-base font-bold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4f46e5] text-white">
                <Radar aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="font-display tracking-tight">
                Earn<span className="text-brand">Radar</span> Institutional
              </span>
            </span>
            <p className="max-w-sm text-muted">
              Sovereign telemetry and high-velocity capital exploration for verified regional
              opportunities, structured revenue vectors, and institutional lead scouting.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                Indore Gateway: 99.98% Up
              </span>
              <span className="tnum rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
                Latency: 14ms
              </span>
              {status}
            </div>
          </div>
          <nav aria-label="Telemetry and nodes" className="flex flex-col items-start gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Telemetry & Nodes</p>
            <Link to="/app/income" className="text-muted transition-colors hover:text-ink">
              Indore Central MP-09
            </Link>
            <Link to="/app/customers" className="text-muted transition-colors hover:text-ink">
              B2B Corridor Telemetry
            </Link>
            <Link to="/how-it-works" className="text-muted transition-colors hover:text-ink">
              Verification Mesh
            </Link>
            <Link to="/app/overview" className="text-muted transition-colors hover:text-ink">
              Raw Stream (gRPC/REST)
            </Link>
          </nav>
          <nav aria-label="Intelligence platform" className="flex flex-col items-start gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">
              Intelligence Platform
            </p>
            <Link to="/app/income" className="text-muted transition-colors hover:text-ink">
              Income Discovery
            </Link>
            <Link to="/app/customers" className="text-muted transition-colors hover:text-ink">
              B2B Leads Radar
            </Link>
            <Link to="/app/shortlist" className="text-muted transition-colors hover:text-ink">
              Shortlist & Action Hub
            </Link>
            <Link to="/how-it-works" className="text-muted transition-colors hover:text-ink">
              Security Architecture
            </Link>
          </nav>
          <nav aria-label="Governance and trust" className="flex flex-col items-start gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">
              Governance & Trust
            </p>
            <Link to="/responsible-use" className="text-muted transition-colors hover:text-ink">
              Bharat Regulatory Framework
            </Link>
            <Link to="/privacy" className="text-muted transition-colors hover:text-ink">
              DPDP Act (2023) Compliance
            </Link>
            <Link to="/terms" className="text-muted transition-colors hover:text-ink">
              Terms & Risk Disclosure
            </Link>
            <Link to="/how-it-works" className="text-muted transition-colors hover:text-ink">
              Sovereign Data Guard
            </Link>
          </nav>
        </div>
      </Reveal>
      <div className="border-t border-line">
        <div className="tnum mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted">
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" />
            ISO 27001 Certified Nodes • Telemetry Stream: Active
          </p>
          <p>© 2025 EarnRadar Bharat Grid. Sovereign Telemetry & Financial Intelligence Systems.</p>
        </div>
      </div>
    </footer>
  );
}
