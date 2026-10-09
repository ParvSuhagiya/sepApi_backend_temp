/** Responsible use: outreach etiquette and verification. Engineering guidance, not legal advice. */
import { Seo } from '../components/Seo';

export function ResponsibleUsePage() {
  return (
    <section aria-labelledby="responsible-use-heading" className="flex flex-col gap-3">
      <Seo route="/responsible-use" />
      <h1 id="responsible-use-heading" className="text-2xl font-bold text-ink">
        Responsible use
      </h1>
      <p className="text-sm text-ink">
        This is practical guidance from engineers, not legal advice. Rules change; when in
        doubt, ask a professional.
      </p>
      <p className="text-sm text-ink">
        <strong>Messaging businesses.</strong> Every draft includes an opt-out line — keep
        it. Message a business once, honour every “stop” immediately, and never use drafts
        for bulk or unsolicited blasts. India&apos;s DPDP Act 2023 and telemarketing rules
        restrict unsolicited commercial messages; prefer contacting businesses that invited
        contact.
      </p>
      <p className="text-sm text-ink">
        <strong>Verifying employers.</strong> Meet in public, check the company address and
        reviews, and never pay joining fees or share ID documents upfront. Walk away from
        pressure, secrecy or pay-first offers.
      </p>
      <p className="text-sm text-ink">
        <strong>Your part.</strong> Edit every draft before sending. Check prices in
        Ahmedabad, Pune or your own city yourself. Report abuse to the platform where it
        happens.
      </p>
    </section>
  );
}
