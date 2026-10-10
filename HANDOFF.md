# Handoff · caja-negra (2026-10-10, ~12:00)

## Objetivo
Construir antes de las **20:00** un reemplazo del servicio original que devuelva el mismo status y el mismo cuerpo,
errores incluidos. Hay tres entregables:
1. El reemplazo desplegado.
2. `SPEC.md`, con las 7 secciones del README y cada comportamiento con su evidencia.
3. `experimentos.jsonl`.

Las reglas están en `README.md` y `CLAUDE.md`. Los secretos solo van en `.env`, que nunca se versiona.

## Decisiones
El detalle de cada una está en `DECISIONS.md`.
- **Dependencias:** ninguna en ejecución. Node 24 ejecuta `.ts` directamente, `--env-file` sustituye a dotenv y los tests usan `node:test`. En desarrollo solo `typescript` y `@types/node`.
- **Formato del log:** se respetan los campos del README. Para las sondas que no son un `POST /msg` autenticado se añaden `method`, `path` y `auth`.
- **`x_req`:** número si el header es numérico; si no, el texto.
- **Velocidad y presupuesto:** 5 req/s y 8000 al día. Las respuestas con `X-Frontier-Infra: rate-limit` se reintentan y no se registran.
- **Oráculo:** prueba primero los candidatos predichos y luego 0..99 en orden.

## Descubrimientos
Los números entre paréntesis son ids de `experimentos.jsonl`.

### Sin cambios desde la mañana
Repetir los 20 ejemplos dio respuestas idénticas (2–21).

### Rutas y autenticación
- **Rutas y métodos:**
  - `GET /health` y `POST /__reset` devuelven `200 {"ok":true}` (22, 23).
  - Cualquier otra ruta o método, incluido `GET /msg`, da `404 {"error":"E404","mensaje":"ruta desconocida"}` (24–26).
- **Autenticación:** sin token o con un token malo, `401 {"error":"E001","mensaje":"no autorizado"}` (27, 28).

### Orden de validación
| Paso | Error | Evidencia |
|---|---|---|
| 1 | ruta → `404 E404` | 33, 34: gana sobre el 401 |
| 2 | autenticación → `401 E001` | 35: gana sobre el JSON inválido |
| 3 | JSON inválido → `400 E100` | 29 |
| 4 | falta `m`, o `m` no es string → `400 E102 "falta m"` | 30, 36–38; E101 no se ha visto |
| 5 | no hay `;` → `400 E103 "falta control"` | 31, 39 |
| 6 | control vacío → `400 E104 "segmento vacío"` | 40; orden frente a E201/E202 por confirmar |
| 7 | control no numérico → `400 E201 "control mal formado"` | 18 |
| 8 | control incorrecto → `400 E202 "control inválido"` | 3, 41–43, 51; va antes que E301 y E302 |
| 9 | comando desconocido → `400 E301 "comando desconocido "` | 13, 50; espacio al final; `sugerencia` si el comando se parece a uno conocido (47, 48) |
| 10 | aridad → `400 E302 "aridad inválida"` | 21 |
| 11 | negocio → `404 E401 "cuenta inexistente"`, `422 E506 "límite excedido"`, `422 E507 "saldo insuficiente"` | 16, 10, 17 |

### Algoritmo del control (resuelto)
- **Fórmula:** ISO 7064 MOD 97‑10 sobre el mensaje sin su último segmento.
  - Los dígitos cuentan como son.
  - Cada letra cuenta como su posición en el alfabeto (A=1 … Z=26), sin distinguir mayúsculas.
  - El resto de caracteres se ignora.
  - `control = 98 − (N·100 mod 97)`.
- **Comparación como texto:** `03` ≠ `3` (43).
- **Evidencia:**
  - Último dígito: 55–64.
  - Penúltimo dígito: 146, 198, 234.
  - Mayúsculas: 235.
  - Letras: 334, 427, 457.
  - Espacios ignorados: 47.
- **Predicción:** el original aceptó **10 de 10** (461–470).
- **`PING` no valida el control** (458, 459).
- **Por probar:** caracteres no ASCII (`ñ`, `á`).

### Comandos vistos
- **`PING`** → `200 {"pong":true}`. No distingue mayúsculas (45, 46).
- **`ALTA;nombre`** → `201 {"cuentaId":"AC-000N"}`. Los ids son secuenciales y se reinician con `/__reset` (44). Acepta nombres con espacio (469).
- **`CONSULTA;cuenta`** → `200 {"cuenta_id":…,"saldo":N}`. Los ids de cuenta **sí** distinguen mayúsculas: `ac-0002` da E401 (468).
- **`DEPOSITO;cuenta;monto`** y **`TRANSFER;origen;destino;monto`** → `200 {"status":"recieved","operacionId":"OP-000N"}`, con el error de escritura incluido.
- **Límite de E506:** 120000 se rechazó y 100000 pasó (10, 11). El límite exacto está por confirmar.
- **`ANULA;operación`** → `{"ok":true,"anulada":…}`. La segunda vez da `{"ok":false,"motivo":"ya anulada"}`, también con status 200. Al anular, el saldo se restaura (14, 15, 465, 466).

### Header `X-Req`
- Es un contador que **no se reinicia con `/__reset`** (36, 52).
- Sube 1 por cada `POST /msg` autenticado, incluidos los que dan 400.
- Viene vacío en `/__reset`, `/health`, 404 y 401.
- Los headers no se califican.

## Estado del código
- **`probe/send.ts`:** envía una request al original, la registra en el log, limita la velocidad y lleva el presupuesto.
- **`probe/oracle.ts`:** busca el control válido de un mensaje.
- **`probe/seqs/`:** las secuencias s1–s6.
- **`src/core/checksum.ts` + `checksum.test.ts`:** el test lee todos los pares de `pruebas/ejemplos.jsonl` y `experimentos.jsonl`. Se ejecuta con `npm test`.
- **Documentos:** `DESIGN.md` (diseño), `DECISIONS.md` (decisiones) y `experimentos.jsonl` (470 líneas).
- **Sin construir todavía:** `src/core/handle.ts`, `state.ts`, `src/server.ts`, `probe/diff.ts`, `probe/drift.ts` y `SPEC.md`.

## Pendiente, en orden de prioridad
1. **Comandos y sus límites:**
   - Montos: cero, negativos, decimales, ceros a la izquierda, números enormes.
   - El límite exacto de E506.
   - Transferencia a la misma cuenta.
   - ANULA de un depósito y de una operación inexistente.
   - La aridad de cada comando.
   - Nombres vacíos o largos en ALTA.
   - Otros comandos ocultos: la `sugerencia` puede revelarlos.
2. **Orden de errores restante:** E104 frente a E201/E202, E302 frente a E401, E506 frente a E507, y E401 entre origen y destino.
3. **El reemplazo:** `state.ts`, `handle.ts` y `server.ts` (con autenticación usando `TEAM_TOKEN`).
4. **`probe/diff.ts`:** reproducir el log contra el reemplazo y medir el porcentaje de coincidencia.
5. **Despliegue:** un solo proceso con URL pública y `/health`. Validar el entrypoint en `/evento`.
6. **`SPEC.md`:** las 7 secciones con tablas `ID | Comportamiento | Evidencia | Confianza`.
7. **`probe/drift.ts`:** una canaria periódica, porque se evalúa contra la versión de las 20:00.

## Presupuesto
**470 de 8000** requests usadas hoy (`probe/budget.json`, día en UTC).

## Cómo seguir
```bash
node --env-file=.env probe/send.ts <seq> probe/seqs/<archivo>.json
node --env-file=.env probe/oracle.ts <seq> "CONSULTA;AC-0001"
npm test
```
La próxima secuencia libre es **s7**.
