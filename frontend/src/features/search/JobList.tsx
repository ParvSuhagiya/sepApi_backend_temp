import { useMemo, useState } from 'react';
import type { JobResult } from '../../api/schemas';
import { JobCard } from './JobCard';

export type RiskFilter = 'Low' | 'Medium' | 'High';
export type SiteFilter = 'all' | 'remote' | 'onsite';
export type JobSort = 'risk' | 'salary';

const RISK_ORDER: Record<RiskFilter, number> = { Low: 0, Medium: 1, High: 2 };
const ALL_RISKS: RiskFilter[] = ['Low', 'Medium', 'High'];

const REMOTE_RE = /\b(remote|anywhere|work from home|work-from-home)\b/i;

export function isRemoteJob(job: JobResult): boolean {
  return REMOTE_RE.test(job.location ?? '');
}

function riskOf(job: JobResult): RiskFilter {
  return job.risk === 'High' || job.risk === 'Medium' ? job.risk : 'Low';
}

/** Jobs section body: Scam Shield disclaimer, filters, sorted cards. */
export function JobList({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: JobResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [risks, setRisks] = useState<RiskFilter[]>(ALL_RISKS);
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [site, setSite] = useState<SiteFilter>('all');
  const [sort, setSort] = useState<JobSort>('risk');

  const visible = useMemo(() => {
    const withIndex = jobs.map((job, index) => ({ job, index }));
    const filtered = withIndex.filter(({ job }) => {
      if (!risks.includes(riskOf(job))) return false;
      if (salaryOnly && !job.salary?.trim()) return false;
      const remote = isRemoteJob(job);
      if (site === 'remote' && !remote) return false;
      if (site === 'onsite' && remote) return false;
      return true;
    });
    filtered.sort((a, b) =>
      sort === 'risk'
        ? RISK_ORDER[riskOf(a.job)] - RISK_ORDER[riskOf(b.job)]
        : Number(Boolean(b.job.salary?.trim())) - Number(Boolean(a.job.salary?.trim())),
    );
    return filtered;
  }, [jobs, risks, salaryOnly, site, sort]);

  function toggleRisk(risk: RiskFilter) {
    setRisks((prev) =>
      prev.includes(risk) ? prev.filter((item) => item !== risk) : [...prev, risk],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-line bg-surface p-3 text-sm text-ink">
        Scam Shield checks text patterns. It cannot guarantee a job is safe. Verify before
        paying or sharing documents.
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <fieldset>
          <legend className="text-sm font-medium text-ink">Risk level</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {ALL_RISKS.map((risk) => (
              <label
                key={risk}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-sm font-medium text-ink"
              >
                <input
                  type="checkbox"
                  checked={risks.includes(risk)}
                  onChange={() => toggleRisk(risk)}
                  className="h-[20px] w-[20px] accent-brand"
                />
                {risk}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 self-end rounded-md text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={salaryOnly}
            onChange={(event) => setSalaryOnly(event.target.checked)}
            className="h-[20px] w-[20px] accent-brand"
          />
          Has salary
        </label>
        <div role="group" aria-label="Work site" className="flex flex-wrap items-center gap-2 self-end">
          {(
            [
              ['all', 'All sites'],
              ['remote', 'Remote'],
              ['onsite', 'On-site'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={site === value}
              onClick={() => setSite(value)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold ${
                site === value
                  ? 'border-brand-strong bg-brand-strong text-white'
                  : 'border-line bg-raised text-ink hover:bg-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="self-end">
          <label htmlFor="job-sort" className="sr-only">
            Sort jobs
          </label>
          <select
            id="job-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as JobSort)}
            className="min-h-[44px] rounded-md border border-line bg-raised px-3 text-sm font-medium text-ink"
          >
            <option value="risk">Safest first</option>
            <option value="salary">Salary listed first</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {visible.length === 1 ? '1 job' : `${visible.length} jobs`}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">
          No live jobs found for this search. Try a broader skill or a larger nearby city.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map(({ job, index }) => (
            <JobCard
              key={`${job.title}|${job.company}|${index}`}
              job={job}
              highlighted={selectedId === `job-${index}`}
              onSelect={() => onSelect(`job-${index}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
