// seq s14: body edge cases
import { send, type Step } from '../send.ts';
import { v } from '../run.ts';
const P = v('PING');
const long = (n: number) => v('ALTA;' + 'a'.repeat(n));
const steps: Step[] = [
  { hipotesis: 'campos extra además de m: se ignoran?', body: { m: P, x: 1, extra: 'y' } },
  { hipotesis: 'espacio al final de m: control "64 " -> E201?', body: { m: P + ' ' } },
  { hipotesis: 'salto de línea al final de m -> E201?', body: { m: P + '\n' } },
  { hipotesis: 'salto de línea al inicio de m -> E301 con sugerencia?', body: { m: '\n' + P } },
  { hipotesis: '";" extra al final (PING) -> E104 segmento vacío?', body: { m: P + ';' } },
  { hipotesis: '";" extra al final (CONSULTA) -> E104?', body: { m: v('CONSULTA;AC-0001') + ';' } },
  { hipotesis: 'PING con control mal formado: PING valida formato (E201) aunque no valor?', body: { m: 'PING;5X' } },
  { hipotesis: 'control con signo +: E201 o E202?', body: { m: 'CONSULTA;AC-0001;+14' } },
  { hipotesis: 'm de 10 005 caracteres (ALTA válido): aceptado?', body: { m: long(10000) } },
  { hipotesis: 'm de 100 005 caracteres (ALTA válido): límite de tamaño?', body: { m: long(100000) } },
  { hipotesis: 'Content-Type text/plain con JSON válido: se parsea igual?', body: { m: P }, contentType: 'text/plain' },
  { hipotesis: 'sin Content-Type con JSON válido: se parsea igual?', body: { m: P }, contentType: null },
  { hipotesis: 'cuerpo vacío con Content-Type JSON -> E100?', raw: '' },
  { hipotesis: 'POST /msg sin cuerpo -> E100?' },
  { hipotesis: 'cuerpo JSON array [] -> E102 o E100?', raw: '[]' },
  { hipotesis: 'cuerpo JSON null -> E102 o E100?', raw: 'null' },
  { hipotesis: 'cuerpo JSON string -> E102?', raw: JSON.stringify(P) },
  { hipotesis: 'clave m duplicada: gana la última (JSON.parse)?', raw: `{"m":"XXXX;1","m":${JSON.stringify(P)}}` },
  { hipotesis: 'BOM antes del JSON -> E100?', raw: '﻿' + JSON.stringify({ m: P }) },
  { hipotesis: 'JSON con espacios y saltos de línea alrededor -> válido?', raw: `\n  ${JSON.stringify({ m: P })}  \n` },
];
await send('s14', { hipotesis: 'reset: inicio de secuencia', path: '/__reset' });
for (const s of steps) {
  const l = await send('s14', s);
  const req = JSON.stringify(s.raw ?? s.body ?? null);
  console.log(l.id, '|', l.x_req, '|', req.length > 50 ? req.slice(0, 47) + '...' : req, s.contentType !== undefined ? `ct=${s.contentType}` : '', '|', l.status, '|', JSON.stringify(l.response).slice(0, 140));
}
