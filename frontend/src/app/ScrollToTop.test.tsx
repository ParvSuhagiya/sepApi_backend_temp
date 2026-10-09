import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { ScrollToTop } from './ScrollToTop';

function Nav() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/b')}>
      go
    </button>
  );
}

describe('ScrollToTop', () => {
  it('moves focus to the main landmark on route change', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/a" element={<Nav />} />
            <Route path="/b" element={<p>arrived</p>} />
          </Routes>
        </main>
      </MemoryRouter>,
    );
    await user.click(document.querySelector('button') as HTMLButtonElement);
    expect(document.activeElement?.id).toBe('main-content');
  });
});
