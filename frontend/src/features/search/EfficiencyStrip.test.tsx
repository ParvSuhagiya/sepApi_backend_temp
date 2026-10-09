import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EfficiencyStrip } from './EfficiencyStrip';

describe('EfficiencyStrip', () => {
  it('reports credits, cache hits and seconds', () => {
    render(<EfficiencyStrip creditsUsed={3} cacheHits={5} durationMs={2500} />);
    expect(
      screen.getByText('SerpAPI credits used: 3 · Served from cache: 5 · Took 2.5s'),
    ).toBeInTheDocument();
  });

  it('offers a caching explanation', () => {
    render(<EfficiencyStrip creditsUsed={0} cacheHits={2} durationMs={120} />);
    expect(screen.getByRole('button', { name: 'About result caching' })).toBeInTheDocument();
  });
});
