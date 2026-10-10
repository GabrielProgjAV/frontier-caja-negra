// s44: a partir de s43 (CMD-0b: mayúsculas solo ASCII, ids 4641-4646):
//  a) unidades de la distancia de la sugerencia: code points, UTF-16 o bytes UTF-8
//  b) decodificación del UTF-8 inválido en nombres: U+FFFD (Node/WHATWG) o Latin-1, visto con TRA-7 (mismo titular = sin E506)
// CLI: node --env-file=.env probe/seqs/s44.ts [--dry]
import { isDeepStrictEqual } from 'node:util';
import { control } from '../../src/core/checksum.ts';
import { local, closeLocal } from '../local.ts';
import type { Step } from '../send.ts';

const DRY = process.argv.includes('--dry');
const c = (p: string) => `${p};${control(p)}`;
const m = (hip: string, msg: string): Step => ({ hipotesis: hip, body: { m: msg } });
const reset = (hip: string): Step => ({ hipotesis: hip, path: '/__reset' });
// ALTA with raw name bytes; the control ignores non-ASCII, so it is control('ALTA;')
const altaBytes = (hip: string, name: number[]): Step =>
  ({ hipotesis: hip, rawB64: Buffer.concat([Buffer.from('{"m":"ALTA;'), Buffer.from(name), Buffer.from(`;${control('ALTA;')}"}`)]).toString('base64') });

const SEQS: [string, Step[]][] = [
  ['s44a', [
    reset('distancia: reset'),
    m('distancia: "PINGññ" -> sugerencia PING si cuenta code points o UTF-16 (2); nada si cuenta bytes (4)', c('PINGññ')),
    m('distancia: "PING😀😀" -> sugerencia PING si cuenta code points (2); nada si UTF-16 (4) o bytes (8)', c('PING😀😀')),
    m('distancia: "PING😀" -> PING con code points (1) o UTF-16 (2); nada con bytes (4)', c('PING😀')),
    m('mayúsculas: "pınG" con control -> E301 sugerencia PING (ı no pasa a I, repetición de 4642)', c('pınG')),
    m('mayúsculas: "ſing" (s larga) -> E301 sugerencia PING (ſ a distancia 1 de P)', c('ſing')),
    m('mayúsculas: "alta" ASCII minúsculas sigue funcionando -> AC-0001', c('alta;x')),
  ]],
  ['s44b', [
    reset('utf8: reset'),
    altaBytes('utf8: ALTA nombre byte FF -> AC-0001', [0xff]),
    altaBytes('utf8: ALTA nombre byte FE -> AC-0002', [0xfe]),
    m('utf8: depósito 900000 en AC-0001', c('DEPOSITO;AC-0001;900000')),
    m('utf8: TRANSFER 150000 FF -> FE: OK si ambos se decodifican como U+FFFD (mismo titular), E506 si son distintos (Latin-1/bytes)', c('TRANSFER;AC-0001;AC-0002;150000')),
    m('utf8: ALTA nombre U+FFFD literal válido -> AC-0003', c('ALTA;\uFFFD')),
    m('utf8: TRANSFER 150000 FF -> U+FFFD literal: OK si FF se reemplaza por U+FFFD', c('TRANSFER;AC-0001;AC-0003;150000')),
    altaBytes('utf8: ALTA nombre bytes FF FE -> AC-0004', [0xff, 0xfe]),
    m('utf8: ALTA nombre U+FFFD U+FFFD literal -> AC-0005', c('ALTA;\uFFFD\uFFFD')),
    m('utf8: depósito 900000 en AC-0004', c('DEPOSITO;AC-0004;900000')),
    m('utf8: TRANSFER 150000 FFFE -> doble U+FFFD: OK si cada byte inválido es un U+FFFD', c('TRANSFER;AC-0004;AC-0005;150000')),
    altaBytes('utf8: ALTA nombre byte F1 (ñ en Latin-1) -> AC-0006', [0xf1]),
    m('utf8: ALTA nombre ñ válido -> AC-0007', c('ALTA;ñ')),
    m('utf8: depósito 900000 en AC-0006', c('DEPOSITO;AC-0006;900000')),
    m('utf8: TRANSFER 150000 F1 -> ñ: E506 si F1 es U+FFFD, OK si se decodifica Latin-1', c('TRANSFER;AC-0006;AC-0007;150000')),
    altaBytes('utf8: ALTA nombre overlong C0 AF -> AC-0008', [0xc0, 0xaf]),
    m('utf8: TRANSFER 150000 AC-0004 (FFFE) -> AC-0008 (C0AF): OK si C0 AF también da dos U+FFFD', c('TRANSFER;AC-0004;AC-0008;150000')),
  ]],
];

const send = DRY ? null : (await import('../send.ts')).send;
let diffs = 0;
for (const [seq, steps] of SEQS) {
  for (const s of steps) {
    const exp = await local(s);
    const expTxt = `${exp.status} ${JSON.stringify(exp.response)}`;
    if (!send) { console.log(`${seq} | ${s.hipotesis} | local ${expTxt}`); continue; }
    const g = await send(seq, {
      ...s, hipotesis: `${s.hipotesis} [handle() espera ${expTxt}]`,
      conclude: (l) => (l.status === exp.status && isDeepStrictEqual(l.response, exp.response) ? 'igual que handle()' : `DISTINTO de handle() (${expTxt})`),
    });
    const same = g.status === exp.status && isDeepStrictEqual(g.response, exp.response);
    if (!same) diffs++;
    console.log(`${g.id} ${seq} | ${JSON.stringify(g.request).slice(0, 60)} | ${g.status} ${JSON.stringify(g.response)}${same ? '' : `  <-- handle(): ${expTxt}`}`);
  }
}
closeLocal();
console.log(`diferencias con handle(): ${diffs}`);
