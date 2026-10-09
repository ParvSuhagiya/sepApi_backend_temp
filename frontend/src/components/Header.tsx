import { Moon, Radar, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/theme';
import { useCustomerAvailability } from '../features/customers/availability';
import { ShortlistMenu } from '../features/shortlist/ShortlistDrawer';
import { Tabs } from './ui/Tabs';

const MODE_TABS = [
  { id: '/app/income', label: 'Income Discovery' },
  { id: '/app/customers', label: 'B2B Leads Radar' },
  { id: '/app/shortlist', label: 'Saved Shortlist' },
  { id: '/how-it-works', label: 'Trust & Scam Shield' },
] as const;

function activeTab(pathname: string): string {
  if (pathname === '/customers' || pathname === '/app/customers') return '/app/customers';
  if (pathname === '/app/shortlist') return '/app/shortlist';
  if (pathname === '/how-it-works') return '/how-it-works';
  return '/app/income';
}

/** Institutional command header: brand block, live pill, mode tabs, actions. */
export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();
  const { available } = useCustomerAvailability();
  const visibleTabs = MODE_TABS.filter(
    (tab) => available || tab.id !== '/app/customers',
  );
  const current = activeTab(pathname);
  const activeId = visibleTabs.some((tab) => tab.id === current)
    ? current
    : '/app/income';

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-raised/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 rounded-md text-lg font-bold text-ink"
          aria-label="EarnRadar home"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-strong text-white shadow-sm">
            <Radar aria-hidden="true" className="h-5 w-5" />
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-lg bg-brand opacity-25" />
          </span>
          <span className="font-display tracking-tight">
            Earn<span className="text-brand">Radar</span>
          </span>
        </Link>
        <p className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted xl:flex">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-tone-green-bg" />
          Realtime Sweep Engine • Bharat Grid Live
        </p>
        <nav aria-label="Modes" className="order-3 w-full sm:order-none sm:w-auto">
          <Tabs
            label="Choose what to find"
            tabs={visibleTabs}
            activeId={activeId}
            onChange={(id) => navigate(id)}
          />
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <ShortlistMenu />
          <button
            type="button"
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-line bg-raised p-2 text-ink hover:bg-surface"
          >
            {resolved === 'dark' ? (
              <Sun aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Moon aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
