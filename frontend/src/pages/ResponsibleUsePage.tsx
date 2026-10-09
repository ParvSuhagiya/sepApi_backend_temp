import { ShieldCheck } from 'lucide-react';
import { Seo } from '../components/Seo';

export function ResponsibleUsePage() {
  return (
    <section aria-labelledby="responsible-use-heading" className="flex flex-col gap-6 py-4">
      <Seo route="/responsible-use" />
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand mb-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Outreach Etiquette & Safety Guidance</span>
        </div>
        <h1 id="responsible-use-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Responsible use
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
          This is practical guidance from engineers, not legal advice. Rules change; when in
          doubt, ask a professional.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-line/80 bg-raised/90 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
        <p className="text-sm text-ink leading-relaxed">
          <strong>Messaging businesses.</strong> Every draft includes an opt-out line — keep
          it. Message a business once, honour every “stop” immediately, and never use drafts
          for bulk or unsolicited blasts. India&apos;s DPDP Act 2023 and telemarketing rules
          restrict unsolicited commercial messages; prefer contacting businesses that invited
          contact.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          <strong>Verifying employers.</strong> Meet in public, check the company address and
          reviews, and never pay joining fees or share ID documents upfront. Walk away from
          pressure, secrecy or pay-first offers.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          <strong>Your part.</strong> Edit every draft before sending. Check prices in
          Ahmedabad, Pune or your own city yourself. Report abuse to the platform where it
          happens.
        </p>
      </div>
    </section>
  );
}
