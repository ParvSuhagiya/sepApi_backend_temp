import RiskBadge from "./RiskBadge.jsx";

export function JobListDisclaimer() {
  return (
    <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      Scam Shield checks text patterns. It cannot guarantee a job is safe. Verify before
      paying or sharing documents.
    </p>
  );
}

export default function JobCard({ job }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900">{job.title}</h3>
        <RiskBadge risk={job.risk} />
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {job.company}
        {job.location ? ` · ${job.location}` : ""}
        {job.via ? ` · via ${job.via}` : ""}
      </p>
      {job.salary && <p className="mt-1 text-sm text-slate-700">Salary: {job.salary}</p>}
      {job.flags && job.flags.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
          {job.flags.map((flag, i) => (
            <li key={i}>{flag}</li>
          ))}
        </ul>
      )}
      {job.link && (
        <a
          href={job.link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block min-h-[40px] py-2 text-sm font-semibold text-green-800 underline focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          Apply<span className="sr-only"> (opens in new tab)</span>
        </a>
      )}
    </article>
  );
}
