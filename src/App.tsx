import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lock,
  Newspaper,
  RefreshCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  UserRound,
  XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { runRelevanceCheck } from './api/relevanceClient';
import { anonymizePanel } from './domain/anonymization';
import { OnboardingTour } from './components/OnboardingTour';
import { data } from './domain/data';
import type {
  CheckStatus,
  Hcp,
  Newsletter,
  RelevanceDecision,
  RelevanceSummary
} from './domain/types';

export type TabId = 'anonymization' | 'newsletters' | 'decision' | 'app';

type InboxItem = RelevanceSummary & {
  id: string;
  newsletterId: string;
  generatedAt: string;
  mode: 'live' | 'fallback';
  score: number;
};

const tabs: Array<{ id: TabId; label: string; icon: typeof ShieldCheck }> = [
  { id: 'anonymization', label: 'Anonymization', icon: ShieldCheck },
  { id: 'newsletters', label: 'Newsletters', icon: Newspaper },
  { id: 'decision', label: 'AI Decision', icon: BrainCircuit },
  { id: 'app', label: 'HCP App', icon: Smartphone }
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('app');
  const [showTour, setShowTour] = useState(() => {
    if (typeof window !== 'undefined' && window.navigator?.webdriver) {
      return false;
    }
    try {
      return localStorage.getItem('onboarding-completed') !== 'true';
    } catch {
      return true;
    }
  });
  const [selectedHcpId, setSelectedHcpId] = useState(data.hcps[0].id);
  const [selectedNewsletterId, setSelectedNewsletterId] = useState(data.newsletters[0].id);
  const [latestDecision, setLatestDecision] = useState<RelevanceDecision | null>(null);
  const [streamText, setStreamText] = useState('');
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready for a Relevance Check');
  const [isChecking, setIsChecking] = useState(false);
  const [inboxByHcp, setInboxByHcp] = useState<Record<string, InboxItem[]>>({});

  const selectedHcp = useMemo(
    () => data.hcps.find((hcp) => hcp.id === selectedHcpId) ?? data.hcps[0],
    [selectedHcpId]
  );
  const selectedNewsletter = useMemo(
    () =>
      data.newsletters.find((newsletter) => newsletter.id === selectedNewsletterId) ??
      data.newsletters[0],
    [selectedNewsletterId]
  );
  const anonymizedProfiles = useMemo(() => anonymizePanel(selectedHcp), [selectedHcp]);
  const selectedInbox = inboxByHcp[selectedHcp.id] ?? [];

  const handleRunCheck = async () => {
    setIsChecking(true);
    setLatestDecision(null);
    setStreamText('');
    setStatus('reading');
    setStatusMessage('Reading the complete Newsletter');

    try {
      const decision = await runRelevanceCheck({
        hcpId: selectedHcp.id,
        newsletterId: selectedNewsletter.id,
        onEvent: (event) => {
          if (event.type === 'status') {
            setStatus(event.status);
            setStatusMessage(event.message);
          }

          if (event.type === 'delta') {
            setStreamText((current) => current + event.text);
          }

          if (event.type === 'decision') {
            setLatestDecision(event.decision);
            setStatus('complete');
            setStatusMessage(event.decision.push ? 'Push sent to HCP Inbox' : 'No push sent');
          }
        }
      });

      if (decision.push && decision.summary) {
        const nextItem: InboxItem = {
          ...decision.summary,
          id: decision.id,
          newsletterId: decision.newsletterId,
          generatedAt: decision.generatedAt,
          mode: decision.mode,
          score: decision.score
        };

        setInboxByHcp((current) => ({
          ...current,
          [decision.hcpId]: [nextItem, ...(current[decision.hcpId] ?? [])]
        }));
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Relevance Check failed');
    } finally {
      setIsChecking(false);
    }
  };

  const handleReset = () => {
    setInboxByHcp({});
    setLatestDecision(null);
    setStreamText('');
    setStatus('idle');
    setStatusMessage('Ready for a Relevance Check');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={20} strokeWidth={2.4} />
          </div>
          <div>
            <h1>Relevance Engine</h1>
            <p>Local proof of concept for HCP Information Triage</p>
          </div>
        </div>
        <div className="topbar-right">
          <button className="help-btn" type="button" onClick={() => setShowTour(true)} title="Start Tour">
            <HelpCircle size={16} />
            <span>Help / Tour</span>
          </button>
          <div className="topbar-status">
            <Lock size={15} />
            <span>Local backend</span>
            <span className="status-dot" />
            <span>Fake data</span>
          </div>
        </div>
      </header>

      <nav className="tabbar" id="navigation-tabs" aria-label="Demo sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="workspace">
        {activeTab === 'anonymization' ? (
          <AnonymizationTab
            hcp={selectedHcp}
            hcps={data.hcps}
            anonymizedProfiles={anonymizedProfiles}
            onSelectHcp={setSelectedHcpId}
          />
        ) : null}

        {activeTab === 'newsletters' ? (
          <NewslettersTab
            newsletters={data.newsletters}
            selectedNewsletter={selectedNewsletter}
            onSelectNewsletter={setSelectedNewsletterId}
          />
        ) : null}

        {activeTab === 'decision' ? (
          <DecisionTab
            decision={latestDecision}
            hcp={selectedHcp}
            newsletter={selectedNewsletter}
            streamText={streamText}
            status={status}
            statusMessage={statusMessage}
          />
        ) : null}

        {activeTab === 'app' ? (
          <HcpAppTab
            hcps={data.hcps}
            newsletters={data.newsletters}
            selectedHcp={selectedHcp}
            selectedNewsletter={selectedNewsletter}
            selectedInbox={selectedInbox}
            latestDecision={latestDecision}
            streamText={streamText}
            status={status}
            statusMessage={statusMessage}
            isChecking={isChecking}
            onSelectHcp={setSelectedHcpId}
            onSelectNewsletter={setSelectedNewsletterId}
            onRunCheck={handleRunCheck}
            onReset={handleReset}
          />
        ) : null}
      </main>

      {showTour && (
        <OnboardingTour
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => setShowTour(false)}
        />
      )}
    </div>
  );
}

function HcpAppTab({
  hcps,
  newsletters,
  selectedHcp,
  selectedNewsletter,
  selectedInbox,
  latestDecision,
  streamText,
  status,
  statusMessage,
  isChecking,
  onSelectHcp,
  onSelectNewsletter,
  onRunCheck,
  onReset
}: {
  hcps: Hcp[];
  newsletters: Newsletter[];
  selectedHcp: Hcp;
  selectedNewsletter: Newsletter;
  selectedInbox: InboxItem[];
  latestDecision: RelevanceDecision | null;
  streamText: string;
  status: CheckStatus;
  statusMessage: string;
  isChecking: boolean;
  onSelectHcp: (hcpId: string) => void;
  onSelectNewsletter: (newsletterId: string) => void;
  onRunCheck: () => void;
  onReset: () => void;
}) {
  return (
    <section className="app-grid">
      <aside className="control-rail">
        <SectionLabel icon={UserRound} label="Selected HCP" />
        <div className="select-stack" id="hcp-selector">
          {hcps.map((hcp) => (
            <button
              key={hcp.id}
              type="button"
              className={`choice-row accent-${hcp.accent} ${selectedHcp.id === hcp.id ? 'is-selected' : ''}`}
              onClick={() => onSelectHcp(hcp.id)}
            >
              <span className="choice-avatar">{initials(hcp.name)}</span>
              <span>
                <strong>{hcp.name}</strong>
                <small>{hcp.role}</small>
              </span>
            </button>
          ))}
        </div>

        <SectionLabel icon={Newspaper} label="Newsletter" />
        <select
          className="field-select"
          id="newsletter-selector"
          value={selectedNewsletter.id}
          onChange={(event) => onSelectNewsletter(event.target.value)}
        >
          {newsletters.map((newsletter) => (
            <option key={newsletter.id} value={newsletter.id}>
              {newsletter.title}
            </option>
          ))}
        </select>

        <div className="action-stack">
          <button id="run-check-button" className="primary-action" type="button" onClick={onRunCheck} disabled={isChecking}>
            {isChecking ? <Sparkles size={18} /> : <Send size={18} />}
            <span>{isChecking ? 'Checking relevance' : 'Check relevance'}</span>
          </button>
          <button className="secondary-action" type="button" onClick={onReset}>
            <RefreshCcw size={16} />
            <span>Reset session</span>
          </button>
        </div>
      </aside>

      <div className="phone-stage">
        <PhoneInbox hcp={selectedHcp} inbox={selectedInbox} />
      </div>

      <aside className="decision-rail">
        <LiveStatus status={status} message={statusMessage} isChecking={isChecking} />
        <NewsletterSnapshot newsletter={selectedNewsletter} />
        <LatestDecisionCard decision={latestDecision} streamText={streamText} />
      </aside>
    </section>
  );
}

function AnonymizationTab({
  hcp,
  hcps,
  anonymizedProfiles,
  onSelectHcp
}: {
  hcp: Hcp;
  hcps: Hcp[];
  anonymizedProfiles: ReturnType<typeof anonymizePanel>;
  onSelectHcp: (hcpId: string) => void;
}) {
  return (
    <section className="process-layout">
      <div className="section-heading">
        <div>
          <h2>Local anonymization before relevance matching</h2>
          <p>Fake Source Patient Records are reduced to clinical traits before the Relevance Engine runs.</p>
        </div>
        <select className="field-select compact" value={hcp.id} onChange={(event) => onSelectHcp(event.target.value)}>
          {hcps.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </div>

      <div className="three-column-flow">
        <div className="flow-panel">
          <SectionLabel icon={FileText} label="Source Patient Records" />
          <div className="record-list">
            {hcp.sourceRecords.map((record) => (
              <article key={record.id} className="source-record">
                <div>
                  <strong>{record.name}</strong>
                  <span>{record.age} years</span>
                </div>
                <p>{record.diagnoses.join(', ')}</p>
                <small>{record.recordNumber} | {record.address}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="flow-panel">
          <SectionLabel icon={ShieldCheck} label="Anonymized Patient Profiles" />
          <div className="record-list">
            {anonymizedProfiles.map((profile) => (
              <article key={profile.id} className="anon-record">
                <div>
                  <strong>{profile.patientLabel}</strong>
                  <span>Age band {profile.ageBand}</span>
                </div>
                <p>{profile.diagnoses.join(', ')}</p>
                <small>{[...profile.biomarkers, ...profile.currentTherapies].join(' | ')}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="flow-panel profile-panel">
          <SectionLabel icon={BrainCircuit} label="HCP Relevance Profile" />
          <h3>{hcp.name}</h3>
          <p>{hcp.relevanceProfile.summary}</p>
          <div className="trait-cloud">
            {hcp.relevanceProfile.traits.map((trait) => (
              <span key={trait}>{trait}</span>
            ))}
          </div>
          <div className="compliance-note">
            <Lock size={16} />
            <span>Fake data. Demo-grade anonymization. Production use requires compliant de-identification and governance.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function NewslettersTab({
  newsletters,
  selectedNewsletter,
  onSelectNewsletter
}: {
  newsletters: Newsletter[];
  selectedNewsletter: Newsletter;
  onSelectNewsletter: (newsletterId: string) => void;
}) {
  return (
    <section className="newsletter-layout">
      <div className="section-heading">
        <div>
          <h2>Curated Newsletter inputs</h2>
          <p>Each Newsletter is evaluated as a complete communication, then only the relevant part is summarized.</p>
        </div>
      </div>

      <div className="newsletter-grid">
        <div className="newsletter-list">
          {newsletters.map((newsletter) => (
            <button
              key={newsletter.id}
              type="button"
              className={`newsletter-row ${newsletter.id === selectedNewsletter.id ? 'is-selected' : ''}`}
              onClick={() => onSelectNewsletter(newsletter.id)}
            >
              <span>{newsletter.topic}</span>
              <strong>{newsletter.title}</strong>
              <small>{newsletter.source} | {newsletter.readingTime}</small>
            </button>
          ))}
        </div>

        <article className="newsletter-detail">
          <div className="detail-meta">
            <span>{selectedNewsletter.source}</span>
            <span>{formatDate(selectedNewsletter.publishedAt)}</span>
            <span>{selectedNewsletter.readingTime}</span>
          </div>
          <h2>{selectedNewsletter.title}</h2>
          <p className="lead">{selectedNewsletter.keyTakeaway}</p>
          <p>{selectedNewsletter.content}</p>
          <div className="trait-cloud">
            {selectedNewsletter.clinicalSignals.map((signal) => (
              <span key={signal}>{signal}</span>
            ))}
          </div>
          <a className="source-link" href={selectedNewsletter.sourceUrl}>
            Original Newsletter link
          </a>
        </article>
      </div>
    </section>
  );
}

function DecisionTab({
  decision,
  hcp,
  newsletter,
  streamText,
  status,
  statusMessage
}: {
  decision: RelevanceDecision | null;
  hcp: Hcp;
  newsletter: Newsletter;
  streamText: string;
  status: CheckStatus;
  statusMessage: string;
}) {
  return (
    <section className="decision-layout">
      <div className="section-heading">
        <div>
          <h2>Latest Relevance Decision</h2>
          <p>{hcp.name} | {newsletter.title}</p>
        </div>
        <ModeBadge mode={decision?.mode ?? 'fallback'} visible={Boolean(decision)} />
      </div>

      <div className="decision-board">
        <div className="decision-main">
          <LiveStatus status={status} message={statusMessage} isChecking={status !== 'idle' && status !== 'complete'} />
          <LatestDecisionCard decision={decision} streamText={streamText} expanded />
        </div>

        <div className="decision-side">
          <InfoPanel title="Matched Clinical Traits">
            {decision?.matchedClinicalTraits.length ? (
              <div className="trait-cloud">
                {decision.matchedClinicalTraits.map((trait) => (
                  <span key={trait}>{trait}</span>
                ))}
              </div>
            ) : (
              <p className="muted-copy">No Push-Worthy clinical trait match yet.</p>
            )}
          </InfoPanel>

          <InfoPanel title="Structured outcome">
            <dl className="decision-facts">
              <div>
                <dt>Outcome</dt>
                <dd>{decision ? (decision.push ? 'Push' : 'Do not push') : 'Not run'}</dd>
              </div>
              <div>
                <dt>Score</dt>
                <dd>{decision ? `${decision.score}/100` : '-'}</dd>
              </div>
              <div>
                <dt>Newsletter</dt>
                <dd>{newsletter.title}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{newsletter.source}</dd>
              </div>
            </dl>
          </InfoPanel>
        </div>
      </div>
    </section>
  );
}

function PhoneInbox({ hcp, inbox }: { hcp: Hcp; inbox: InboxItem[] }) {
  return (
    <div className="phone-frame" id="phone-inbox" aria-label="Smartphone-style HCP Inbox">
      <div className="phone-top">
        <span>09:41</span>
        <span className="phone-notch" />
        <span>5G</span>
      </div>
      <div className="phone-appbar">
        <div>
          <small>HCP Inbox</small>
          <strong>{hcp.name}</strong>
        </div>
        <span className={`avatar-dot accent-${hcp.accent}`}>{initials(hcp.name)}</span>
      </div>
      <div className="phone-content">
        {inbox.length ? (
          inbox.map((item) => (
            <article key={item.id} className="push-card">
              <div className="push-card-head">
                <span>{item.mode === 'live' ? 'Live AI' : 'Fallback'}</span>
                <span>{item.score}/100</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <small>{item.whyRelevant}</small>
              <a href={item.sourceUrl}>Open original Newsletter</a>
            </article>
          ))
        ) : (
          <div className="empty-inbox">
            <ShieldCheck size={34} />
            <h3>No pushed updates</h3>
            <p>The HCP Inbox only receives Push-Worthy Relevance Summaries.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LatestDecisionCard({
  decision,
  streamText,
  expanded = false
}: {
  decision: RelevanceDecision | null;
  streamText: string;
  expanded?: boolean;
}) {
  return (
    <div className={`decision-card ${expanded ? 'is-expanded' : ''}`}>
      <div className="decision-card-head">
        <div>
          <span>Relevance Decision</span>
          <strong>{decision ? (decision.push ? 'Push-Worthy' : 'Do not push') : 'Awaiting check'}</strong>
        </div>
        {decision ? (
          decision.push ? (
            <CheckCircle2 className="icon-success" size={24} />
          ) : (
            <XCircle className="icon-muted" size={24} />
          )
        ) : (
          <BrainCircuit className="icon-muted" size={24} />
        )}
      </div>

      {decision ? (
        <div className="score-row">
          <div className="score-ring" style={{ '--score': `${decision.score * 3.6}deg` } as React.CSSProperties}>
            <span>{decision.score}</span>
          </div>
          <p>{decision.rationale}</p>
        </div>
      ) : (
        <p className="muted-copy">Run a Relevance Check to generate the latest push or no-push decision.</p>
      )}

      <div className="stream-box">
        <span>Live generation</span>
        <p>{streamText || 'No generation output yet.'}</p>
      </div>

      {decision?.summary ? (
        <div className="summary-preview">
          <span>Push payload</span>
          <strong>{decision.summary.title}</strong>
          <p>{decision.summary.body}</p>
          <small>{decision.summary.whyRelevant}</small>
        </div>
      ) : decision ? (
        <div className="no-push-box">
          <XCircle size={18} />
          <span>No push sent</span>
        </div>
      ) : null}
    </div>
  );
}

function LiveStatus({
  status,
  message,
  isChecking
}: {
  status: CheckStatus;
  message: string;
  isChecking: boolean;
}) {
  return (
    <div className={`live-status status-${status}`}>
      <span className={isChecking ? 'pulse-dot is-running' : 'pulse-dot'} />
      <div>
        <strong>{message}</strong>
        <small>{statusLabel(status)}</small>
      </div>
    </div>
  );
}

function NewsletterSnapshot({ newsletter }: { newsletter: Newsletter }) {
  return (
    <article className="snapshot">
      <SectionLabel icon={Newspaper} label="Selected Newsletter" />
      <h3>{newsletter.title}</h3>
      <p>{newsletter.keyTakeaway}</p>
      <div className="detail-meta">
        <span>{newsletter.topic}</span>
        <span>{newsletter.readingTime}</span>
      </div>
    </article>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="info-panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="section-label">
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
}

function ModeBadge({ mode, visible }: { mode: 'live' | 'fallback'; visible: boolean }) {
  if (!visible) return null;

  return <span className={`mode-badge mode-${mode}`}>{mode === 'live' ? 'Live AI' : 'Fallback mode'}</span>;
}

function statusLabel(status: CheckStatus): string {
  switch (status) {
    case 'reading':
      return 'Newsletter input';
    case 'comparing':
      return 'HCP Relevance Profile';
    case 'generating':
      return 'Relevance Engine';
    case 'complete':
      return 'Decision complete';
    case 'error':
      return 'Needs attention';
    case 'idle':
    default:
      return 'Ready';
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}
