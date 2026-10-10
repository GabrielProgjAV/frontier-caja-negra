// Rival models for the E301 "sugerencia" field.
export const CMDS = ['PING', 'ALTA', 'CONSULTA', 'DEPOSITO', 'TRANSFER', 'ANULA', 'HALT'];
export const lev = (a: string, b: string) => {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const next = [i]; for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); row = next; }
  return row[b.length];
};
const best = (w: string, order: string[]) => { let b: string | null = null, bd = 3; for (const c of order) { const d = lev(w, c); if (d < bd) { bd = d; b = c; } } return b; };
export const models = (word: string) => {
  const w = word.toUpperCase();
  return { F_primero_lista: CMDS.find((c) => lev(w, c) <= 2) ?? null, N_cercano_lista: best(w, CMDS), A_cercano_alfabetico: best(w, [...CMDS].sort()) };
};
