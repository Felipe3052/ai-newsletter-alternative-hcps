import demoData from '../../data/demo-data.json';
import type { DemoData, Hcp, Newsletter } from './types';

export const data = demoData as DemoData;

export function getHcp(hcpId: string): Hcp {
  const hcp = data.hcps.find((candidate) => candidate.id === hcpId);

  if (!hcp) {
    throw new Error(`Unknown HCP: ${hcpId}`);
  }

  return hcp;
}

export function getNewsletter(newsletterId: string): Newsletter {
  const newsletter = data.newsletters.find((candidate) => candidate.id === newsletterId);

  if (!newsletter) {
    throw new Error(`Unknown Newsletter: ${newsletterId}`);
  }

  return newsletter;
}
