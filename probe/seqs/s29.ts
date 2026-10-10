// seq s29-s31: hypothesis: the E506 limit does not apply between accounts with the same name (same owner)
import { run, v } from '../run.ts';
await run('s29', [
  [v('ALTA;Zoe'), 'AC-0001 Zoe'], [v('ALTA;Zoe'), 'AC-0002 Zoe (mismo nombre)'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'mismo nombre, saldo 0, monto 100001: E507 si el límite no aplica entre mismo titular'],
  [v('DEPOSITO;AC-0001;250000'), 'AC-0001 = 250000'],
  [v('TRANSFER;AC-0001;AC-0002;150000'), 'mismo nombre, saldo suficiente, monto 150000 > límite: 200 si el límite no aplica'],
  [v('CONSULTA;AC-0002'), 'AC-0002 = 150000 si la transferencia pasó'],
  [v('ALTA;Ana'), 'AC-0003 Ana (otro nombre)'],
  [v('TRANSFER;AC-0001;AC-0003;100001'), 'distinto nombre, saldo 100000 suficiente? (250000-150000=100000 < 100001): E506 esperado por precedencia normal'],
  [v('TRANSFER;AC-0002;AC-0003;100001'), 'distinto nombre, saldo 150000 >= monto: E506'],
]);
await run('s30', [
  [v('ALTA;zoe'), 'AC-0001 zoe'], [v('ALTA;Zoe'), 'AC-0002 Zoe'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'nombres que solo difieren en mayúsculas: ¿mismo titular?'],
  [v('ALTA;Zoe '), 'AC-0003 "Zoe " con espacio final'],
  [v('TRANSFER;AC-0002;AC-0003;100001'), '"Zoe" y "Zoe ": ¿mismo titular (nombre recortado)?'],
]);
await run('s31', [
  [v('ALTA;A'), 'AC-0001'], [v('ALTA;B'), 'AC-0002'], [v('DEPOSITO;AC-0001;21341'), 'OP-0001'],
  [v('TRANSFER;AC-0002;AC-0002;1'), 'E304'], [v('TRANSFER;AC-0002;AC-0002;1'), 'E304'], [v('DEPOSITO;AC-0002;4315'), 'OP-0002'],
  [v('ANULA;OP-0001'), 'saldo AC-0001 = 0'], [v('TRANSFER;AC-0002;AC-0002;100001'), 'E304'],
  [v('TRANSFER;AC-0001;AC-0002;100001'), 'secuencia completa de fuzzbb8_9 con nombres distintos: E506 si la causa es el nombre'],
]);
