import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Heart,
  HelpCircle,
  Lock,
  MessageSquare,
  Newspaper,
  RefreshCcw,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  ThumbsDown,
  UserRound,
  X,
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

type NewsletterBroadcastRun = {
  newsletterId: string;
  checkedCount: number;
  totalCount: number;
  activeHcpName: string | null;
  results: RelevanceDecision[];
  error?: string;
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
  const [newsletterBroadcastRun, setNewsletterBroadcastRun] = useState<NewsletterBroadcastRun | null>(null);

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

  const upsertPushDecision = (decision: RelevanceDecision) => {
    if (!decision.push || !decision.summary) return;

    const nextItem: InboxItem = {
      ...decision.summary,
      id: decision.id,
      newsletterId: decision.newsletterId,
      generatedAt: decision.generatedAt,
      mode: decision.mode,
      score: decision.score
    };

    setInboxByHcp((current) => {
      const currentInbox = current[decision.hcpId] ?? [];
      const existsIndex = currentInbox.findIndex((item) => item.newsletterId === decision.newsletterId);

      if (existsIndex >= 0) {
        const updated = [...currentInbox];
        updated[existsIndex] = nextItem;
        return { ...current, [decision.hcpId]: updated };
      }

      return {
        ...current,
        [decision.hcpId]: [nextItem, ...currentInbox]
      };
    });
  };

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

      upsertPushDecision(decision);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Relevance Check failed');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRunNewsletterBroadcast = async () => {
    const newsletter = selectedNewsletter;
    const totalCount = data.hcps.length;
    const completedDecisions: RelevanceDecision[] = [];

    setIsChecking(true);
    setLatestDecision(null);
    setStreamText('');
    setStatus('reading');
    setStatusMessage(`Preparing ${newsletter.title} for all HCPs`);
    setNewsletterBroadcastRun({
      newsletterId: newsletter.id,
      checkedCount: 0,
      totalCount,
      activeHcpName: null,
      results: []
    });

    try {
      for (const hcp of data.hcps) {
        setStreamText(`Checking ${hcp.name} against "${newsletter.title}"...\n`);
        setStatus('comparing');
        setStatusMessage(`Checking ${hcp.name}'s HCP Relevance Profile`);
        setNewsletterBroadcastRun((current) =>
          current && current.newsletterId === newsletter.id
            ? { ...current, activeHcpName: hcp.name }
            : current
        );

        const decision = await runRelevanceCheck({
          hcpId: hcp.id,
          newsletterId: newsletter.id,
          onEvent: (event) => {
            if (event.type === 'status') {
              setStatus(event.status);
              setStatusMessage(`${hcp.name}: ${event.message}`);
            }

            if (event.type === 'delta') {
              setStreamText((current) => current + event.text);
            }

            if (event.type === 'decision') {
              setLatestDecision(event.decision);
            }
          }
        });

        completedDecisions.push(decision);
        upsertPushDecision(decision);

        setNewsletterBroadcastRun((current) =>
          current && current.newsletterId === newsletter.id
            ? {
                ...current,
                checkedCount: completedDecisions.length,
                activeHcpName: completedDecisions.length === totalCount ? null : current.activeHcpName,
                results: [...completedDecisions]
              }
            : current
        );
      }

      const pushCount = completedDecisions.filter((decision) => decision.push).length;
      const firstPushedDecision = completedDecisions.find((decision) => decision.push) ?? null;
      const decisionToReview = firstPushedDecision ?? completedDecisions[completedDecisions.length - 1] ?? null;

      if (decisionToReview) {
        setLatestDecision(decisionToReview);
      }

      if (firstPushedDecision) {
        const pushedHcp =
          data.hcps.find((hcp) => hcp.id === firstPushedDecision.hcpId) ?? data.hcps[0];
        setSelectedHcpId(firstPushedDecision.hcpId);
        setStreamText(
          [
            `Broadcast complete: ${pushCount} push${pushCount === 1 ? '' : 'es'} sent from "${newsletter.title}".`,
            `First pushed recipient: ${pushedHcp.name}.`,
            `Push summary: ${firstPushedDecision.summary?.body ?? firstPushedDecision.rationale}`
          ].join('\n')
        );
      } else {
        setStreamText(`Broadcast complete: no HCP profiles received a push for "${newsletter.title}".`);
      }

      setStatus('complete');
      setStatusMessage(`${pushCount} push${pushCount === 1 ? '' : 'es'} sent from this Newsletter`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Newsletter relevance check failed';
      setStatus('error');
      setStatusMessage(message);
      setNewsletterBroadcastRun((current) =>
        current && current.newsletterId === newsletter.id ? { ...current, error: message } : current
      );
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
    setNewsletterBroadcastRun(null);
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
            hcps={data.hcps}
            newsletters={data.newsletters}
            selectedNewsletter={selectedNewsletter}
            broadcastRun={newsletterBroadcastRun}
            streamText={streamText}
            isChecking={isChecking}
            onSelectNewsletter={setSelectedNewsletterId}
            onRunNewsletterCheck={handleRunNewsletterBroadcast}
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
        <PhoneInbox hcp={selectedHcp} inbox={selectedInbox} onRefresh={onRunCheck} isChecking={isChecking} />
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
  hcps,
  newsletters,
  selectedNewsletter,
  broadcastRun,
  streamText,
  isChecking,
  onSelectNewsletter,
  onRunNewsletterCheck
}: {
  hcps: Hcp[];
  newsletters: Newsletter[];
  selectedNewsletter: Newsletter;
  broadcastRun: NewsletterBroadcastRun | null;
  streamText: string;
  isChecking: boolean;
  onSelectNewsletter: (newsletterId: string) => void;
  onRunNewsletterCheck: () => void;
}) {
  const runForSelectedNewsletter =
    broadcastRun?.newsletterId === selectedNewsletter.id ? broadcastRun : null;
  const isBroadcastingSelected =
    isChecking &&
    Boolean(runForSelectedNewsletter) &&
    runForSelectedNewsletter?.checkedCount !== runForSelectedNewsletter?.totalCount;
  const checkedCount = runForSelectedNewsletter?.checkedCount ?? 0;
  const totalCount = runForSelectedNewsletter?.totalCount ?? hcps.length;

  return (
    <section className="newsletter-layout">
      <div className="section-heading">
        <div>
          <h2>Curated Newsletter inputs</h2>
          <p>Each Newsletter is evaluated as a complete communication, then only the relevant part is summarized.</p>
        </div>
        <button
          id="newsletter-check-all-button"
          className="primary-action newsletter-broadcast-action"
          type="button"
          onClick={onRunNewsletterCheck}
          disabled={isChecking}
        >
          {isBroadcastingSelected ? <Sparkles size={18} /> : <Send size={18} />}
          <span>
            {isBroadcastingSelected
              ? `Checking ${Math.min(checkedCount + 1, totalCount)}/${totalCount}`
              : 'Check relevance for all HCPs'}
          </span>
        </button>
      </div>

      <div className="newsletter-grid">
        <div className="newsletter-list">
          {newsletters.map((newsletter) => (
            <button
              key={newsletter.id}
              type="button"
              className={`newsletter-row ${newsletter.id === selectedNewsletter.id ? 'is-selected' : ''}`}
              onClick={() => onSelectNewsletter(newsletter.id)}
              disabled={isChecking}
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

        <NewsletterBroadcastPanel
          hcps={hcps}
          selectedNewsletter={selectedNewsletter}
          broadcastRun={runForSelectedNewsletter}
          streamText={streamText}
          isChecking={isBroadcastingSelected}
        />
      </div>
    </section>
  );
}

function NewsletterBroadcastPanel({
  hcps,
  selectedNewsletter,
  broadcastRun,
  streamText,
  isChecking
}: {
  hcps: Hcp[];
  selectedNewsletter: Newsletter;
  broadcastRun: NewsletterBroadcastRun | null;
  streamText: string;
  isChecking: boolean;
}) {
  const resultsByHcpId = new Map(
    broadcastRun?.results.map((decision) => [decision.hcpId, decision]) ?? []
  );
  const pushCount = broadcastRun?.results.filter((decision) => decision.push).length ?? 0;
  const noPushCount = broadcastRun ? broadcastRun.checkedCount - pushCount : 0;

  return (
    <aside className="broadcast-panel">
      <SectionLabel icon={Send} label="Newsletter distribution" />

      <div className="broadcast-summary">
        <strong>{broadcastRun ? `${pushCount} push${pushCount === 1 ? '' : 'es'} ready` : 'Not checked yet'}</strong>
        <span>
          {broadcastRun
            ? `${broadcastRun.checkedCount}/${broadcastRun.totalCount} HCP profiles checked, ${noPushCount} no-push`
            : `Run this Newsletter against all ${hcps.length} HCP Relevance Profiles.`}
        </span>
      </div>

      {broadcastRun?.error ? (
        <div className="broadcast-error">
          <XCircle size={17} />
          <span>{broadcastRun.error}</span>
        </div>
      ) : null}

      <div className="broadcast-live-box">
        <span>{isChecking ? `Live generation: ${broadcastRun?.activeHcpName}` : 'Latest generation'}</span>
        <p>{streamText || `No generated result yet for ${selectedNewsletter.title}.`}</p>
      </div>

      <div className="distribution-list">
        {hcps.map((hcp) => {
          const decision = resultsByHcpId.get(hcp.id);
          const isActive = broadcastRun?.activeHcpName === hcp.name && isChecking;

          return (
            <article
              key={hcp.id}
              className={`distribution-row accent-${hcp.accent} ${decision?.push ? 'is-push' : ''} ${isActive ? 'is-active' : ''}`}
            >
              <div className="distribution-head">
                <span className="choice-avatar">{initials(hcp.name)}</span>
                <div>
                  <strong>{hcp.name}</strong>
                  <small>{hcp.role}</small>
                </div>
              </div>

              <div className="distribution-outcome">
                {isActive ? (
                  <>
                    <Sparkles size={16} />
                    <span>Checking now</span>
                  </>
                ) : decision ? (
                  decision.push ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Push sent | {decision.score}/100</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      <span>No push | {decision.score}/100</span>
                    </>
                  )
                ) : (
                  <>
                    <BrainCircuit size={16} />
                    <span>Waiting</span>
                  </>
                )}
              </div>

              {decision?.summary ? (
                <p>{decision.summary.body}</p>
              ) : decision ? (
                <p>{decision.rationale}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </aside>
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

type PhoneTab = 'recaps' | 'inbox' | 'community';

function PhoneInbox({ hcp, inbox, onRefresh, isChecking }: { hcp: Hcp; inbox: InboxItem[]; onRefresh: () => void; isChecking: boolean }) {
  const [activeTab, setActiveTab] = useState<PhoneTab>('inbox');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const tabNames: Record<PhoneTab, string> = {
    recaps: 'Monthly Recaps',
    inbox: 'HCP Inbox',
    community: 'Community Forum'
  };

  return (
    <div className="phone-frame" id="phone-inbox" aria-label="Smartphone-style HCP Inbox">
      <div className="phone-top">
        <span>09:41</span>
        <span className="phone-notch" />
        <span>5G</span>
      </div>
      
      <div className="phone-appbar">
        <button 
          className={`avatar-dot accent-${hcp.accent} profile-trigger`} 
          onClick={() => setIsProfileOpen(true)}
          type="button"
          title="View HCP Profile"
        >
          {initials(hcp.name)}
        </button>
        <div className="appbar-title">
          <small>{tabNames[activeTab]}</small>
          <strong>{hcp.name}</strong>
        </div>
        <div style={{ width: 40 }} /> {/* spacer */}
      </div>

      {isProfileOpen && (
        <div className="phone-profile-overlay">
          <div className="profile-modal">
            <div className="profile-modal-head">
              <button type="button" className="icon-button" aria-label="Settings" title="Settings">
                <Settings size={20} />
              </button>
              <h3>HCP Profile</h3>
              <button type="button" className="icon-button" onClick={() => setIsProfileOpen(false)} aria-label="Close" title="Close">
                <X size={20} />
              </button>
            </div>
            <div className="profile-modal-body">
              <div className={`modal-avatar accent-${hcp.accent}`}>
                {initials(hcp.name)}
              </div>
              <h2>{hcp.name}</h2>
              <span className="modal-role">{hcp.role}</span>
              <p className="modal-summary">{hcp.relevanceProfile.summary}</p>
              <div className="trait-cloud">
                {hcp.relevanceProfile.traits.map((trait) => (
                  <span key={trait}>{trait}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="phone-content">
        {activeTab === 'inbox' && (
          <>
            <div className="inbox-header">
              <h3 className="view-title" style={{ margin: 0 }}>Latest Pushes</h3>
              <button 
                type="button"
                className="secondary-action compact-action" 
                onClick={onRefresh}
                disabled={isChecking}
              >
                {isChecking ? <Sparkles size={14} /> : <RefreshCcw size={14} />} 
                {isChecking ? 'Checking...' : 'Refresh'}
              </button>
            </div>
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
          </>
        )}

        {activeTab === 'recaps' && <RecapsView />}

        {activeTab === 'community' && <CommunityForum hcp={hcp} />}
      </div>

      <nav className="phone-bottom-nav">
        <button 
          type="button" 
          className={`nav-tab ${activeTab === 'recaps' ? 'active' : ''}`}
          onClick={() => setActiveTab('recaps')}
        >
          <FileText size={22} />
          <span>Recaps</span>
        </button>
        <button 
          type="button" 
          className={`nav-tab ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <Send size={22} />
          <span>Inbox</span>
        </button>
        <button 
          type="button" 
          className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          <MessageSquare size={22} />
          <span>Community</span>
        </button>
      </nav>
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

// --- Recaps View Implementation ---

interface Recap {
  id: string;
  title: string;
  summary: string;
  details: string[];
}

const initialRecaps: Recap[] = [
  {
    id: 'r1',
    title: 'May 2026 Oncology Highlights',
    summary: 'A quick summary of the 4 most practice-changing updates pushed to you this month, tailored to your active patient panel.',
    details: [
      '• New FDA approval for targeted KRAS inhibitor in late-stage NSCLC.',
      '• Updated ASCO guidelines for managing immunotoxicity.',
      '• Supply chain alert: Temporary shortage of standard chemotherapy drug X.',
      '• Liquid biopsy screening shown to reduce false positives by 15%.'
    ]
  },
  {
    id: 'r2',
    title: 'April 2026 Oncology Highlights',
    summary: 'Your digest of last month\'s 6 key updates, including new ASCO guidelines.',
    details: [
      '• Revised EGFR monitoring recommendations: shift to 6-month intervals.',
      '• Phase 3 trial results for new mAb show significant PFS improvement.',
      '• Case study: Managing rare adverse effects in combination therapy.',
      '• Reminder: Annual oncology conference early bird registration.',
      '• Integration of AI scribes in clinic workflows reduces documentation time by 40%.',
      '• New clinical guidelines for adjuvant therapy in early-stage breast cancer.'
    ]
  }
];

function RecapsView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="recaps-view">
      <h3 className="view-title">Monthly Recaps</h3>
      {initialRecaps.map(recap => (
        <article key={recap.id} className="recap-card">
          <h4>{recap.title}</h4>
          <p>{recap.summary}</p>
          
          {expandedId === recap.id && (
            <div className="recap-details">
              <ul>
                {recap.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
          
          <button 
            type="button"
            className="secondary-action compact-action" 
            onClick={() => toggleExpand(recap.id)}
          >
            {expandedId === recap.id ? 'Close Recap' : 'Read Recap'}
          </button>
        </article>
      ))}
    </div>
  );
}

// --- Community Forum Implementation ---

interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  accent: string;
  text: string;
  timestamp: string;
}

interface Post {
  id: string;
  author: string;
  authorInitials: string;
  accent: string;
  timestamp: string;
  createdAt: number;
  content: string;
  likes: number;
  dislikes: number;
  userLiked: boolean;
  userDisliked: boolean;
  comments: Comment[];
  showComments?: boolean;
}

const now = Date.now();
const hour = 60 * 60 * 1000;

const initialPosts: Post[] = [
  {
    id: 'p1',
    author: 'Dr. David Bauer',
    authorInitials: 'DB',
    accent: 'blue',
    timestamp: '2 hours ago',
    createdAt: now - 2 * hour,
    content: 'Has anyone seen the latest phase 3 data on the new targeted therapy? It looks incredibly promising for late-stage patients.',
    likes: 12,
    dislikes: 1,
    userLiked: false,
    userDisliked: false,
    comments: [
      {
        id: 'c1',
        author: 'Dr. Sofia Keller',
        authorInitials: 'SK',
        accent: 'green',
        text: 'Yes! The progression-free survival delta was quite impressive. I plan to mention this to my panel tomorrow.',
        timestamp: '1 hour ago'
      },
      {
        id: 'c2',
        author: 'Dr. Marc Dubois',
        authorInitials: 'MD',
        accent: 'violet',
        text: 'I am waiting for the subgroup analysis on patients with prior resistance mutations.',
        timestamp: '45 mins ago'
      }
    ]
  },
  {
    id: 'p2',
    author: 'Dr. Sofia Keller',
    authorInitials: 'SK',
    accent: 'green',
    timestamp: '5 hours ago',
    createdAt: now - 5 * hour,
    content: 'Just read the pushed update on EGFR monitoring. Changing our screening protocols tomorrow.',
    likes: 34,
    dislikes: 0,
    userLiked: true,
    userDisliked: false,
    comments: [
      {
        id: 'c3',
        author: 'Andrea Rossi',
        authorInitials: 'AR',
        accent: 'amber',
        text: 'Agreed. The new imaging frequency recommendations make a lot of sense.',
        timestamp: '2 hours ago'
      }
    ]
  },
  {
    id: 'p3',
    author: 'Dr. Michael Chen',
    authorInitials: 'MC',
    accent: 'rose',
    timestamp: '15 mins ago',
    createdAt: now - 0.25 * hour,
    content: 'Are there any recent supply chain issues with standard chemotherapy drugs in your regions? We are seeing backorders.',
    likes: 3,
    dislikes: 0,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p4',
    author: 'Dr. Elena Rostova',
    authorInitials: 'ER',
    accent: 'amber',
    timestamp: '4 hours ago',
    createdAt: now - 4 * hour,
    content: 'I highly recommend the new webinar on managing immunotoxicity. The case studies were extremely relevant to my current patients.',
    likes: 45,
    dislikes: 2,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p5',
    author: 'Dr. Thomas Wright',
    authorInitials: 'TW',
    accent: 'indigo',
    timestamp: '10 hours ago',
    createdAt: now - 10 * hour,
    content: 'The recent FDA approval for the new KRAS inhibitor is a game changer for our clinic.',
    likes: 120,
    dislikes: 5,
    userLiked: true,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p6',
    author: 'Dr. Sarah Jenkins',
    authorInitials: 'SJ',
    accent: 'violet',
    timestamp: '1 day ago',
    createdAt: now - 24 * hour,
    content: 'Has anyone integrated the new liquid biopsy screening into their standard workflows? Looking for best practices.',
    likes: 15,
    dislikes: 0,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p7',
    author: 'Dr. Liam O\'Connor',
    authorInitials: 'LO',
    accent: 'green',
    timestamp: '1 day ago',
    createdAt: now - 25 * hour,
    content: 'A patient asked me about an experimental diet they saw on TikTok... How do you handle medical misinformation in the clinic?',
    likes: 89,
    dislikes: 1,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p8',
    author: 'Dr. Aisha Patel',
    authorInitials: 'AP',
    accent: 'blue',
    timestamp: '2 days ago',
    createdAt: now - 48 * hour,
    content: 'Just published a small case series on rare adverse effects. Happy to share the preprint if anyone is interested.',
    likes: 56,
    dislikes: 0,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p9',
    author: 'Dr. Wei Zhang',
    authorInitials: 'WZ',
    accent: 'teal',
    timestamp: '2 days ago',
    createdAt: now - 50 * hour,
    content: 'Question: What is the consensus on off-label prescribing for the new mAb when insurance denies coverage?',
    likes: 22,
    dislikes: 4,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p10',
    author: 'Dr. Chloe Martin',
    authorInitials: 'CM',
    accent: 'rose',
    timestamp: '3 days ago',
    createdAt: now - 72 * hour,
    content: 'Reminder to all: the annual conference early bird registration ends tomorrow!',
    likes: 5,
    dislikes: 12,
    userLiked: false,
    userDisliked: true,
    comments: []
  },
  {
    id: 'p11',
    author: 'Dr. Robert Kim',
    authorInitials: 'RK',
    accent: 'indigo',
    timestamp: '4 days ago',
    createdAt: now - 96 * hour,
    content: 'I feel like I am drowning in paperwork this week. Does anyone use AI scribes effectively?',
    likes: 210,
    dislikes: 2,
    userLiked: false,
    userDisliked: false,
    comments: []
  },
  {
    id: 'p12',
    author: 'Dr. Olivia Brown',
    authorInitials: 'OB',
    accent: 'amber',
    timestamp: '1 week ago',
    createdAt: now - 168 * hour,
    content: 'The new clinical guidelines are finally out! Thoughts?',
    likes: 312,
    dislikes: 8,
    userLiked: false,
    userDisliked: false,
    comments: []
  }
];

function CommunityForum({ hcp }: { hcp: Hcp }) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPostContent, setNewPostContent] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const newPost: Post = {
      id: `p${Date.now()}`,
      author: hcp.name,
      authorInitials: initials(hcp.name),
      accent: hcp.accent,
      timestamp: 'Just now',
      createdAt: Date.now(),
      content: newPostContent.trim(),
      likes: 0,
      dislikes: 0,
      userLiked: false,
      userDisliked: false,
      comments: []
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  const toggleLike = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id !== postId) return p;
      if (p.userLiked) {
        return { ...p, userLiked: false, likes: p.likes - 1 };
      }
      return { 
        ...p, 
        userLiked: true, 
        likes: p.likes + 1,
        userDisliked: false,
        dislikes: p.userDisliked ? p.dislikes - 1 : p.dislikes
      };
    }));
  };

  const toggleDislike = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id !== postId) return p;
      if (p.userDisliked) {
        return { ...p, userDisliked: false, dislikes: p.dislikes - 1 };
      }
      return { 
        ...p, 
        userDisliked: true, 
        dislikes: p.dislikes + 1,
        userLiked: false,
        likes: p.userLiked ? p.likes - 1 : p.likes
      };
    }));
  };

  const toggleComments = (postId: string) => {
    setPosts(posts.map(p => 
      p.id === postId ? { ...p, showComments: !p.showComments } : p
    ));
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'recent') {
      return b.createdAt - a.createdAt;
    } else {
      return b.likes - a.likes;
    }
  });

  return (
    <div className="community-view">
      <div className="forum-header">
        <h3 className="view-title" style={{ marginBottom: 0 }}>HCP Community Forum</h3>
        <div className="forum-sort">
          <button 
            type="button" 
            className={sortBy === 'recent' ? 'active-sort' : ''} 
            onClick={() => setSortBy('recent')}
          >
            New
          </button>
          <button 
            type="button" 
            className={sortBy === 'popular' ? 'active-sort' : ''} 
            onClick={() => setSortBy('popular')}
          >
            Top
          </button>
        </div>
      </div>
      
      <form className="post-composer" onSubmit={handlePostSubmit}>
        <div className="composer-header">
          <span className={`avatar-dot accent-${hcp.accent}`}>{initials(hcp.name)}</span>
          <strong>Post as {hcp.name}</strong>
        </div>
        <textarea 
          placeholder="Share a clinical insight or ask a question..." 
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          rows={3}
        />
        <div className="composer-footer">
          <button type="submit" className="primary-action compact-action" disabled={!newPostContent.trim()}>
            Post to Forum
          </button>
        </div>
      </form>

      <div className="forum-feed">
        {sortedPosts.map(post => (
          <article key={post.id} className="community-post">
            <div className="post-author">
              <span className={`avatar-dot accent-${post.accent}`}>{post.authorInitials}</span>
              <div>
                <strong>{post.author}</strong>
                <small>{post.timestamp}</small>
              </div>
            </div>
            <p>{post.content}</p>
            <div className="community-actions">
              <button 
                type="button" 
                className={post.userLiked ? 'action-active-like' : ''} 
                onClick={() => toggleLike(post.id)}
              >
                <Heart size={16} fill={post.userLiked ? 'currentColor' : 'none'} /> {post.likes}
              </button>
              <button 
                type="button" 
                className={post.userDisliked ? 'action-active-dislike' : ''} 
                onClick={() => toggleDislike(post.id)}
              >
                <ThumbsDown size={16} fill={post.userDisliked ? 'currentColor' : 'none'} /> {post.dislikes}
              </button>
              <button type="button" onClick={() => toggleComments(post.id)}>
                <MessageSquare size={16} /> {post.comments.length} Comments
              </button>
            </div>
            
            {post.showComments && (
              <div className="comments-section">
                {post.comments.length === 0 ? (
                  <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  post.comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <span className={`avatar-dot accent-${comment.accent} small-avatar`}>{comment.authorInitials}</span>
                      <div className="comment-content">
                        <div className="comment-author">
                          <strong>{comment.author}</strong>
                          <small>{comment.timestamp}</small>
                        </div>
                        <p>{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
