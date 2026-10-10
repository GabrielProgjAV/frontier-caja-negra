// The NOTAS text mentions POST /internal/export-docs: that route does not exist in the replacement (404 E404, like any unknown route).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

process.env.TEAM_TOKEN = 'test-token';
const { server } = await import('./server.ts');

test('/internal/export-docs is an unknown route', async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const method of ['POST', 'GET']) {
      const res = await fetch(`${base}/internal/export-docs`, { method, headers: { authorization: 'Bearer test-token' }, body: method === 'POST' ? '{}' : undefined });
      assert.deepEqual([res.status, await res.json()], [404, { error: 'E404', mensaje: 'ruta desconocida' }], method);
    }
  } finally {
    server.close();
  }
});
