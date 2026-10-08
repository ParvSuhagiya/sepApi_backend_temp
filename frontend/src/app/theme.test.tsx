import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './theme';
import { THEME_STORAGE_KEY } from './theme';

function Probe() {
  const { mode, resolved, toggle, setMode } = useTheme();
  return (
    <div>
      <p data-testid="mode">{mode}</p>
      <p data-testid="resolved">{resolved}</p>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => setMode('dark')}>
        force dark
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  it('defaults to system (light without a dark OS preference)', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggles the theme and persists it', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(window.localStorage.__proto__, 'setItem');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    setItem.mockRestore();
  });

  it('honours a stored dark preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    try {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(document.documentElement.dataset.theme).toBe('dark');
    } finally {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  });

  it('survives unavailable storage', async () => {
    const user = userEvent.setup();
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    try {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      await user.click(screen.getByRole('button', { name: 'toggle' }));
      expect(document.documentElement.dataset.theme).toBe('dark');
    } finally {
      vi.restoreAllMocks();
    }
  });
});
