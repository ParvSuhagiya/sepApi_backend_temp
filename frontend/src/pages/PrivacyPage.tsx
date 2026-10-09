/** Privacy: exactly what the browser stores. */
export function PrivacyPage() {
  return (
    <section aria-labelledby="privacy-heading" className="flex flex-col gap-3">
      <h1 id="privacy-heading" className="text-2xl font-bold text-ink">
        Privacy
      </h1>
      <p className="text-sm text-ink">
        EarnRadar stores exactly one thing in your browser: your theme choice (light or dark).
        Nothing else is saved on your device by us.
      </p>
      <p className="text-sm text-ink">
        Your searches, results and shortlist live only in the tab&apos;s memory. Closing the
        tab clears them. Our servers keep no account, no profile and no history about you.
      </p>
      <p className="text-sm text-ink">
        When you search, your typed words and city go to our API to fetch results. Phone
        numbers are never sent to draft messages. Opening WhatsApp happens only when you
        click the button, through a wa.me link.
      </p>
      <p className="text-sm text-ink">
        Map tiles come from OpenStreetMap. No third-party trackers or analytics run on this
        site.
      </p>
    </section>
  );
}
