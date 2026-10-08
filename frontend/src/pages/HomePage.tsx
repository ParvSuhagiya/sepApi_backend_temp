/** Income-mode landing page. Search experience arrives in a later step. */
export function HomePage() {
  return (
    <section aria-labelledby="income-heading" className="flex flex-col gap-2">
      <h1 id="income-heading" className="text-2xl font-bold text-ink">
        Find income ideas
      </h1>
      <p className="text-sm text-muted">
        Realistic income ideas for your skills, city, hours and budget.
      </p>
    </section>
  );
}
