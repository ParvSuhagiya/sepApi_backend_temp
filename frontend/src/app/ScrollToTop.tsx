import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Reset scroll on navigation and move focus to the main landmark. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
