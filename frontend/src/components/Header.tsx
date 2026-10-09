import { Moon, Radar, Sun } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/theme';
import { Tabs } from './ui/Tabs';

const MODE_TABS = [
  { id: '/app/income', label: 'Find income ideas' },
  { id: '/customers', label: 'Find customers' },
] as const;

function activeTab(pathname: string): string {
  if (pathname === '/customers') return '/customers';
  return '/app/income';
}

/** Site header: wordmark, mode tabs, theme toggle, explainer link. */
export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { resolved, toggle } = useTheme();

  return (
    <header className="border-b border-line bg-raised">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md text-lg font-bold text-ink"
          aria-label="EarnRadar home"
        >
          <Radar aria-hidden="true" className="h-6 w-6 text-brand" />
          EarnRadar
        </Link>
        <nav aria-label="Modes" className="order-3 w-full sm:order-none sm:w-auto">
          <Tabs
            label="Choose what to find"
            tabs={MODE_TABS}
            activeId={activeTab(pathname)}
            onChange={(id) => navigate(id)}
          />
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <Link
            to="/how-it-works"
            className="rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            How it works
          </Link>
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
