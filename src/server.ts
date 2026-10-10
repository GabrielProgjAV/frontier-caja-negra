// node:http adapter. One process, state in memory. Run: node --env-file=.env src/server.ts (TEAM_TOKEN, PORT).
// Route check before auth (33, 34); auth before body parsing (35).
import { createServer, type ServerResponse } from 'node:http';
import { handle } from './core/handle.ts';
import { initialState } from './core/state.ts';

let state = initialState();
const reply = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

export const server = createServer(async (req, res) => {
  const route = `${req.method} ${new URL(req.url ?? '/', 'http://x').pathname}`;
  if (!['GET /health', 'POST /__reset', 'POST /msg'].includes(route)) return reply(res, 404, { error: 'E404', mensaje: 'ruta desconocida' });
  if (route === 'GET /health') return reply(res, 200, { ok: true }); // supuesto: no auth needed (only probed with auth, 23)
  const token = process.env.TEAM_TOKEN;
  if (!token || req.headers.authorization !== `Bearer ${token}`) return reply(res, 401, { error: 'E001', mensaje: 'no autorizado' });
  if (route === 'POST /__reset') { state = initialState(); return reply(res, 200, { ok: true }); }
  req.setEncoding('utf8');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const r = handle(state, raw);
  state = r.state;
  reply(res, r.status, r.body);
});

if (import.meta.main) {
  if (!process.env.TEAM_TOKEN) throw new Error('TEAM_TOKEN missing');
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`listening on ${port}`));
}
