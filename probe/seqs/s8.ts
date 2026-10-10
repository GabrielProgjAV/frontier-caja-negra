// seq s8: pending error-order tests
import { run, v } from '../run.ts';
await run('s8', [
  [v('ALTA;Ana'), 'setup: AC-0001'],
  [v('DEPOSITO;AC-0001;abc;extra'), 'orden: aridad + monto inválido -> E302 o E303?'],
  [v('DEPOSITO;AC-0009;abc'), 'orden: cuenta inexistente + monto inválido -> E401 o E303?'],
  [v('TRANSFER;AC-0009;AC-0009;100'), 'orden: misma cuenta inexistente -> E304 o E401?'],
  [v('TRANSFER;AC-0001;AC-0001;0'), 'orden: misma cuenta + monto inválido -> E303 o E304?'],
  [v('TRANSFER;AC-0001;AC-0001;200000'), 'orden: misma cuenta + límite -> E304 o E506?'],
  [v('TRANSFER;AC-0001;AC-0009;abc'), 'orden: destino inexistente + monto inválido -> E401 o E303?'],
]);
