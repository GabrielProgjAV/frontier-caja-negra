// Finds the valid control for a message by trying candidates until the answer is not E202.
// CLI: node --env-file=.env probe/oracle.ts <seq> <msg>[=hint,hint] ...   (does POST /__reset first)
// Hints are tried first, then 0..99 in order; the result is the same as a plain 0..99 sweep.
import { send } from './send.ts';

export async function oracle(seq: string, msg: string, hints: number[] = []) {
  const order = [...new Set([...hints, ...Array.from({ length: 100 }, (_, i) => i)])];
  for (const c of order) {
    const l = await send(seq, {
      hipotesis: `oracle: buscar control válido para ${msg} (candidato ${c})`,
      body: { m: `${msg};${c}` },
      conclude: (l) => ((l.response as { error?: string })?.error === 'E202' ? `${c} no es válido` : `${c} es el control válido para ${msg}`),
    });
    if ((l.response as { error?: string })?.error !== 'E202') return { msg, control: c, id: l.id as number, tries: order.indexOf(c) + 1 };
  }
  return { msg, control: null, id: null, tries: order.length };
}

if (import.meta.main) {
  const [seq, ...msgs] = process.argv.slice(2);
  if (!seq || !msgs.length) throw new Error('usage: probe/oracle.ts <seq> <msg>[=h1,h2] ...');
  await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
  for (const a of msgs) {
    const [msg, h] = a.split('=');
    console.log(JSON.stringify(await oracle(seq, msg, h ? h.split(',').map(Number) : [])));
  }
}
