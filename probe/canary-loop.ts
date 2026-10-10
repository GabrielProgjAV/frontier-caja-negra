// Canary loop: runs probe/canary.ts --lite every N minutes (the full 70-step canary every `--full-every` runs) until HH:MM (UTC-5),
// and stops at the FIRST difference (exit 1) or X-Req jump (exit 3, likely redeploy), printing ALERTA, so it can be investigated.
// Budget guard: never starts a run if fewer than --reserve requests would remain (kept for regression.ts + characterizing v2).
// It must be the ONLY prober while it runs (one token = one shared state; send.ts ids are per process). Stop it with Ctrl+C / kill.
// CLI: node --env-file=.env probe/canary-loop.ts [--every 10] [--until 19:45] [--full-every 6] [--reserve 700]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const opt = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const every = Number(opt('every', '10')), fullEvery = Number(opt('full-every', '6')), reserve = Number(opt('reserve', '700'));
const until = opt('until', '19:45');
const now5 = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(11, 16); // HH:MM UTC-5
const used = () => JSON.parse(readFileSync('probe/budget.json', 'utf8')).used as number;

for (let run = 0; now5() < until; run++) {
  const full = run % fullEvery === 0;
  const cost = full ? 70 : 29;
  if (8000 - used() - cost < reserve) { console.log(`${now5()} STOP presupuesto: quedan ${8000 - used()}, reserva ${reserve}`); break; }
  const r = spawnSync(process.execPath, ['--env-file=.env', 'probe/canary.ts', ...(full ? [] : ['--lite'])], { encoding: 'utf8' });
  const out = (r.stdout + r.stderr).trim();
  console.log(`${now5()} ${full ? 'completo' : 'lite'} -> ${out.split('\n').at(-1)}`);
  if (r.status !== 0) { console.log(`\n*** ALERTA ${now5()} (exit ${r.status}) ***\n${out}`); process.exit(r.status ?? 1); }
  await new Promise((res) => setTimeout(res, every * 60e3));
}
