import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LeadsResponse } from '../../api/schemas';
import { leadsSuccess } from '../../test/fixtures';
import { LeadsInspector } from './LeadsInspector';

const result = leadsSuccess as unknown as LeadsResponse;

describe('LeadsInspector', () => {
  it('shows an idle radar without results', () => {
    render(<LeadsInspector result={null} />);
    expect(screen.getByRole('img', { name: /idle buyer radar/i })).toBeInTheDocument();
    expect(screen.getByText(/describe your offer/i)).toBeInTheDocument();
  });

  it('summarises live leads with honest aggregates', () => {
    render(<LeadsInspector result={result} />);
    expect(screen.getByRole('img', { name: /buyer radar with .* signals/i })).toBeInTheDocument();
    expect(screen.getByText('Leads found')).toBeInTheDocument();
    expect(screen.getByText('Avg match')).toBeInTheDocument();
    expect(screen.getByText('Market benchmark')).toBeInTheDocument();
  });

  it('flags unknown competitor pricing and counts reachable leads', () => {
    render(
      <LeadsInspector
        result={{
          ...result,
          leads: [{ ...result.leads[0], phone: null }],
          market_notes: ['price not found'],
        }}
      />,
    );
    expect(screen.getByText(/confirm prices yourself before quoting/i)).toBeInTheDocument();
    expect(screen.getByText('Reachable')).toBeInTheDocument();
  });
});
