// In-memory state of one token. Ids are derived from counts (nothing is ever deleted): AC-000N, OP-000N.
export type Op = { from?: string; to: string; monto: number; anulada: boolean };
export type State = { cuentas: Record<string, number>; ops: Record<string, Op> };
export const initialState = (): State => ({ cuentas: {}, ops: {} });
