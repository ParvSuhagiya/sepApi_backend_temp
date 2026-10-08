import OutreachButton from "./OutreachButton.jsx";

export default function LocalCard({ profile, place }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{place.name}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {[place.type, place.address].filter(Boolean).join(" · ")}
        {place.rating != null ? ` · ★ ${place.rating}` : ""}
        {place.reviews != null ? ` (${place.reviews} reviews)` : ""}
      </p>
      <OutreachButton profile={profile} place={place} />
    </article>
  );
}
