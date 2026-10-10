// seq s18: large amounts. Max digits accepted by DEPOSITO, then sums beyond 2^53-1 (9007199254740991).
import { send } from '../send.ts';
import { v } from '../run.ts';
const seq = 's18';
const msg = async (m: string, hipotesis: string) => {
  const l = await send(seq, { hipotesis, body: { m } });
  console.log(l.id, '|', m.length > 70 ? m.slice(0, 67) + '...' : m, '|', l.status, '|', JSON.stringify(l.response));
  return l;
};
await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
await msg(v('ALTA;Busqueda'), 'setup AC-0001 (búsqueda de dígitos)');
await msg(v('ALTA;Suma'), 'setup AC-0002 (suma > 2^53)');
const ok = (l: Record<string, unknown>) => l.status === 200;
let lo = 6, hi = 20; // 6 dígitos aceptado (474), 20 rechazado (481)
while (hi - lo > 1) {
  const k = (lo + hi) >> 1;
  const l = await msg(v(`DEPOSITO;AC-0001;1${'0'.repeat(k - 1)}`), `máximo de dígitos: monto 10^${k - 1} (${k} dígitos) aceptado?`);
  if (ok(l)) lo = k; else hi = k;
}
console.log(`digits: ${lo} accepted, ${hi} rejected`);
const max = '9'.repeat(lo);
const lMax = await msg(v(`DEPOSITO;AC-0001;${max}`), `límite por dígitos o por magnitud: ${lo} nueves aceptado?`);
await msg(v('DEPOSITO;AC-0001;9007199254740992'), 'magnitud: 2^53 (16 dígitos) aceptado?');
await msg(v('DEPOSITO;AC-0001;9007199254740991'), 'magnitud: 2^53-1 aceptado?');
await msg(v('CONSULTA;AC-0001'), 'saldo AC-0001 tras la búsqueda: suma exacta o con pérdida de precisión?');
// suma > 2^53-1 en AC-0002 con el mayor monto aceptado
const big = ok(lMax) ? max : `1${'0'.repeat(lo - 1)}`;
let total = 0n;
for (let i = 0; i < 12 && total <= 9007199254740991n * 2n; i++) {
  const l = await msg(v(`DEPOSITO;AC-0002;${big}`), `suma > 2^53-1: depósito ${i + 1} de ${big}; acumulado esperado ${total + BigInt(big)}`);
  if (!ok(l)) break;
  total += BigInt(big);
  if (total > 9007199254740991n) {
    const c = await msg(v('CONSULTA;AC-0002'), `CONSULTA con acumulado exacto ${total} (> 2^53-1): precisión, error o string?`);
    console.log('expected exact', total.toString());
    if (i >= 1) break;
  }
}
await msg(v('TRANSFER;AC-0002;AC-0001;1'), 'TRANSFER desde una cuenta con saldo > 2^53: funciona?');
await msg(v('CONSULTA;AC-0002'), 'saldo AC-0002 tras restar 1: ¿se nota el -1 o se pierde por precisión?');
