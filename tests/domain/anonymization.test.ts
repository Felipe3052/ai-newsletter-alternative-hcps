import { describe, expect, it } from 'vitest';
import { anonymizePanel, profileContainsDirectIdentifiers } from '../../src/domain/anonymization';
import { data } from '../../src/domain/data';

describe('anonymization and HCP Relevance Profiles', () => {
  it('removes direct identifiers from every Anonymized Patient Profile', () => {
    for (const hcp of data.hcps) {
      const anonymizedProfiles = anonymizePanel(hcp);

      expect(anonymizedProfiles).toHaveLength(hcp.sourceRecords.length);

      anonymizedProfiles.forEach((profile, index) => {
        expect(profileContainsDirectIdentifiers(profile, hcp.sourceRecords[index])).toBe(false);
        expect(profile.patientLabel).toMatch(/^Patient/);
        expect(profile.ageBand).toMatch(/^\d{2}-\d{2}$/);
      });
    }
  });

  it('preserves clinical traits needed for relevance matching', () => {
    const oncology = data.hcps.find((hcp) => hcp.id === 'hcp-oncology-meier');

    expect(oncology?.relevanceProfile.traits).toContain('EGFR-positive metastatic lung cancer');
    expect(oncology?.relevanceProfile.traits).toContain('Immune-related adverse event management');
  });
});
