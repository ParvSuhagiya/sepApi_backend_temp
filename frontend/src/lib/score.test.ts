import { describe, expect, it } from 'vitest';
import { scoreColor } from './score';

describe('scoreColor', () => {
  it('is green at 75 and above', () => {
    expect(scoreColor(75)).toBe('green');
    expect(scoreColor(100)).toBe('green');
  });

  it('is amber from 55 to 74', () => {
    expect(scoreColor(55)).toBe('amber');
    expect(scoreColor(74)).toBe('amber');
  });

  it('is red below 55', () => {
    expect(scoreColor(54)).toBe('red');
    expect(scoreColor(0)).toBe('red');
  });
});
