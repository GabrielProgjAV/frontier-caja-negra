// Reimplementación "desde cero" a partir de SPEC.md únicamente (sin leer src/).
// Núcleo puro: handle(state, rawBody) -> { state, status, body }. Sin I/O.

export interface Cuenta { id: string; nombre: string; saldo: number }
export interface Operacion {
  id: string;
  tipo: 'DEPOSITO' | 'TRANSFER';
  origen: string | null;
  destino: string;
  monto: number;
  anulada: boolean;
}
export interface State {
  cuentas: Record<string, Cuenta>;
  operaciones: Record<string, Operacion>;
  ac: number; // contadores: último número usado
  op: number;
}
export interface Result { state: State; status: number; body: unknown }

export const MAX_BODY_BYTES = 8192; // ENT-10
export const LIMITE_TRANSFER = 100000; // TRA-5
const COMANDOS = ['PING', 'ALTA', 'CONSULTA', 'DEPOSITO', 'TRANSFER', 'ANULA', 'HALT']; // CMD-1c
const ARIDAD: Record<string, number> = { PING: 0, ALTA: 1, CONSULTA: 1, DEPOSITO: 2, TRANSFER: 3, ANULA: 1, HALT: 1 };

export function initialState(): State {
  return { cuentas: {}, operaciones: {}, ac: 0, op: 0 }; // ENT-3
}

// INT-4: dígitos tal cual, letras como su posición (A=1..Z=26) en decimal, resto ignorado.
export function controlEsperado(prefijo: string): number {
  let digits = '';
  for (const ch of prefijo) {
    if (ch >= '0' && ch <= '9') digits += ch;
    else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) digits += String(ch.toLowerCase().charCodeAt(0) - 96);
  }
  let r = 0;
  for (const d of digits) r = (r * 10 + Number(d)) % 97;
  return 98 - ((r * 100) % 97);
}

// CMD-1a: Levenshtein clásica (sin transposición).
function lev(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function pad(n: number): string { return String(n).padStart(4, '0'); }

export function handle(state: State, rawBody: string): Result {
  const out = (status: number, body: unknown, s: State = state): Result => ({ state: s, status, body });
  const e = (status: number, error: string, mensaje: string, extra: object = {}) => out(status, { error, mensaje, ...extra });

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return e(413, 'E101', 'cuerpo demasiado grande');
  let json: unknown;
  try { json = JSON.parse(rawBody); } catch { return e(400, 'E100', 'json inválido'); }
  if (json === null || typeof json !== 'object' || Array.isArray(json) || typeof (json as any).m !== 'string') {
    return e(400, 'E102', 'falta m');
  }
  const m: string = (json as any).m;
  if (!m.includes(';')) return e(400, 'E103', 'falta control');
  const parts = m.split(';');
  if (parts.some((p) => p === '')) return e(400, 'E104', 'segmento vacío');

  const control = parts[parts.length - 1];
  const cmdRaw = parts[0];
  const cmd = cmdRaw.toUpperCase();
  const args = parts.slice(1, -1);

  // INT-9: PING no valida el control. Resto: INT-3, INT-4, INT-10.
  if (cmd !== 'PING') {
    if (!/^[0-9]+$/.test(control)) return e(400, 'E201', 'control mal formado');
    const prefijo = parts.slice(0, -1).join(';');
    if (control !== String(controlEsperado(prefijo))) return e(400, 'E202', 'control inválido');
  }

  if (!COMANDOS.includes(cmd)) {
    let best: string | undefined, bd = Infinity;
    for (const c of COMANDOS) { const d = lev(cmdRaw.toUpperCase(), c); if (d < bd) { bd = d; best = c; } }
    return e(400, 'E301', 'comando desconocido ', bd <= 2 ? { sugerencia: best } : {});
  }
  if (args.length !== ARIDAD[cmd]) return e(400, 'E302', 'aridad inválida');

  const montoOk = (s: string) => /^[1-9][0-9]{0,9}$/.test(s);
  const s: State = structuredClone(state);
  const ok = (status: number, body: unknown) => out(status, body, s);

  switch (cmd) {
    case 'PING': return out(200, { pong: true });
    case 'HALT': return e(409, 'E520', 'operación destructiva: detiene el servicio; reenvía con confirmación');
    case 'ALTA': {
      s.ac++;
      const id = `AC-${pad(s.ac)}`;
      s.cuentas[id] = { id, nombre: args[0], saldo: 0 };
      return ok(201, { cuentaId: id });
    }
    case 'CONSULTA': {
      const c = Object.hasOwn(s.cuentas, args[0]) ? s.cuentas[args[0]] : undefined;
      if (!c) return e(404, 'E401', 'cuenta inexistente');
      return out(200, { cuenta_id: c.id, saldo: c.saldo });
    }
    case 'DEPOSITO': {
      if (!montoOk(args[1])) return e(400, 'E303', 'monto inválido');
      const c = Object.hasOwn(s.cuentas, args[0]) ? s.cuentas[args[0]] : undefined;
      if (!c) return e(404, 'E401', 'cuenta inexistente');
      const monto = Number(args[1]);
      c.saldo += monto;
      s.op++;
      const id = `OP-${pad(s.op)}`;
      s.operaciones[id] = { id, tipo: 'DEPOSITO', origen: null, destino: c.id, monto, anulada: false };
      return ok(200, { status: 'recieved', operacionId: id });
    }
    case 'TRANSFER': {
      const [o, d, ms] = args;
      if (!montoOk(ms)) return e(400, 'E303', 'monto inválido');
      if (o === d) return e(400, 'E304', 'origen y destino iguales');
      const co = Object.hasOwn(s.cuentas, o) ? s.cuentas[o] : undefined;
      const cd = Object.hasOwn(s.cuentas, d) ? s.cuentas[d] : undefined;
      if (!co || !cd) return e(404, 'E401', 'cuenta inexistente');
      const monto = Number(ms);
      if (co.nombre !== cd.nombre && monto > LIMITE_TRANSFER) return e(422, 'E506', 'límite excedido'); // TRA-5/TRA-7
      if (co.saldo < monto) return e(422, 'E507', 'saldo insuficiente');
      co.saldo -= monto;
      cd.saldo += monto;
      s.op++;
      const id = `OP-${pad(s.op)}`;
      s.operaciones[id] = { id, tipo: 'TRANSFER', origen: co.id, destino: cd.id, monto, anulada: false };
      return ok(200, { status: 'recieved', operacionId: id });
    }
    case 'ANULA': {
      const op = Object.hasOwn(s.operaciones, args[0]) ? s.operaciones[args[0]] : undefined;
      if (!op) return e(404, 'E402', 'operación inexistente');
      if (op.anulada) return out(200, { ok: false, motivo: 'ya anulada' });
      op.anulada = true;
      s.cuentas[op.destino].saldo -= op.monto;
      if (op.origen) s.cuentas[op.origen].saldo += op.monto;
      return ok(200, { ok: true, anulada: op.id });
    }
  }
  return e(500, 'E500', 'inalcanzable');
}

// ---- Capa HTTP lógica (sin sockets): rutas + autenticación (ENT-2..ENT-7) ----
export interface Req { method: string; path: string; authorization?: string; body?: string }

export function route(state: State, token: string, req: Req): Result {
  const path = req.path.split('?')[0]; // ENT-4c
  const k = `${req.method} ${path}`;
  const known = k === 'POST /msg' || k === 'POST /__reset' || k === 'GET /health';
  if (!known) return { state, status: 404, body: req.method === 'HEAD' ? '' : { error: 'E404', mensaje: 'ruta desconocida' } }; // ENT-4, ENT-4d
  // ENT-5/5b: "Bearer <token>" exacto; el HTTP ya recorta espacios/tabs de los extremos del valor.
  const auth = req.authorization?.replace(/^[ \t]+|[ \t]+$/g, '');
  if (auth !== `Bearer ${token}`) return { state, status: 401, body: { error: 'E001', mensaje: 'no autorizado' } };
  if (k === 'GET /health') return { state, status: 200, body: { ok: true } };
  if (k === 'POST /__reset') return { state: initialState(), status: 200, body: { ok: true } };
  return handle(state, req.body ?? '');
}
