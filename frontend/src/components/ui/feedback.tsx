/** Shimmer placeholder. Decorative; pair with an aria-busy region or label. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />;
}

/** Ordered stage indicator. The current step is exposed via aria-current. */
export function ProgressSteps({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li
            key={step}
            aria-current={current ? 'step' : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              current
                ? 'border-brand bg-brand text-white'
                : done
                  ? 'border-line bg-surface text-ink'
                  : 'border-line bg-raised text-muted'
            }`}
          >
            {step}
          </li>
        );
      })}
    </ol>
  );
}
