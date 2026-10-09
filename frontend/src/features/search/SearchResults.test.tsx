import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState, type ReactNode } from 'react';
import type { SearchResponse } from '../../api/schemas';
import { searchSuccess } from '../../test/fixtures';
import { SearchResults, SearchResultsView } from './SearchResults';
import { SearchSessionProvider } from './session';

const result = searchSuccess as unknown as SearchResponse;

function resultWith(meta: Partial<SearchResponse['meta']>): SearchResponse {
  return { ...result, meta: { ...result.meta, ...meta } };
}

describe('SearchResultsView', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders sticky nav, efficiency line and all section headings', () => {
    render(<SearchResultsView result={result} />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(nav).toHaveClass('sticky');
    for (const label of ['Opportunities', 'Jobs', 'Map', 'Local', 'Trends', 'Forum']) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        `#${label.toLowerCase()}`,
      );
    }
    expect(screen.getByText(/found\./)).toBeInTheDocument();
  });

  it('tracks the visible section with scroll-spy', () => {
    let callback: IntersectionObserverCallback = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    render(<SearchResultsView result={result} />);
    expect(observe).toHaveBeenCalledTimes(6);
    expect(screen.queryByRole('link', { current: true })).not.toBeInTheDocument();
    const target = document.getElementById('jobs');
    act(() => {
      callback(
        [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('aria-current', 'true');
  });

  it('renders without scroll-spy when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<SearchResultsView result={result} />);
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { current: true })).not.toBeInTheDocument();
  });

  it('jumps to sections through nav links', async () => {
    const user = userEvent.setup();
    render(<SearchResultsView result={result} />);
    await user.click(screen.getByRole('link', { name: 'Jobs' }));
    expect(window.location.hash).toBe('#jobs');
  });

  it('uses smooth scrolling when the browser supports it', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    render(<SearchResultsView result={result} />);
    const target = document.getElementById('jobs') as unknown as {
      scrollIntoView?: (options?: unknown) => void;
    };
    const scroll = vi.fn();
    target.scrollIntoView = scroll;
    await user.click(screen.getByRole('link', { name: 'Jobs' }));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    delete target.scrollIntoView;
  });

  it('shows degraded, partial and mapped notes', () => {
    render(
      <SearchResultsView
        result={resultWith({
          degraded: ['trends'],
          partial: ['jobs'],
          notes: ['fewer_than_5_opportunities'],
        })}
      />,
    );
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Some sources were unavailable: trends.');
    expect(banner).toHaveTextContent('Partial data from: jobs.');
    expect(banner).toHaveTextContent('fewer than 5 strong opportunities');
  });

  it('passes through unmapped notes verbatim and hides when clean', () => {
    const { rerender } = render(
      <SearchResultsView result={resultWith({ notes: ['custom backend note'] })} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('custom backend note');
    rerender(<SearchResultsView result={result} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dismisses the notice', async () => {
    const user = userEvent.setup();
    render(
      <SearchResultsView
        result={resultWith({ degraded: ['trends'], partial: [], notes: [] })}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss notice/i }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('SearchResults', () => {
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
        <SearchSessionProvider>{children}</SearchSessionProvider>
      </QueryClientProvider>
    );
  }

  it('renders nothing without a settled result', () => {
    render(
      <Providers>
        <SearchResults />
      </Providers>,
    );
    expect(
      screen.queryByRole('heading', { name: /your income opportunities/i }),
    ).not.toBeInTheDocument();
  });
});
