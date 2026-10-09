import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ENV } from '../env';
import { jsonError, jsonOk, leadsSuccess } from '../test/fixtures';
import '../test/msw';
import { server } from '../test/msw';
import { ThemeProvider } from '../app/theme';
import { Header } from './Header';

const api = (path: string) => `${ENV.apiUrl}${path}`;

function Pathname() {
  return <p data-testid="pathname">{useLocation().pathname}</p>;
}

function Shell({ initial = '/' }: { initial?: string }) {
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
      <ThemeProvider>
        <MemoryRouter initialEntries={[initial]}>
          <Header />
          <Pathname />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('Header mode tabs', () => {
  it('shows every mode and navigates between /app routes', async () => {
    const user = userEvent.setup();
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    render(<Shell />);
    const customers = await screen.findByRole('tab', { name: 'B2B Leads Radar' });
    expect(screen.getByRole('tab', { name: 'Income Discovery' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Saved Shortlist' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trust & Scam Shield' })).toBeInTheDocument();
    await user.click(customers);
    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/app/customers'));
    await user.click(screen.getByRole('tab', { name: 'Income Discovery' }));
    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/app/income'));
    await user.click(screen.getByRole('tab', { name: 'Saved Shortlist' }));
    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/app/shortlist'));
  });

  it('marks the legacy /customers alias as the customers tab', async () => {
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    render(<Shell initial="/customers" />);
    const customers = await screen.findByRole('tab', { name: 'B2B Leads Radar' });
    expect(customers).toHaveAttribute('aria-selected', 'true');
  });

  it('hides the customers tab when the mode is disabled, keeping the rest intact', async () => {
    server.use(
      http.post(api('/api/leads'), () => jsonError('feature_disabled', 'off', 404)),
    );
    render(<Shell />);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Income Discovery' })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.queryByRole('tab', { name: /leads radar/i })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('tab', { name: 'Saved Shortlist' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: /choose what to find/i })).toBeInTheDocument();
  });
});
