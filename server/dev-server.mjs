import { createServer as createHttpServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';

process.env.NODE_ENV = 'development';

const root = process.cwd();
const port = Number(process.env.PORT ?? 5173);

loadLocalEnv(resolve(root, '.env.local'));
loadLocalEnv(resolve(root, '.env'));

const demoData = JSON.parse(readFileSync(resolve(root, 'data/demo-data.json'), 'utf-8'));

const vite = await createViteServer({
  root,
  server: { middlewareMode: true },
  appType: 'spa'
});

const server = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      writeJson(res, {
        ok: true,
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY)
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/relevance/check') {
      await handleRelevanceCheck(req, res);
      return;
    }

    vite.middlewares(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  } catch (error) {
    vite.ssrFixStacktrace(error);
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }
});

// Bind to 0.0.0.0 on Render to allow external traffic routing, otherwise keep localhost locally
const host = process.env.RENDER ? '0.0.0.0' : '127.0.0.1';
server.listen(port, host, () => {
  console.log(`Relevance Engine demo running at http://${host}:${port}`);
});

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (process.env[key]) continue;

    const rawValue = valueParts.join('=').trim();
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

async function handleRelevanceCheck(req, res) {
  const body = await readJsonBody(req);
  const baseHcp = getHcp(body.hcpId);
  const hcp = mergeHcpOverride(baseHcp, body.hcp);
  const newsletter = body.newsletter
    ? sanitizeNewsletter(body.newsletter, body.newsletterId)
    : getNewsletter(body.newsletterId);
  const preferLive = body.preferLive !== false;

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  send({ type: 'status', status: 'reading', message: 'Reading the complete Newsletter' });
  await pause(160);
  send({ type: 'status', status: 'comparing', message: 'Comparing against the HCP Relevance Profile' });
  await pause(160);

  const forceFallback = process.env.DEMO_FORCE_FALLBACK === '1';

  if (preferLive && process.env.OPENAI_API_KEY && !forceFallback) {
    try {
      const decision = await runLiveRelevanceCheck({ hcp, newsletter, send });
      send({ type: 'decision', decision });
      res.end();
      return;
    } catch (error) {
      console.error('Live Relevance Check unavailable:', error instanceof Error ? error.message : error);
      send({
        type: 'status',
        status: 'generating',
        message: 'Live AI was unavailable. Switching to deterministic fallback.'
      });
      send({
        type: 'delta',
        text: 'Live AI was unavailable for this run. Fallback mode is generating the decision.\n'
      });
    }
  } else {
    send({
      type: 'status',
      status: 'generating',
      message: 'Using deterministic fallback mode'
    });
  }

  const decision = buildFallbackDecision(hcp, newsletter);
  await streamFallbackNarrative(send, decision, hcp, newsletter);
  send({ type: 'decision', decision });
  res.end();
}

async function runLiveRelevanceCheck({ hcp, newsletter, send }) {
  send({ type: 'status', status: 'generating', message: 'Generating a live relevance decision' });

  const structuredPrompt = [
    'Return a JSON decision for this relevance check.',
    'The decision is binary: push or do not push.',
    'The score must be an integer from 0 to 100.',
    'Push only if the Newsletter is clinically actionable or practice-changing for the HCP Relevance Profile.',
    'Mere topic overlap is not enough.',
    'Do not provide clinical advice. Do not mention individual patients.',
    '',
    `HCP: ${hcp.name}, ${hcp.role}`,
    `HCP Relevance Profile: ${hcp.relevanceProfile.summary}`,
    `Traits: ${hcp.relevanceProfile.traits.join('; ')}`,
    '',
    `Newsletter title: ${newsletter.title}`,
    `Newsletter source: ${newsletter.source}`,
    `Newsletter topic: ${newsletter.topic}`,
    `Newsletter source URL: ${newsletter.sourceUrl}`,
    `Newsletter content: ${newsletter.content}`
  ].join('\n');

  const structured = await createStructuredOpenAIDecision(structuredPrompt);
  const matchedClinicalTraits = Array.isArray(structured.matchedClinicalTraits)
    ? structured.matchedClinicalTraits.filter((trait) => typeof trait === 'string').slice(0, 6)
    : [];
  const push = Boolean(structured.push);
  const generatedAt = new Date().toISOString();
  const decision = {
    id: `${hcp.id}:${newsletter.id}:${generatedAt}`,
    hcpId: hcp.id,
    newsletterId: newsletter.id,
    mode: 'live',
    push,
    score: clampNumber(structured.score, 0, 100, push ? 82 : 24),
    rationale: String(structured.rationale ?? ''),
    matchedClinicalTraits,
    summary: push
      ? {
          title: String(structured.summaryTitle || newsletter.title),
          body: String(structured.summaryBody || newsletter.keyTakeaway),
          whyRelevant: String(
            structured.whyRelevant ||
              `Relevant to anonymized clinical traits in ${hcp.name}'s HCP Relevance Profile.`
          ),
          sourceUrl: newsletter.sourceUrl
        }
      : null,
    generatedAt
  };

  send({ type: 'status', status: 'generating', message: 'Streaming the final rationale and push payload' });

  const narrativePrompt = [
    'You are generating visible text for a healthcare newsletter relevance demo.',
    'This is Information Triage only, not clinical advice.',
    'Use only anonymized clinical traits. Do not mention individual patients.',
    'The structured decision below is already final. Do not contradict it.',
    'Write 2 short lines: first the relevance rationale, then the push summary if the outcome is PUSH or the no-push reason if the outcome is DO NOT PUSH.',
    '',
    `Final outcome: ${decision.push ? 'PUSH' : 'DO NOT PUSH'}`,
    `Final score: ${decision.score}/100`,
    `Final rationale: ${decision.rationale}`,
    `Matched traits: ${decision.matchedClinicalTraits.join('; ') || 'none'}`,
    `Push title: ${decision.summary?.title ?? 'none'}`,
    `Push body: ${decision.summary?.body ?? 'none'}`,
    `Why relevant: ${decision.summary?.whyRelevant ?? 'none'}`,
    '',
    `HCP: ${hcp.name}, ${hcp.role}`,
    `HCP Relevance Profile: ${hcp.relevanceProfile.summary}`,
    '',
    `Newsletter title: ${newsletter.title}`,
    `Newsletter topic: ${newsletter.topic}`,
    `Newsletter content: ${newsletter.content}`
  ].join('\n');

  await streamOpenAIText(narrativePrompt, (text) => send({ type: 'delta', text }));

  return decision;
}

async function streamOpenAIText(prompt, onDelta) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      input: prompt,
      stream: true,
      max_output_tokens: 420
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenAI streaming request failed (${response.status})`);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const dataLine = event
        .split('\n')
        .find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      const data = dataLine.slice(5).trim();
      if (!data || data === '[DONE]') continue;

      const parsed = JSON.parse(data);
      if (parsed.type === 'response.output_text.delta' && parsed.delta) {
        onDelta(parsed.delta);
      }
    }
  }
}

async function createStructuredOpenAIDecision(prompt) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'relevance_decision',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: [
              'push',
              'score',
              'rationale',
              'matchedClinicalTraits',
              'summaryTitle',
              'summaryBody',
              'whyRelevant'
            ],
            properties: {
              push: { type: 'boolean' },
              score: { type: 'number' },
              rationale: { type: 'string' },
              matchedClinicalTraits: {
                type: 'array',
                items: { type: 'string' }
              },
              summaryTitle: { type: 'string' },
              summaryBody: { type: 'string' },
              whyRelevant: { type: 'string' }
            }
          }
        }
      },
      max_output_tokens: 650
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI structured request failed (${response.status})`);
  }

  const json = await response.json();
  const text = extractOutputText(json);
  return JSON.parse(text);
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === 'string') {
    return responseJson.output_text;
  }

  const message = responseJson.output?.find((item) => item.type === 'message');
  const outputText = message?.content?.find((item) => item.type === 'output_text');
  if (outputText?.text) return outputText.text;

  throw new Error('OpenAI response did not include output text');
}

async function streamFallbackNarrative(send, decision, hcp, newsletter) {
  const lines = decision.push
    ? [
        `Fallback rationale: ${newsletter.title} maps to ${decision.matchedClinicalTraits.join(', ')} in ${hcp.name}'s HCP Relevance Profile.\n`,
        `Fallback summary: ${decision.summary?.body ?? newsletter.keyTakeaway}\n`
      ]
    : [`Fallback rationale: ${decision.rationale}\n`];

  for (const line of lines) {
    for (const chunk of chunkText(line, 22)) {
      send({ type: 'delta', text: chunk });
      await pause(24);
    }
  }
}

function buildFallbackDecision(hcp, newsletter) {
  const matchedClinicalTraits = getMatchedClinicalTraits(hcp, newsletter);
  const isAdministrative = newsletter.topic.toLowerCase() === 'administration';
  const push = matchedClinicalTraits.length > 0 && !isAdministrative;
  const score = push ? Math.min(96, 78 + matchedClinicalTraits.length * 6) : isAdministrative ? 12 : 28;
  const generatedAt = new Date().toISOString();

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
    summary: push
      ? {
          title: newsletter.title,
          body: newsletter.keyTakeaway,
          whyRelevant: `Relevant to ${hcp.role.toLowerCase()} patients with ${formatTraitList(matchedClinicalTraits)}.`,
          sourceUrl: newsletter.sourceUrl
        }
      : null,
    generatedAt
  };
}

function getMatchedClinicalTraits(hcp, newsletter) {
  const searchableNewsletterText = [
    newsletter.title,
    newsletter.topic,
    newsletter.keyTakeaway,
    newsletter.content,
    ...newsletter.clinicalSignals
  ].join(' ');

  return hcp.relevanceProfile.traits.filter((trait) =>
    hasOverlap(searchableNewsletterText, trait)
  );
}

function hasOverlap(signal, trait) {
  const normalizedSignal = normalize(signal);
  const normalizedTrait = normalize(trait);
  return (
    normalizedSignal === normalizedTrait ||
    normalizedSignal.includes(normalizedTrait) ||
    normalizedTrait.includes(normalizedSignal)
  );
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function formatTraitList(traits) {
  if (traits.length <= 1) return traits[0] ?? 'matched clinical traits';
  return `${traits.slice(0, -1).join(', ')} and ${traits[traits.length - 1]}`;
}

function getHcp(hcpId) {
  const hcp = demoData.hcps.find((candidate) => candidate.id === hcpId);
  if (!hcp) throw new Error(`Unknown HCP: ${hcpId}`);
  return hcp;
}

function getNewsletter(newsletterId) {
  const newsletter = demoData.newsletters.find((candidate) => candidate.id === newsletterId);
  if (!newsletter) throw new Error(`Unknown Newsletter: ${newsletterId}`);
  return newsletter;
}

function mergeHcpOverride(baseHcp, override) {
  if (!override || typeof override !== 'object') return baseHcp;

  const overrideProfile = override.relevanceProfile;
  if (!overrideProfile || typeof overrideProfile !== 'object') return baseHcp;

  return {
    ...baseHcp,
    relevanceProfile: {
      summary: sanitizeText(
        overrideProfile.summary,
        baseHcp.relevanceProfile.summary,
        900
      ),
      traits: sanitizeStringArray(
        overrideProfile.traits,
        baseHcp.relevanceProfile.traits,
        18,
        120
      ),
      domains: sanitizeStringArray(
        overrideProfile.domains,
        baseHcp.relevanceProfile.domains,
        10,
        80
      )
    }
  };
}

function sanitizeNewsletter(newsletter, fallbackId) {
  if (!newsletter || typeof newsletter !== 'object') {
    throw new Error('Custom Newsletter payload is missing');
  }

  const content = sanitizeText(newsletter.content, '', 16000);
  if (!content) {
    throw new Error('Custom Newsletter content is required');
  }

  const title = sanitizeText(newsletter.title, 'Custom Newsletter', 180);

  return {
    id: sanitizeId(newsletter.id, fallbackId || 'newsletter-custom-upload'),
    title,
    source: sanitizeText(newsletter.source, 'Tester upload', 120),
    publishedAt: sanitizeText(newsletter.publishedAt, new Date().toISOString().slice(0, 10), 30),
    readingTime: sanitizeText(newsletter.readingTime, 'Custom', 30),
    topic: sanitizeText(newsletter.topic, 'Custom newsletter', 120),
    sourceUrl: sanitizeText(newsletter.sourceUrl, '#', 500),
    clinicalSignals: sanitizeStringArray(
      newsletter.clinicalSignals,
      [title, sanitizeText(newsletter.topic, '', 120)],
      12,
      120
    ),
    keyTakeaway: sanitizeText(newsletter.keyTakeaway, content.slice(0, 220), 500),
    content
  };
}

function sanitizeId(value, fallback) {
  const text = sanitizeText(value, fallback, 120);
  return text.replace(/[^a-zA-Z0-9:_-]/g, '-').replace(/-+/g, '-');
}

function sanitizeText(value, fallback, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maxLength);
}

function sanitizeStringArray(value, fallback, maxItems, maxLength) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set();
  const sanitized = [];

  for (const item of source) {
    if (typeof item !== 'string') continue;

    const text = item.trim().slice(0, maxLength);
    const key = normalize(text);
    if (!text || seen.has(key)) continue;

    seen.add(key);
    sanitized.push(text);
    if (sanitized.length >= maxItems) break;
  }

  return sanitized.length ? sanitized : fallback.slice(0, maxItems);
}

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
}

function writeJson(res, payload) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function clampNumber(value, min, max, fallback) {
  const rawNumber = Number(value);
  const number = rawNumber > 0 && rawNumber <= 1 ? rawNumber * 100 : rawNumber;
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.max(min, Math.min(max, number)));
}

function pause(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}
