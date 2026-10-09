import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarScope } from './RadarScope';

describe('RadarScope', () => {
  it('renders the scope with labelled blips', () => {
    const { container } = render(
      <RadarScope
        label="Example radar sweep"
        caption="GEO: 22.72° N, 75.86° E"
        blips={[
          { x: 30, y: 30, tone: 'safe', label: 'Cloud Kitchen', sub: 'EarnScore 82' },
          { x: 70, y: 60, tone: 'risk', label: 'Fake Gig', sub: 'High risk' },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Example radar sweep' })).toBeInTheDocument();
    expect(screen.getByText('GEO: 22.72° N, 75.86° E')).toBeInTheDocument();
    const titles = Array.from(container.querySelectorAll('title')).map(
      (node) => node.textContent,
    );
    expect(titles).toContain('Cloud Kitchen — EarnScore 82');
    expect(titles).toContain('Fake Gig — High risk');
  });

  it('renders an empty scope without blips', () => {
    const { container } = render(<RadarScope label="Idle scope" blips={[]} />);
    expect(screen.getByRole('img', { name: 'Idle scope' })).toBeInTheDocument();
    expect(container.querySelectorAll('title')).toHaveLength(0);
  });
});
