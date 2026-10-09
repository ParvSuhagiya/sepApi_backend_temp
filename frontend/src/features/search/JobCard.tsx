import { AlertTriangle, Briefcase, ExternalLink, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { JobResult } from '../../api/schemas';
import { RiskBadge, type RiskLevel } from '../../components/ui/RiskBadge';
import { StarButton } from '../shortlist/shortlist';

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
      className={`flex flex-col gap-3 rounded-3xl border bg-raised/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md ${
        highlighted ? 'border-brand-strong ring-2 ring-brand-strong' : 'border-line/80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4
            id={`job-${job.title}-heading`}
            className="break-words text-base sm:text-lg font-bold text-ink flex items-center gap-2"
          >
            <Briefcase className="h-4 w-4 text-brand shrink-0" />
            <span>{job.title}</span>
          </h4>
          <p className="mt-1 break-words text-xs sm:text-sm text-muted">
            {[job.company, job.location].filter(Boolean).join(' · ')}
            {job.via ? ` (via ${job.via})` : ''}
          </p>
        </div>
        <RiskBadge risk={risk} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className="font-semibold text-ink">Salary: </span>
        <span className="rounded-full bg-surface px-2.5 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 border border-line/60">
          {salary ?? 'Salary not listed'}
        </span>
      </div>

      {flags.length > 0 ? (
        <ul aria-label="Scam Shield flags" className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <li
              key={flag}
              className="rounded-full border border-tone-amber-border/40 bg-tone-amber-bg px-2.5 py-0.5 text-xs font-semibold text-tone-amber-fg shadow-sm"
            >
              {flag}
            </li>
          ))}
        </ul>
      ) : null}

      {risk === 'High' ? (
        <p
          role="note"
          className="flex items-start gap-2.5 rounded-2xl border border-tone-red-border/40 bg-tone-red-bg/10 p-4 text-xs sm:text-sm font-medium text-ink"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-tone-red-bg" />
          <span>
            Caution: this listing matches high-risk patterns. Do not pay any fee or share
            documents before verifying the employer independently.
          </span>
        </p>
      ) : null}

      {description ? (
        <div className="rounded-2xl bg-surface/50 p-4 border border-line/60">
          <p
            className={`whitespace-pre-line break-words text-xs sm:text-sm leading-relaxed text-ink ${
              expanded ? '' : 'line-clamp-3'
            }`}
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
            className="mt-2 text-xs font-bold text-brand hover:underline"
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
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand hover:underline"
          >
            <span>Apply for this job</span>
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5 border-t border-line/60 pt-3">
        <StarButton
          item={{
            id: `job:${job.title}|${job.company}`,
            kind: 'job',
            title: job.title,
            subtitle: [job.company, job.location].filter(Boolean).join(' · '),
            phone: null,
          }}
        />
        <button
          type="button"
          aria-pressed={highlighted}
          onClick={onSelect}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition-all ${
            highlighted
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-line/80 bg-raised text-ink hover:bg-surface'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{highlighted ? 'Showing on map' : 'Show on map'}</span>
        </button>
      </div>
    </article>
  );
}
