import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({
  default: () => Promise.resolve(),
}));

afterEach(() => {
  cleanup();
});

// jsdom lacks ResizeObserver (needed by Recharts' ResponsiveContainer).
// A no-op stub is enough: chart-content assertions target headings,
// toggles and the table fallback, never measured pixels.
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom lacks IntersectionObserver (used by framer-motion reveals and the
// scroll-spy). Report everything as immediately visible: animation tests
// assert rendered content, and scroll-spy tests stub their own observer.
if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = class {
    private callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }

    unobserve() {}

    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

