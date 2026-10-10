# Black Box Replacement — Frontier challenge 2

## Read first
PLAN.md (owners, probe lock; update status + time after each task, commit, push), README.md (challenge rules
and REQUIRED formats) and pruebas/ejemplos.jsonl.

## Hard rules
- The replacement (src/) must NEVER call the original. Probing code lives only in probe/.
- No third-party reverse-engineering tools. Own scripts/fuzzers only.
- Secrets from .env only: ORIGINAL_URL, ORIGINAL_TOKEN, TEAM_TOKEN. Never commit .env.
- Rate limit our probes to max 5 req/s. Daily budget 8000 req: track usage in probe/budget.json.
- If a response has header X-Frontier-Infra: rate-limit, it is infra, not the service: retry later, do not log it as behavior.

## Evaluation facts
- Only HTTP status + body are compared. JSON key order does not matter; strings must be identical.
  Non-JSON bodies are compared char by char.
- Each test starts with POST /__reset. 5 seconds per step.
- The service can change during the day. We are graded against the 20:00 version.

## Experiment log (MANDATORY format) -> experimentos.jsonl
One line per request sent to the original:
{"id":N,"seq":"sX","x_req":<X-Req response header>,"hipotesis":"...","request":{...},"status":N,"response":{...},"conclusion":"..."}
- id unique and incremental. Every seq starts after POST /__reset.

## Architecture
- src/core/handle.ts: PURE function handle(state, rawBody) -> { state, status, body }. No I/O.
- src/core/checksum.ts: control digit algorithm (isolated, unit-tested against all known pairs).
- src/core/state.ts: initialState(). Accounts, operations, counters.
- src/server.ts: node:http adapter. Auth check, GET /health, POST /__reset, POST /msg, unknown routes —
  all replicating the original exactly.
- probe/send.ts: send one request to the original, append it to experimentos.jsonl.
- probe/oracle.ts: find the valid control for a message by trying 0..99 (stop at first non-E202).
- probe/diff.ts: replay recorded sequences against our replacement (local) and report % match per command.
- probe/drift.ts: re-run a canary sequence against the original to detect service changes.

## Method
Hypothesis -> experiment -> log -> SPEC.md (with evidence ids and confidence) -> implement -> diff -> commit.
SPEC.md must follow the 7 sections and table format required by README.md.

## Style
Small steps. Show commands and outputs as evidence. Propose before coding new areas; wait for my OK.
Log key decisions with reasons in DECISIONS.md.




----
- Always read PLAN.md and HANDOFF.md first. Update PLAN.md after each task.