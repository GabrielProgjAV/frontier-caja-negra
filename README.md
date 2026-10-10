# Caja negra · reemplazo de un servicio sin documentación

Reto 2 de Frontier Bogotá 2026 (enunciado en [RETO.md](RETO.md)). Un servicio HTTP lleva años en producción sin código ni
documentación. Recibe mensajes `COMANDO;argumentos;control` por `POST /msg`, guarda cuentas, saldos y operaciones, y responde
JSON. Este repo contiene un reemplazo que devuelve el mismo status y el mismo cuerpo, errores incluidos, y la evidencia de cómo
se descubrió cada comportamiento.

## Cómo funciona

**1. Descubrimiento con el original como oráculo.** Cada hipótesis se probó con una request real al servicio original
mediante `probe/send.ts`, que limita a 5 req/s, lleva el presupuesto diario en `probe/budget.json` y registra cada request en
[experimentos.jsonl](experimentos.jsonl) (hipótesis, request, respuesta y conclusión). La especificación se escribió después,
citando los ids de ese log: [SPEC.md](SPEC.md).

**2. Núcleo puro.** `src/core/handle.ts` es una función sin I/O: `handle(estado, cuerpoCrudo) → { estado, status, cuerpo }`.
Aplica las validaciones en el orden observado (E101, E100, E102, E103, E104, E201, E202, E301, E302, E303, E304, E401, E402,
E506, E507) y ejecuta `PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`, `ANULA` y el comando oculto `HALT`, que responde
`409 E520` (pide confirmación). `src/server.ts` es solo un adaptador `node:http` (rutas, token y reset); sin dependencias en
ejecución.

**3. Dígito de control.** Es ISO 7064 MOD 97-10 (como el IBAN) sobre el mensaje sin su último segmento: los dígitos cuentan
tal cual, cada letra vale su posición en el alfabeto, el resto se ignora, y `control = 98 − (N·100 mod 97)`. `PING` no lo valida.
`src/core/checksum.ts` tiene un test contra todos los pares conocidos del log.

**4. Testing diferencial.** `probe/diff.ts` reproduce cada secuencia grabada contra el reemplazo local y compara status y cuerpo.
`probe/remote-diff.ts` hace lo mismo contra el reemplazo desplegado y mide la latencia por paso. Ninguno de los dos llama al original.

**5. Fuzzing.** `probe/fuzz.ts` genera secuencias aleatorias (controles válidos y mutaciones), las manda al original y compara
cada respuesta con `handle()` local; se detiene en la primera diferencia y la imprime.

**6. Detección de cambios.** El servicio puede cambiar durante el día. `probe/drift.ts` repite los 20 ejemplos de la mañana contra
el original y avisa de cualquier diferencia.

## Resultados (al momento de escribir esto)

| Medida | Resultado |
|---|---|
| `pruebas/ejemplos.jsonl` contra el reemplazo local | 20/20 |
| `experimentos.jsonl` contra el reemplazo local | 1521/1521 |
| Fuzz contra el original (semillas 101, 202, 303) | 90 secuencias, 595 mensajes, 0 diferencias |
| Drift de los 20 ejemplos contra el original (12:52) | sin cambios |
| Tests (`npm test`) | 3 de 3 |

Límites de esos números:
- El 1521/1521 reproduce el mismo log con el que se construyó el reemplazo, así que mide que no hay regresiones y no cobertura nueva.
  La medida independiente es el fuzz.
- El fuzz cubrió poco los errores de límite excedido (E506, 1 caso) y saldo insuficiente (E507, 2 casos), y no incluye
  errores de forma (E100 a E103, E201), que cubre el diff. Excluye `HALT` a propósito.
- El reemplazo está desplegado en Render, pero su comprobación remota con `remote-diff.ts` está pendiente. No hay todavía un
  resultado medido sobre el set de evaluación.
- [SPEC.md](SPEC.md) es un borrador. Cada comportamiento indica su confianza (confirmado, probable o supuesto); los supuestos son lo
  que hace el reemplazo donde no se probó nada, por ejemplo que el límite de 8192 bytes cuenta bytes y no caracteres.

## Cómo correrlo

Requiere Node 24 o superior. El reemplazo no tiene dependencias en ejecución.

```bash
npm install                                        # solo typescript y @types/node, para desarrollo
TEAM_TOKEN=secreto PORT=3000 npm start             # escucha en 0.0.0.0:3000
npm test                                           # control + ejemplos 20/20
node probe/diff.ts                                 # % de coincidencia por comando, en local
npx tsc --noEmit                                   # tipos
```

Las sondas al original y al despliegue leen `.env` (`ORIGINAL_URL`, `ORIGINAL_TOKEN`, `TEAM_TOKEN`, `REPLACEMENT_URL`), que nunca
se versiona:

```bash
node --env-file=.env probe/remote-diff.ts pruebas/ejemplos.jsonl      # contra el despliegue
node --env-file=.env probe/fuzz.ts --seqs 30 --seed 101              # contra el original
node --env-file=.env probe/drift.ts                                   # contra el original
node probe/validate-log.ts                                           # formato de experimentos.jsonl
```

Los pasos de despliegue en Render están en [DEPLOY.md](DEPLOY.md).

## Mapa del repo

| Ruta | Qué es |
|---|---|
| [SPEC.md](SPEC.md) | Especificación con las 7 secciones del reto y evidencia por comportamiento |
| [experimentos.jsonl](experimentos.jsonl) | Log de cada request enviada al original |
| [DESIGN.md](DESIGN.md) | Documento de diseño inicial |
| [DECISIONS.md](DECISIONS.md) | Decisiones y sus motivos |
| [PLAN.md](PLAN.md), [HANDOFF.md](HANDOFF.md) | Tareas, estado y traspaso entre sesiones |
| `src/` | Reemplazo: `core/handle.ts`, `core/checksum.ts`, `core/state.ts`, `server.ts` |
| `probe/` | Sondas y herramientas: `send`, `oracle`, `diff`, `remote-diff`, `fuzz`, `drift`, `validate-log` |
