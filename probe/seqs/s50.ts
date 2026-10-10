// s50 (v2): third change in HALT? Confirmation arguments from s42-2..7 (v1: all E520, 3956-3976), and more, vs the v2 model.
import { isDeepStrictEqual } from 'node:util';
import { control } from '../../src/core/checksum.ts';
import { send, type Step } from '../send.ts';
import { local, closeLocal } from '../local.ts';
const c = (p: string) => `${p};${control(p)}`;
const steps: Step[] = [{ hipotesis: 'v2: reset', path: '/__reset' },
  ...['CONFIRMO', 'SÍ', 'YES', 'CONFIRM', 'OK', 'TRUE', 'CONFIRMAR', 'S', 'Y', '1 '].map((a) => ({ hipotesis: `v2: HALT;${a}: ¿E520 como en v1 o confirma (E599)?`, body: { m: c(`HALT;${a}`) } })),
  { hipotesis: 'v2: PING tras los HALT: ¿sigue vivo?', body: { m: 'PING;64' } }];
let d = 0;
for (const s of steps) {
  const e = await local(s);
  const l = await send('s50', { ...s, conclude: (x) => (x.status === e.status && isDeepStrictEqual(x.response, e.response) ? 'igual que el modelo v2' : `DISTINTO del modelo v2: ${e.status} ${JSON.stringify(e.response)}`) });
  const same = l.status === e.status && isDeepStrictEqual(l.response, e.response); if (!same) d++;
  console.log(l.id, JSON.stringify(l.request), l.status, JSON.stringify(l.response).slice(0, 60), same ? '' : `<-- modelo ${e.status} ${JSON.stringify(e.response)}`);
}
await send('s50', { hipotesis: 'v2: reset final', path: '/__reset' });
closeLocal(); console.log('diferencias', d);
