import type { Hcp, Newsletter, RelevanceDecision, RelevanceSummary } from './types';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasOverlap(signal: string, trait: string): boolean {
  const normalizedSignal = normalize(signal);
  const normalizedTrait = normalize(trait);

  return (
    normalizedSignal === normalizedTrait ||
    normalizedSignal.includes(normalizedTrait) ||
    normalizedTrait.includes(normalizedSignal)
  );
}

export function getMatchedClinicalTraits(hcp: Hcp, newsletter: Newsletter): string[] {
  return hcp.relevanceProfile.traits.filter((trait) =>
    newsletter.clinicalSignals.some((signal) => hasOverlap(signal, trait))
  );
}

export function buildFallbackDecision(
  hcp: Hcp,
  newsletter: Newsletter,
  generatedAt = new Date().toISOString()
): RelevanceDecision {
  const matchedClinicalTraits = getMatchedClinicalTraits(hcp, newsletter);
  const isAdministrative = newsletter.topic.toLowerCase() === 'administration';
  const push = matchedClinicalTraits.length > 0 && !isAdministrative;
  const score = push
    ? Math.min(96, 78 + matchedClinicalTraits.length * 6)
    : isAdministrative
      ? 12
      : 28;

  return {
    id: `${hcp.id}:${newsletter.id}:${generatedAt}`,
    hcpId: hcp.id,
    newsletterId: newsletter.id,
    mode: 'fallback',
    push,
    score,
    rationale: push
      ? `This Newsletter is Push-Worthy because it maps to ${matchedClinicalTraits.length} clinical trait${
          matchedClinicalTraits.length === 1 ? '' : 's'
        } in ${hcp.name}'s HCP Relevance Profile.`
      : isAdministrative
        ? 'No push sent because this Newsletter is administrative and does not contain clinically actionable or practice-changing information for the selected HCP Relevance Profile.'
        : `No push sent because this Newsletter does not match clinically actionable traits in ${hcp.name}'s HCP Relevance Profile.`,
    matchedClinicalTraits,
    summary: push ? buildSummary(hcp, newsletter, matchedClinicalTraits) : null,
    generatedAt
  };
}

function buildSummary(
  hcp: Hcp,
  newsletter: Newsletter,
  matchedClinicalTraits: string[]
): RelevanceSummary {
  const traitText =
    matchedClinicalTraits.length === 1
      ? matchedClinicalTraits[0]
      : `${matchedClinicalTraits.slice(0, -1).join(', ')} and ${
          matchedClinicalTraits[matchedClinicalTraits.length - 1]
        }`;

  return {
    title: newsletter.title,
    body: newsletter.keyTakeaway,
    whyRelevant: `Relevant to ${hcp.role.toLowerCase()} patients with ${traitText}.`,
    sourceUrl: newsletter.sourceUrl
  };
}

export function decisionContainsPatientIdentity(
  decision: RelevanceDecision,
  patientNames: string[]
): boolean {
  const serialized = JSON.stringify(decision).toLowerCase();
  return patientNames.some((name) => serialized.includes(name.toLowerCase()));
}
