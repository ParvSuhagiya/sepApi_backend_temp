import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountUp, Reveal, Stagger, StaggerItem } from './motion';

describe('motion primitives', () => {
  it('reveals content and counts up', () => {
    render(
      <div>
        <Reveal>
          <p>Hello reveal</p>
        </Reveal>
        <Stagger>
          <StaggerItem>
            <p>Stagger one</p>
          </StaggerItem>
        </Stagger>
        <CountUp value={120} format={(n) => `${n} done`} />
      </div>,
    );
    expect(screen.getByText('Hello reveal')).toBeInTheDocument();
    expect(screen.getByText('Stagger one')).toBeInTheDocument();
    expect(screen.getByText(/done/)).toBeInTheDocument();
  });
});
