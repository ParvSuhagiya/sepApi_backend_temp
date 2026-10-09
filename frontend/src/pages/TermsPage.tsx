/** Terms: plain-English ground rules. */
import { Seo } from '../components/Seo';

export function TermsPage() {
  return (
    <section aria-labelledby="terms-heading" className="flex flex-col gap-3">
      <Seo route="/terms" />
      <h1 id="terms-heading" className="text-2xl font-bold text-ink">
        Terms
      </h1>
      <p className="text-sm text-ink">
        EarnRadar provides information, not guarantees. Income figures are estimates. Lead
        scores are signals from public data. Neither promises work, pay or customers.
      </p>
      <p className="text-sm text-ink">
        You are responsible for verifying employers and businesses before paying money,
        sharing documents or sending messages. Scam Shield flags text patterns; it cannot
        declare anything safe.
      </p>
      <p className="text-sm text-ink">
        Fair use: searches are rate-limited per address. Do not scrape, overload or abuse
        the service. Draft messages are yours to review — you send them, not us.
      </p>
    </section>
  );
}
