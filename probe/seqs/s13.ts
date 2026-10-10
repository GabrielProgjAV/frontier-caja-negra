// seq s13: method / route matrix
import { send, type Step } from '../send.ts';
import { v } from '../run.ts';
const ping = { m: v('PING') };
const steps: Step[] = [
  ...['GET', 'PUT', 'DELETE', 'PATCH'].map((method): Step => ({ hipotesis: `${method} /msg: 404 E404 como GET /msg (26)?`, method, path: '/msg', ...(method === 'GET' ? {} : { body: ping }) })),
  ...['GET', 'PUT', 'DELETE'].map((method): Step => ({ hipotesis: `${method} /__reset: 404 o reset?`, method, path: '/__reset' })),
  ...['POST', 'PUT', 'DELETE'].map((method): Step => ({ hipotesis: `${method} /health: 404 o 200?`, method, path: '/health' })),
  { hipotesis: 'GET /msg sin token: 404 (ruta) o 401?', method: 'GET', path: '/msg', auth: 'none' },
  { hipotesis: 'barra final /msg/: misma ruta o 404?', path: '/msg/', body: ping },
  { hipotesis: 'barra final /health/', method: 'GET', path: '/health/' },
  { hipotesis: 'query string /msg?x=1: se ignora?', path: '/msg?x=1', body: ping },
  { hipotesis: 'query string /health?x=1', method: 'GET', path: '/health?x=1' },
  { hipotesis: 'mayúsculas /MSG: rutas distinguen mayúsculas?', path: '/MSG', body: ping },
  { hipotesis: 'mayúsculas /HEALTH', method: 'GET', path: '/HEALTH' },
  { hipotesis: 'doble barra //msg', path: '//msg', body: ping },
  { hipotesis: 'HEAD /health', method: 'HEAD', path: '/health' },
  { hipotesis: 'control: POST /msg normal sigue respondiendo', body: ping },
];
await send('s13', { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
for (const s of steps) {
  const l = await send('s13', s);
  console.log(l.id, '|', l.x_req, '|', s.method ?? 'POST', s.path ?? '/msg', s.auth ?? 'ok', '|', l.status, '|', JSON.stringify(l.response));
}
