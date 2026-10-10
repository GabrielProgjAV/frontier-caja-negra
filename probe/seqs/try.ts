// Quick directed probe: node --env-file=.env probe/seqs/try.ts <seq> "<hipotesis>" <payload> [<payload> ...]
// Each payload gets its correct control appended (prefix "raw:" to send m as is; "RESET" sends POST /__reset).
// Compared with the local model (src/ via probe/local.ts).
import { isDeepStrictEqual } from 'node:util';
import { control } from '../../src/core/checksum.ts';
import { send, type Step } from '../send.ts';
import { local, closeLocal } from '../local.ts';
const [seq, hip, ...msgs] = process.argv.slice(2);
for (const p of msgs) {
  const s: Step = p === 'RESET' ? { hipotesis: `${hip}: reset`, path: '/__reset' }
    : { hipotesis: `${hip}: ${p}`, body: { m: p.startsWith('raw:') ? p.slice(4) : `${p};${control(p)}` } };
  const e = await local(s);
  const l = await send(seq, { ...s, conclude: (x) => (x.status === e.status && isDeepStrictEqual(x.response, e.response) ? 'igual que el modelo' : `DISTINTO del modelo: ${e.status} ${JSON.stringify(e.response)}`) });
  const same = l.status === e.status && isDeepStrictEqual(l.response, e.response);
  console.log(l.id, JSON.stringify(l.request), l.status, JSON.stringify(l.response), same ? '' : `<-- modelo ${e.status} ${JSON.stringify(e.response)}`);
}
closeLocal();
