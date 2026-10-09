import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEADS_STAGES, LeadsProgress, LeadsResultsSkeleton } from './LeadsProgress';

describe('LeadsProgress', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('steps through stages every 3.5 s and stops on the last', () => {
    vi.useFakeTimers();
    render(<LeadsProgress retrying={false} />);
    expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
    for (let step = 0; step < 2; step += 1) {
      act(() => {
        vi.advanceTimersByTime(3500);
      });
    }
    expect(screen.getByText(/Step 4 of 4/)).toBeInTheDocument();
    expect(screen.getByText(LEADS_STAGES[3] ?? '')).toBeInTheDocument();
    for (let step = 0; step < 3; step += 1) {
      act(() => {
        vi.advanceTimersByTime(3500);
      });
    }
    expect(screen.getByText(/Step 4 of 4/)).toBeInTheDocument();
  });

  it('announces politely and shows the cold-start message only when retrying', () => {
    const { rerender } = render(<LeadsProgress retrying={false} />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(screen.queryByText(/waking up the server/i)).not.toBeInTheDocument();
    rerender(<LeadsProgress retrying />);
    expect(screen.getByText(/waking up the server/i)).toBeInTheDocument();
  });

  it('renders an aria-busy skeleton shaped like results', () => {
    render(<LeadsResultsSkeleton />);
    const busy = document.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy).toHaveAttribute('aria-label', 'Loading leads');
  });
});
