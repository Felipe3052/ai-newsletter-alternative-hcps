# AI Newsletter Alternative for HCPs

Proof-of-concept web app showing how anonymized patient-panel data can be used to triage healthcare newsletters and push only relevant summaries to healthcare professionals.

## Demo Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and replace the placeholder with an OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-real-key-here
```

Start the local demo:

```bash
npm run dev
```

Open the URL printed by the terminal, usually:

```text
http://127.0.0.1:5173/
```

## API Key Handling

The app reads the OpenAI key from `.env.local`. That file is intentionally ignored by Git so each presenter or reviewer can add their own local key without publishing credentials.

If no key is configured, or if `DEMO_FORCE_FALLBACK=1`, the app still runs in deterministic fallback mode so the prototype remains demoable without live AI generation.

## Useful Commands

```bash
npm run dev
npm run test
npm run build
npm run test:e2e
```
