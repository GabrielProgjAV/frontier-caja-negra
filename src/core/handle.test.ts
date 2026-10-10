// Replays pruebas/ejemplos.jsonl through the pure core: must be 20/20.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handle } from './handle.ts';
import { initialState } from './state.ts';
import { control } from './checksum.ts';

test('ejemplos 20/20', () => {
  let state = initialState();
  for (const l of readFileSync('pruebas/ejemplos.jsonl', 'utf8').trim().split('\n').map((x) => JSON.parse(x))) {
    const r = handle(state, JSON.stringify(l.request));
    state = r.state;
    assert.deepEqual([r.status, r.body], [l.status, l.response], l.request.m);
  }
});

// B1: Object.prototype keys are not accounts or operations.
test('prototype keys -> E401/E402, state untouched', () => {
  const send = (state: ReturnType<typeof initialState>, p: string) => handle(state, JSON.stringify({ m: `${p};${control(p)}` }));
  let state = initialState();
  for (const p of ['ALTA;Ana', 'DEPOSITO;AC-0001;50']) state = send(state, p).state;
  const E401 = { error: 'E401', mensaje: 'cuenta inexistente' }, E402 = { error: 'E402', mensaje: 'operación inexistente' };
  for (const k of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
    for (const p of [`CONSULTA;${k}`, `DEPOSITO;${k};5`, `TRANSFER;AC-0001;${k};5`, `TRANSFER;${k};AC-0001;5`]) {
      const r = send(state, p);
      assert.deepEqual([r.status, r.body], [404, E401], p);
    }
    const r = send(state, `ANULA;${k}`);
    assert.deepEqual([r.status, r.body], [404, E402], `ANULA;${k}`);
  }
  assert.deepEqual(send(state, 'CONSULTA;AC-0001').body, { cuenta_id: 'AC-0001', saldo: 50 });
});

// T2: only HALT;1 halts (503 E599); any other argument -> 409 E520 without halting.
test('HALT;1 sets halted, other args do not', () => {
  const send = (state: ReturnType<typeof initialState>, p: string) => handle(state, JSON.stringify({ m: `${p};${control(p)}` }));
  for (const arg of ['0', '2', '01', 'true', 'si', 'confirmar', 'ok', 'yes']) {
    const r = send(initialState(), `HALT;${arg}`);
    assert.deepEqual([r.status, r.body, r.state.halted], [409, { error: 'E520', mensaje: 'operación destructiva: detiene el servicio; reenvía con confirmación' }, false], arg);
  }
  const r = send(initialState(), 'halt;1');
  assert.deepEqual([r.status, r.body, r.state.halted], [503, { error: 'E599', mensaje: 'service halted' }, true]);
});
