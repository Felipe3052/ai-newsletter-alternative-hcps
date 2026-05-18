import type { RelevanceDecision, StreamEvent } from '../domain/types';

export type RunRelevanceCheckInput = {
  hcpId: string;
  newsletterId: string;
  preferLive?: boolean;
  onEvent: (event: StreamEvent) => void;
};

export async function runRelevanceCheck({
  hcpId,
  newsletterId,
  preferLive = true,
  onEvent
}: RunRelevanceCheckInput): Promise<RelevanceDecision> {
  const response = await fetch('/api/relevance/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hcpId, newsletterId, preferLive })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Relevance Check failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalDecision: RelevanceDecision | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;

      const event = JSON.parse(line) as StreamEvent;
      onEvent(event);

      if (event.type === 'decision') {
        finalDecision = event.decision;
      }
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer) as StreamEvent;
    onEvent(event);
    if (event.type === 'decision') {
      finalDecision = event.decision;
    }
  }

  if (!finalDecision) {
    throw new Error('Relevance Check finished without a decision');
  }

  return finalDecision;
}
