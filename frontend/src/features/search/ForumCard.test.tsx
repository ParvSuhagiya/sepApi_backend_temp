import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ForumCard } from './ForumCard';

describe('ForumCard', () => {
  it('links the whole card to a new tab with the source host', () => {
    render(
      <ForumCard
        item={{
          title: 'How much do tailors earn?',
          link: 'https://www.reddit.com/r/india/comments/abc',
          snippet: 'Steady rates in Pune.',
        }}
      />,
    );
    const link = screen.getByRole('link', { name: /how much do tailors earn/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(link).toHaveTextContent('reddit.com');
    expect(link).toHaveTextContent(/opens in new tab/);
    expect(link).toHaveTextContent('Steady rates in Pune.');
  });
});
