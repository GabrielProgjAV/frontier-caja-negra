// seq s19: Authorization header variants ({T} = our token; the log stores the template only)
import { send, type Step } from '../send.ts';
import { v } from '../run.ts';
const body = { m: v('PING') };
const variants = ['bearer {T}', 'BEARER {T}', 'Bearer  {T}', 'Bearer {T} ', ' Bearer {T}', 'Basic {T}', '{T}', 'Bearer', 'Bearer ', 'Bearer {T}x', 'Bearer {T},Bearer {T}'];
const steps: Step[] = [
  ...variants.map((h): Step => ({ hipotesis: `Authorization "${h}": aceptado (200) o 401?`, body, authHeader: h })),
  { hipotesis: 'control: Authorization "Bearer {T}" exacto -> 200', body, authHeader: 'Bearer {T}' },
  { hipotesis: 'GET /health con "bearer {T}" minúscula', method: 'GET', path: '/health', authHeader: 'bearer {T}' },
];
await send('s19', { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
for (const s of steps) { const l = await send('s19', s); console.log(l.id, '|', l.x_req, '|', s.method ?? 'POST', s.path ?? '/msg', JSON.stringify(s.authHeader), '|', l.status, '|', JSON.stringify(l.response)); }
