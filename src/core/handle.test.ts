// Replays pruebas/ejemplos.jsonl through the pure core: must be 20/20.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handle } from './handle.ts';
import { initialState } from './state.ts';

test('ejemplos 20/20', () => {
  let state = initialState();
  for (const l of readFileSync('pruebas/ejemplos.jsonl', 'utf8').trim().split('\n').map((x) => JSON.parse(x))) {
    const r = handle(state, JSON.stringify(l.request));
    state = r.state;
    assert.deepEqual([r.status, r.body], [l.status, l.response], l.request.m);
  }
});
