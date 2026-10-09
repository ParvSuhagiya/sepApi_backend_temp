import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { JobResult } from '../../api/schemas';
import { RiskBadge, type RiskLevel } from '../../components/ui/RiskBadge';

function toRiskLevel(risk: JobResult['risk']): RiskLevel {
  return risk === 'High' || risk === 'Medium' ? risk : 'Low';
}

export interface JobCardProps {
  job: JobResult;
  highlighted: boolean;
  onSelect: () => void;
}

/** One job listing with Scam Shield signals. High-risk items warn, never hide. */
export function JobCard({ job, highlighted, onSelect }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const risk = toRiskLevel(job.risk);
  const salary = job.salary?.trim() ? job.salary : null;
  const flags = job.flags ?? [];
  const description = job.desc ?? '';

  return (
    <article
      aria-labelledby={`job-${job.title}-heading`}
      className={`flex flex-col gap-2 rounded-lg border bg-raised p-4 shadow-sm ${
        highlighted ? 'border-brand-strong ring-2 ring-brand-strong' : 'border-line'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4
            id={`job-${job.title}-heading`}
            className="break-words text-base font-bold text-ink"
          >
            {job.title}
          </h4>
          <p className="break-words text-sm text-muted">
            {[job.company, job.location].filter(Boolean).join(' · ')}
            {job.via ? ` (via ${job.via})` : ''}
          </p>
        </div>
        <RiskBadge risk={risk} />
      </div>

      <p className="text-sm text-ink">
        <span className="font-semibold">Salary: </span>
        {salary ?? 'Salary not listed'}
      </p>

      {flags.length > 0 ? (
        <ul aria-label="Scam Shield flags" className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <li
              key={flag}
              className="rounded-full border border-tone-amber-border bg-tone-amber-bg px-2.5 py-0.5 text-xs font-semibold text-tone-amber-fg"
            >
              {flag}
            </li>
          ))}
        </ul>
      ) : null}

      {risk === 'High' ? (
        <p
          role="note"
          className="flex items-start gap-1.5 rounded-md border border-tone-red-border bg-tone-red-bg/10 p-3 text-sm font-medium text-ink"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-tone-red-bg" />
          <span>
            Caution: this listing matches high-risk patterns. Do not pay any fee or share
            documents before verifying the employer independently.
          </span>
        </p>
      ) : null}

      {description ? (
        <div>
          <p
            className={`whitespace-pre-line break-words text-sm text-ink ${expanded ? '' : 'line-clamp-3'}`}
          >
            {description}
          </p>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
            className="mt-1 min-h-[44px] rounded-md px-1 text-sm font-semibold text-brand underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      ) : null}

      {job.link ? (
        <p>
          <a
            href={job.link}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand underline"
          >
            Apply for this job
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </p>
      ) : null}

      <div>
        <button
          type="button"
          aria-pressed={highlighted}
          onClick={onSelect}
          className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
        >
          {highlighted ? 'Showing on map' : 'Show on map'}
        </button>
      </div>
    </article>
  );
}
