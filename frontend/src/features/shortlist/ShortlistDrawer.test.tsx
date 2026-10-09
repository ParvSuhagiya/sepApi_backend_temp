import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeadsSessionProvider } from '../customers/session';
import { SearchSessionProvider } from '../search/session';
import { ShortlistDrawer } from './ShortlistDrawer';
import { ShortlistProvider, useShortlist } from './shortlist';

const DRAFT = {
  id: 'lead:Sharma Tailoring',
  kind: 'lead' as const,
  title: 'Sharma Tailoring',
  subtitle: 'Tailor · MG Road',
  phone: '919822012345',
};

function Shell() {
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
            <Harness />
          </ShortlistProvider>
        </SearchSessionProvider>
      </LeadsSessionProvider>
    </QueryClientProvider>
  );
}

function Harness() {
  const shortlist = useShortlist();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => shortlist.toggle(DRAFT)}>
        seed
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        open drawer
      </button>
      {open ? <ShortlistDrawer onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function SeededShell() {
  return <Shell />;
}

describe('ShortlistDrawer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the empty state and the privacy note', async () => {
    const user = userEvent.setup();
    render(<SeededShell />);
    await user.click(screen.getByRole('button', { name: 'open drawer' }));
    expect(screen.getByRole('dialog', { name: /shortlist \(0\)/i })).toBeInTheDocument();
    expect(screen.getByText(/nothing is saved on our servers/i)).toBeInTheDocument();
    expect(screen.getByText(/shortlist is empty/i)).toBeInTheDocument();
  });

  it('edits per-item notes in memory', async () => {
    const user = userEvent.setup();
    render(<SeededShell />);
    await user.click(screen.getByRole('button', { name: 'seed' }));
    await user.click(screen.getByRole('button', { name: 'open drawer' }));
    const box = screen.getByLabelText(/note for sharma tailoring/i);
    await user.type(box, 'call Tuesday');
    expect(box).toHaveValue('call Tuesday');
  });

  it('exports CSV without phones by default and with phones when ticked', async () => {
    const user = userEvent.setup();
    let captured: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      captured = blob;
      return 'blob:mock';
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    render(<SeededShell />);
    await user.click(screen.getByRole('button', { name: 'seed' }));
    await user.click(screen.getByRole('button', { name: 'open drawer' }));
    await user.click(screen.getByRole('button', { name: /export csv/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(await (captured as unknown as Blob).text()).not.toContain('919822012345');
    await user.click(screen.getByRole('checkbox', { name: /include phone numbers/i }));
    await user.click(screen.getByRole('button', { name: /export csv/i }));
    expect(await (captured as unknown as Blob).text()).toContain('919822012345');
  });

  it('copies a markdown summary and prints', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<SeededShell />);
    await user.click(screen.getByRole('button', { name: 'seed' }));
    await user.click(screen.getByRole('button', { name: 'open drawer' }));
    await user.click(screen.getByRole('button', { name: /copy shortlist summary/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# Shortlist (1)'));
    await user.click(screen.getByRole('button', { name: /^print$/i }));
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it('resets everything behind a confirm step', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    function ResetShell() {
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
                <SeedOnMount />
                <ShortlistDrawer onClose={onClose} />
              </ShortlistProvider>
            </SearchSessionProvider>
          </LeadsSessionProvider>
        </QueryClientProvider>
      );
    }
    function SeedOnMount() {
      const shortlist = useShortlist();
      useEffect(() => {
        shortlist.toggle(DRAFT);
      }, []);
      return null;
    }
    render(<ResetShell />);
    expect(await screen.findByText('Sharma Tailoring')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset everything/i }));
    expect(screen.getByText(/clear the shortlist/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear everything/i }));
    expect(screen.getByText(/shortlist is empty/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
