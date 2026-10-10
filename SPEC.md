# SPEC · Servicio "caja negra" (borrador)

La evidencia son ids de `experimentos.jsonl`. La confianza es: **confirmado** (probado y con 2 o más ids de evidencia),
**probable** (visto una vez o inferido) o **supuesto** (no probado; es lo que hace nuestro reemplazo por defecto).
Los cuerpos se escriben exactos. Todos los textos van en español y con tildes.

## 1. Entrada
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ENT-1 | `POST /msg` con cuerpo JSON `{"m":"<segmentos separados por ;>"}`. El último segmento es el dígito de control. | 2–21 | confirmado |
| ENT-2 | `GET /health` con token → `200 {"ok":true}`. Sin token → `401 E001`. | 23, 648 | confirmado |
| ENT-2b | `POST /__reset` sin token → `401 E001` y no reinicia el estado. | 649, 650 | confirmado |
| ENT-3 | `POST /__reset` → `200 {"ok":true}`. Vuelve al estado inicial: sin cuentas ni operaciones, y los contadores empiezan otra vez en `AC-0001` y `OP-0001`. | 1, 22, 44, 461, 472 | confirmado |
| ENT-4 | Solo existen `POST /msg`, `POST /__reset` y `GET /health`. Cualquier otra combinación de método y ruta (GET/PUT/DELETE/PATCH sobre /msg, GET/PUT/DELETE sobre /__reset, POST/PUT/DELETE sobre /health, `GET /`) → `404 {"error":"E404","mensaje":"ruta desconocida"}` | 24, 25, 26, 673–682 | confirmado |
| ENT-4b | La ruta se compara de forma exacta: distingue mayúsculas (`/MSG`, `/HEALTH`) y no acepta barra final (`/msg/`, `/health/`) ni `//msg` → 404. | 684, 685, 688, 689, 690 | confirmado |
| ENT-4c | La query string se ignora: `/msg?x=1` y `/health?x=1` funcionan normalmente. | 686, 687 | confirmado |
| ENT-4d | `HEAD /health` → 404 con cuerpo vacío: HEAD no se trata como GET. | 691 | probable |
| ENT-5 | Autenticación: la cabecera debe ser exactamente `Authorization: Bearer <token>`, con `Bearer` tal cual (distingue mayúsculas), un solo espacio y el token exacto. Cualquier otra forma → `401 {"error":"E001","mensaje":"no autorizado"}`: sin cabecera, token desconocido, `bearer`/`BEARER`, doble espacio, `Basic`, token sin esquema, `Bearer` sin token, token con un carácter extra o dos credenciales. Aplica igual en `/health`. | 27, 28, 790, 791, 792, 795–800, 802 | confirmado |
| ENT-5b | Con espacios al principio o al final del valor de la cabecera se obtuvo 200. Probablemente los quitó el cliente HTTP antes de enviar, como manda el estándar de cabeceras, y node:http hace lo mismo al recibir, así que no se distingue de la forma exacta. | 793, 794 | probable |
| ENT-6 | La ruta se evalúa antes que la autenticación: una ruta desconocida sin token da 404, no 401. | 33, 34 | confirmado |
| ENT-7 | La autenticación se evalúa antes que el tamaño y que el parseo del JSON. | 35, 727 | confirmado |
| ENT-10 | Tamaño máximo del cuerpo: 8192 bytes. Con 8193 o más → `413 {"error":"E101","mensaje":"cuerpo demasiado grande"}`. Se evalúa después de la ruta (404) y de la autenticación (401), y antes del parseo del JSON (E100). Se probó solo con ASCII; que cuente bytes y no caracteres es una suposición. | 702, 703, 714–729 | confirmado |
| ENT-11 | El Content-Type se ignora: el cuerpo se parsea como JSON aunque sea `text/plain` o falte. | 704, 705 | confirmado |
| ENT-12 | Cuerpo vacío o sin cuerpo → E100. BOM al inicio → E100. Se aceptan espacios y saltos de línea alrededor del JSON. | 706, 707, 712, 713 | confirmado |
| ENT-13 | JSON válido que no es un objeto con `m` string (`[]`, `null`, `"texto"`) → E102. Los campos extra se ignoran. Con la clave `m` duplicada gana la última. | 694, 708, 709, 710, 711 | confirmado |
| ENT-8 | Cada token tiene su propio estado. | README | supuesto |
| ENT-9 | Header de respuesta `X-Req`: contador numérico (ver MEM-6). Los headers no se califican. | 2–21, 36, 52 | confirmado |

## 2. Integridad
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| INT-1 | Si `m` no tiene `;`, no hay control → `E103` | 31, 39 | confirmado |
| INT-2 | Si hay un segmento vacío en cualquier posición, incluido el control → `E104`. Se evalúa antes que el control. | 40, 505, 509, 510, 511 | confirmado |
| INT-3 | El control debe ser solo dígitos (`[0-9]+`): `5X`, `+14`, `14 ` y `14
` → `E201`. No se recortan espacios. | 18, 701, 730, 731 | confirmado |
| INT-3b | Un `;` final deja vacío el último segmento → E104. | 698, 699 | confirmado |
| INT-4 | Algoritmo (ISO 7064 MOD 97‑10): se toma `m` sin su último segmento. Cada dígito cuenta como dígito y cada letra como su posición en el alfabeto, sin distinguir mayúsculas (A=1 … Z=26, en decimal). Todo lo demás (`;`, `-`, espacios, caracteres no ASCII) se ignora. Con la cadena resultante N, `control = 98 − (N·100 mod 97)`, en el rango 1–98. | 55–64, 146, 198, 234, 235, 334, 427, 457 | confirmado |
| INT-5 | Predicción a ciegas: 10 de 10 mensajes nuevos aceptados. | 461–470 | confirmado |
| INT-6 | El control se compara como texto: `03` no equivale a `3`. | 43 | probable |
| INT-7 | Los espacios se ignoran en el control: no cuentan, ni siquiera como 0. Con el control de `ALTA;AnaMaria` vale `ALTA;  Ana  Maria  `. En el comando no se ignoran (ver CMD-0). | 47, 48, 807, 808, 809 | confirmado |
| INT-8 | Los caracteres no ASCII (`Ñ`, `ú`) se ignoran en el control. | 508 | probable |
| INT-9 | `PING` no valida el control, ni el valor ni el formato: `PING;0`, `PING;1`, `PING;5X`, `PING;64 ` y `PING;64
` dan 200. Sí aplican E103 (falta `;`) y E104 (segmento vacío). | 2, 39, 40, 458, 459, 695, 696, 700 | confirmado |
| INT-10 | El control se valida antes que el comando y que la aridad. | 41, 42, 50, 51 | confirmado |

## 3. Comandos
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CMD-0 | El nombre del comando no distingue mayúsculas (`ping`, `Ping`, `CONSULTa`). No se recortan espacios: `PING ` o ` PING` dan E301. | 12, 45, 46, 47, 48 | confirmado |
| CMD-1 | Comando desconocido → `400 {"error":"E301","mensaje":"comando desconocido "}`, con espacio al final. | 13, 50, 525–604 | confirmado |
| CMD-1a | Se añade `"sugerencia":"<COMANDO>"` si la distancia de Levenshtein clásica, sin distinguir mayúsculas y sobre el segmento tal cual (incluidos los espacios), hasta algún comando conocido es ≤ 2. Se sugiere el más cercano, siempre en mayúsculas. El umbral es absoluto, no depende de la longitud. | 47, 48, 539, 540, 574–576, 589–604, 609, 610 | confirmado |
| CMD-1b | Con distancia ≥ 3 a todos los comandos no hay `sugerencia`: se probaron 60 nombres. Un intercambio de letras cuenta 2, no 1 (no es Damerau): `PNIGX` no sugiere nada. | 525–588, 604, 608 | confirmado |
| CMD-1c | En un empate entre ALTA y HALT gana ALTA. No se distingue si es por orden de la lista o alfabético; el reemplazo usa la lista PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA, HALT. | 606, 607 | probable |
| CMD-1d | Comandos que existen: PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA y el oculto **HALT**. No existen ninguno de los 60 nombres probados, por ejemplo BAJA, RETIRO, SALDO, HISTORIAL, AYUDA, HELP, VERSION o RESET. | 525–588 | confirmado |
| CMD-2 | Si el número de argumentos no es el del comando → `400 {"error":"E302","mensaje":"aridad inválida"}` | 21, 499–504 | confirmado |

### PING (0 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| PING-1 | `PING;<control>` → `200 {"pong":true}`. No cambia el estado. | 2, 45, 52, 53 | confirmado |
| PING-2 | `PING;x;<c>` → E302 | 499 | probable |

### ALTA;nombre (1 argumento)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ALTA-1 | Crea una cuenta con saldo 0 → `201 {"cuentaId":"AC-NNNN"}`: secuencial, empieza en 0001 tras el reset, 4 dígitos con ceros a la izquierda. | 4, 5, 6, 44, 461, 462, 472, 473 | confirmado |
| ALTA-2 | Acepta nombres con espacios internos, al principio o al final, solo espacios, tabuladores, números, 200 caracteres y caracteres no ASCII. El nombre se guarda tal cual, sin recortar: `"Zoe "` y `"Zoe"` son titulares distintos para TRA-7 (1990). Ningún comando devuelve el nombre. | 469, 506, 507, 508, 804–807, 810, 811, 1990 | confirmado |
| ALTA-3 | Nombre literalmente vacío (`ALTA;;c`) → E104. Un nombre de solo espacios no cuenta como vacío y crea la cuenta. Dos argumentos → E302. | 21, 505, 621, 622, 810, 812 | confirmado |
| ALTA-4 | Los nombres pueden repetirse: un `ALTA;Ana` duplicado crea otra cuenta. Dos cuentas con el mismo nombre se tratan como del mismo titular (TRA-7). | 619, 620, 1976, 1977 | confirmado |
| ALTA-5 | No hay límite de cuentas por nombre: se crearon 6 cuentas `Zoe` seguidas. | 2461, 2462, 2471–2474 | confirmado |

### CONSULTA;cuenta (1 argumento)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CON-1 | → `200 {"cuenta_id":"AC-NNNN","saldo":N}`. Ojo: la clave es `cuenta_id`, no `cuentaId`. | 6, 9, 12, 20 | confirmado |
| CON-2 | Cuenta inexistente → `404 {"error":"E401","mensaje":"cuenta inexistente"}` | 16, 467 | confirmado |
| CON-3 | Los ids de cuenta se comparan de forma exacta en todos los comandos: distinguen mayúsculas, no se recortan espacios y no se rellenan ceros. `ac-0001`, ` AC-0001`, `AC-0001 ` y `AC-1` → E401. | 468, 641, 642, 643, 644, 645 | confirmado |

### DEPOSITO;cuenta;monto (2 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| DEP-1 | Suma el monto al saldo → `200 {"status":"recieved","operacionId":"OP-NNNN"}`, con `recieved` mal escrito tal cual. | 7, 19, 20, 463, 474, 475 | confirmado |
| DEP-2 | El monto debe cumplir `^[1-9][0-9]{0,9}$`: entero > 0, solo dígitos, sin ceros a la izquierda y **como máximo 10 dígitos** (máximo 9999999999). Si no → `400 {"error":"E303","mensaje":"monto inválido"}`, sin efecto sobre el saldo. Falla con: `0`, `-100`, `10.5`, `0100`, `1e3`, `+100`, `abc`, `" 100"`, 11 dígitos o más, incluidos 2^53 y 2^53−1. Pasa con 9 y 10 dígitos. | 476–484, 646, 767–773 | confirmado |
| DEP-3 | Los depósitos no tienen límite de importe más allá del tope de 10 dígitos: 500000 y 9999999999 se aceptaron, y doce depósitos seguidos de 9999999999 también. | 474, 771, 775–786 | confirmado |
| DEP-6 | Los saldos son exactos: 11099999999 y 119999999987 = 12·9999999999 − 1. Con el tope de 10 dígitos, llegar a 2^53 exigiría unos 900 000 depósitos, así que un `Number` de JavaScript basta y no hace falta BigInt. | 774, 788 | confirmado |
| DEP-7 | DEPOSITO no depende del nombre del titular: 100001 se acepta igual con los nombres `Ana`, `ADMIN`, `BANCO`, `SISTEMA`, `HALT` y `0`. | 2451–2457 | confirmado |
| DEP-4 | Cuenta inexistente con monto válido → `404 E401`. Con monto inválido gana E303. | 626, 515 | confirmado |
| DEP-5 | El monto con signo `+` → E303: solo se aceptan dígitos. | 646 | probable |

### TRANSFER;origen;destino;monto (3 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| TRA-1 | Mueve el monto de origen a destino → `200 {"status":"recieved","operacionId":"OP-NNNN"}` | 8, 9, 11, 464, 485, 494 | confirmado |
| TRA-2 | Monto inválido → E303, con las mismas reglas que DEP-2, incluido el tope de 10 dígitos. Ese tope va antes que el límite: 11 dígitos dan E303 y 10 dígitos dan E506. | 492, 493, 517, 519, 814, 815 | confirmado |
| TRA-3 | Origen igual a destino → `400 {"error":"E304","mensaje":"origen y destino iguales"}` | 487, 516, 518 | confirmado |
| TRA-4 | Origen o destino inexistente → `404 E401` | 488, 489, 490 | confirmado |
| TRA-5 | Límite por operación de 100000, inclusivo, **solo entre titulares distintos** (ver TRA-7). Más → `422 {"error":"E506","mensaje":"límite excedido"}`. No es acumulado. Entre titulares distintos, E506 gana a E507 con cualquier saldo (0, 1, negativo o casi suficiente). | 10, 11, 485, 486, 1917, 1918, 1921, 1926, 1931, 1983, 1984 | confirmado |
| TRA-6 | Saldo del origen menor que el monto → `422 {"error":"E507","mensaje":"saldo insuficiente"}`. Transferir exactamente el saldo está permitido (`saldo >= monto`). | 17, 627, 629, 630 | confirmado |
| TRA-7 | **Si el origen y el destino tienen el mismo nombre de titular** (el nombre dado en ALTA, comparado de forma exacta: distingue mayúsculas y no recorta espacios), **no se aplica el límite E506**. Una transferencia de 150000 o de 9999999999 pasa si hay saldo, y con saldo insuficiente se responde E507. El tope de 10 dígitos (E303) sigue aplicando. | 1602, 1942, 1952, 1978, 1980, 1981, 1988, 1990, 2000, 2418, 2421, 2725, 2828, 2874, 2875, 2942, 2992, 3003, 3236 | confirmado |
| TRA-7b | Los nombres que solo se diferencian en las tildes (`José` frente a `Jose`) cuentan como titulares distintos: E506. | 2540 | probable |
| TRA-8 | No hay límite acumulado: tres transferencias de 100000 desde el mismo origen, más una desde otra cuenta del mismo titular, pasan todas (400000 en total). | 2466, 2467, 2468, 2469, 2470 | confirmado |

### ANULA;operacion (1 argumento)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ANU-1 | Revierte la operación → `200 {"ok":true,"anulada":"OP-NNNN"}`. En una transferencia, devuelve el monto al origen y lo quita del destino. | 14, 17, 465, 466 | confirmado |
| ANU-2 | Anular otra vez → `200 {"ok":false,"motivo":"ya anulada"}`. Ojo: status 200. | 15, 638 | confirmado |
| ANU-3 | Se puede anular un depósito aunque el saldo ya se haya gastado: el saldo queda **negativo**. | 495, 496, 631, 632 | confirmado |
| ANU-3b | Se puede anular una transferencia aunque el destino ya haya gastado el monto: el destino queda **negativo** y el origen recupera el monto. No se comprueba el saldo al anular. | 635, 636, 637 | confirmado |
| ANU-3c | ANULA de una transferencia entre cuentas del mismo titular (TRA-7) se comporta igual que ANU-3b: el destino queda negativo si ya gastó el dinero y el origen recupera el monto. | 2482, 2483, 2484, 2485 | confirmado |
| ANU-4 | Operación inexistente o id mal formado → `404 {"error":"E402","mensaje":"operación inexistente"}`. También un id de cuenta (`ANULA;AC-0001`), exista o no la cuenta, y una operación de una secuencia anterior al reset. El id se compara de forma exacta: `op-0001` y `OP-1` → E402. | 497, 498, 639, 640, 2487, 2488, 2491, 2492 | confirmado |

### HALT;x (1 argumento, comando oculto)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| HAL-1 | HALT existe. Se descubrió por la `sugerencia` de `HELP`, y responde E302/E520 en lugar de E301. | 540, 612, 613, 617 | confirmado |
| HAL-2 | Sin argumentos → E302, así que su aridad es 1. No distingue mayúsculas. | 613, 617 | confirmado |
| HAL-3 | Con un argumento cualquiera → `409 {"error":"E520","mensaje":"operación destructiva: detiene el servicio; reenvía con confirmación"}`. No cambia el estado y el servicio sigue respondiendo. | 612, 614, 615, 616 | probable (E520 visto una sola vez) |
| HAL-4 | No se probó el formato de la confirmación, a propósito, por ser destructivo. El reemplazo responde E520 a cualquier argumento. | — | supuesto |

## 4. Memoria entre requests
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| MEM-1 | El servicio guarda las cuentas (id, **nombre del titular** y saldo), las operaciones (tipo, cuentas, monto y si están anuladas) y dos contadores, AC y OP. El nombre no se devuelve nunca, pero decide si aplica el límite de TRANSFER (TRA-7). | 2–21, 1978, 1988, 2000 | confirmado |
| MEM-2 | Los contadores AC y OP son independientes. `/__reset` los reinicia a 0001 y borra todo el estado anterior. | 44, 461, 472, 474, 733–742 | confirmado |
| MEM-3 | Solo los éxitos consumen números. Las operaciones que fallan (E303, E401, E506, E507) no consumen número de OP. ANULA no genera ni consume número de OP. Las ALTA que fallan (E104, E302) no consumen número de AC. | 10, 11, 621–628, 633 | confirmado |
| MEM-4 | El estado de anulación se recuerda: la segunda ANULA da `ok:false`. | 14, 15, 635, 638 | confirmado |
| MEM-5 | Los saldos reflejan todas las operaciones válidas no anuladas. Los errores no cambian el estado. | 9, 20, 475, 484, 494 | confirmado |
| MEM-6 | `X-Req` cuenta los `POST /msg` autenticados (incluidos los que dan 400) y no se reinicia con `/__reset`. Viene vacío en `/__reset`, `/health`, 404 y 401. | 21–31, 36, 52, 53 | confirmado |

## 5. Errores
Orden de evaluación: el primero que aplica gana.

| ID | Orden | Status | Cuerpo exacto | Cuándo | Evidencia | Confianza |
|---|---|---|---|---|---|---|
| ERR-1 | 1 | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | ruta o método desconocido | 24–26, 33, 34 | confirmado |
| ERR-2 | 2 | 401 | `{"error":"E001","mensaje":"no autorizado"}` | sin token o token inválido | 27, 28, 35 | confirmado |
| ERR-2b | 3 | 413 | `{"error":"E101","mensaje":"cuerpo demasiado grande"}` | cuerpo > 8192 bytes | 702, 703, 716, 725, 728 | confirmado |
| ERR-3 | 4 | 400 | `{"error":"E100","mensaje":"json inválido"}` | el cuerpo no es JSON: vacío, sin cuerpo o con BOM | 29, 706, 707, 712 | confirmado |
| ERR-4 | 5 | 400 | `{"error":"E102","mensaje":"falta m"}` | sin `m`, o `m` no es string | 30, 36, 37, 38 | confirmado |
| ERR-5 | 6 | 400 | `{"error":"E103","mensaje":"falta control"}` | `m` sin `;` (incluido `""`) | 31, 39 | confirmado |
| ERR-6 | 7 | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | algún segmento vacío | 40, 505, 509, 510, 511 | confirmado |
| ERR-7 | 8 | 400 | `{"error":"E201","mensaje":"control mal formado"}` | control no numérico | 18 | probable |
| ERR-8 | 9 | 400 | `{"error":"E202","mensaje":"control inválido"}` | control incorrecto | 3, 41, 42, 43, 51 | confirmado |
| ERR-9 | 10 | 400 | `{"error":"E301","mensaje":"comando desconocido "}` (+ `sugerencia` opcional) | comando desconocido | 13, 47, 48, 50 | confirmado |
| ERR-10 | 11 | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | número de argumentos incorrecto | 21, 499–504, 514 | confirmado |
| ERR-11 | 12 | 400 | `{"error":"E303","mensaje":"monto inválido"}` | monto no entero positivo canónico | 476–483, 515, 517, 519 | confirmado |
| ERR-12 | 13 | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | TRANSFER a la misma cuenta | 487, 516, 518 | confirmado |
| ERR-13 | 14 | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | cuenta inexistente | 16, 488, 489, 490, 504 | confirmado |
| ERR-14 | 14 | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | ANULA de una operación inexistente | 497, 498 | confirmado |
| ERR-14b | — | 409 | `{"error":"E520","mensaje":"operación destructiva: detiene el servicio; reenvía con confirmación"}` | HALT con 1 argumento | 612 | probable (visto una vez; orden frente a E4xx/E5xx sin probar) |
| ERR-15 | 15 | 422 | `{"error":"E506","mensaje":"límite excedido"}` | TRANSFER > 100000 entre titulares distintos | 10, 486, 491, 1917, 1931, 1983 | confirmado |
| ERR-16 | 16 | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | saldo < monto (entre mismo titular, también por encima de 100000) | 17, 627, 630, 1978, 1942 | confirmado |

Pruebas de orden:
- E404 > E001: 33, 34, 683.
- E404 > E101: 729.
- E001 > E101: 727.
- E101 > E100: 728.
- E001 > E100: 35.
- E104 > E201 y E202: 510, 511.
- E202 > E301 y E302: 41, 42, 51.
- E302 > E303: 514.
- E302 > E401: 504.
- E303 > E304: 517.
- E303 > E401: 515, 519.
- E304 > E401: 516.
- E304 > E506: 518.
- E401 > E506: 490.
- E506 > E507 entre titulares distintos: 491, 1921, 1931. Con el mismo titular E506 no existe: 1978.

Con `m` no string se responde E102, no E101. E101 es el error de tamaño del cuerpo (413).

## 6. Cambios durante el día
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CAM-1 | A las ~10:30 (UTC-5), la repetición de los 20 ejemplos de la mañana dio respuestas idénticas. | 2–21 | confirmado |
| CAM-6 | A las 13:21 (UTC-5), `probe/drift.ts` dio 20 de 20 idénticos. Antes, 80 secuencias de fuzz de negocio v2 (semillas 707 y 808, con colisiones de nombres) dieron 0 diferencias frente al reemplazo con TRA-7. | 2494–3556, 3558–3577 | confirmado |
| CAM-5 | A las ~13:08 (UTC-5), `probe/drift.ts` dio 20 de 20 idénticos. Entre medias, 80 secuencias de fuzz de negocio (semillas 404 y 505) coincidieron con el reemplazo salvo la regla TRA-7, que no es un cambio de versión: 1920 repite 491 con el mismo resultado. | 1522–2413, 1920, 2423–2442 | confirmado |
| CAM-4 | A las 12:52 (UTC-5), la cuarta repetición de los 20 ejemplos dio respuestas idénticas. Entre medias, 90 secuencias aleatorias de fuzz (3 semillas) coincidieron por completo con este SPEC implementado. | 816–1500, 1502–1521 | confirmado |
| CAM-3 | A las 12:26 (UTC-5), la tercera repetición de los 20 ejemplos dio respuestas idénticas. | 744–763 | confirmado |
| CAM-2 | A las 12:20 (UTC-5), la segunda repetición de los 20 ejemplos también dio respuestas idénticas: sin cambios de versión hasta esa hora. | 652–671 | confirmado |

## 7. Riesgos
| ID | Riesgo | Evidencia | Confianza | Cómo cerrarlo |
|---|---|---|---|---|
| RIE-10 | El límite de 100000 por transferencia se esquiva creando una cuenta con el mismo nombre que el origen, porque el nombre no está verificado ni es único. | 1976–1981, 2418 | confirmado | Identificar al titular con un id verificado (KYC) y no por el nombre libre. Aplicar el límite también entre cuentas propias o registrar esas transferencias aparte. |
| RIE-1 | ANULA de un depósito ya gastado, o de una transferencia cuyo destino ya gastó, deja saldos negativos. | 495, 496, 632, 637 | confirmado | Rechazar la anulación si deja saldo < 0, o solo permitir anular operaciones sin consumo posterior. |
| RIE-2 | El dígito de control es un checksum público (MOD 97‑10), no una firma: cualquiera puede generar mensajes válidos. | 461–470 | confirmado | Usar HMAC con una clave secreta por cliente. |
| RIE-3 | `PING` no valida el control. | 458, 459 | confirmado | Validar todos los comandos por igual. |
| RIE-4 | Los ids de cuenta y de operación son secuenciales y se pueden enumerar. Además, E401/E402 revelan si un id existe. | 4, 5, 16, 497 | confirmado | Usar ids aleatorios (UUID) y una respuesta uniforme. |
| RIE-5 | Las respuestas no son consistentes: `cuentaId` frente a `cuenta_id`, `"recieved"` mal escrito, espacio al final en E301, y `ok:false` con status 200. | 4, 6, 7, 13, 15 | confirmado | Versionar la API (v2) con un esquema consistente; mantener v1 tal cual para clientes heredados. |
| RIE-6 | Los depósitos no tienen límite. | 474 | probable | Imponer un límite por operación y un control de origen de fondos. |
| RIE-8 | Existe un comando oculto, `HALT`, que detiene el servicio y que cualquier cliente con token puede invocar. La `sugerencia` de E301 lo revela. | 540, 612 | confirmado | Quitar HALT de la API pública, o dejarlo solo para un rol de administración con autenticación aparte. No sugerir comandos ocultos. |
| RIE-9 | La `sugerencia` de E301 enumera los comandos existentes. | 589–604 | confirmado | Quitar `sugerencia` o limitarla a comandos públicos. |
| RIE-7 | `X-Req` revela el volumen de requests del token y no se reinicia. | 36, 52 | confirmado | Quitar el header o hacerlo opaco. |
