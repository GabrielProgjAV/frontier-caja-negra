// seq s14 (continuation, same reset): E101 size threshold by binary search + E101 order
import { send } from '../send.ts';
import { v } from '../run.ts';
const seq = 's14';
const bodyOf = (n: number) => { // JSON body of exactly n bytes with a valid ALTA message
  for (let k = Math.max(0, n - 40); ; k++) { const b = JSON.stringify({ m: v('ALTA;' + 'a'.repeat(k)) }); if (b.length >= n) return b; }
};
let lo = 230, hi = 10027; // lo accepted (id 506 ~ 230 bytes), hi rejected (id 702)
while (hi - lo > 1) {
  const mid = (lo + hi) >> 1, raw = bodyOf(mid), n = Buffer.byteLength(raw);
  const l = await send(seq, { hipotesis: `umbral E101: cuerpo de ${n} bytes aceptado?`, raw });
  const big = l.status === 413;
  console.log(l.id, n, l.status, JSON.stringify(l.response));
  if (big) hi = n; else lo = n;
}
console.log(`threshold: ${lo} bytes accepted, ${hi} bytes rejected`);
const big = 'x'.repeat(hi + 100);
for (const s of [
  { hipotesis: 'orden: cuerpo grande sin token -> 401 o 413?', raw: JSON.stringify({ m: big }), auth: 'none' as const },
  { hipotesis: 'orden: cuerpo grande con JSON inválido -> 413 o 400 E100?', raw: '{"m":' + big },
  { hipotesis: 'orden: cuerpo grande en ruta inexistente -> 404 o 413?', path: '/nope', raw: JSON.stringify({ m: big }) },
  { hipotesis: 'espacio al final del control en comando validado: "14 " -> E201 o aceptado?', body: { m: v('CONSULTA;AC-0001') + ' ' } },
  { hipotesis: 'salto de línea al final del control en comando validado -> E201?', body: { m: v('CONSULTA;AC-0001') + '\n' } },
]) { const l = await send(seq, s); console.log(l.id, l.x_req, s.auth ?? 'ok', s.path ?? '/msg', s.hipotesis.slice(0, 40), '|', l.status, JSON.stringify(l.response)); }
