# Decisions

- **2026-10-10 · Zero runtime deps.** Node 24 runs .ts natively (type stripping), `--env-file` replaces dotenv, `fetch` and `node:test` are built in. Dev deps only `typescript` + `@types/node` for `tsc --noEmit`. Why: less to install/deploy, nothing to break.
- **2026-10-10 · Log format.** `experimentos.jsonl` keeps every README field exactly (`id, seq, x_req, hipotesis, request, status, response, conclusion`). For probes that are not an authenticated `POST /msg` (routes, methods, auth, `/__reset`) we add `method`, `path`, `auth` (`ok` | `none` | `wrong`). Why: README requires one line per request to the original, but its format cannot express method/path/auth.
- **2026-10-10 · `request` field.** JSON bodies are logged as the parsed object; malformed bodies as the exact raw string sent; no body as `null`.
- **2026-10-10 · `response` field.** Logged as parsed JSON when the body parses, else the exact text.
- **2026-10-10 · `x_req`.** Number when the header is numeric, else the string (or `null` if absent).
- **2026-10-10 · Rate/budget.** 5 req/s (README allows 10) and 8000/day tracked in `probe/budget.json`. Responses with `X-Frontier-Infra: rate-limit` are retried with backoff and not logged.
- **2026-10-10 · Oracle (0..99 control search).** Only for targeted experiments; first try to deduce the control algorithm offline from known pairs.
- **2026-10-10 · Oracle order.** `probe/oracle.ts` tries hypothesis-predicted candidates first, then 0..99 in order. Same result as a plain sweep, far fewer requests (s5: 17 controls found with ~400 requests).
- **2026-10-10 · Control algorithm.** ISO 7064 MOD 97-10 with letters = alphabet position, other chars ignored (`src/core/checksum.ts`). The test reads all known pairs from `pruebas/ejemplos.jsonl` + `experimentos.jsonl`, so every new experiment re-checks it.
