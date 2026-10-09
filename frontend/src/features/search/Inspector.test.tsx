import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SearchResponse } from '../../api/schemas';
import { searchSuccess } from '../../test/fixtures';
import { Inspector } from './Inspector';

const result = searchSuccess as unknown as SearchResponse;

describe('Inspector', () => {
  it('shows an idle scope without results', () => {
    render(<Inspector result={null} />);
    expect(screen.getByRole('img', { name: /idle radar scope/i })).toBeInTheDocument();
    expect(screen.getByText(/run a radar sweep/i)).toBeInTheDocument();
  });

  it('summarises live results with honest aggregates', () => {
    render(<Inspector result={result} />);
    expect(
      screen.getByRole('img', { name: /radar scope with .* signals/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ideas found')).toBeInTheDocument();
    expect(screen.getByText('Avg EarnScore')).toBeInTheDocument();
    expect(screen.getByText('Scams blocked')).toBeInTheDocument();
    expect(screen.getByText('Sharma Tailoring')).toBeInTheDocument();
  });

  it('handles unrated places and empty sections honestly', () => {
    render(
      <Inspector
        result={{
          ...result,
          opportunities: [],
          local: [
            { name: 'Unrated Shop', rating: null, reviews: null },
            { name: 'Quiet Shop', rating: 3.0, reviews: null },
          ],
          jobs: [],
        }}
      />,
    );
    expect(screen.getByText('Unrated')).toBeInTheDocument();
    expect(screen.queryByText(/\(\d+ reviews?\)/)).not.toBeInTheDocument();
  });
});
