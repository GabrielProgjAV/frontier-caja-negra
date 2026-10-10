// seq s22: investigate fuzz difference (log 1602): E507 won over E506 with saldo 0. Which precedence rule?
import { run, v } from '../run.ts';
await run('s22', [
  [v('ALTA;A'), 'setup AC-0001'],
  [v('ALTA;B'), 'setup AC-0002'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'saldo 0 nunca fondeado, monto 100001: E506 o E507?'],
  [v('TRANSFER;AC-0001;AC-0002;150000'), 'saldo 0, monto 150000: E506 o E507?'],
  [v('DEPOSITO;AC-0001;100000'), 'AC-0001 = 100000'],
  [v('TRANSFER;AC-0001;AC-0002;150000'), 'repite 491 (saldo 100000, monto 150000): E506 como a las 12:06, o cambió el servicio?'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'saldo 100000 < 100001 (por 1), sobre el límite: E506 o E507?'],
  [v('DEPOSITO;AC-0001;1'), 'AC-0001 = 100001'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'saldo 100001 = monto, sobre el límite: E506 esperado'],
  [v('ALTA;C'), 'setup AC-0003'],
  [v('DEPOSITO;AC-0003;1'), 'AC-0003 = 1'],
  [v('TRANSFER;AC-0003;AC-0002;100001'), 'saldo 1, monto 100001: E506 o E507? (frontera saldo>0)'],
  [v('ALTA;D'), 'setup AC-0004'],
  [v('DEPOSITO;AC-0004;500'), 'AC-0004 = 500 (OP-0004)'],
  [v('TRANSFER;AC-0004;AC-0002;500'), 'AC-0004 = 0'],
  [v('ANULA;OP-0004'), 'AC-0004 = -500 (anula depósito gastado)'],
  [v('TRANSFER;AC-0004;AC-0002;100001'), 'saldo negativo, monto 100001: E506 o E507?'],
  [v('TRANSFER;AC-0001;AC-0002;100000'), 'control: saldo 100001, monto 100000 en el límite: 200'],
]);
