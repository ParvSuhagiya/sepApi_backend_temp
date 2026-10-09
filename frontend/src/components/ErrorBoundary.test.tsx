import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('tile layer exploded');
}

describe('ErrorBoundary compact mode', () => {
  it('contains a section failure without hiding siblings', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div>
        <p>Results stay here</p>
        <ErrorBoundary
          compact
          title="Map failed to load"
          message="The rest of your results are unaffected."
        >
          <Boom />
        </ErrorBoundary>
      </div>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Map failed to load');
    expect(screen.getByText('Results stay here')).toBeInTheDocument();
    expect(screen.queryByText('tile layer exploded')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
