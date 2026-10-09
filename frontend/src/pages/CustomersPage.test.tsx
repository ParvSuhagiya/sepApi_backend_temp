import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ENV } from '../env';
import { jsonError, jsonOk, leadsSuccess } from '../test/fixtures';
import '../test/msw';
import { server } from '../test/msw';
import { LeadsSessionProvider } from '../features/customers/session';
import { CustomersPage } from './CustomersPage';

const api = (path: string) => `${ENV.apiUrl}${path}`;

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
  return (
    <QueryClientProvider client={client}>
      <LeadsSessionProvider>{children}</LeadsSessionProvider>
    </QueryClientProvider>
  );
}

describe('CustomersPage error flow', () => {
  it('shows the error with support code and retries into success', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.post(api('/api/leads'), () => {
        calls += 1;
        // Fail twice so the client's single retry is also exhausted.
        return calls <= 2
          ? jsonError('upstream_failure', 'downstream blew up', 502)
          : jsonOk(leadsSuccess);
      }),
    );
    render(
      <Providers>
        <CustomersPage />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: /try: restaurant system/i }));
    await user.click(screen.getByRole('button', { name: /find customers/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/try again in a minute/i);
    expect(alert).toHaveTextContent('req-test');
    await user.click(screen.getByRole('button', { name: /retry search/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /your customer leads/i })).toBeInTheDocument(),
    );
    expect(calls).toBe(3);
  });
});
