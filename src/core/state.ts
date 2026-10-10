// In-memory state of one token. Ids are derived from counts (nothing is ever deleted): AC-000N, OP-000N.
export type Op = { from?: string; to: string; monto: number; anulada: boolean };
// nombres: exact holder name given in ALTA (TRA-7: same name on both sides of a TRANSFER skips the E506 limit)
// halted: set only by HALT;1, cleared only by POST /__reset (T2, HAL-3..9)
export type State = { cuentas: Record<string, number>; nombres: Record<string, string>; ops: Record<string, Op>; halted: boolean };
export const initialState = (): State => ({ cuentas: {}, nombres: {}, ops: {}, halted: false });
