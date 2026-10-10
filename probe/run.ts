// Runs a sequence of /msg steps after POST /__reset. v(p) appends the valid control computed by checksum.ts.
import { send } from './send.ts';
import { control } from '../src/core/checksum.ts';
export const v = (p: string) => `${p};${control(p)}`;
export async function run(seq: string, steps: [m: string, hipotesis: string][]) {
  await send(seq, { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
  for (const [m, h] of steps) {
    const l = await send(seq, { hipotesis: h, body: { m } });
    console.log(l.id, '|', l.x_req, '|', m.length > 50 ? m.slice(0, 47) + '...' : m, '|', l.status, '|', JSON.stringify(l.response));
  }
}
