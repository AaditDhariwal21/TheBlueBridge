import { cn } from '../../../lib/cn';

/**
 * "Step 2 of 6" with a segmented bar. The text is what assistive tech reads (the form
 * focuses its heading on every step); the bar is decoration.
 */
export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div aria-hidden="true" className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 flex-1 transition-colors duration-(--duration-base)',
            i < current ? 'bg-primary' : i === current ? 'bg-accent' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}
