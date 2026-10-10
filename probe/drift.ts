// Canary: replays the 20 morning examples against the ORIGINAL and compares with pruebas/ejemplos.jsonl.
// Any difference means the service changed during the day (SPEC section 6). Every request is logged in experimentos.jsonl.
// Only session 1 runs it (probe turn): node --env-file=.env probe/drift.ts   (exit 1 if anything differs)
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { send } from './send.ts';

const examples = readFileSync('pruebas/ejemplos.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const seq = `drift-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`;
const diffs: string[] = [];

await send(seq, { hipotesis: 'drift: reset, inicio de la canaria', path: '/__reset' });
for (const e of examples) {
  const got = await send(seq, { hipotesis: `drift: ejemplo ${e.n} sigue igual que en la mañana`, body: e.request });
  if (got.status !== e.status || !isDeepStrictEqual(got.response, e.response))
    diffs.push(`  ejemplo ${e.n} ${JSON.stringify(e.request)}\n    mañana: ${e.status} ${JSON.stringify(e.response)}\n    ahora:  ${got.status} ${JSON.stringify(got.response)} (log id ${got.id})`);
}
console.log(diffs.length ? `DRIFT: ${diffs.length}/${examples.length} ejemplos cambiaron\n${diffs.join('\n')}` : `sin cambios: ${examples.length}/${examples.length} ejemplos idénticos a los de la mañana`);
process.exitCode = diffs.length ? 1 : 0;
