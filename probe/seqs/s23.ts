// seq s23/s24: exact replay of fuzzbb8_9 (log 1594-1602) twice: is E507-over-E506 deterministic?
import { run } from '../run.ts';
const repro = ['ALTA;Zoe;3', 'ALTA;Zoe;3', 'DEPOSITO;AC-0001;21341;74', 'TRANSFER;AC-0002;AC-0002;1;7', 'TRANSFER;AC-0002;AC-0002;1;7',
  'DEPOSITO;AC-0002;4315;54', 'ANULA;OP-0001;72', 'TRANSFER;AC-0002;AC-0002;100001;53', 'TRANSFER;AC-0001;AC-0002;100001;9'];
for (const seq of ['s23', 's24'])
  await run(seq, repro.map((m, i): [string, string] => [m, `réplica exacta de fuzzbb8_9 paso ${i + 1}${i === 8 ? ': E507 (como 1602) o E506?' : ''}`]));
