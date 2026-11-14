/**
 * Presentation slide navigation helper functions
 */

export function canGoNext(currentSlide: number, totalSlides: number): boolean {
  return currentSlide < totalSlides;
}

export function canGoPrevious(currentSlide: number): boolean {
  return currentSlide > 1;
}

export function getNextSlide(currentSlide: number, totalSlides: number): number {
  if (currentSlide < totalSlides) {
    return currentSlide + 1;
  }
  return currentSlide;
}

export function getPreviousSlide(currentSlide: number): number {
  if (currentSlide > 1) {
    return currentSlide - 1;
  }
  return 1;
}

export function clampSlide(requestedSlide: number, totalSlides: number): number {
  if (isNaN(requestedSlide) || requestedSlide < 1) return 1;
  if (requestedSlide > totalSlides) return Math.max(1, totalSlides);
  return Math.floor(requestedSlide);
}

export function formatSlideCounter(current: number, total: number): string {
  return `${current} / ${Math.max(1, total)}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
