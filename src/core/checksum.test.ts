// Checks control() against every known pair: pruebas/ejemplos.jsonl + experimentos.jsonl.
// Valid pair = any answer that passed the control check; invalid = E202. PING skips the check, so it is excluded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { control } from './checksum.ts';

const lines = ['pruebas/ejemplos.jsonl', 'experimentos.jsonl']
  .flatMap((f) => readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)))
  .filter((l) => typeof l.request?.m === 'string' && l.request.m.includes(';') && !/^ping;/i.test(l.request.m));
const split = (m: string) => [m.slice(0, m.lastIndexOf(';')), m.slice(m.lastIndexOf(';') + 1)];
const beforeControl = ['E100', 'E102', 'E103', 'E104', 'E201'];

test('valid pairs match', () => {
  const valid = lines.filter((l) => l.response?.error !== 'E202' && !beforeControl.includes(l.response?.error));
  assert.ok(valid.length >= 30);
  for (const l of valid) { const [p, c] = split(l.request.m); assert.equal(String(control(p)), c, l.request.m); }
});

test('E202 pairs do not match', () => {
  const invalid = lines.filter((l) => l.response?.error === 'E202');
  assert.ok(invalid.length >= 5);
  for (const l of invalid) { const [p, c] = split(l.request.m); assert.notEqual(String(control(p)), c, l.request.m); }
});
