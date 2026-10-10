import { send } from '../send.ts';
const seq = 's45';
for (const st of [
  { hipotesis: 'v2: reset; ¿headers con versión?', path: '/__reset', headers: true },
  { hipotesis: 'v2: GET /health, ¿cuerpo o headers con versión?', method: 'GET', path: '/health', headers: true },
  { hipotesis: 'v2: PING, ¿headers con versión?', body: { m: 'PING;64' }, headers: true },
]) { const l = await send(seq, st); console.log(l.id, l.status, JSON.stringify(l.response), JSON.stringify(l.resp_headers)); }
