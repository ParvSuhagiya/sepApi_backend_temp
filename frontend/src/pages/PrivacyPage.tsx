import { Lock } from 'lucide-react';
import { Seo } from '../components/Seo';

export function PrivacyPage() {
  return (
    <section aria-labelledby="privacy-heading" className="flex flex-col gap-6 py-4">
      <Seo route="/privacy" />
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand mb-2">
          <Lock className="h-3.5 w-3.5" />
          <span>Zero Data Retention Architecture</span>
        </div>
        <h1 id="privacy-heading" className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Privacy
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
          We believe in privacy by design. We do not track, profile, or sell your data.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-line/80 bg-raised/90 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
        <p className="text-sm text-ink leading-relaxed">
          EarnRadar stores exactly one thing in your browser: your theme choice (light or dark).
          Nothing else is saved on your device by us.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          Your searches, results and shortlist live only in the tab&apos;s memory. Closing the
          tab clears them. Our servers keep no account, no profile and no history about you.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          When you search, your typed words and city go to our API to fetch results. Phone
          numbers are never sent to draft messages. Opening WhatsApp happens only when you
          click the button, through a wa.me link.
        </p>
        <p className="text-sm text-ink leading-relaxed">
          Map tiles come from OpenStreetMap. No third-party trackers or analytics run on this site.
        </p>
      </div>
    </section>
  );
}
