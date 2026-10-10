# PLAN · caja-negra (hasta las 20:00 del 2026-10-10, hora UTC-5)

> **REGLA para todos los agentes:** lee este archivo antes de empezar una tarea. Al terminar cada tarea,
> actualiza su estado y la hora (`HH:MM`), haz commit y push.
> **Solo UN agente prueba el original a la vez**, porque el token comparte estado y presupuesto. Antes de
> probar, apúntate en "Sonda activa" y libérala al terminar.

**Sonda activa:** sesión 1 (s33-s36 hipótesis trampa, fuzz --business v2, drift), desde 13:15

## Entregables para las 20:00
| Entregable | Formato exacto | Fuente |
|---|---|---|
| Entrypoint desplegado | URL pública con `Authorization: Bearer <token del equipo>` en todas las llamadas; con otro token o sin token responde como el original. `GET /health` → 200 cuando está listo. `POST /__reset` vuelve al estado inicial. Cualquier otra ruta responde igual que el original. Un solo proceso. 5 s por paso. Se valida en `/evento`. | RETO.md |
| `SPEC.md` | 7 secciones: 1 Entrada, 2 Integridad, 3 Comandos (un bloque por comando), 4 Memoria entre requests, 5 Errores (status, cuerpo exacto y orden), 6 Cambios durante el día, 7 Riesgos. Cada una con una tabla `ID \| Comportamiento \| Evidencia \| Confianza`; la confianza es confirmado, probable o supuesto, y la evidencia son ids del log. Una afirmación falsa resta. | RETO.md |
| `experimentos.jsonl` | Una línea por cada request al original: `{"id","seq","x_req","hipotesis","request","status","response","conclusion"}`, más `method`, `path` y `auth` en las sondas que no son `/msg`. Cada `seq` empieza tras un `/__reset`. | RETO.md + DECISIONS.md |
| Repo público | GitHub `GabrielProgjAV/frontier-caja-negra` en modo **público**, sin `.env`. | indicación del equipo, no está en RETO.md |
| Video de 2 min | Demo y explicación del método. | indicación del equipo, no está en RETO.md |

**Ejecuciones del set oculto (100 tests):** según el equipo, solo hay **3**. RETO.md dice que corre cada vez que
se valida el entrypoint, así que hay que confirmarlo en `/evento`. Planificamos con 3: no se gasta ninguna sin `diff.ts` en verde.

## Fases
| Hora | Fase | Dueño |
|---|---|---|
| ahora–13:30 | Experimentos de comandos (s7 en adelante) | sesión 1 |
| ahora–13:30 | Construir el reemplazo en paralelo, sin tocar el original | sesión 2 |
| 13:30–14:30 | Desplegar en Render (un solo proceso) | sesión 2 |
| ~15:30 | **Ejecución 1 del set oculto** | sesión 2 |
| 15:30–18:00 | Arreglos + comprobaciones de cambios (`drift.ts`) | sesión 1 (sondas) + sesión 2 (arreglos) |
| ~18:00 | **Ejecución 2 del set oculto** | sesión 2 |
| 18:00–19:00 | Terminar `SPEC.md` | sesión 1 |
| 19:00–19:30 | Video de 2 min | humano |
| ~19:30 | **Ejecución 3 del set oculto** (lo último antes de la entrega) | sesión 2 |
| **19:40** | **Entrega** (entrypoint en `/evento`, repo público y push final) | humano |

## Lista de tareas
Estados: `todo` · `doing` · `done` · `blocked`.

| # | Tarea | Dueño | Estado | Actualizado |
|---|---|---|---|---|
| 1 | Infraestructura de sondas (`send.ts`, presupuesto, log) | sesión 1 | done | 10:40 |
| 2 | Orden de validación, rutas y autenticación (s2–s4) | sesión 1 | done | 11:00 |
| 3 | Algoritmo del control: `checksum.ts` + tests, 10/10 predicciones (s5–s6) | sesión 1 | done | 11:40 |
| 4 | `HANDOFF.md` + push | sesión 1 | done | 12:00 |
| 5 | s7: límites de comandos (montos, límite E506, misma cuenta, ANULA de depósito o de operación inexistente, aridad por comando, nombres) | sesión 1 | done | 12:06 |
| 6 | Orden de errores restante. Completo: s7 + s8 (orden en SPEC §5) | sesión 1 | done | 12:16 |
| 7 | Comandos ocultos: HALT encontrado (E520 409, confirmación sin probar), regla de sugerencia = Levenshtein <= 2 (s9, s10) | sesión 1 | done | 12:18 |
| 8 | `src/core/state.ts` + `handle.ts` (núcleo puro, orden de validación de HANDOFF.md) | sesión 2 | done (incluye HALT→E520) | 12:25 |
| 9 | `src/server.ts` (`node:http`, autenticación con `TEAM_TOKEN`, `/health`, `/__reset`, 404) | sesión 2 | done (health/reset exigen token; 0.0.0.0:PORT) | 12:25 |
| 10 | `probe/diff.ts`: reproducir el log contra el reemplazo local, % por comando | sesión 2 | done: ejemplos 20/20, experimentos 815/815 (100%) | 12:38 |
| 11 | Desplegar en Render y comprobar `/health` en la URL pública | sesión 2 | doing: desplegado en https://frontier-caja-negra.onrender.com, pero responde 401 con el TEAM_TOKEN de .env (token de Render por confirmar) | 12:54 |
| 12 | Ejecución 1 del set oculto (~15:30) | sesión 2 | todo | |
| 13 | `probe/drift.ts`: canaria contra el original (cada ~1 h). Drift manual s12 (12:20) y s17 (12:27): sin cambios; falta el script | sesión 1 | todo | 12:27 |
| 14 | Arreglos a partir de los resultados de la ejecución 1 y de diff | sesión 2 | todo | |
| 15 | Ejecución 2 del set oculto (~18:00) | sesión 2 | todo | |
| 16 | `SPEC.md`, las 7 secciones con evidencia (borrador creado; se actualiza tras cada bloque) | sesión 1 | doing | 12:16 |
| 17 | Video de 2 min | humano | todo | |
| 18 | Ejecución 3 del set oculto (~19:30) | sesión 2 | todo | |
| 19 | Repo público + push final + entrega en `/evento` antes de las 19:40 | humano | todo | |
| 20 | s13-s17: rutas exactas, cuerpo (E101 413 si > 8192 bytes, Content-Type ignorado), contadores tras el reset, drift. Para la sesión 2: E101, /health sin token -> 401, HALT -> E520/E302 | sesión 1 | done | 12:27 |
| 21 | s18-s20: monto máximo de 10 dígitos (sin BigInt), Authorization exacta "Bearer <token>", nombres con espacios. Para la sesión 2: DEP/TRA monto ^[1-9][0-9]{0,9}$; auth exacta | sesión 1 | done | 12:36 |
| 22 | Fuzz: 3 semillas (101, 202, 303) x 30 seqs = 90 secuencias, 595 mensajes, 0 diferencias (ids 816-1500). HALT excluido del fuzzer. Cobertura débil: E506 (1), E507 (2); sin E100-E103/E201 (los cubre diff.ts). Drift s21 a las 12:52: sin cambios | sesión 1 | done | 12:53 |
| 23 | Fuzz --business: 2 semillas (404, 505) x 40 seqs, 6-12 pasos, 725 mensajes (ids 1522-2413). 1 diferencia: TRA-7 (límite E506 no aplica entre cuentas con el mismo nombre de titular), investigada en s22-s32. drift.ts ~13:08: 20/20 sin cambios | sesión 1 | done | 13:10 |
| 24 | **Sesión 2: implementar TRA-7.** Guardar el nombre en cada cuenta (ALTA). En TRANSFER, si nombre(origen) === nombre(destino) (exacto, sin trim, distingue mayúsculas), saltar el check E506; E303/E304/E401/E507 igual. diff.ts falla en 1602, 1942, 1952, 1978, 1980, 1981, 2418, 2419 | sesión 2 | todo | 13:10 |

## Presupuesto
2442 de 8000 requests usadas (13:10). Fuente de verdad: `probe/budget.json`.

## Sesión 2 (12:38)
| # | Tarea | Estado |
|---|---|---|
| 21 | E101 (413 si el cuerpo pasa de 8192 bytes, tras auth y antes del JSON); tope de monto de 10 dígitos (9999999999 pasa, 11 dígitos E303); diff soporta `auth: header:...` | done |
| 22 | `probe/validate-log.ts`: 815 líneas, 0 problemas (el taskkill no rompió nada) | done |
| 23 | `probe/fuzz.ts` (no ejecutado contra el original; probado en sandbox contra el servidor local: 40 secuencias, 0 diferencias). Lo ejecuta sesión 1 con `node --env-file=.env probe/fuzz.ts --seqs N [--seed S]` | done |
| 24 | DEPLOY.md corregido para Render Free + ping externo cada 5 min | done |

**Supuestos para que sesión 1 los confirme:**
- E101 cuenta **bytes** (`Buffer.byteLength`), no caracteres; se probó solo con ASCII. Falta un cuerpo > 8192 bytes con caracteres multibyte pero < 8192 caracteres.
- Sugerencia de E301: primer comando conocido (orden PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA, HALT) a distancia de Levenshtein <= 2; el orden decide empates.
- `HALT` con cualquier argumento da E520 incluso con cuenta/argumento inválido.
| 25 | `probe/remote-diff.ts` (REPLACEMENT_URL + TEAM_TOKEN; % y latencia máxima; `--sample N`). Probado contra servidor local: ejemplos 20/20, latencia máx 160 ms. **Sin correr contra Render (12:54): 401 con el TEAM_TOKEN de .env** | blocked |
| 26 | `probe/drift.ts`: canaria de los 20 ejemplos contra el original (no ejecutado; lo corre sesión 1: `node --env-file=.env probe/drift.ts`). Probado en sandbox local | done |
| 27 | README.md del reto movido a RETO.md (referencias actualizadas) y README.md nuevo del proyecto, solo con cifras medidas (13:04). Falta: remote-diff contra Render cuando el token quede bien | done |
| 28 | **Abierto para sesión 1:** el fuzz de negocio encontró una diferencia, id 1602 (seq fuzzbb8_9): `TRANSFER;AC-0001;AC-0002;100001;9` con saldo origen 0 -> original E507, nosotros E506. Con saldo 0 y el mismo monto dieron E506 los ids 1438, 1589, 1612, 1836. Lo que distingue a 1602: el destino tiene saldo 4315 (deposito OP-0002) y hubo 3 TRANSFER fallidos por E304 antes. Hipótesis: el orden E506/E507 depende del saldo del destino o de intentos previos. Hay que sondearlo (13:05) | todo |
