// seq s40 (burst ~9 req/s) and s41 (2 req/s): same 10 steps, compare responses. Any difference = rate/time dependence.
import { isDeepStrictEqual } from 'node:util';
import { send, setGap } from '../send.ts';
import { v } from '../run.ts';
const steps = ['ALTA;A', 'ALTA;B', 'DEPOSITO;AC-0001;1000', 'DEPOSITO;AC-0001;1000', 'TRANSFER;AC-0001;AC-0002;100', 'TRANSFER;AC-0001;AC-0002;100', 'CONSULTA;AC-0001', 'CONSULTA;AC-0002', 'ANULA;OP-0003', 'CONSULTA;AC-0001'].map(v);
const out: Record<string, { status: number; response: unknown; id: number }[]> = {};
for (const [seq, gap, label] of [['s40', 111, '~9 req/s'], ['s41', 500, '2 req/s']] as const) {
  setGap(gap);
  await send(seq, { hipotesis: `reset: inicio de ráfaga ${label}`, path: '/__reset' });
  const t0 = Date.now();
  out[seq] = [];
  for (const [i, m] of steps.entries()) {
    const l = await send(seq, { hipotesis: `ráfaga ${label}, paso ${i + 1} (pasos 3-4 y 5-6 son duplicados exactos): ¿detección de duplicados o dependencia del tiempo?`, body: { m } });
    out[seq].push({ status: l.status as number, response: l.response, id: l.id as number });
  }
  const secs = (Date.now() - t0) / 1000;
  console.log(`${seq} (${label}, intervalo ${gap} ms): ${steps.length} requests en ${secs.toFixed(2)} s = ${(steps.length / secs).toFixed(1)} req/s reales`);
}
setGap(200);
let diffs = 0;
steps.forEach((m, i) => {
  const a = out.s40[i], b = out.s41[i], same = a.status === b.status && isDeepStrictEqual(a.response, b.response);
  if (!same) diffs++;
  console.log(`${same ? 'igual' : 'DISTINTO'} ${m} | s40 #${a.id} ${a.status} ${JSON.stringify(a.response)} | s41 #${b.id} ${b.status} ${JSON.stringify(b.response)}`);
});
console.log(`diferencias: ${diffs}`);
