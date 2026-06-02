import { describe, expect, it } from 'vitest';
import { data, getHcp, getNewsletter } from '../../src/domain/data';
import { buildFallbackDecision, decisionContainsPatientIdentity } from '../../src/domain/relevance';

describe('fallback Relevance Decisions', () => {
  it('pushes a Newsletter that is Push-Worthy for the selected HCP Relevance Profile', () => {
    const hcp = getHcp('hcp-oncology-meier');
    const newsletter = getNewsletter('newsletter-egfr-lung');
    const decision = buildFallbackDecision(hcp, newsletter, '2026-05-17T12:00:00.000Z');

    expect(decision.push).toBe(true);
    expect(decision.summary?.sourceUrl).toBe(newsletter.sourceUrl);
    expect(decision.matchedClinicalTraits).toContain('EGFR-positive metastatic lung cancer');
  });

  it('does not push administrative Newsletters', () => {
    const hcp = getHcp('hcp-cardiology-fischer');
    const newsletter = getNewsletter('newsletter-admin-congress');
    const decision = buildFallbackDecision(hcp, newsletter, '2026-05-17T12:00:00.000Z');

    expect(decision.push).toBe(false);
    expect(decision.summary).toBeNull();
    expect(decision.score).toBeLessThan(20);
  });

  it('matches custom Newsletter content even when curated clinical signals are missing', () => {
    const hcp = getHcp('hcp-cardiology-fischer');
    const newsletter = {
      ...getNewsletter('newsletter-admin-congress'),
      id: 'newsletter-custom-upload',
      title: 'Tester supplied HFrEF update',
      source: 'Tester upload',
      topic: 'Cardiology',
      clinicalSignals: [],
      keyTakeaway: 'The pasted Newsletter highlights HFrEF follow-up workflow changes.',
      content:
        'This pasted Newsletter discusses heart failure with reduced ejection fraction, SGLT2 inhibitor use in heart failure, iron deficiency in heart failure, and post-discharge medication optimization.'
    };

    const decision = buildFallbackDecision(hcp, newsletter, '2026-05-17T12:00:00.000Z');

    expect(decision.push).toBe(true);
    expect(decision.matchedClinicalTraits).toContain('Heart failure with reduced ejection fraction');
    expect(decision.matchedClinicalTraits).toContain('Iron deficiency in heart failure');
  });

  it('does not expose Source Patient Record names in Relevance Decisions', () => {
    const hcp = getHcp('hcp-oncology-pharmacy-rossi');
    const newsletter = getNewsletter('newsletter-oncology-support');
    const decision = buildFallbackDecision(hcp, newsletter, '2026-05-17T12:00:00.000Z');
    const patientNames = data.hcps.flatMap((candidate) =>
      candidate.sourceRecords.map((record) => record.name)
    );

    expect(decisionContainsPatientIdentity(decision, patientNames)).toBe(false);
  });
});
