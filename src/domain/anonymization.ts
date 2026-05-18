import type { AnonymizedPatientProfile, Hcp, SourcePatientRecord } from './types';

const patientLabels = ['Patient A', 'Patient B', 'Patient C', 'Patient D', 'Patient E'];

export function toAgeBand(age: number): string {
  const floor = Math.floor(age / 10) * 10;
  return `${floor}-${floor + 9}`;
}

export function anonymizeSourceRecord(
  record: SourcePatientRecord,
  index: number
): AnonymizedPatientProfile {
  return {
    id: record.id.replace(/^src-/, 'anon-'),
    patientLabel: patientLabels[index] ?? `Patient ${index + 1}`,
    ageBand: toAgeBand(record.age),
    diagnoses: record.diagnoses,
    biomarkers: record.biomarkers,
    currentTherapies: record.currentTherapies,
    careContext: record.careContext
  };
}

export function anonymizePanel(hcp: Hcp): AnonymizedPatientProfile[] {
  return hcp.sourceRecords.map(anonymizeSourceRecord);
}

export function getDirectIdentifierValues(record: SourcePatientRecord): string[] {
  return [record.name, record.dob, record.address, record.recordNumber];
}

export function profileContainsDirectIdentifiers(
  profile: AnonymizedPatientProfile,
  source: SourcePatientRecord
): boolean {
  const serialized = JSON.stringify(profile).toLowerCase();
  return getDirectIdentifierValues(source).some((identifier) =>
    serialized.includes(identifier.toLowerCase())
  );
}
