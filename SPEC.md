# SPEC · Servicio "caja negra" (borrador)

La evidencia son ids de `experimentos.jsonl`. La confianza es: **confirmado** (probado y repetido),
**probable** (visto una vez o inferido) o **supuesto** (no probado; es lo que hace nuestro reemplazo por defecto).
Los cuerpos se escriben exactos. Todos los textos van en español y con tildes.

## 1. Entrada
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ENT-1 | `POST /msg` con cuerpo JSON `{"m":"<segmentos separados por ;>"}`. El último segmento es el dígito de control. | 2–21 | confirmado |
| ENT-2 | `GET /health` → `200 {"ok":true}` | 23 | probable |
| ENT-3 | `POST /__reset` → `200 {"ok":true}`. Vuelve al estado inicial: sin cuentas ni operaciones, y los contadores empiezan otra vez en `AC-0001` y `OP-0001`. | 1, 22, 44, 461, 472 | confirmado |
| ENT-4 | Cualquier otra ruta o método, incluidos `GET /` y `GET /msg`, → `404 {"error":"E404","mensaje":"ruta desconocida"}` | 24, 25, 26 | confirmado |
| ENT-5 | Autenticación con `Authorization: Bearer <token>`. Sin token o con un token desconocido → `401 {"error":"E001","mensaje":"no autorizado"}` | 27, 28 | confirmado |
| ENT-6 | La ruta se evalúa antes que la autenticación: una ruta desconocida sin token da 404, no 401. | 33, 34 | confirmado |
| ENT-7 | La autenticación se evalúa antes que el parseo del JSON. | 35 | probable |
| ENT-8 | Cada token tiene su propio estado. | README | supuesto |
| ENT-9 | Header de respuesta `X-Req`: contador numérico (ver MEM-6). Los headers no se califican. | 2–21, 36, 52 | confirmado |

## 2. Integridad
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| INT-1 | Si `m` no tiene `;`, no hay control → `E103` | 31, 39 | confirmado |
| INT-2 | Si hay un segmento vacío en cualquier posición, incluido el control → `E104`. Se evalúa antes que el control. | 40, 505, 509, 510, 511 | confirmado |
| INT-3 | Control no numérico → `E201` | 18 | probable |
| INT-4 | Algoritmo (ISO 7064 MOD 97‑10): se toma `m` sin su último segmento. Cada dígito cuenta como dígito y cada letra como su posición en el alfabeto, sin distinguir mayúsculas (A=1 … Z=26, en decimal). Todo lo demás (`;`, `-`, espacios, caracteres no ASCII) se ignora. Con la cadena resultante N, `control = 98 − (N·100 mod 97)`, en el rango 1–98. | 55–64, 146, 198, 234, 235, 334, 427, 457 | confirmado |
| INT-5 | Predicción a ciegas: 10 de 10 mensajes nuevos aceptados. | 461–470 | confirmado |
| INT-6 | El control se compara como texto: `03` no equivale a `3`. | 43 | probable |
| INT-7 | Los espacios se ignoran en el control (pero no en el comando, ver CMD-0). | 47, 48 | probable |
| INT-8 | Los caracteres no ASCII (`Ñ`, `ú`) se ignoran en el control. | 508 | probable |
| INT-9 | `PING` no valida el control: cualquier control numérico da 200. | 2, 458, 459 | confirmado |
| INT-10 | El control se valida antes que el comando y que la aridad. | 41, 42, 50, 51 | confirmado |

## 3. Comandos
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CMD-0 | El nombre del comando no distingue mayúsculas (`ping`, `Ping`, `CONSULTa`). No se recortan espacios: `PING ` o ` PING` dan E301. | 12, 45, 46, 47, 48 | confirmado |
| CMD-1 | Comando desconocido → `400 {"error":"E301","mensaje":"comando desconocido "}`, con espacio al final. Si el comando se parece a uno conocido, se añade `"sugerencia":"<COMANDO>"`. | 13, 47, 48, 50 | confirmado |
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
| ALTA-2 | Acepta nombres con espacios, numéricos, de 200 caracteres y no ASCII. | 469, 506, 507, 508 | confirmado |
| ALTA-3 | Nombre vacío (`ALTA;;c`) → E104. Dos argumentos → E302. | 505, 21 | confirmado |

### CONSULTA;cuenta (1 argumento)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CON-1 | → `200 {"cuenta_id":"AC-NNNN","saldo":N}`. Ojo: la clave es `cuenta_id`, no `cuentaId`. | 6, 9, 12, 20 | confirmado |
| CON-2 | Cuenta inexistente → `404 {"error":"E401","mensaje":"cuenta inexistente"}` | 16, 467 | confirmado |
| CON-3 | El id de cuenta distingue mayúsculas: `ac-0002` → E401 aunque exista `AC-0002`. | 468 | probable |

### DEPOSITO;cuenta;monto (2 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| DEP-1 | Suma el monto al saldo → `200 {"status":"recieved","operacionId":"OP-NNNN"}`, con `recieved` mal escrito tal cual. | 7, 19, 20, 463, 474, 475 | confirmado |
| DEP-2 | El monto debe ser un entero > 0, solo dígitos y sin ceros a la izquierda. Si no → `400 {"error":"E303","mensaje":"monto inválido"}`, sin efecto sobre el saldo. Falla con: `0`, `-100`, `10.5`, `0100`, `1e3`, 20 dígitos, `abc`, `" 100"`. | 476–484 | confirmado |
| DEP-3 | Los depósitos no tienen límite: 500000 se aceptó. | 474 | probable |

### TRANSFER;origen;destino;monto (3 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| TRA-1 | Mueve el monto de origen a destino → `200 {"status":"recieved","operacionId":"OP-NNNN"}` | 8, 9, 11, 464, 485, 494 | confirmado |
| TRA-2 | Monto inválido → E303, con las mismas reglas que DEP-2. | 492, 493, 517, 519 | confirmado |
| TRA-3 | Origen igual a destino → `400 {"error":"E304","mensaje":"origen y destino iguales"}` | 487, 516, 518 | confirmado |
| TRA-4 | Origen o destino inexistente → `404 E401` | 488, 489, 490 | confirmado |
| TRA-5 | Límite por operación de 100000, inclusivo. Más → `422 {"error":"E506","mensaje":"límite excedido"}`. No es acumulado. | 10, 11, 485, 486 | confirmado |
| TRA-6 | Saldo del origen menor que el monto → `422 {"error":"E507","mensaje":"saldo insuficiente"}` | 17 | probable |

### ANULA;operacion (1 argumento)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ANU-1 | Revierte la operación → `200 {"ok":true,"anulada":"OP-NNNN"}`. En una transferencia, devuelve el monto al origen y lo quita del destino. | 14, 17, 465, 466 | confirmado |
| ANU-2 | Anular otra vez → `200 {"ok":false,"motivo":"ya anulada"}`. Ojo: status 200. | 15 | probable |
| ANU-3 | Se puede anular un depósito aunque el saldo ya se haya gastado: el saldo queda **negativo**. | 495, 496 | confirmado |
| ANU-4 | Operación inexistente o id mal formado → `404 {"error":"E402","mensaje":"operación inexistente"}` | 497, 498 | confirmado |

## 4. Memoria entre requests
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| MEM-1 | El servicio guarda las cuentas (id y saldo), las operaciones (tipo, cuentas, monto y si están anuladas) y dos contadores, AC y OP. | 2–21 | confirmado |
| MEM-2 | Los contadores AC y OP son independientes y `/__reset` los reinicia. | 44, 461, 472, 474 | confirmado |
| MEM-3 | Una operación que falla (E506) no consume número de OP. | 10, 11 | probable |
| MEM-4 | El estado de anulación se recuerda: la segunda ANULA da `ok:false`. | 14, 15 | probable |
| MEM-5 | Los saldos reflejan todas las operaciones válidas no anuladas. Los errores no cambian el estado. | 9, 20, 475, 484, 494 | confirmado |
| MEM-6 | `X-Req` cuenta los `POST /msg` autenticados (incluidos los que dan 400) y no se reinicia con `/__reset`. Viene vacío en `/__reset`, `/health`, 404 y 401. | 21–31, 36, 52, 53 | confirmado |

## 5. Errores
Orden de evaluación: el primero que aplica gana.

| ID | Orden | Status | Cuerpo exacto | Cuándo | Evidencia | Confianza |
|---|---|---|---|---|---|---|
| ERR-1 | 1 | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | ruta o método desconocido | 24–26, 33, 34 | confirmado |
| ERR-2 | 2 | 401 | `{"error":"E001","mensaje":"no autorizado"}` | sin token o token inválido | 27, 28, 35 | confirmado |
| ERR-3 | 3 | 400 | `{"error":"E100","mensaje":"json inválido"}` | el cuerpo no es JSON | 29 | probable |
| ERR-4 | 4 | 400 | `{"error":"E102","mensaje":"falta m"}` | sin `m`, o `m` no es string | 30, 36, 37, 38 | confirmado |
| ERR-5 | 5 | 400 | `{"error":"E103","mensaje":"falta control"}` | `m` sin `;` (incluido `""`) | 31, 39 | confirmado |
| ERR-6 | 6 | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | algún segmento vacío | 40, 505, 509, 510, 511 | confirmado |
| ERR-7 | 7 | 400 | `{"error":"E201","mensaje":"control mal formado"}` | control no numérico | 18 | probable |
| ERR-8 | 8 | 400 | `{"error":"E202","mensaje":"control inválido"}` | control incorrecto | 3, 41, 42, 43, 51 | confirmado |
| ERR-9 | 9 | 400 | `{"error":"E301","mensaje":"comando desconocido "}` (+ `sugerencia` opcional) | comando desconocido | 13, 47, 48, 50 | confirmado |
| ERR-10 | 10 | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | número de argumentos incorrecto | 21, 499–504, 514 | confirmado |
| ERR-11 | 11 | 400 | `{"error":"E303","mensaje":"monto inválido"}` | monto no entero positivo canónico | 476–483, 515, 517, 519 | confirmado |
| ERR-12 | 12 | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | TRANSFER a la misma cuenta | 487, 516, 518 | confirmado |
| ERR-13 | 13 | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | cuenta inexistente | 16, 488, 489, 490, 504 | confirmado |
| ERR-14 | 13 | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | ANULA de una operación inexistente | 497, 498 | confirmado |
| ERR-15 | 14 | 422 | `{"error":"E506","mensaje":"límite excedido"}` | TRANSFER > 100000 | 10, 486, 491 | confirmado |
| ERR-16 | 15 | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | saldo < monto | 17 | probable |

Pruebas de orden:
- E404 > E001: 33, 34.
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
- E506 > E507: 491.

E101 no se ha observado: `m` no string da E102.

## 6. Cambios durante el día
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CAM-1 | A las ~10:30 (UTC-5), la repetición de los 20 ejemplos de la mañana dio respuestas idénticas. | 2–21 | confirmado |

## 7. Riesgos
| ID | Riesgo | Evidencia | Confianza | Cómo cerrarlo |
|---|---|---|---|---|
| RIE-1 | ANULA de un depósito ya gastado deja el saldo negativo. | 495, 496 | confirmado | Rechazar la anulación si deja saldo < 0, o solo permitir anular operaciones sin consumo posterior. |
| RIE-2 | El dígito de control es un checksum público (MOD 97‑10), no una firma: cualquiera puede generar mensajes válidos. | 461–470 | confirmado | Usar HMAC con una clave secreta por cliente. |
| RIE-3 | `PING` no valida el control. | 458, 459 | confirmado | Validar todos los comandos por igual. |
| RIE-4 | Los ids de cuenta y de operación son secuenciales y se pueden enumerar. Además, E401/E402 revelan si un id existe. | 4, 5, 16, 497 | confirmado | Usar ids aleatorios (UUID) y una respuesta uniforme. |
| RIE-5 | Las respuestas no son consistentes: `cuentaId` frente a `cuenta_id`, `"recieved"` mal escrito, espacio al final en E301, y `ok:false` con status 200. | 4, 6, 7, 13, 15 | confirmado | Versionar la API (v2) con un esquema consistente; mantener v1 tal cual para clientes heredados. |
| RIE-6 | Los depósitos no tienen límite. | 474 | probable | Imponer un límite por operación y un control de origen de fondos. |
| RIE-7 | `X-Req` revela el volumen de requests del token y no se reinicia. | 36, 52 | confirmado | Quitar el header o hacerlo opaco. |
