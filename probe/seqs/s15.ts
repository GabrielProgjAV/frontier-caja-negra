// seq s15 + s16: AC/OP counters before and after POST /__reset
import { run, v } from '../run.ts';
const ops: [string, string][] = [
  [v('ALTA;Ana'), 'contador AC tras reset: AC-0001?'],
  [v('ALTA;Beto'), 'AC-0002'],
  [v('DEPOSITO;AC-0001;1000'), 'contador OP tras reset: OP-0001?'],
  [v('TRANSFER;AC-0001;AC-0002;10'), 'OP-0002'],
];
await run('s15', ops);
await run('s16', [...ops, [v('CONSULTA;AC-0002'), 'saldo 10: el estado de s15 no sobrevive al reset (AC-0002 empezaría en 10, no en 20)']]);
