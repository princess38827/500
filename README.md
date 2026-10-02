# Cluster — 500 agents

A simple chat with exactly 500 role definitions: one router and 499 specialists. The roster includes the original twelve generalists, seven cross-domain roles, and 480 specialists spanning 40 subject areas and twelve perspectives per area. These are prompted roles using the same configured Meta model, not 500 independently trained models. The searchable directory includes all 500 agents.

The router selects up to four specialists, runs them concurrently, then synthesizes one reply. The browser displays real pipeline progress using a streamed NDJSON response; answer text arrives after synthesis. Specialists have no browsing or external tools.

## Run

Requires Node 20.19+ (Node 24 recommended).

```sh
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000. Demo mode works immediately without credentials and explicitly labels its illustrative responses.

## Connect a model

Set `DEMO_MODE=false`, `META_API_KEY`, `META_API_BASE_URL` (base URL before `/chat/completions`) and `MUSE_MODEL_ID` in `.env`. The client expects an HTTPS, OpenAI-compatible chat-completions endpoint that supports `response_format: {type: "json_object"}`. Confirm Meta availability, endpoint, model identifier, and request schema in your provider documentation. The supplied brief's `muse-spark-1.2` identifier and Meta endpoint have not been independently verified; live Meta integration has not been tested. No model identifier or endpoint is guessed by this implementation.

Credentials remain on the server. Never commit `.env`. Each live turn makes one routing call, zero to four specialist calls, and one synthesis call. Provider charges may apply. Specialist failures are disclosed to the synthesis stage; routing/provider failures appear in chat.

## Deploy

Push the folder to a private or public repository (excluding `.env`). Create a Node web service on your chosen host, build with `npm ci`, start with `npm start`, and set the environment variables above. Free hosting availability depends on the host's current pricing. A Render blueprint is included; select a plan supported by your account. Set `TRUST_PROXY=true` only when exactly one trusted reverse proxy sits in front of the app. Hostnames and ports come from the host; `PORT` defaults to 3000.

The in-memory limiter permits 20 messages/minute/IP and resets on process restart. It is per instance and is not account authentication. Before broad public use, add authentication and shared quota enforcement. This source package does not deploy itself.

## Files

- `server.js`: Express, input validation, rate limiting, static hosting, streamed progress.
- `orchestrator.js`: allowlisted selection, concurrent specialists, synthesis.
- `agents.js`: roles and prompts.
- `museClient.js`: server-side provider calls and timeouts.
- `public/`: responsive, accessible HTML/CSS/JS interface, no build step.
- `test/`: pipeline concurrency, failure handling and routing tests.

Run `npm test` to check the pipeline. Chat history is kept only in browser memory and is cleared by New chat or reload. User and assistant messages are sent to the configured provider in live mode. No chat database is included.

## Vercel

Deploy this folder using the Vercel CLI (`npx vercel`, then `npx vercel --prod`) or import a Git repository containing this folder. Use framework preset Other with no build command. The public directory serves the UI and api/index.js serves the backend. Demo mode is the default. Configure Meta variables in the Vercel project settings to enable live replies. Live requests require function duration limits sufficient for routing, specialists and synthesis; provider calls can each take up to 45 seconds. The in-memory rate limiter is per function instance, not a shared quota.

The routing prompt contains the compact full specialist catalog. Only up to four selected specialists are called; increasing the catalog increases routing input tokens but does not invoke all 500 agents. Demo mode uses illustrative fixed routing and never calls a model.
