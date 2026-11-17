import { useEffect, useRef, type RefObject } from 'react';

/**
 * A thin blue-to-pink bar under the header that fills as the article is read (from its top
 * reaching the header to its end reaching the bottom of the screen). Decorative: the scroll
 * position is already available to assistive tech. Updated straight on the element, once per
 * frame, so scrolling never re-renders the page.
 */
export function ReadingProgress({ target }: { target: RefObject<HTMLElement | null> }) {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const article = target.current;
      const bar = barRef.current;
      if (!article || !bar) return;
      const { top, height } = article.getBoundingClientRect();
      const header = Number.parseFloat(getComputedStyle(bar).top) || 0;
      const distance = height - (window.innerHeight - header);
      const progress = distance <= 0 ? 1 : Math.min(1, Math.max(0, (header - top) / distance));
      bar.style.scale = `${progress} 1`;
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    if (target.current) observer.observe(target.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [target]);

  return (
    <span
      ref={barRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-header z-40 h-0.5 origin-left bg-linear-to-r from-accent-soft to-accent-2-soft"
      style={{ scale: '0 1' }}
    />
  );
}
