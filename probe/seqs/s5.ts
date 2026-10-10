// seq s5: one-character-at-a-time oracle experiments
import { send } from '../send.ts';
import { oracle } from '../oracle.ts';
const seq = 's5';
await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
const pred = (x: number) => (((14 - 3 * (x - 1)) % 97) + 97) % 97; // hypothesis: -3 per unit in last char
for (let x = 0; x <= 9; x++) console.log(JSON.stringify(await oracle(seq, `CONSULTA;AC-000${x}`, [pred(x)])));
for (const m of ['CONSULTA;AC-0011', 'CONSULTA;AC-0021', 'CONSULTA;AC-0091', 'consulta;AC-0001', 'CONSULTA;A', 'CONSULTA;AB', 'CONSULTA;ABC'])
  console.log(JSON.stringify(await oracle(seq, m, m === 'consulta;AC-0001' ? [14] : [])));
for (const c of [0, 1]) {
  const l = await send(seq, { hipotesis: `PING se valida? PING;${c}`, body: { m: `PING;${c}` } });
  console.log(l.id, `PING;${c}`, l.status, JSON.stringify(l.response));
}
