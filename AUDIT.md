# AUDIT — auditoría independiente de SPEC.md

Rama: `audit`. Auditor independiente; sin llamadas a servicios externos (solo lectura de `RETO.md`, `SPEC.md`, `experimentos.jsonl` y `pruebas/ejemplos.jsonl`).

## Método

1. Cargué las 3577 líneas de `experimentos.jsonl`. Comprobé: ids únicos y consecutivos 1–3577; toda secuencia empieza con `POST /__reset`; `x_req` es una cuenta sin huecos (1…3248) que coincide exactamente con los `POST /msg` autenticados (incluidos 400/413), así que el log no omite requests.
2. Para cada una de las 112 filas de SPEC.md extraje los ids citados, comprobé que existen y leí request, status y response de cada uno contra la afirmación.
3. Reconstruí con scripts propios: (a) el algoritmo de control contra 3126 requests con control numérico (0 discrepancias); (b) Levenshtein ≤2 y desempate de `sugerencia` contra las 123 respuestas E301 (0 discrepancias); (c) los nombres de titular por secuencia para auditar TRA-7; (d) los replays de deriva contra `pruebas/ejemplos.jsonl` (2–21, 652–671, 744–763, 1502–1521, 3558–3577: idénticos).
4. Veredictos: **OK**, **FALSA** (la evidencia contradice), **DÉBIL** ("confirmado" con evidencia única, indirecta o que no cubre toda la afirmación) o **SIN EVIDENCIA**.

## Resumen
| Veredicto | Filas |
|---|---|
| FALSA | 1 |
| SIN EVIDENCIA | 1 |
| DÉBIL | 11 |
| OK | 99 |
| **Total** | **112** |

Los ids citados existen todos (ninguna cita apunta fuera de 1–3577). Ninguna fila marcada "confirmado" tiene menos de 2 ids. El núcleo (rutas, auth, integridad, comandos, errores y su orden, TRA-7, memoria) está bien respaldado; los problemas son una cita equivocada, una hora sin respaldo y varias afirmaciones marcadas "confirmado" que son inferencias.

## Estructura exigida por RETO.md

| Comprobación | Resultado |
|---|---|
| Las 7 secciones (Entrada, Integridad, Comandos, Memoria entre requests, Errores, Cambios durante el día, Riesgos) | OK: presentes y en ese orden. |
| Tabla `ID \| Comportamiento \| Evidencia \| Confianza` | OK en 1, 2, 4, 6 y en cada bloque de comando de 3. **Desviación**: la sección 5 usa `ID \| Orden \| Status \| Cuerpo exacto \| Cuándo \| Evidencia \| Confianza` y la 7 usa `ID \| Riesgo \| Evidencia \| Confianza \| Cómo cerrarlo`: contienen las 4 columnas pero con otros nombres/extras. |
| Sección 3: "un bloque por comando" | OK: PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA y HALT. |
| Sección 5: orden frente a otros errores | OK, pero las "pruebas de orden" van como lista fuera de tabla (todas verificadas, ver abajo). |
| Sección 6: "qué cambió, desde cuándo y cómo lo detectaste" | La sección solo dice "no cambió nada" hasta las 13:21; no cubre 13:21–20:00 (limitación, no error). |
| Niveles de confianza (confirmado/probable/supuesto) | Se usan bien; SPEC.md redefine "confirmado" como ≥2 ids, más estricto que RETO.md. |

Pruebas de orden de la sección 5 comprobadas una a una (33/34/683, 729, 727, 728, 35, 510/511, 41/42/51, 514, 504, 517, 515/519, 516, 518, 490, 491/1921/1931): todas coinciden con los datos.

## Hallazgos y veredicto por fila (ordenados por gravedad)

Gravedad 1 = peor. Las filas OK van al final con nota solo cuando hay algo que matizar.

| Grav. | ID | Veredicto | Afirmación (resumen) | Evidencia citada | Confianza SPEC | Hallazgo |
|---|---|---|---|---|---|---|
| 1 | ERR-13 | FALSA | 404 `{"error":"E401","mensaje":"cuenta inexistente"}` — cuenta inexistente | 16, 488, 489, 490, 504 | confirmado | La fila cita el id 504 como prueba de E401, pero 504 (`CONSULTA;AC-0009;extra;11`) devolvió `400 E302`, no E401. El comportamiento E401 sí está probado por 16, 488, 489, 490; el id 504 solo sirve para el orden E302>E401. La cita contradice la afirmación. |
| 2 | CAM-1 | SIN EVIDENCIA | A las ~10:30 (UTC-5), la repetición de los 20 ejemplos de la mañana dio respuestas idénticas. | 2–21 | confirmado | Los ids 2–21 son idénticos a `pruebas/ejemplos.jsonl` (verificado), pero el log no tiene marcas de hora: la hora "~10:30 (UTC-5)" no sale de ninguna línea (en CAM-2…6 la hora sí está en hipótesis/conclusión). Marcada "confirmado". |
| 3 | CMD-1d | DÉBIL | Comandos que existen: PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA y el oculto **HALT**. No existen ningun… | 525–588 | confirmado | "Comandos que existen: …" marcada confirmado. Los 64 nombres probados (525–588; la fila dice 60) solo prueban que ESOS no existen. HALT apareció por casualidad vía `sugerencia`; otro comando oculto a distancia >2 de todos los nombres probados no se descarta. La lista cerrada es una inferencia (probable). |
| 3 | DEP-6 | DÉBIL | Los saldos son exactos: 11099999999 y 119999999987 = 12·9999999999 − 1. Con el tope de 10 dígitos, llegar a 2… | 774, 788 | confirmado | 774 y 788 prueban saldos exactos (11099999999 y 119999999987), pero 788 depende de la transferencia de 1 en 787 (no citada). La conclusión "un Number basta, no hace falta BigInt" (900 000 depósitos para 2^53) es una inferencia, no una observación; no hay ningún saldo cercano a 2^53 en el log. Marcada confirmado. |
| 3 | HAL-3 | DÉBIL | Con un argumento cualquiera → `409 {"error":"E520","mensaje":"operación destructiva: detiene el servicio; ree… | 612, 614, 615, 616 | probable (E520 visto una sola… | La fila dice "con un argumento cualquiera → E520" pero solo se probó el argumento `x` (612); 614–616 prueban solo que el servicio sigue vivo. Ya está como "probable"; el texto generaliza más que la evidencia. |
| 3 | RIE-6 | DÉBIL | Los depósitos no tienen límite. | 474 | probable | "Los depósitos no tienen límite" contradice DEP-2/DEP-3 (tope de 10 dígitos, E303 con 11). Evidencia 474 (500000) solo prueba que 500000 se acepta. |
| 3 | RIE-8 | DÉBIL | Existe un comando oculto, `HALT`, que detiene el servicio y que cualquier cliente con token puede invocar. La… | 540, 612 | confirmado | Marcada "confirmado", pero el log solo prueba que HALT existe y que con un argumento devuelve E520 (540, 612). Que "detiene el servicio" es lo que dice el texto del error; no se probó (HAL-4 lo admite como supuesto) y 614–616 muestran que el servicio siguió vivo. Confianza correcta: probable. |
| 4 | INT-4 | DÉBIL | Algoritmo (ISO 7064 MOD 97‑10): se toma `m` sin su último segmento. Cada dígito cuenta como dígito y cada let… | 55–64, 146, 198, 234, 235, 334, 427, 457 | confirmado | El algoritmo es correcto: lo verifiqué contra 3126 requests del log (todos los E202/aceptados coinciden, 0 fallos). Pero los ids citados (55–64, 146, 198, 234, 235, 334, 427, 457) son respuestas E401 de CONSULTA: solo prueban que el control calculado fue aceptado; ninguno muestra un control rechazado ni el detalle de letras/espacios/no ASCII. La evidencia citada es indirecta. |
| 4 | ALTA-5 | DÉBIL | No hay límite de cuentas por nombre: se crearon 6 cuentas `Zoe` seguidas. | 2461, 2462, 2471–2474 | confirmado | "No hay límite de cuentas por nombre" se apoya en 6 altas con el mismo nombre: no basta para afirmar que no hay límite. Marcada confirmado. |
| 4 | TRA-2 | DÉBIL | Monto inválido → E303, con las mismas reglas que DEP-2, incluido el tope de 10 dígitos. Ese tope va antes que… | 492, 493, 517, 519, 814, 815 | confirmado | "Mismas reglas que DEP-2" para el monto: en TRANSFER solo se probaron `0`, `-5`, `abc` y 11 dígitos (492, 493, 519, 814); no se probaron `0100`, `1e3`, `+1`, `10.5` ni espacios. El resto es inferencia. Los dos hechos de tope (E303 con 11 dígitos, E506 con 10: 814, 815) sí están probados. |
| 5 | ENT-2 | DÉBIL | `GET /health` con token → `200 {"ok":true}`. Sin token → `401 E001`. | 23, 648 | confirmado | Cada mitad tiene una sola línea: "con token → 200" solo en 23 y "sin token → 401" solo en 648 (más 802 para token malo). Marcada confirmado con 2 ids en total. |
| 6 | ENT-4d | DÉBIL | `HEAD /health` → 404 con cuerpo vacío: HEAD no se trata como GET. | 691 | probable | `HEAD /health` → 404 con cuerpo vacío (691); un HEAD nunca lleva cuerpo, así que el cuerpo no distingue nada, y solo se mide el status 404. Declarada probable: aceptable, evidencia mínima. |
| 6 | PING-1 | DÉBIL | `PING;<control>` → `200 {"pong":true}`. No cambia el estado. | 2, 45, 52, 53 | confirmado | "No cambia el estado" no se prueba directamente en ninguna línea citada (2, 45, 52, 53 son PING sueltos; no hay un CONSULTA/ALTA antes y después). El 200 `{"pong":true}` sí está probado. |
| 8 | ENT-10 | OK | Tamaño máximo del cuerpo: 8192 bytes. Con 8193 o más → `413 {"error":"E101","mensaje":"cuerpo demasiado grand… | 702, 703, 714–729 | confirmado | Verificado: 8192 bytes aceptados (726), 8193 rechazados (725), 8191 aceptados (717), orden frente a 401/404/E100 (727–729). La fila reconoce que solo se probó ASCII. |
| 8 | CMD-1b | OK | Con distancia ≥ 3 a todos los comandos no hay `sugerencia`: se probaron 60 nombres. Un intercambio de letras … | 525–588, 604, 608 | confirmado | Correcto (verificado: las 123 respuestas E301 del log coinciden con Levenshtein ≤2 sobre las 7 palabras, 0 fallos). Notas: 525–588 incluye 5 ids con sugerencia (539, 540, 574–576), así que son ~59 nombres sin sugerencia + 604 y 608, no "60". |
| 8 | TRA-7 | OK | **Si el origen y el destino tienen el mismo nombre de titular** (el nombre dado en ALTA, comparado de forma e… | 1602, 1942, 1952, 1978, 1980, 1981, 1988, 1990, 2000, 2418,… | confirmado | Confirmado. De los 19 ids, 1602, 1942, 1952, 1978, 1980, 2418, 2421, 2874, 2875, 2992, 3236 prueban la exención entre mismo nombre; 1988, 1990, 2725, 2828, 2942, 3003 prueban la comparación exacta (nombres distintos → E506); 2000 (nombres `A` y `B`) es un caso de nombres distintos y no aporta a la regla. Verificado con una reconstrucción de nombres por secuencia. |
| 8 | CAM-6 | OK | A las 13:21 (UTC-5), `probe/drift.ts` dio 20 de 20 idénticos. Antes, 80 secuencias de fuzz de negocio v2 (sem… | 2494–3556, 3558–3577 | confirmado | Verificado: 80 secuencias (fuzzbjn, fuzzbmg), 0 DIFERENCIA; drift 3558–3577 idéntico a ejemplos; `drift-182139` = 13:21 UTC-5, consistente. |
| 8 | CAM-5 | OK | A las ~13:08 (UTC-5), `probe/drift.ts` dio 20 de 20 idénticos. Entre medias, 80 secuencias de fuzz de negocio… | 1522–2413, 1920, 2423–2442 | confirmado | Verificado: 80 secuencias (fuzzbb8, fuzzbe1), una sola DIFERENCIA (1602, explicada por TRA-7); drift 2423–2442 idéntico a ejemplos; 1920 repite 491 con el mismo resultado. La hora "~13:08" sale del nombre `drift-180826` (18:08 UTC = 13:08 UTC-5, consistente). |
| 8 | CAM-4 | OK | A las 12:52 (UTC-5), la cuarta repetición de los 20 ejemplos dio respuestas idénticas. Entre medias, 90 secue… | 816–1500, 1502–1521 | confirmado | Verificado: 90 secuencias fuzz (fuzz2t, fuzz5m, fuzz8f), todas las conclusiones "coincide con el reemplazo local"; replay 1502–1521 idéntico a ejemplos. Las conclusiones las escribe el propio script del equipo (no hay forma de recalcularlas sin el reemplazo). |
| 9 | ENT-5b | OK | Con espacios al principio o al final del valor de la cabecera se obtuvo 200. Probablemente los quitó el clien… | 793, 794 | probable | Probable y bien razonado: 793/794 devuelven 200; la fila admite que no distingue de la forma exacta. |
| 9 | ENT-8 | OK | Cada token tiene su propio estado. | README | supuesto | Supuesto declarado; la cita es "README", no un id (correcto para un supuesto). |
| 9 | HAL-4 | OK | No se probó el formato de la confirmación, a propósito, por ser destructivo. El reemplazo responde E520 a cua… | — | supuesto | Supuesto declarado, sin evidencia por diseño. |
| 9 | ERR-7 | OK | 400 `{"error":"E201","mensaje":"control mal formado"}` — control no numérico | 18 | probable | La evidencia 18 es válida. Está infravalorada: INT-3 cita 18, 701, 730, 731 como confirmado; la misma conducta aquí figura como "probable" (inconsistencia menor). |
| 9 | CAM-3 | OK | A las 12:26 (UTC-5), la tercera repetición de los 20 ejemplos dio respuestas idénticas. | 744–763 | confirmado | Verificado: 744–763 idénticos a ejemplos; hora en la hipótesis. |
| 9 | CAM-2 | OK | A las 12:20 (UTC-5), la segunda repetición de los 20 ejemplos también dio respuestas idénticas: sin cambios d… | 652–671 | confirmado | Verificado: 652–671 idénticos a ejemplos; hora en la hipótesis. |
| — | ENT-1 | OK | `POST /msg` con cuerpo JSON `{"m":"<segmentos separados por ;>"}`. El último segmento es el dígito de control. | 2–21 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-2b | OK | `POST /__reset` sin token → `401 E001` y no reinicia el estado. | 649, 650 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-3 | OK | `POST /__reset` → `200 {"ok":true}`. Vuelve al estado inicial: sin cuentas ni operaciones, y los contadores e… | 1, 22, 44, 461, 472 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-4 | OK | Solo existen `POST /msg`, `POST /__reset` y `GET /health`. Cualquier otra combinación de método y ruta (GET/P… | 24, 25, 26, 673–682 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-4b | OK | La ruta se compara de forma exacta: distingue mayúsculas (`/MSG`, `/HEALTH`) y no acepta barra final (`/msg/`… | 684, 685, 688, 689, 690 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-4c | OK | La query string se ignora: `/msg?x=1` y `/health?x=1` funcionan normalmente. | 686, 687 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-5 | OK | Autenticación: la cabecera debe ser exactamente `Authorization: Bearer <token>`, con `Bearer` tal cual (disti… | 27, 28, 790, 791, 792, 795–800, 802 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-6 | OK | La ruta se evalúa antes que la autenticación: una ruta desconocida sin token da 404, no 401. | 33, 34 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-7 | OK | La autenticación se evalúa antes que el tamaño y que el parseo del JSON. | 35, 727 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-11 | OK | El Content-Type se ignora: el cuerpo se parsea como JSON aunque sea `text/plain` o falte. | 704, 705 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-12 | OK | Cuerpo vacío o sin cuerpo → E100. BOM al inicio → E100. Se aceptan espacios y saltos de línea alrededor del J… | 706, 707, 712, 713 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-13 | OK | JSON válido que no es un objeto con `m` string (`[]`, `null`, `"texto"`) → E102. Los campos extra se ignoran.… | 694, 708, 709, 710, 711 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ENT-9 | OK | Header de respuesta `X-Req`: contador numérico (ver MEM-6). Los headers no se califican. | 2–21, 36, 52 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-1 | OK | Si `m` no tiene `;`, no hay control → `E103` | 31, 39 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-2 | OK | Si hay un segmento vacío en cualquier posición, incluido el control → `E104`. Se evalúa antes que el control. | 40, 505, 509, 510, 511 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-3 | OK | El control debe ser solo dígitos (`[0-9]+`): `5X`, `+14`, `14 ` y `14 ` → `E201`. No se recortan espacios. | 18, 701, 730, 731 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-3b | OK | Un `;` final deja vacío el último segmento → E104. | 698, 699 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-5 | OK | Predicción a ciegas: 10 de 10 mensajes nuevos aceptados. | 461–470 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-6 | OK | El control se compara como texto: `03` no equivale a `3`. | 43 | probable | Evidencia revisada: coincide con la afirmación. |
| — | INT-7 | OK | Los espacios se ignoran en el control: no cuentan, ni siquiera como 0. Con el control de `ALTA;AnaMaria` vale… | 47, 48, 807, 808, 809 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-8 | OK | Los caracteres no ASCII (`Ñ`, `ú`) se ignoran en el control. | 508 | probable | Evidencia revisada: coincide con la afirmación. |
| — | INT-9 | OK | `PING` no valida el control, ni el valor ni el formato: `PING;0`, `PING;1`, `PING;5X`, `PING;64 ` y `PING;64 … | 2, 39, 40, 458, 459, 695, 696, 700 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | INT-10 | OK | El control se valida antes que el comando y que la aridad. | 41, 42, 50, 51 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CMD-0 | OK | El nombre del comando no distingue mayúsculas (`ping`, `Ping`, `CONSULTa`). No se recortan espacios: `PING ` … | 12, 45, 46, 47, 48 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CMD-1 | OK | Comando desconocido → `400 {"error":"E301","mensaje":"comando desconocido "}`, con espacio al final. | 13, 50, 525–604 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CMD-1a | OK | Se añade `"sugerencia":"<COMANDO>"` si la distancia de Levenshtein clásica, sin distinguir mayúsculas y sobre… | 47, 48, 539, 540, 574–576, 589–604, 609, 610 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CMD-1c | OK | En un empate entre ALTA y HALT gana ALTA. No se distingue si es por orden de la lista o alfabético; el reempl… | 606, 607 | probable | Evidencia revisada: coincide con la afirmación. |
| — | CMD-2 | OK | Si el número de argumentos no es el del comando → `400 {"error":"E302","mensaje":"aridad inválida"}` | 21, 499–504 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | PING-2 | OK | `PING;x;<c>` → E302 | 499 | probable | Evidencia revisada: coincide con la afirmación. |
| — | ALTA-1 | OK | Crea una cuenta con saldo 0 → `201 {"cuentaId":"AC-NNNN"}`: secuencial, empieza en 0001 tras el reset, 4 dígi… | 4, 5, 6, 44, 461, 462, 472, 473 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ALTA-2 | OK | Acepta nombres con espacios internos, al principio o al final, solo espacios, tabuladores, números, 200 carac… | 469, 506, 507, 508, 804–807, 810, 811, 1990 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ALTA-3 | OK | Nombre literalmente vacío (`ALTA;;c`) → E104. Un nombre de solo espacios no cuenta como vacío y crea la cuent… | 21, 505, 621, 622, 810, 812 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ALTA-4 | OK | Los nombres pueden repetirse: un `ALTA;Ana` duplicado crea otra cuenta. Dos cuentas con el mismo nombre se tr… | 619, 620, 1976, 1977 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CON-1 | OK | → `200 {"cuenta_id":"AC-NNNN","saldo":N}`. Ojo: la clave es `cuenta_id`, no `cuentaId`. | 6, 9, 12, 20 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CON-2 | OK | Cuenta inexistente → `404 {"error":"E401","mensaje":"cuenta inexistente"}` | 16, 467 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | CON-3 | OK | Los ids de cuenta se comparan de forma exacta en todos los comandos: distinguen mayúsculas, no se recortan es… | 468, 641, 642, 643, 644, 645 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | DEP-1 | OK | Suma el monto al saldo → `200 {"status":"recieved","operacionId":"OP-NNNN"}`, con `recieved` mal escrito tal … | 7, 19, 20, 463, 474, 475 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | DEP-2 | OK | El monto debe cumplir `^[1-9][0-9]{0,9}$`: entero > 0, solo dígitos, sin ceros a la izquierda y **como máximo… | 476–484, 646, 767–773 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | DEP-3 | OK | Los depósitos no tienen límite de importe más allá del tope de 10 dígitos: 500000 y 9999999999 se aceptaron, … | 474, 771, 775–786 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | DEP-7 | OK | DEPOSITO no depende del nombre del titular: 100001 se acepta igual con los nombres `Ana`, `ADMIN`, `BANCO`, `… | 2451–2457 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | DEP-4 | OK | Cuenta inexistente con monto válido → `404 E401`. Con monto inválido gana E303. | 626, 515 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | DEP-5 | OK | El monto con signo `+` → E303: solo se aceptan dígitos. | 646 | probable | Evidencia revisada: coincide con la afirmación. |
| — | TRA-1 | OK | Mueve el monto de origen a destino → `200 {"status":"recieved","operacionId":"OP-NNNN"}` | 8, 9, 11, 464, 485, 494 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | TRA-3 | OK | Origen igual a destino → `400 {"error":"E304","mensaje":"origen y destino iguales"}` | 487, 516, 518 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | TRA-4 | OK | Origen o destino inexistente → `404 E401` | 488, 489, 490 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | TRA-5 | OK | Límite por operación de 100000, inclusivo, **solo entre titulares distintos** (ver TRA-7). Más → `422 {"error… | 10, 11, 485, 486, 1917, 1918, 1921, 1926, 1931, 1983, 1984 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | TRA-6 | OK | Saldo del origen menor que el monto → `422 {"error":"E507","mensaje":"saldo insuficiente"}`. Transferir exact… | 17, 627, 629, 630 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | TRA-7b | OK | Los nombres que solo se diferencian en las tildes (`José` frente a `Jose`) cuentan como titulares distintos: … | 2540 | probable | Evidencia revisada: coincide con la afirmación. |
| — | TRA-8 | OK | No hay límite acumulado: tres transferencias de 100000 desde el mismo origen, más una desde otra cuenta del m… | 2466, 2467, 2468, 2469, 2470 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ANU-1 | OK | Revierte la operación → `200 {"ok":true,"anulada":"OP-NNNN"}`. En una transferencia, devuelve el monto al ori… | 14, 17, 465, 466 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ANU-2 | OK | Anular otra vez → `200 {"ok":false,"motivo":"ya anulada"}`. Ojo: status 200. | 15, 638 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ANU-3 | OK | Se puede anular un depósito aunque el saldo ya se haya gastado: el saldo queda **negativo**. | 495, 496, 631, 632 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ANU-3b | OK | Se puede anular una transferencia aunque el destino ya haya gastado el monto: el destino queda **negativo** y… | 635, 636, 637 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ANU-3c | OK | ANULA de una transferencia entre cuentas del mismo titular (TRA-7) se comporta igual que ANU-3b: el destino q… | 2482, 2483, 2484, 2485 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ANU-4 | OK | Operación inexistente o id mal formado → `404 {"error":"E402","mensaje":"operación inexistente"}`. También un… | 497, 498, 639, 640, 2487, 2488, 2491, 2492 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | HAL-1 | OK | HALT existe. Se descubrió por la `sugerencia` de `HELP`, y responde E302/E520 en lugar de E301. | 540, 612, 613, 617 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | HAL-2 | OK | Sin argumentos → E302, así que su aridad es 1. No distingue mayúsculas. | 613, 617 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | MEM-1 | OK | El servicio guarda las cuentas (id, **nombre del titular** y saldo), las operaciones (tipo, cuentas, monto y … | 2–21, 1978, 1988, 2000 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | MEM-2 | OK | Los contadores AC y OP son independientes. `/__reset` los reinicia a 0001 y borra todo el estado anterior. | 44, 461, 472, 474, 733–742 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | MEM-3 | OK | Solo los éxitos consumen números. Las operaciones que fallan (E303, E401, E506, E507) no consumen número de O… | 10, 11, 621–628, 633 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | MEM-4 | OK | El estado de anulación se recuerda: la segunda ANULA da `ok:false`. | 14, 15, 635, 638 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | MEM-5 | OK | Los saldos reflejan todas las operaciones válidas no anuladas. Los errores no cambian el estado. | 9, 20, 475, 484, 494 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | MEM-6 | OK | `X-Req` cuenta los `POST /msg` autenticados (incluidos los que dan 400) y no se reinicia con `/__reset`. Vien… | 21–31, 36, 52, 53 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-1 | OK | 404 `{"error":"E404","mensaje":"ruta desconocida"}` — ruta o método desconocido | 24–26, 33, 34 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-2 | OK | 401 `{"error":"E001","mensaje":"no autorizado"}` — sin token o token inválido | 27, 28, 35 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-2b | OK | 413 `{"error":"E101","mensaje":"cuerpo demasiado grande"}` — cuerpo > 8192 bytes | 702, 703, 716, 725, 728 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-3 | OK | 400 `{"error":"E100","mensaje":"json inválido"}` — el cuerpo no es JSON: vacío, sin cuerpo o con BOM | 29, 706, 707, 712 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-4 | OK | 400 `{"error":"E102","mensaje":"falta m"}` — sin `m`, o `m` no es string | 30, 36, 37, 38 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-5 | OK | 400 `{"error":"E103","mensaje":"falta control"}` — `m` sin `;` (incluido `""`) | 31, 39 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-6 | OK | 400 `{"error":"E104","mensaje":"segmento vacío"}` — algún segmento vacío | 40, 505, 509, 510, 511 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-8 | OK | 400 `{"error":"E202","mensaje":"control inválido"}` — control incorrecto | 3, 41, 42, 43, 51 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-9 | OK | 400 `{"error":"E301","mensaje":"comando desconocido "}` (+ `sugerencia` opcional) — comando desconocido | 13, 47, 48, 50 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-10 | OK | 400 `{"error":"E302","mensaje":"aridad inválida"}` — número de argumentos incorrecto | 21, 499–504, 514 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-11 | OK | 400 `{"error":"E303","mensaje":"monto inválido"}` — monto no entero positivo canónico | 476–483, 515, 517, 519 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-12 | OK | 400 `{"error":"E304","mensaje":"origen y destino iguales"}` — TRANSFER a la misma cuenta | 487, 516, 518 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-14 | OK | 404 `{"error":"E402","mensaje":"operación inexistente"}` — ANULA de una operación inexistente | 497, 498 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-14b | OK | 409 `{"error":"E520","mensaje":"operación destructiva: detiene el servicio; reenvía con confirmación"}` — HAL… | 612 | probable (visto una vez; orde… | Evidencia revisada: coincide con la afirmación. |
| — | ERR-15 | OK | 422 `{"error":"E506","mensaje":"límite excedido"}` — TRANSFER > 100000 entre titulares distintos | 10, 486, 491, 1917, 1931, 1983 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | ERR-16 | OK | 422 `{"error":"E507","mensaje":"saldo insuficiente"}` — saldo < monto (entre mismo titular, también por encim… | 17, 627, 630, 1978, 1942 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-10 | OK | El límite de 100000 por transferencia se esquiva creando una cuenta con el mismo nombre que el origen, porque… | 1976–1981, 2418 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-1 | OK | ANULA de un depósito ya gastado, o de una transferencia cuyo destino ya gastó, deja saldos negativos. | 495, 496, 632, 637 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-2 | OK | El dígito de control es un checksum público (MOD 97‑10), no una firma: cualquiera puede generar mensajes váli… | 461–470 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-3 | OK | `PING` no valida el control. | 458, 459 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-4 | OK | Los ids de cuenta y de operación son secuenciales y se pueden enumerar. Además, E401/E402 revelan si un id ex… | 4, 5, 16, 497 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-5 | OK | Las respuestas no son consistentes: `cuentaId` frente a `cuenta_id`, `"recieved"` mal escrito, espacio al fin… | 4, 6, 7, 13, 15 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-9 | OK | La `sugerencia` de E301 enumera los comandos existentes. | 589–604 | confirmado | Evidencia revisada: coincide con la afirmación. |
| — | RIE-7 | OK | `X-Req` revela el volumen de requests del token y no se reinicia. | 36, 52 | confirmado | Evidencia revisada: coincide con la afirmación. |

## Recomendaciones

1. **ERR-13**: quitar 504 de la evidencia (dejar 16, 488, 489, 490).
2. **CAM-1**: quitar la hora "~10:30" o respaldarla (el log no tiene marcas de hora) y bajar a probable.
3. **CMD-1d, DEP-6, ALTA-5, TRA-2, RIE-8, RIE-6, HAL-3**: pasar a "probable" o añadir el experimento que falta (monto TRANSFER `0100`/`1e3`/`+1`/`10.5`; un comando oculto adicional a distancia >2; etc.). RIE-6 debe alinearse con DEP-2 (tope de 10 dígitos).
4. **INT-4**: añadir como evidencia un control rechazado con letras/espacios/no ASCII (p. ej. 3, 43, 809) además de las aceptaciones.
5. Unificar las columnas de las secciones 5 y 7 con la tabla de 4 columnas exigida, o añadir una aclaración.
6. Volver a correr la deriva cerca de las 20:00: el SPEC solo garantiza "sin cambios" hasta las 13:21.
