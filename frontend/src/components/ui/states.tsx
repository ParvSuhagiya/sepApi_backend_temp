import { Inbox, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

function StateShell({
  icon: Icon,
  title,
  description,
  action,
}: StateProps & { icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-raised px-6 py-10 text-center">
      <Icon aria-hidden="true" className="h-8 w-8 text-muted" />
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateShell icon={Inbox} {...props} />;
}

export function ErrorState({ onRetry, ...rest }: StateProps & { onRetry?: () => void }) {
  return (
    <div role="alert">
      <StateShell
        icon={TriangleAlert}
        {...rest}
        action={
          onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : (
            rest.action
          )
        }
      />
    </div>
  );
}
