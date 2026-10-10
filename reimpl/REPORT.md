# Reimplementación desde SPEC.md: informe

Rama `spec-reimpl`. Pregunta: ¿basta `SPEC.md` para reimplementar el servicio sin ver `src/` ni llamar al original?

## Qué se hizo
- `reimpl/handle.ts`: `handle(state, rawBody) -> {state, status, body}` puro, `initialState()`, y `route(state, token, req)`
  para rutas, método, autenticación y 404/401. Escrito leyendo solo `SPEC.md`, `RETO.md`, `CLAUDE.md`, `PLAN.md`, `HANDOFF.md`
  y `probe/diff.ts`. **No se abrió nada de `src/`.** No se hizo ninguna llamada de red.
- `reimpl/diff.ts`: copia adaptada de `probe/diff.ts`. `probe/diff.ts` levanta `src/server.ts` por HTTP, y eso exigía `src/`. La
  copia llama a `route()` en proceso, con la misma lógica de claves, aciertos y serialización a texto antes de comparar.
- Salida completa en `reimpl/diff-output.txt`. Se reproduce con `node reimpl/diff.ts`.

## Resultado
| Archivo | Coincidencia |
|---|---|
| `pruebas/ejemplos.jsonl` | 20/20 (100 %) |
| `experimentos.jsonl` | 3577/3577 (100 %) |
| Total | 3597/3597 (100 %) |

Por comando en `experimentos.jsonl` (status + cuerpo exactos):

| Comando / grupo | Aciertos |
|---|---|
| PING | 68/68 (100 %) |
| ALTA | 711/711 (100 %) |
| CONSULTA | 719/719 (100 %) |
| DEPOSITO | 641/641 (100 %) |
| TRANSFER | 548/548 (100 %) |
| ANULA | 403/403 (100 %) |
| HALT | 3/3 (100 %) |
| Comandos desconocidos (E301, con y sin `sugerencia`) | 117/117 (100 %) |
| Rutas, métodos y cabeceras de auth distintas de `POST /msg` válido | 333/333 (100 %) |
| Cuerpo crudo y `m` que no es string (E100, E102) | 27/27 (100 %) |
| `m` vacío o sin comando (E103/E104) | 7/7 (100 %) |

## Fallas
**No hubo ninguna**, así que no hay fila de `SPEC.md` que cite como causa de un fallo.

Esto no demuestra que la SPEC sea suficiente para el set oculto de 100 tests. Tres salvedades:
1. **Circularidad.** `SPEC.md` se escribió a partir de estos mismos logs, y esos logs incluyen fuzz comparado con la
   implementación original de `src/`. El 100 % mide que la SPEC describe lo que se observó, no que cubra lo que no se observó.
2. **Contaminación leve.** `PLAN.md` y `HANDOFF.md` (lectura obligatoria por `CLAUDE.md`) repiten algunos detalles de
   `SPEC.md`, como el orden de validación y el orden de la lista de sugerencias. Los usé solo como confirmación.
3. Se miró la forma del log (campos `method`, `path`, `auth`) para poder adaptar el diff. Eso no cambia `handle.ts`.

## Ambigüedades de SPEC.md
No causaron fallos, pero obligaron a decidir. Para saber si el log las distingue, probé mutantes de `handle.ts`:

| Fila | Qué faltaba o era ambiguo | Qué hice | ¿Lo distingue el log? |
|---|---|---|---|
| INT-4 / INT-6 | INT-4 dice "rango 1–98", pero la fórmula `98 − (N·100 mod 97)` da 2–98 y nunca 1. INT-6 dice que `03` ≠ `3`, pero no dice cuál forma es la canónica. | Sin relleno de ceros: `String(n)` | **Sí.** Con relleno a 2 dígitos cae a 74,0 % (3597 → 2660). Acerté por inferencia (si se acepta `3`, `03` falla). Conviene escribirlo explícitamente |
| CMD-1c | Empate ALTA/HALT: "lista u orden alfabético". | Primero de la lista, con `<` estricto | Solo confirma que gana ALTA. Quedarse con el último empate falla 3 líneas, pero lista y alfabético dan lo mismo en ese par y en el log |
| CMD-0 / CMD-1a | No dice cómo se normalizan mayúsculas fuera de ASCII. | `toUpperCase()` general | **No.** Mutante ASCII-only: 100 % |
| ENT-10 | Admite que bytes frente a caracteres es un supuesto. | `Buffer.byteLength` | **No.** Mutante por caracteres: 100 % |
| ENT-4d | HEAD → 404 con cuerpo vacío (`probable`, 1 línea). | Devuelvo `''` | Solo 1 línea (devolver el JSON de E404 falla 1) |
| ENT-5b | Espacios en la cabecera: no se distingue. | Recorto espacios y tabs de los extremos | Solo 2 líneas (sin recorte: 3575/3577) |
| ENT-8 | Estado por token es `supuesto`, y la SPEC no dice cómo se asigna el token. | `route()` recibe un solo token y un solo estado | **No** (el log usa un solo token) |
| HAL-3 / ERR-14b | Orden de E520 frente a otros errores, y E520 con argumento inválido, "sin probar". | E520 tras la aridad, con cualquier argumento | Solo 3 líneas de HALT |
| ALTA-1 | No dice qué pasa tras 9999 cuentas u operaciones. | `padStart(4)` sin tope (`AC-10000`) | **No** |
| ERR-7 frente a INT-3 | ERR-7 marca E201 como `probable` (evidencia 18) mientras INT-3 lo marca `confirmado` (18, 701, 730, 731). | Seguí INT-3 | Sí: 4 líneas coinciden |

Los mutantes que sí mueven el resultado confirman que la SPEC pesa donde debe: control sin relleno (−26 %), `>=` en vez de `>`
en el límite de 100 000 (−2,4 %), reset que no reinicia contadores (−62 %), umbral de sugerencia 3 en vez de 2 (−0,3 %),
nombre de titular recortado o sin distinguir mayúsculas (−0,3 % cada uno).

## Conclusión
Con `SPEC.md`, `RETO.md` y la interfaz de `diff.ts` se reprodujo el comportamiento completo del log sin consultar `src/`.
Lo único que pude reimplementar con la SPEC y no con el log son los puntos de la tabla marcados "No": ahí el set oculto
podría diferir, y la SPEC debería afirmar un comportamiento explícito (o declararlo `supuesto`) en cada uno.
