// Replays pruebas/ejemplos.jsonl through the pure core: every example not superseded by v2 (probe/v2.json) must match.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { handle } from './handle.ts';
import { initialState } from './state.ts';
import { control } from './checksum.ts';

test('ejemplos (v1 vigentes)', () => {
  const sup = new Set<number>();
  if (existsSync('probe/v2.json')) for (const x of JSON.parse(readFileSync('probe/v2.json', 'utf8')).superseded_ejemplos ?? []) {
    const [a, b = a] = String(x).split('-').map(Number);
    for (let i = a; i <= b; i++) sup.add(i);
  }
  let state = initialState();
  for (const l of readFileSync('pruebas/ejemplos.jsonl', 'utf8').trim().split('\n').map((x) => JSON.parse(x))) {
    const r = handle(state, JSON.stringify(l.request));
    state = r.state;
    if (sup.has(l.id)) continue;
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
  assert.deepEqual(send(state, 'CONSULTA;AC-0001').body, { cuenta_id: 'AC-0001', saldo: '0.50' });
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

// T5 (v2): CONSULTA saldo = integer / 100 as a string with 2 decimals. T6 (v2): TRANSFER limit 50000 between different holders.
test('v2: saldo format and 50000 limit', () => {
  const send = (state: ReturnType<typeof initialState>, p: string) => handle(state, JSON.stringify({ m: `${p};${control(p)}` }));
  const saldo = (n: number) => {
    const st = initialState(); st.cuentas['AC-0001'] = n;
    return (send(st, 'CONSULTA;AC-0001').body as { saldo: unknown }).saldo;
  };
  for (const [n, s] of [[0, '0.00'], [1, '0.01'], [10, '0.10'], [23556, '235.56'], [-3, '-0.03'], [-150000, '-1500.00'], [11099999999, '110999999.99']] as const)
    assert.equal(saldo(n), s, String(n));
  let st = initialState();
  for (const p of ['ALTA;Ana', 'ALTA;Bo', 'ALTA;Ana', 'DEPOSITO;AC-0001;500000']) st = send(st, p).state;
  assert.deepEqual(send(st, 'TRANSFER;AC-0001;AC-0002;50001').body, { error: 'E506', mensaje: 'límite excedido' });
  assert.equal(send(st, 'TRANSFER;AC-0001;AC-0002;50000').status, 200);
  assert.equal(send(st, 'TRANSFER;AC-0001;AC-0003;150000').status, 200); // TRA-7: same holder, no limit
});
