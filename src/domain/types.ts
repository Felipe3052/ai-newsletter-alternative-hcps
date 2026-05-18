export type Accent = 'teal' | 'blue' | 'green' | 'violet' | 'amber';

export type SourcePatientRecord = {
  id: string;
  name: string;
  age: number;
  dob: string;
  address: string;
  recordNumber: string;
  diagnoses: string[];
  biomarkers: string[];
  currentTherapies: string[];
  careContext: string[];
};

export type AnonymizedPatientProfile = {
  id: string;
  patientLabel: string;
  ageBand: string;
  diagnoses: string[];
  biomarkers: string[];
  currentTherapies: string[];
  careContext: string[];
};

export type HcpRelevanceProfile = {
  summary: string;
  traits: string[];
  domains: string[];
};

export type Hcp = {
  id: string;
  name: string;
  role: string;
  location: string;
  focus: string;
  accent: Accent;
  sourceRecords: SourcePatientRecord[];
  relevanceProfile: HcpRelevanceProfile;
};

export type Newsletter = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  readingTime: string;
  topic: string;
  sourceUrl: string;
  clinicalSignals: string[];
  keyTakeaway: string;
  content: string;
};

export type DemoData = {
  hcps: Hcp[];
  newsletters: Newsletter[];
};

export type RelevanceSummary = {
  title: string;
  body: string;
  whyRelevant: string;
  sourceUrl: string;
};

export type RelevanceDecision = {
  id: string;
  hcpId: string;
  newsletterId: string;
  mode: 'live' | 'fallback';
  push: boolean;
  score: number;
  rationale: string;
  matchedClinicalTraits: string[];
  summary: RelevanceSummary | null;
  generatedAt: string;
};

export type CheckStatus =
  | 'idle'
  | 'reading'
  | 'comparing'
  | 'generating'
  | 'complete'
  | 'error';

export type StreamEvent =
  | { type: 'status'; status: CheckStatus; message: string }
  | { type: 'delta'; text: string }
  | { type: 'decision'; decision: RelevanceDecision }
  | { type: 'error'; message: string; decision?: RelevanceDecision };
