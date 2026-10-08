/** Small loading spinner. Decorative unless given a label. */
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-hidden={label ? undefined : true} className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}
