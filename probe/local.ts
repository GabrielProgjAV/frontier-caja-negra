// In-process replacement (src/server.ts -> handle()) to predict what our build answers for a probe Step.
// Never touches the original. Used by canary.ts and the sX probe scripts to log the expectation next to the real answer.
import type { AddressInfo } from 'node:net';
import type { Step } from './send.ts';

const LOCAL_TOKEN = 'canary-local-token';
process.env.TEAM_TOKEN = LOCAL_TOKEN; // the local replacement accepts only this token (the team token is never used here)
const { server } = await import('../src/server.ts');
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const LOCAL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

export async function local(s: Step) {
  const headers: Record<string, string> = {};
  const auth = s.auth ?? 'ok';
  if (auth === 'ok') headers.authorization = `Bearer ${LOCAL_TOKEN}`;
  if (auth === 'wrong') headers.authorization = 'Bearer wrong-token';
  if (s.authHeader !== undefined) headers.authorization = s.authHeader.replace('{T}', LOCAL_TOKEN);
  const payload = s.rawB64 !== undefined ? Buffer.from(s.rawB64, 'base64') : s.raw ?? (s.body === undefined ? undefined : JSON.stringify(s.body));
  if (payload !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(LOCAL + (s.path ?? '/msg'), { method: s.method ?? 'POST', headers, body: payload });
  const text = await res.text();
  let response: unknown; try { response = JSON.parse(text); } catch { response = text; }
  return { status: res.status, response };
}
export const closeLocal = () => server.close();
