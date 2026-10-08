import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../app/theme';
import { Badge, Card, Chip, VisuallyHidden } from '../components/ui/badges';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Dialog } from '../components/ui/Dialog';
import { Disclosure } from '../components/ui/Disclosure';
import { EmptyState, ErrorState } from '../components/ui/states';
import { ProgressSteps, Skeleton } from '../components/ui/feedback';
import { Input, NumberField, Select, Textarea } from '../components/ui/fields';
import { IconButton } from '../components/ui/IconButton';
import { RiskBadge, Stat } from '../components/ui/RiskBadge';
import { ScoreBadge, ScoreRing } from '../components/ui/ScoreBadge';
import { Spinner } from '../components/ui/Spinner';
import { Tabs } from '../components/ui/Tabs';
import { ToastProvider, useToast } from '../components/ui/Toast';
import { Tooltip } from '../components/ui/Tooltip';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-line bg-raised p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return <Button variant="secondary" onClick={() => toast('Kitchen sink toast')}>Show toast</Button>;
}

/** DEV-ONLY kitchen sink. Route is registered only for dev builds. */
export function UiKitchenSinkPage() {
  const { mode, toggle } = useTheme();
  const [tab, setTab] = useState('one');
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6">
        <h1>UI kitchen sink</h1>
        <Section title="Theme">
          <Button variant="secondary" onClick={toggle}>
            {mode === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            Toggle theme (now {mode})
          </Button>
        </Section>
        <Section title="Buttons">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <IconButton label="Search">
            <Sun aria-hidden="true" />
          </IconButton>
        </Section>
        <Section title="Fields">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Input id="ks-text" label="Text input" placeholder="Type here" hint="Helper text" />
            <Input id="ks-err" label="With error" error="Something is wrong" defaultValue="x" />
            <Textarea id="ks-area" label="Textarea" maxLength={100} value="Hello" readOnly />
            <NumberField id="ks-num" label="Number" defaultValue={10} min={1} max={168} />
            <Select
              id="ks-select"
              label="Select"
              options={[
                { value: 'a', label: 'Option A' },
                { value: 'b', label: 'Option B' },
              ]}
            />
          </div>
        </Section>
        <Section title="Tabs">
          <Tabs
            label="Demo tabs"
            activeId={tab}
            onChange={setTab}
            tabs={[
              { id: 'one', label: 'Tab one' },
              { id: 'two', label: 'Tab two' },
            ]}
          />
        </Section>
        <Section title="Badges and chips">
          <Badge tone="green">Live</Badge>
          <Badge tone="amber">Partial</Badge>
          <Badge tone="red">Failed</Badge>
          <Badge tone="info">Info</Badge>
          <Badge>Neutral</Badge>
          <Chip>Keyword chip</Chip>
        </Section>
        <Section title="Scores and risk">
          <ScoreBadge score={82} label="EarnScore" />
          <ScoreBadge score={60} label="Lead score" />
          <ScoreBadge score={30} label="EarnScore" />
          <ScoreRing score={82} label="EarnScore" />
          <RiskBadge risk="Low" />
          <RiskBadge risk="Medium" />
          <RiskBadge risk="High" />
        </Section>
        <Section title="Card and disclosure">
          <Card>
            <p className="text-sm">Card body</p>
          </Card>
          <Disclosure summary="How this score was built">
            <p className="text-sm">Details body</p>
          </Disclosure>
        </Section>
        <Section title="Dialog">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          {dialogOpen && (
            <Dialog title="Demo dialog" onClose={() => setDialogOpen(false)}>
              <p>Dialog body with focus trap and Esc to close.</p>
            </Dialog>
          )}
        </Section>
        <Section title="Toast">
          <ToastDemo />
        </Section>
        <Section title="Tooltip and copy">
          <Tooltip content="Helpful hint">
            <button type="button" className="min-h-[44px] rounded-md border border-line px-3">
              Hover me
            </button>
          </Tooltip>
          <CopyButton text="REQ-123" label="support code" />
        </Section>
        <Section title="Progress, skeleton, spinner">
          <ProgressSteps steps={['Plan', 'Fetch', 'Rank']} currentIndex={1} />
          <Skeleton className="h-4 w-40" />
          <Spinner label="Loading results" />
        </Section>
        <Section title="States and stats">
          <div className="grid w-full gap-4">
            <EmptyState title="Nothing here yet" description="Try a broader search." />
            <ErrorState title="Something broke" description="Please try again." />
            <dl>
              <Stat label="Credits used" value="0" />
            </dl>
          </div>
        </Section>
        <VisuallyHidden>Kitchen sink end marker</VisuallyHidden>
      </div>
    </ToastProvider>
  );
}
