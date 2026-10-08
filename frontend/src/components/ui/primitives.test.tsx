import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Badge, Card, Chip, VisuallyHidden } from './badges';
import { CopyButton } from './CopyButton';
import { Dialog } from './Dialog';
import { Disclosure } from './Disclosure';
import { EmptyState, ErrorState } from './states';
import { ProgressSteps, Skeleton } from './feedback';
import { ToastProvider, useToast } from './Toast';
import { Tooltip } from './Tooltip';

describe('badges and card', () => {
  it('renders tones with text, not colour alone', () => {
    render(
      <>
        <Badge tone="amber">Partial</Badge>
        <Chip>billing software</Chip>
        <Card>
          <p>Body</p>
        </Card>
      </>,
    );
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('billing software')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('hides content visually only', () => {
    const { container } = render(
      <VisuallyHidden>
        <span>secret label</span>
      </VisuallyHidden>,
    );
    expect(container.firstChild).toHaveClass('sr-only');
    expect(screen.getByText('secret label')).toBeInTheDocument();
  });
});

describe('Disclosure', () => {
  it('toggles native details content', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="How this score was built">
        <p>Details body</p>
      </Disclosure>,
    );
    await user.click(screen.getByText('How this score was built'));
    expect(screen.getByText('Details body')).toBeVisible();
  });
});

describe('Dialog', () => {
  it('traps focus and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog title="Access code" onClose={onClose}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Access code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cycles Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(
      <Dialog title="Access code" onClose={() => {}}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });
});

describe('Tooltip', () => {
  it('describes the trigger', () => {
    render(
      <Tooltip content="Helpful hint">
        <button type="button">Hover me</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Hover me' });
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent('Helpful hint');
  });
});

describe('Toast', () => {
  function Harness() {
    const { toast } = useToast();
    return (
      <button type="button" onClick={() => toast('Saved for later')}>
        Notify
      </button>
    );
  }

  it('announces messages in a live region', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    const live = screen.getByText('Saved for later').closest('[aria-live]');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });
});

describe('CopyButton', () => {
  it('copies text and confirms', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<CopyButton text="REQ-123" label="support code" />);
    await user.click(screen.getByRole('button', { name: /copy support code/i }));
    expect(writeText).toHaveBeenCalledWith('REQ-123');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });
});

describe('feedback blocks', () => {
  it('renders skeleton, steps, states and stats regions', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <>
        <Skeleton className="h-4 w-40" />
        <ProgressSteps steps={['Plan', 'Fetch', 'Rank']} currentIndex={1} />
        <EmptyState title="Nothing found" description="Broaden your search." />
        <ErrorState title="Search failed" description="Try again." onRetry={onRetry} />
      </>,
    );
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const current = screen.getByText('Fetch');
    expect(current).toHaveAttribute('aria-current', 'step');
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
