# PLAN · caja-negra (hasta las 20:00 del 2026-10-10, hora UTC-5)

> **REGLA para todos los agentes:** lee este archivo antes de empezar una tarea. Al terminar cada tarea,
> actualiza su estado y la hora (`HH:MM`), haz commit y push.
> **Solo UN agente prueba el original a la vez**, porque el token comparte estado y presupuesto. Antes de
> probar, apúntate en "Sonda activa" y libérala al terminar.

**Sonda activa:** libre (desde 12:06)

## Entregables para las 20:00
| Entregable | Formato exacto | Fuente |
|---|---|---|
| Entrypoint desplegado | URL pública con `Authorization: Bearer <token del equipo>` en todas las llamadas; con otro token o sin token responde como el original. `GET /health` → 200 cuando está listo. `POST /__reset` vuelve al estado inicial. Cualquier otra ruta responde igual que el original. Un solo proceso. 5 s por paso. Se valida en `/evento`. | README |
| `SPEC.md` | 7 secciones: 1 Entrada, 2 Integridad, 3 Comandos (un bloque por comando), 4 Memoria entre requests, 5 Errores (status, cuerpo exacto y orden), 6 Cambios durante el día, 7 Riesgos. Cada una con una tabla `ID \| Comportamiento \| Evidencia \| Confianza`; la confianza es confirmado, probable o supuesto, y la evidencia son ids del log. Una afirmación falsa resta. | README |
| `experimentos.jsonl` | Una línea por cada request al original: `{"id","seq","x_req","hipotesis","request","status","response","conclusion"}`, más `method`, `path` y `auth` en las sondas que no son `/msg`. Cada `seq` empieza tras un `/__reset`. | README + DECISIONS.md |
| Repo público | GitHub `GabrielProgjAV/frontier-caja-negra` en modo **público**, sin `.env`. | indicación del equipo, no está en README |
| Video de 2 min | Demo y explicación del método. | indicación del equipo, no está en README |

**Ejecuciones del set oculto (100 tests):** según el equipo, solo hay **3**. El README dice que corre cada vez que
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
| 6 | Orden de errores restante (E104 frente a E201/E202, E302 frente a E401, E506 frente a E507, E401 origen frente a destino). Hecho en s7; faltan E303 frente a E302/E401 y E304 frente a E401 | sesión 1 | doing | 12:06 |
| 7 | Comandos ocultos (mirar el campo `sugerencia`) | sesión 1 | todo | |
| 8 | `src/core/state.ts` + `handle.ts` (núcleo puro, orden de validación de HANDOFF.md) | sesión 2 | todo | |
| 9 | `src/server.ts` (`node:http`, autenticación con `TEAM_TOKEN`, `/health`, `/__reset`, 404) | sesión 2 | todo | |
| 10 | `probe/diff.ts`: reproducir el log contra el reemplazo local, % por comando | sesión 2 | todo | |
| 11 | Desplegar en Render y comprobar `/health` en la URL pública | sesión 2 | todo | |
| 12 | Ejecución 1 del set oculto (~15:30) | sesión 2 | todo | |
| 13 | `probe/drift.ts`: canaria contra el original (cada ~1 h) | sesión 1 | todo | |
| 14 | Arreglos a partir de los resultados de la ejecución 1 y de diff | sesión 2 | todo | |
| 15 | Ejecución 2 del set oculto (~18:00) | sesión 2 | todo | |
| 16 | `SPEC.md`, las 7 secciones con evidencia | sesión 1 | todo | |
| 17 | Video de 2 min | humano | todo | |
| 18 | Ejecución 3 del set oculto (~19:30) | sesión 2 | todo | |
| 19 | Repo público + push final + entrega en `/evento` antes de las 19:40 | humano | todo | |

## Presupuesto
511 de 8000 requests usadas (12:06). Fuente de verdad: `probe/budget.json`.
