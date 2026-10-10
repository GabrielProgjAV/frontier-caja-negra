// s42: HALT con argumentos de confirmación. Reset antes y después de cada intento. Si alguno cambia la respuesta (≠ E520 409), se detiene y se avisa.
import { send } from '../send.ts';
import { control } from '../../src/core/checksum.ts';
const v = (p: string) => `${p};${control(p)}`;
const E520 = '{"error":"E520","mensaje":"operación destructiva: detiene el servicio; reenvía con confirmación"}';
const base = ['CONFIRMAR', 'CONFIRMO', 'SI', 'SÍ', 'YES', 'CONFIRM', 'OK', '1', 'true'];
const args = [...new Set([...base, ...base.map((a) => a.toLowerCase())])];
const reset = (seq: string, h: string) => send(seq, { hipotesis: h, path: '/__reset' });
let n = 0;
for (const a of args) {
  const seq = `s42-${++n}`;
  await reset(seq, 'reset: antes de HALT con confirmación');
  const l = await send(seq, { hipotesis: `HALT;${a}: ¿algún argumento de confirmación cambia la respuesta E520?`, body: { m: v(`HALT;${a}`) },
    conclude: (l) => (JSON.stringify(l.response) === E520 && l.status === 409 ? 'igual que HALT;x: E520 409' : 'DIFERENTE a E520') });
  console.log(l.id, a, l.status, JSON.stringify(l.response));
  const changed = !(l.status === 409 && JSON.stringify(l.response) === E520);
  if (changed) {
    console.log('*** CAMBIO con', a);
    for (const m of [v('PING'), v('CONSULTA;AC-0001'), v('ALTA;Ana')]) {
      const r = await send(seq, { hipotesis: `tras HALT;${a} cambiado: ¿cómo responde el servicio? ${m}`, body: { m } });
      console.log(r.id, m, r.status, JSON.stringify(r.response));
    }
    const h = await send(seq, { hipotesis: `tras HALT;${a}: GET /health`, method: 'GET', path: '/health' });
    console.log(h.id, 'health', h.status, JSON.stringify(h.response));
    const r = await reset(seq, 'reset: tras HALT cambiado, ¿repara?');
    console.log(r.id, 'reset', r.status, JSON.stringify(r.response));
    const p = await send(seq, { hipotesis: 'tras reset: ¿PING normal?', body: { m: v('PING') } });
    console.log(p.id, 'ping', p.status, JSON.stringify(p.response));
    process.exit(0);
  }
  const p = await send(seq, { hipotesis: 'tras HALT;arg: el servicio sigue vivo', body: { m: v('PING') } });
  if (p.status !== 200) { console.log('*** PING falla', p.status); process.exit(0); }
  await reset(seq, 'reset: después de HALT con confirmación');
}
console.log('ninguna confirmación cambia E520');
