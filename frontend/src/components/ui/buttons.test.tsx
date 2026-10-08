import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Spinner } from './Spinner';

describe('Button', () => {
  it('renders variants and a 44px touch target', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button.className).toContain('min-h-[44px]');
  });

  it('shows loading state and disables interaction', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );
    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('exposes an accessible label', () => {
    render(
      <IconButton label="Toggle theme">
        <span aria-hidden="true">*</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });
});

describe('Spinner', () => {
  it('announces itself with a label, silent without one', () => {
    const { rerender } = render(<Spinner label="Loading results" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading results');
    rerender(<Spinner label="" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
