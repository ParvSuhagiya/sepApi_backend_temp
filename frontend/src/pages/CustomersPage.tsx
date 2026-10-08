/** Customer-mode landing page. Lead search arrives in a later step. */
export function CustomersPage() {
  return (
    <section aria-labelledby="customers-heading" className="flex flex-col gap-2">
      <h1 id="customers-heading" className="text-2xl font-bold text-ink">
        Find customers for my product
      </h1>
      <p className="text-sm text-muted">
        Local businesses that could become your customers, ranked as signals.
      </p>
    </section>
  );
}
