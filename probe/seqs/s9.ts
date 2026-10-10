// seq s9: hidden commands (0 args: E301 = no existe, E302 = existe con argumentos, 200 = existe sin argumentos)
// + typo variants to characterize the "sugerencia" field
import { run, v } from '../run.ts';
const cands = ['BAJA', 'CIERRE', 'CERRAR', 'RETIRO', 'RETIRAR', 'MOVIMIENTOS', 'HISTORIAL', 'EXTRACTO', 'SALDO', 'SALDOS',
  'LISTA', 'LISTAR', 'CUENTAS', 'ESTADO', 'AYUDA', 'HELP', 'VERSION', 'INFO', 'STATUS', 'PAGO', 'PAGAR', 'CREDITO',
  'DEBITO', 'BLOQUEO', 'BLOQUEAR', 'DESBLOQUEAR', 'CONGELAR', 'INTERES', 'ECHO', 'RESET', 'DUMP', 'DEBUG', 'ADMIN',
  'AUDIT', 'AUDITORIA', 'LOG', 'OPERACIONES', 'OPERACION', 'DETALLE', 'RESUMEN', 'COMISION', 'LIMITE', 'TASA',
  'CAMBIO', 'REVERSA', 'REVERSO', 'DEVOLUCION', 'RETIROS', 'TRANSFERENCIA', 'DEPOSITAR', 'CONSULTAR', 'ANULAR',
  'TIEMPO', 'FECHA', 'HORA', 'TEST', 'NOOP', 'WHOAMI', 'TOKEN', 'MERGE', 'FUSION', 'RENOMBRAR', 'MODIFICAR', 'PRESTAMO'];
const typos = ['PIN', 'PINGG', 'PNIG', 'PONG', 'ALT', 'ALTAS', 'CONSULT', 'CONSLTA', 'XONSULTA', 'DEPOSIT', 'DEPOSITOS',
  'TRANSFE', 'TRANSFERR', 'ANUL', 'ANULAA', 'XXXX'];
await run('s9', [
  [v('ALTA;Ana'), 'setup: AC-0001'],
  [v('ALTA;Beto'), 'setup: AC-0002'],
  [v('DEPOSITO;AC-0001;5000'), 'setup: OP-0001'],
  [v('TRANSFER;AC-0001;AC-0002;1000'), 'setup: OP-0002'],
  ...cands.map((c): [string, string] => [v(c), `comando oculto ${c}? 0 args: E301 no existe, E302 existe con args, 200 existe sin args`]),
  ...typos.map((c): [string, string] => [v(c), `sugerencia: ${c} (variante con error de escritura) qué comando sugiere y con qué umbral`]),
]);
