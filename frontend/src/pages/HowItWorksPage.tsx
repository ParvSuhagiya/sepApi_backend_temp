import { Database, HelpCircle, Key, LineChart, ShieldCheck } from 'lucide-react';
import { Reveal, Stagger, StaggerItem } from '../components/motion';
import { Seo } from '../components/Seo';

const CARDS = [
  {
    icon: Database,
    title: 'Where the data comes from',
    body: [
      'Find income ideas searches live jobs, local businesses on the map, demand trends and forum discussions near your city — for example Pune or Ahmedabad. Find customers searches businesses on the map and reads their public reviews for pain signals, plus one competitor search.',
      'A search takes 10–40 seconds. It takes longer after idle while the server wakes up. Business websites are never fetched. Nothing is ever sent automatically.',
    ],
  },
  {
    icon: LineChart,
    title: 'How EarnScore is computed',
    body: [
      'EarnScore blends five signals: 30% Demand, 20% Fit, 20% Trust, 15% Low competition and 15% Easy to start. Lead scores blend 40% mid-level fit, 30% pain signals, 15% reachability and 15% no-software signal.',
      'Guardrails only lower scores, and every adjustment is listed under “How this score was built”. Income figures are always estimates, never promises.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Scam Shield: what it checks',
    body: [
      'Every job is scanned for text patterns such as upfront-fee demands, vague pay and personal-data requests. Matches become readable flags with a Low, Medium or High risk badge. Scam-Shield cross-examines 26 behavioral heuristics including missing GSTIN registrations and Telegram redirects.',
      'Its limits matter more: it reads text, not intent. A “low risk” badge cannot guarantee a job is safe. High-risk listings stay visible with a caution panel — verify every employer before paying money or sharing documents.',
    ],
  },
  {
    icon: Key,
    title: 'Caching and credits',
    body: [
      'Searches hit a cache first. A repeated identical search costs zero credits and reports it. Every results page shows “credits used” and “served from cache” so you can see exactly what a search cost.',
      'Limits protect everyone: searches are rate-limited per IP address, request bodies are capped at 20 KB, and failures show a support code — never raw server text.',
    ],
  },
] as const;

export function HowItWorksPage() {
  return (
    <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-8 py-4">
      <Seo route="/how-it-works" />
      <Reveal>
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>System Architecture & Transparency • Trust & Scam Shield</span>
          </div>
          <h1
            id="how-it-works-heading"
            className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
          >
            How EarnRadar works
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Plain words. Short version: live evidence in, honest scores out. Sovereign Data Guard
            compliant with the DPDP Act (2023).
          </p>
        </div>
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <StaggerItem key={card.title}>
            <div className="stitch-card flex h-full flex-col gap-3 rounded-2xl border border-line/80 bg-raised/90 p-6 shadow-sm backdrop-blur-xl hover:shadow-md">
              <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md">
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-ink">{card.title}</h2>
              {card.body.map((para) => (
                <p key={para.slice(0, 24)} className="text-xs leading-relaxed text-ink sm:text-sm">
                  {para}
                </p>
              ))}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
