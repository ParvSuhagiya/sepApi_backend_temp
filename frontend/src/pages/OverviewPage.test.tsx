import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ENV } from '../env';
import { jsonOk, leadsSuccess, searchSuccess } from '../test/fixtures';
import '../test/msw';
import { server } from '../test/msw';
import { LeadsSessionProvider, useLeadsSession } from '../features/customers/session';
import { SearchSessionProvider, useSearchSession } from '../features/search/session';
import { ShortlistProvider } from '../features/shortlist/shortlist';
import { OverviewPage } from './OverviewPage';

const api = (path: string) => `${ENV.apiUrl}${path}`;
const PROFILE = { skills: 'tailoring', city: 'Pune', hours: 10, budget: 0 };
const OFFER = {
  offer: 'Restaurant management software for billing and staff duties in local eateries',
  city: 'Ahmedabad',
  max_leads: 5,
};

function Shell({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <LeadsSessionProvider>
        <SearchSessionProvider>
          <ShortlistProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </ShortlistProvider>
        </SearchSessionProvider>
      </LeadsSessionProvider>
    </QueryClientProvider>
  );
}

function Runner() {
  const search = useSearchSession();
  const leads = useLeadsSession();
  return (
    <div>
      <button type="button" onClick={() => search.run(PROFILE)}>
        run income
      </button>
      <button type="button" onClick={() => leads.run(OFFER)}>
        run leads
      </button>
    </div>
  );
}

describe('OverviewPage', () => {
  it('invites both sweeps when empty', () => {
    render(
      <Shell>
        <OverviewPage />
      </Shell>,
    );
    expect(screen.getByRole('heading', { name: 'Executive Overview' })).toBeInTheDocument();
    expect(screen.getByText(/no sweeps yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Income Discovery' })).toHaveAttribute(
      'href',
      '/app/income',
    );
  });

  it('aggregates both modes once they complete', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(api('/api/search'), () => jsonOk(searchSuccess)),
      http.post(api('/api/leads'), () => jsonOk(leadsSuccess)),
    );
    render(
      <Shell>
        <Runner />
        <OverviewPage />
      </Shell>,
    );
    await user.click(screen.getByRole('button', { name: 'run income' }));
    await user.click(screen.getByRole('button', { name: 'run leads' }));
    await waitFor(() => expect(screen.getByText('Ideas found')).toBeInTheDocument());
    expect(screen.getByText('Buyer leads')).toBeInTheDocument();
    expect(screen.getByText('Scams blocked')).toBeInTheDocument();
    expect(screen.getByText('Tailoring from home')).toBeInTheDocument();
    expect(screen.getByText('Sharma Restaurant')).toBeInTheDocument();
  });
});
