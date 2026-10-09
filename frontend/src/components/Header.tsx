import { Bell, Bolt, Moon, Radar, Search, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../app/theme';
import { useCustomerAvailability } from '../features/customers/availability';
import { ShortlistMenu } from '../features/shortlist/ShortlistDrawer';
import { useOptionalShortlist } from '../features/shortlist/shortlist';
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

/** Stitch institutional command header: brand, live pill, mode tabs, telemetry actions. */
export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();
  const { available } = useCustomerAvailability();
  const shortlist = useOptionalShortlist();
  const savedCount = shortlist?.count ?? 0;
  const visibleTabs = MODE_TABS.filter((tab) => available || tab.id !== '/app/customers');
  const current = activeTab(pathname);
  const activeId = visibleTabs.some((tab) => tab.id === current) ? current : '/app/income';

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-[var(--z-header)] border-b border-line bg-raised/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2 rounded-md text-lg font-bold text-ink"
          aria-label="EarnRadar home"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Radar aria-hidden="true" className="h-5 w-5" />
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-lg bg-[#4f46e5] opacity-25"
            />
            <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4edea3] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#006e4b]" />
            </span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-bold tracking-tight">
              Earn<span className="text-brand">Radar</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
              Capital Scope
            </span>
          </span>
        </Link>

        <p className="tnum hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted xl:flex">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Bharat Grid Live (Indore MP-09)
        </p>

        <nav aria-label="Modes" className="order-3 w-full sm:order-none sm:w-auto lg:mx-auto">
          <Tabs
            label="Choose what to find"
            tabs={visibleTabs}
            activeId={activeId}
            onChange={(id) => navigate(id)}
          />
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <label className="relative hidden md:block">
            <span className="sr-only">Search opportunities</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              placeholder="Search opportunities, GST..."
              className="h-8 w-44 rounded-lg border border-line bg-surface pl-8 pr-2 text-xs text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 lg:w-52"
            />
          </label>

          <span className="tnum hidden items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink sm:inline-flex">
            <Bolt aria-hidden="true" className="h-3.5 w-3.5 text-brand" />
            184/200
            <span className="font-semibold uppercase tracking-wide text-muted">Credits</span>
          </span>

          <Link
            to="/app/shortlist"
            aria-label={`Saved shortlist, ${savedCount} items`}
            className="relative inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-line bg-surface p-2 text-ink transition-colors hover:bg-raised"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span
              aria-hidden="true"
              className="tnum absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4f46e5] px-1 text-[10px] font-bold text-white shadow-sm"
            >
              {savedCount}
            </span>
          </Link>

          <button
            type="button"
            aria-label="Notifications, 2 unread"
            className="relative inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-line bg-surface p-2 text-ink transition-colors hover:bg-raised"
          >
            <Bell aria-hidden="true" className="h-4 w-4" />
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ba1a1a] ring-2 ring-surface"
            />
          </button>

          <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />

          <ShortlistMenu />

          <button
            type="button"
            onClick={toggle}
            aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-line bg-raised p-2 text-ink transition-colors hover:bg-surface"
          >
            {resolved === 'dark' ? (
              <Sun aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Moon aria-hidden="true" className="h-4 w-4" />
            )}
          </button>

          <span className="hidden items-center gap-2 lg:flex">
            <span className="text-right leading-tight">
              <span className="block text-xs font-bold text-ink">Priya Sharma</span>
              <span className="flex items-center justify-end gap-1 text-[11px] font-medium text-muted">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Pro Hustler
              </span>
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5] font-display text-xs font-bold text-white ring-2 ring-[#e2dfff]">
              P
            </span>
          </span>
        </div>
      </div>
    </motion.header>
  );
}
