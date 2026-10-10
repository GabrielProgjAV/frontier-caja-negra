// seq s32: same-owner transfer edges
import { run, v } from '../run.ts';
await run('s32', [
  [v('ALTA;Zoe'), 'AC-0001 Zoe'], [v('ALTA;Zoe'), 'AC-0002 Zoe'],
  [v('DEPOSITO;AC-0001;9999999999'), 'AC-0001 = 9999999999 (OP-0001)'],
  [v('TRANSFER;AC-0001;AC-0002;9999999999'), 'mismo titular, 10 dígitos con saldo exacto: 200 (sin límite)?'],
  [v('ANULA;OP-0002'), 'ANULA de una transferencia grande entre mismo titular: normal?'],
  [v('CONSULTA;AC-0001'), 'AC-0001 vuelve a 9999999999'],
  [v('TRANSFER;AC-0001;AC-0002;99999999999'), 'mismo titular, 11 dígitos: E303 (tope de dígitos sigue aplicando)'],
]);
