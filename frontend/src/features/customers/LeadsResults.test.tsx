import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { LeadsResponse } from '../../api/schemas';
import { leadsSuccess } from '../../test/fixtures';
import { ShortlistProvider } from '../shortlist/shortlist';
import { LeadsNotice, LeadsResultsView } from './LeadsResults';

const result = leadsSuccess as unknown as LeadsResponse;
const input = { offer: 'Billing software for restaurants', city: 'Ahmedabad', max_leads: 10 };

function resultWith(meta: Partial<LeadsResponse['meta']>): LeadsResponse {
  return { ...result, meta: { ...result.meta, ...meta } };
}

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function view(ui: ReactNode) {
  return render(<Providers>{ui}</Providers>);
}

describe('LeadsResultsView', () => {
  it('summarises the offer with query details and an edit action', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    view(<LeadsResultsView result={result} input={input} onEdit={onEdit} />);
    expect(screen.getByRole('heading', { name: 'What we understood' })).toBeInTheDocument();
    expect(screen.getByText('Restaurant billing software')).toBeInTheDocument();
    expect(screen.getByText(/city:/i)).toHaveTextContent(/ahmedabad/i);
    await user.click(screen.getByRole('button', { name: /edit and re-run/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('shows the disclaimer, credits and lead count', () => {
    view(<LeadsResultsView result={result} input={input} onEdit={() => {}} />);
    expect(screen.getByText(/signals from public data/i)).toBeInTheDocument();
    expect(screen.getByText(/serpapi credits used: 7/i)).toBeInTheDocument();
    expect(screen.getByText(/1 lead found\./)).toBeInTheDocument();
  });

  it('maps deadline and fallback notes, and dismisses', async () => {
    const user = userEvent.setup();
    view(
      <LeadsResultsView
        result={resultWith({ notes: ['deadline_reached', 'ai_text_fallback'] })}
        input={input}
        onEdit={() => {}}
      />,
    );
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/time limit/i);
    expect(banner).toHaveTextContent(/fallback text/i);
    await user.click(screen.getByRole('button', { name: /dismiss notice/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an empty state without leads', () => {
    view(
      <LeadsResultsView result={{ ...result, leads: [] }} input={input} onEdit={() => {}} />,
    );
    expect(screen.getByText(/no customer leads found/i)).toBeInTheDocument();
  });

  it('hides query details and syncs the map without an input', async () => {
    const user = userEvent.setup();
    view(<LeadsResultsView result={result} input={null} onEdit={() => {}} />);
    expect(screen.queryByText(/city:/i)).not.toBeInTheDocument();
    const card = screen.getByRole('heading', { name: 'Sharma Restaurant' }).closest('article');
    if (!card) throw new Error('card missing');
    await user.click(within(card).getByRole('button', { name: /show on map/i }));
    expect(
      within(card).getByRole('button', { name: /showing on map/i }),
    ).toBeInTheDocument();
  });

  it('flags shortlisted leads for the map layer', async () => {
    const user = userEvent.setup();
    render(
      <ShortlistProvider>
        <Providers>
          <LeadsResultsView result={result} input={input} onEdit={() => {}} />
        </Providers>
      </ShortlistProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Add Sharma Restaurant to shortlist' }));
    expect(
      screen.getByRole('button', { name: 'Remove Sharma Restaurant from shortlist' }),
    ).toBeInTheDocument();
  });
});

describe('LeadsNotice', () => {
  it('hides when the meta is clean', () => {
    render(<LeadsNotice meta={result.meta} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports degraded and partial sources', () => {
    render(<LeadsNotice meta={{ ...result.meta, degraded: ['market'], partial: ['reviews'] }} />);
    expect(screen.getByRole('status')).toHaveTextContent(/unavailable: market/i);
    expect(screen.getByRole('status')).toHaveTextContent(/partial data from: reviews/i);
  });
});
