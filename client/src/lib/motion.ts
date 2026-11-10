/** True when the user asked the OS for reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `scrollIntoView` that only animates when motion is allowed. */
export function scrollIntoViewGently(el: Element, block: ScrollLogicalPosition = 'nearest'): void {
  el.scrollIntoView({ block, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
