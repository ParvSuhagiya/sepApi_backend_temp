import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SEARCH_STAGES, SearchProgress, SearchResultsSkeleton } from './SearchProgress';

describe('SearchProgress', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('steps through stages every 3.5 s and stops on the last', () => {
    vi.useFakeTimers();
    render(<SearchProgress retrying={false} />);
    expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByText(/Step 2 of 6/)).toBeInTheDocument();
    for (let step = 0; step < 4; step += 1) {
      act(() => {
        vi.advanceTimersByTime(3500);
      });
    }
    expect(screen.getByText(/Step 6 of 6/)).toBeInTheDocument();
    expect(screen.getByText(SEARCH_STAGES[5] ?? '')).toBeInTheDocument();
    for (let step = 0; step < 3; step += 1) {
      act(() => {
        vi.advanceTimersByTime(3500);
      });
    }
    expect(screen.getByText(/Step 6 of 6/)).toBeInTheDocument();
  });

  it('announces politely and shows the cold-start message only when retrying', () => {
    const { rerender } = render(<SearchProgress retrying={false} />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(screen.queryByText(/waking up the server/i)).not.toBeInTheDocument();
    rerender(<SearchProgress retrying />);
    expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
  });

  it('renders an aria-busy skeleton shaped like results', () => {
    render(<SearchResultsSkeleton />);
    const busy = document.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy).toHaveAttribute('aria-label', 'Loading results');
  });
});
