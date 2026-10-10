// s43: cerrar supuestos B3 (comando vacío), INT-4b (controles 0, 1, 99), CMD-0b (comando con ñ, ß, ı, ſ),
// ENT-14 (cuerpo > 8192 bytes con multibyte) y B9 (m no string, m duplicada, UTF-8 inválido).
// Cada paso se manda al original y al reemplazo local (handle()); la hipótesis lleva lo que espera handle().
// CLI: node --env-file=.env probe/seqs/s43.ts [--dry]
import { isDeepStrictEqual } from 'node:util';
import { control } from '../../src/core/checksum.ts';
import { local, closeLocal } from '../local.ts';
import type { Step } from '../send.ts';

const DRY = process.argv.includes('--dry');
const c = (p: string) => `${p};${control(p)}`;
const m = (hip: string, msg: string): Step => ({ hipotesis: hip, body: { m: msg } });
const reset = (hip: string): Step => ({ hipotesis: hip, path: '/__reset' });
const b64 = (...parts: (string | number[])[]) => Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p) : Buffer.from(p)))).toString('base64');
const big = (p: string) => JSON.stringify({ m: 'PING;64', p });

const SEQS: [string, Step[]][] = [
  ['s43a', [
    reset('B3: reset'),
    m('B3: comando vacío ";64" -> E104 (segmento vacío) o E301/E202?', ';64'),
    m('B3: ";ALTA;x;<control de ALTA;x>" (comando vacío delante) -> E104?', `;ALTA;x;${control('ALTA;x')}`),
    m('B3: ";" solo -> E104?', ';'),
    m('B3: ";PING;64" -> E104 o pong?', ';PING;64'),
    m('B3: ";ALTA;x;<control incorrecto>" -> E104 gana a E202?', `;ALTA;x;${control('ALTA;x') === 50 ? 51 : 50}`),
    m('B3: CONSULTA AC-0001 -> E401 si ";ALTA;x" no creó cuenta', c('CONSULTA;AC-0001')),
  ]],
  ['s43b', [
    reset('INT-4b: reset'),
    ...['0', '1', '99', '00'].map((k) => m(`INT-4b: ALTA;Ana con control ${k} -> E202 (la fórmula da 2..98)`, `ALTA;Ana;${k}`)),
    ...['0', '1', '99'].map((k) => m(`INT-4b: CONSULTA;AC-0001 con control ${k} -> E202`, `CONSULTA;AC-0001;${k}`)),
    m('INT-4b: DEPOSITO;AC-0001;5 con control 99 -> E202', 'DEPOSITO;AC-0001;5;99'),
    m('INT-4b: ALTA;Ana con su control -> AC-0001 (ninguno de los anteriores creó cuenta)', c('ALTA;Ana')),
  ]],
  ['s43c', [
    reset('CMD-0b: reset'),
    m('CMD-0b: "pıng" (i sin punto U+0131; JS upper -> PING) -> pong si normaliza Unicode, E202/E301 si solo ASCII', 'pıng;64'),
    m('CMD-0b: "pıng" con el control calculado ignorando ı -> pong (Unicode) o E301 sugerencia PING (solo ASCII)', c('pıng')),
    m('CMD-0b: "haßß" (JS upper -> HASSSS, distancia 4 a HALT: sin sugerencia; sin expandir ß: HALT a distancia 2)', c('haßß')),
    m('CMD-0b: "ñing" -> E301 sugerencia PING (Ñ a distancia 1)', c('ñing')),
    m('CMD-0b: "CONſULTA;AC-0001" (s larga U+017F; JS upper -> CONSULTA) -> E401 (Unicode) o E301 sugerencia CONSULTA', c('CONſULTA;AC-0001')),
    m('CMD-0b: "PİNG" (I con punto U+0130; JS upper la deja) -> E301 sugerencia PING', c('PİNG')),
  ]],
  ['s43d', [
    reset('ENT-14: reset'),
    { hipotesis: 'ENT-14: 8192 bytes con ñ (4107 caracteres) -> pong', raw: big('ñ'.repeat(4085)) },
    { hipotesis: 'ENT-14: 8193 bytes con ñ (4108 caracteres) -> E101 si cuenta bytes, pong si cuenta caracteres', raw: big('x' + 'ñ'.repeat(4085)) },
    { hipotesis: 'ENT-14: 8193 bytes con emoji de 4 bytes (2067 code points) -> E101 si cuenta bytes', raw: big('xxx' + '😀'.repeat(2042)) },
    { hipotesis: 'ENT-14: 8193 bytes con € de 3 bytes -> E101 si cuenta bytes', raw: big('xx' + '€'.repeat(2723)) },
  ]],
  ['s43e', [
    reset('B9: reset'),
    { hipotesis: 'B9: m booleana -> E102', body: { m: true } },
    { hipotesis: 'B9: m objeto -> E102', body: { m: {} } },
    { hipotesis: 'B9: m 0 -> E102', body: { m: 0 } },
    { hipotesis: 'B9: m cadena vacía -> E103 (no tiene ;)', body: { m: '' } },
    { hipotesis: 'B9: m duplicada, la última numérica -> E102 si gana la última', raw: '{"m":"PING;64","m":5}' },
    { hipotesis: 'B9: m duplicada, la última válida -> pong si gana la última', raw: '{"m":5,"m":"PING;64"}' },
    { hipotesis: 'B9: UTF-8 inválido (byte FF suelto tras el JSON) -> E100?', rawB64: b64('{"m":"PING;64"}', [0xff]) },
    { hipotesis: 'B9: UTF-8 inválido (FF) dentro del nombre de ALTA, control de "ALTA;" -> AC-0001 con nombre U+FFFD (Node) o E100?', rawB64: b64(`{"m":"ALTA;`, [0xff], `;${control('ALTA;')}"}`) },
    { hipotesis: 'B9: Latin-1 F1 (ñ mal codificada) en el nombre -> se trata como U+FFFD?', rawB64: b64(`{"m":"ALTA;I`, [0xf1], `igo;${control('ALTA;Iigo')}"}`) },
    { hipotesis: 'B9: byte de continuación 80 suelto en PING -> pong?', rawB64: b64(`{"m":"PING;64`, [0x80], `"}`) },
    { hipotesis: 'B9: secuencia overlong C0 AF en el nombre -> AC-000N o E100?', rawB64: b64(`{"m":"ALTA;`, [0xc0, 0xaf], `;${control('ALTA;')}"}`) },
    m('B9: CONSULTA AC-0001 -> existe si el FF en el nombre creó cuenta', c('CONSULTA;AC-0001')),
    m('B9: CONSULTA AC-0003 -> existe si el overlong creó cuenta', c('CONSULTA;AC-0003')),
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
    console.log(`${g.id} ${seq} | ${JSON.stringify(g.request).slice(0, 70)} | ${g.status} ${JSON.stringify(g.response)}${same ? '' : `  <-- handle(): ${expTxt}`}`);
  }
}
closeLocal();
console.log(`diferencias con handle(): ${diffs}`);
