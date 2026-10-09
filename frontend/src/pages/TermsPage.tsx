import { FileText } from 'lucide-react';
import { Seo } from '../components/Seo';

export function TermsPage() {
  return (
    <section aria-labelledby="terms-heading" className="flex flex-col gap-6 py-4">
      <Seo route="/terms" />
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand mb-2">
          <FileText className="h-3.5 w-3.5" />
          <span>User Agreement & Disclaimers</span>
        </div>
        <h1 id="terms-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Terms
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
          Clear, plain-English ground rules for using EarnRadar.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-line/80 bg-raised/90 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
        <p className="text-sm text-ink leading-relaxed">
          EarnRadar provides information, not guarantees. Income figures are estimates. Lead
          scores are signals from public data. Neither promises work, pay or customers.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          You are responsible for verifying employers and businesses before paying money,
          sharing documents or sending messages. Scam Shield flags text patterns; it cannot
          declare anything safe.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          Fair use: searches are rate-limited per address. Do not scrape, overload or abuse
          the service. Draft messages are yours to review — you send them, not us.
        </p>
      </div>
    </section>
  );
}
