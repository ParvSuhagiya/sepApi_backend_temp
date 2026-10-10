import { Bell, Bookmark, LayoutDashboard, Moon, Search, Sun, Users, Zap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/theme';
import { useCustomerAvailability } from '../features/customers/availability';
import { useOptionalShortlist } from '../features/shortlist/shortlist';
import { ShortlistMenu } from '../features/shortlist/ShortlistDrawer';

const NAV = [
  { to: '/app/income',    label: 'Income',    Icon: LayoutDashboard },
  { to: '/app/customers', label: 'B2B Leads', Icon: Users           },
  { to: '/app/shortlist', label: 'Saved',     Icon: Bookmark        },
] as const;

function getActive(pathname: string) {
  if (pathname.includes('/customers')) return '/app/customers';
  if (pathname.includes('/shortlist')) return '/app/shortlist';
  if (pathname.startsWith('/app'))     return '/app/income';
  return '';
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();
  const { available } = useCustomerAvailability();
  const shortlist = useOptionalShortlist();
  const savedCount = shortlist?.count ?? 0;
  const active = getActive(pathname);

  const visibleNav = NAV.filter((n) => available || n.to !== '/app/customers');

  return (
    <header className="sticky top-0 z-[var(--z-header)] border-b border-line bg-raised/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4 sm:px-6">

        {/* Logo */}
        <Link
          to="/"
          aria-label="EarnRadar"
          className="mr-3 flex shrink-0 items-center gap-2.5 no-underline"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-[13px] font-black text-white tracking-tight">
            ER
          </span>
          <span className="hidden text-[15px] font-bold text-ink tracking-tight sm:block">
            EarnRadar
          </span>
        </Link>

        {/* Nav tabs */}
        <nav aria-label="Main navigation" className="flex items-center gap-0.5">
          {visibleNav.map(({ to, label, Icon }) => {
            const isActive = active === to;
            return (
              <button
                key={to}
                type="button"
                onClick={() => navigate(to)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? 'bg-brand/10 text-brand font-semibold'
                    : 'text-muted hover:bg-surface hover:text-ink'
                  }`}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="hidden sm:block">{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <label className="relative hidden md:flex">
          <span className="sr-only">Search</span>
          <Search
            size={13}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            placeholder="Search…"
            className="er-input h-8 w-40 pl-8 text-[13px]"
          />
        </label>

        {/* Credits chip */}
        <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink sm:flex">
          <Zap size={11} className="text-brand" />
          184/200
        </span>

        {/* Shortlist */}
        <Link
          to="/app/shortlist"
          aria-label={`Saved (${savedCount})`}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted no-underline transition-colors hover:border-brand/30 hover:text-ink"
        >
          <Bookmark size={14} />
          {savedCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white"
            >
              {savedCount}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-brand/30 hover:text-ink"
        >
          <Bell size={14} />
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-raised bg-red-500"
          />
        </button>

        <ShortlistMenu />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-brand/30 hover:text-ink"
        >
          {resolved === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Avatar */}
        <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white lg:flex">
          P
        </div>
      </div>
    </header>
  );
}
