import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ENV } from '../../env';
import { jsonError, jsonOk, leadsSuccess } from '../../test/fixtures';
import '../../test/msw';
import { server } from '../../test/msw';
import { useLeadsSession, LeadsSessionProvider } from './session';

const api = (path: string) => `${ENV.apiUrl}${path}`;
const OFFER = {
  offer: 'Restaurant management software for billing and staff duties in local eateries',
  city: 'Ahmedabad',
  max_leads: 5,
};

function Probe() {
  const session = useLeadsSession();
  return (
    <div>
      <p data-testid="status">{session.status}</p>
      <p data-testid="leads">{session.result?.leads.length ?? 'none'}</p>
      <p data-testid="error">{session.error?.message ?? 'none'}</p>
      <button type="button" onClick={() => session.run(OFFER)}>
        run
      </button>
      <button type="button" onClick={() => session.retry()}>
        retry
      </button>
    </div>
  );
}

function Shell({ showProbe }: { showProbe: boolean }) {
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
      <LeadsSessionProvider>{showProbe ? <Probe /> : <p>hidden</p>}</LeadsSessionProvider>
    </QueryClientProvider>
  );
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
  return (
    <QueryClientProvider client={client}>
      <LeadsSessionProvider>{children}</LeadsSessionProvider>
    </QueryClientProvider>
  );
}

describe('leads session', () => {
  it('runs loading to success and stores the result', async () => {
    const user = userEvent.setup();
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
    expect(screen.getByTestId('leads')).toHaveTextContent('1');
  });

  it('shows loading while the request is in flight', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(api('/api/leads'), async () => {
        await gate;
        return jsonOk(leadsSuccess);
      }),
    );
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    const clicked = user.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('loading'));
    release();
    await clicked;
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
  });

  it('maps errors to friendly copy without raw text', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(api('/api/leads'), () =>
        jsonError('internal', 'PG::Error db exploded SECRETXYZ', 500),
      ),
    );
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    const message = screen.getByTestId('error').textContent ?? '';
    expect(message).toContain('try again in a minute');
    expect(message).not.toContain('SECRETXYZ');
  });

  it('retry resubmits the last offer', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.post(api('/api/leads'), () => {
        calls += 1;
        // Run #1 consumes two 502s (initial + client retry), retry succeeds.
        return calls <= 2
          ? jsonError('upstream_failure', 'downstream blew up', 502)
          : jsonOk(leadsSuccess);
      }),
    );
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    await user.click(screen.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
    expect(calls).toBe(3);
  });

  it('keeps results when the consumer unmounts and remounts', async () => {
    const user = userEvent.setup();
    server.use(http.post(api('/api/leads'), () => jsonOk(leadsSuccess)));
    const view = render(<Shell showProbe />);
    await user.click(screen.getByRole('button', { name: 'run' }));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
    view.rerender(<Shell showProbe={false} />);
    expect(screen.getByText('hidden')).toBeInTheDocument();
    view.rerender(<Shell showProbe />);
    expect(screen.getByTestId('status')).toHaveTextContent('success');
    expect(screen.getByTestId('leads')).toHaveTextContent('1');
  });
});
