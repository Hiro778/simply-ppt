import { describe, it, expect } from 'vitest';
import {
  canGoNext,
  canGoPrevious,
  getNextSlide,
  getPreviousSlide,
  clampSlide,
  formatSlideCounter,
  formatDuration,
} from '@/lib/presentation/navigation';

describe('Slide Navigation Helpers (Unit)', () => {
  it('correctly determines whether navigation is possible', () => {
    expect(canGoNext(1, 10)).toBe(true);
    expect(canGoNext(10, 10)).toBe(false);

    expect(canGoPrevious(1)).toBe(false);
    expect(canGoPrevious(2)).toBe(true);
  });

  it('increments and decrements slide numbers safely', () => {
    expect(getNextSlide(1, 5)).toBe(2);
    expect(getNextSlide(5, 5)).toBe(5);

    expect(getPreviousSlide(3)).toBe(2);
    expect(getPreviousSlide(1)).toBe(1);
  });

  it('clamps requested slide indices to valid bounds', () => {
    expect(clampSlide(0, 10)).toBe(1);
    expect(clampSlide(-5, 10)).toBe(1);
    expect(clampSlide(15, 10)).toBe(10);
    expect(clampSlide(5, 10)).toBe(5);
    expect(clampSlide(3.7, 10)).toBe(3);
    expect(clampSlide(NaN, 10)).toBe(1);
  });

  it('formats slide counter display strings properly', () => {
    expect(formatSlideCounter(1, 25)).toBe('1 / 25');
    expect(formatSlideCounter(25, 25)).toBe('25 / 25');
    expect(formatSlideCounter(1, 0)).toBe('1 / 1');
  });

  it('formats presentation duration in minutes and seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(9)).toBe('00:09');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3600)).toBe('60:00');
  });
});
