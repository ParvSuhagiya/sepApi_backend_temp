import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { LeadsSessionProvider } from '../features/customers/session';
import { SearchSessionProvider } from '../features/search/session';
import { ShortlistProvider, useShortlist } from '../features/shortlist/shortlist';
import { ShortlistPage } from './ShortlistPage';

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
          <ShortlistProvider>{children}</ShortlistProvider>
        </SearchSessionProvider>
      </LeadsSessionProvider>
    </QueryClientProvider>
  );
}

function Seed() {
  const shortlist = useShortlist();
  useEffect(() => {
    shortlist.toggle({
      id: 'lead:Sharma Tailoring',
      kind: 'lead',
      title: 'Sharma Tailoring',
      subtitle: 'Tailor',
      phone: null,
    });
    shortlist.toggle({
      id: 'job:Tailor needed|ABC',
      kind: 'job',
      title: 'Tailor needed',
      subtitle: 'ABC',
      phone: null,
    });
  }, []);
  return null;
}

describe('ShortlistPage', () => {
  it('shows the empty state with guidance', () => {
    render(
      <Shell>
        <ShortlistPage />
      </Shell>,
    );
    expect(
      screen.getByRole('heading', { name: 'Saved Shortlist & Action Hub' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/action hub — notes and export live below/i)).toBeInTheDocument();
    expect(screen.getByText(/your shortlist is empty/i)).toBeInTheDocument();
  });

  it('summarises saved counts by kind', () => {
    render(
      <Shell>
        <Seed />
        <ShortlistPage />
      </Shell>,
    );
    expect(screen.getByText(/2 saved — 1 leads · 1 jobs · 0 opportunities\./)).toBeInTheDocument();
    expect(screen.getByText('Sharma Tailoring')).toBeInTheDocument();
    expect(screen.getByText('Tailor needed')).toBeInTheDocument();
  });

  it('filters items by kind', async () => {
    const user = userEvent.setup();
    render(
      <Shell>
        <Seed />
        <ShortlistPage />
      </Shell>,
    );
    await user.click(screen.getByRole('button', { name: 'Leads1' }));
    expect(screen.getByText('Sharma Tailoring')).toBeInTheDocument();
    expect(screen.queryByText('Tailor needed')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Jobs1' }));
    expect(screen.getByText('Tailor needed')).toBeInTheDocument();
    expect(screen.queryByText('Sharma Tailoring')).not.toBeInTheDocument();
  });
});
