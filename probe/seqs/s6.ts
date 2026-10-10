// seq s6: predict controls with checksum.ts, then verify against the original
import { send } from '../send.ts';
import { control } from '../../src/core/checksum.ts';
const seq = 's6';
await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
const msgs = ['ALTA;Zoe', 'ALTA;Ximena', 'DEPOSITO;AC-0001;123456', 'TRANSFER;AC-0001;AC-0002;777', 'ANULA;OP-0002',
  'CONSULTA;AC-0001', 'CONSULTA;AC-9999', 'consulta;ac-0002', 'ALTA;Juan Perez', 'SALDOS;XYZ'];
let ok = 0;
for (const p of msgs) {
  const c = control(p);
  const l = await send(seq, {
    hipotesis: `predicción checksum.ts (MOD 97-10, letras=posición, resto ignorado): control de ${p} es ${c}`,
    body: { m: `${p};${c}` },
    conclude: (l) => ((l.response as { error?: string })?.error === 'E202' ? 'predicción rechazada (E202)' : 'predicción aceptada: control válido'),
  });
  const pass = (l.response as { error?: string })?.error !== 'E202';
  ok += +pass;
  console.log(l.id, pass ? 'OK  ' : 'FAIL', `${p};${c}`, l.status, JSON.stringify(l.response));
}
console.log(`score ${ok}/${msgs.length}`);
