// seq s25-s28: ablation of fuzzbb8_9. Which earlier step makes E507 win over E506?
import { run, v } from '../run.ts';
const base: [string, string][] = [[v('ALTA;A'), 'setup AC-0001'], [v('ALTA;B'), 'setup AC-0002']];
const last: [string, string] = [v('TRANSFER;AC-0001;AC-0002;100001'), 'monto 100001 con saldo 0: E506 o E507?'];
await run('s25', [...base, [v('DEPOSITO;AC-0001;21341'), 'OP-0001'], [v('ANULA;OP-0001'), 'saldo 0 por ANULA del depósito'], [last[0], 'V1 (solo ANULA a saldo 0): ' + last[1]]]);
await run('s26', [...base, [v('TRANSFER;AC-0002;AC-0002;100001'), 'E304 previo con el mismo monto'], [last[0], 'V2 (solo E304 previo): ' + last[1]]]);
await run('s27', [...base, [v('DEPOSITO;AC-0001;21341'), 'OP-0001'], [v('TRANSFER;AC-0001;AC-0002;21341'), 'saldo 0 por transferencia'], [last[0], 'V3 (saldo 0 por TRANSFER, sin ANULA): ' + last[1]]]);
await run('s28', [...base, [v('DEPOSITO;AC-0001;21341'), 'OP-0001'], [last[0], 'V4 (saldo 21341, sin ANULA): ' + last[1]]]);
