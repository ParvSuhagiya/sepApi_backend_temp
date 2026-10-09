import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText(/1 saved — 1 leads · 0 jobs · 0 opportunities\./)).toBeInTheDocument();
    expect(screen.getByText('Sharma Tailoring')).toBeInTheDocument();
  });
});
