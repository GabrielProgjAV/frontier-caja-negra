# SPEC · Servicio "caja negra"

La evidencia son ids de `experimentos.jsonl`. La confianza es: **confirmado** (probado y con 2 o más ids de evidencia),
**probable** (visto una vez o inferido) o **supuesto** (no probado; es lo que hace nuestro reemplazo por defecto).
Los cuerpos se escriben exactos. Todos los textos van en español y con tildes.

## 1. Entrada
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ENT-1 | `POST /msg` con cuerpo JSON `{"m":"<segmentos separados por ;>"}`. El último segmento es el dígito de control. | 2–21 | confirmado |
| ENT-2 | `GET /health` con token → `200 {"ok":true}` (también con query string). | 23, 687 | confirmado |
| ENT-2c | `GET /health` sin token → `401 E001`. Solo hay una observación de "sin token" (con una cabecera mal formada, 802, también da 401). | 648, 802 | probable |
| ENT-2b | `POST /__reset` sin token → `401 E001` y no reinicia el estado. | 649, 650 | confirmado |
| ENT-3 | `POST /__reset` → `200 {"ok":true}`. Vuelve al estado inicial: sin cuentas ni operaciones, y los contadores empiezan otra vez en `AC-0001` y `OP-0001`. | 1, 22, 44, 461, 472 | confirmado |
| ENT-4 | Solo existen `POST /msg`, `POST /__reset` y `GET /health`. Cualquier otra combinación de método y ruta (GET/PUT/DELETE/PATCH sobre /msg, GET/PUT/DELETE sobre /__reset, POST/PUT/DELETE sobre /health, `GET /`) → `404 {"error":"E404","mensaje":"ruta desconocida"}` | 24, 25, 26, 673–682 | confirmado |
| ENT-4b | La ruta se compara de forma exacta: distingue mayúsculas (`/MSG`, `/HEALTH`) y no acepta barra final (`/msg/`, `/health/`) ni `//msg` → 404. | 684, 685, 688, 689, 690 | confirmado |
| ENT-4c | La query string se ignora: `/msg?x=1` y `/health?x=1` funcionan normalmente. | 686, 687 | confirmado |
| ENT-4d | `HEAD /health` → status 404. No se puede ver el cuerpo porque HEAD nunca lleva cuerpo: solo se midió el status. HEAD no se trata como GET. | 691 | probable |
| ENT-5 | Autenticación: la cabecera debe ser exactamente `Authorization: Bearer <token>`, con `Bearer` tal cual (distingue mayúsculas), un solo espacio y el token exacto. Cualquier otra forma → `401 {"error":"E001","mensaje":"no autorizado"}`: sin cabecera, token desconocido, `bearer`/`BEARER`, doble espacio, `Basic`, token sin esquema, `Bearer` sin token, token con un carácter extra o dos credenciales. Aplica igual en `/health`. | 27, 28, 790, 791, 792, 795–800, 802 | confirmado |
| ENT-5b | Con espacios al principio o al final del valor de la cabecera se obtuvo 200. Probablemente los quitó el cliente HTTP antes de enviar, como manda el estándar de cabeceras, y node:http hace lo mismo al recibir, así que no se distingue de la forma exacta. | 793, 794 | probable |
| ENT-6 | La ruta se evalúa antes que la autenticación: una ruta desconocida sin token da 404, no 401. | 33, 34 | confirmado |
| ENT-7 | La autenticación se evalúa antes que el tamaño y que el parseo del JSON. | 35, 727 | confirmado |
| ENT-10 | Tamaño máximo del cuerpo: 8192 bytes. Con 8193 o más → `413 {"error":"E101","mensaje":"cuerpo demasiado grande"}`. Se evalúa después de la ruta (404) y de la autenticación (401), y antes del parseo del JSON (E100). Cuenta bytes, no caracteres (ENT-14). | 702, 703, 714–729, 4648, 4649 | confirmado |
| ENT-11 | El Content-Type se ignora: el cuerpo se parsea como JSON aunque sea `text/plain` o falte. | 704, 705 | confirmado |
| ENT-12 | Cuerpo vacío o sin cuerpo → E100. BOM al inicio → E100. Se aceptan espacios y saltos de línea alrededor del JSON. | 706, 707, 712, 713 | confirmado |
| ENT-13 | JSON válido que no es un objeto con `m` string (`[]`, `null`, `"texto"`, `m` booleana, objeto o `0`) → E102. Los campos extra se ignoran. `m` cadena vacía → E103 (no tiene `;`). **Con la clave `m` duplicada gana la última**: `{"m":"PING;64","m":5}` → E102 y `{"m":5,"m":"PING;64"}` → pong. | 694, 708, 709, 710, 711, 4653, 4654, 4655, 4656, 4657, 4658 | confirmado |
| ENT-14 | El límite de 8192 cuenta **bytes UTF-8**, no caracteres: un cuerpo de 8192 bytes con `ñ` (4107 caracteres) se procesa; con 8193 bytes (4108 caracteres) → E101. También con `€` (3 bytes) y emoji (4 bytes): 8193 bytes → E101 aunque haya muchos menos caracteres. | 4648, 4649, 4650, 4651 | confirmado |
| ENT-15 | **UTF-8 inválido**: cada byte inválido se decodifica como un U+FFFD (como el decodificador WHATWG de Node), y el resto del mensaje se procesa normal. Un nombre con el byte `FF`, otro con `FE` y otro con U+FFFD literal son el **mismo titular** (TRA-7, sin E506); `FF FE` y `C0 AF` (overlong) dan dos U+FFFD, iguales al literal doble; `F1` no es `ñ` (no hay Latin-1: E506 entre `F1` y `ñ`). Un byte inválido después del JSON → E100. Dentro del control de `PING` no importa (PING no valida el control). | 4659, 4660, 4661, 4662, 4663, 4664, 4665, 4674–4689 | confirmado |
| ENT-8 | Cada token tiene su propio estado. | README | supuesto |
| ENT-9 | Header de respuesta `X-Req`: contador numérico (ver MEM-6). Los headers no se califican. | 2–21, 36, 52 | confirmado |

## 2. Integridad
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| INT-1 | Si `m` no tiene `;`, no hay control → `E103` | 31, 39 | confirmado |
| INT-2 | Si hay un segmento vacío en cualquier posición, incluido el control → `E104`. Se evalúa antes que el control. | 40, 505, 509, 510, 511 | confirmado |
| INT-3 | El control debe ser solo dígitos y **de 1 o 2 dígitos exactamente** (`[0-9]{1,2}`): `5X`, `+14`, `14 `, `14\n`, `050`, `100` y `10000000000` → `E201`. No se recortan espacios. | 18, 701, 730, 731, 4548–4551 | confirmado |
| INT-2b | **Comando vacío** (primer segmento vacío) → E104, como cualquier segmento vacío: `;64`, `;`, `;PING;64`, `;ALTA;x;<control correcto>` y con control incorrecto (E104 gana a E202). No crea cuenta. | 4624, 4625, 4626, 4627, 4628, 4629 | confirmado |
| INT-3b | Un `;` final deja vacío el último segmento → E104. | 698, 699 | confirmado |
| INT-4 | El control es ISO 7064 MOD 97‑10 sobre el mensaje sin su último segmento: dígitos tal cual, letras como su posición en el alfabeto (A=1 … Z=26, sin distinguir mayúsculas), todo lo demás ignorado, y `control = 98 − (N·100 mod 97)`. Algoritmo, ejemplo resuelto y vectores de prueba en 2.1. Evidencia directa: barridos completos del oráculo (cada mensaje con todos los controles rechazados con E202 hasta el único aceptado), 10 predicciones a ciegas aceptadas (461–470) y un control calculado con una variante distinta rechazado (809). | 55–457, 461–470, 809 | confirmado |
| INT-4b | El rango del control es de 2 a 98: con la fórmula, `r'` va de 0 a 96, así que nunca sale 0, 1 ni 99. Comprobado: `0`, `1`, `99` y `00` → E202 en ALTA, CONSULTA y DEPOSITO, y el control correcto (`ALTA;Ana;50`) sí pasa después. En el log el mínimo aceptado es 2 (id 1208) y el máximo 98 (id 334). | 334, 1208, 65, 66, 147, 148, 4631–4639 | confirmado |
| INT-5 | Predicción a ciegas: 10 de 10 mensajes nuevos aceptados. | 461–470 | confirmado |
| INT-6 | El control se compara como texto, en su forma decimal sin ceros a la izquierda: para `ALTA;Mateo` el control `3` es válido y `03` no (E202). **Los controles de 3 o más dígitos (como `050` o `100`) dan E201, no E202.** | 5, 43, 44, 4548–4551 | confirmado |
| INT-7 | Los espacios se ignoran en el control: no cuentan, ni siquiera como 0. Con el control de `ALTA;AnaMaria` vale `ALTA;  Ana  Maria  `. En el comando no se ignoran (ver CMD-0). | 47, 48, 807, 808, 809 | confirmado |
| INT-8 | Los caracteres no ASCII se ignoran en el control, igual que `;` o `-`: letras con tilde o diéresis (`é`, `í`, `Á`, `É`, `ü`), `ñ`/`Ñ`, en el nombre, en el comando o en el id. Descartadas: quitar la tilde (é=5, ñ=14), usar el código Latin-1 y ñ=15. | 508, 3579–3590 | confirmado |
| INT-9 | `PING` no valida el control, ni el valor ni el formato: `PING;0`, `PING;1`, `PING;5X`, `PING;64 ` y `PING;64\n` dan 200. Sí aplican E103 (falta `;`) y E104 (segmento vacío). | 2, 39, 40, 458, 459, 695, 696, 700 | confirmado |
| INT-10 | El control se valida antes que el comando y que la aridad. | 41, 42, 50, 51 | confirmado |

### 2.1 Algoritmo del control (ISO 7064 MOD 97‑10), paso a paso

Entrada: el mensaje completo **sin** el último segmento ni el `;` que lo precede (`m = "CONSULTA;AC-0001;14"` → `"CONSULTA;AC-0001"`). Salida: un entero de 2 a 98.

1. **Convertir cada carácter** a texto numérico y concatenar los resultados en una cadena `N`:
   - dígito `0`–`9` → él mismo;
   - letra `A`–`Z` o `a`–`z` → su posición en el alfabeto, **sin ceros a la izquierda** (`A`=1, `B`=2, … `J`=10, … `Z`=26), sin distinguir mayúsculas;
   - cualquier otro carácter (`;`, `-`, espacio, tabulador, `Ñ`, `ú`…) → nada (se ignora).
2. **Resto módulo 97** de `N` leído como número decimal. `N` puede tener decenas de dígitos: se calcula dígito a dígito (método de Horner), `r = (r·10 + dígito) mod 97`, empezando en `r = 0`.
3. **Desplazar dos posiciones**: `r' = (r·100) mod 97` (equivale a añadir `00` al final de `N`).
4. **Control** = `98 − r'`. Como `r'` va de 0 a 96, el control va de 2 a 98 (con esta fórmula nunca sale 1).
5. **Comparar como texto**: el control recibido, tal cual llegó, debe ser igual a la representación decimal del control calculado, sin ceros a la izquierda. `"03"`, `"+14"`, `" 14"` y `"14\n"` no son iguales a `"3"` ni a `"14"`.

**Ejemplo resuelto: `CONSULTA;AC-0001` → 14** (es el ejemplo 5 del reto; el original lo acepta en los ids 6 y 56):

| Carácter | C | O | N | S | U | L | T | A | `;` | A | C | `-` | 0 | 0 | 0 | 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Aporta a `N` | 3 | 15 | 14 | 19 | 21 | 12 | 20 | 1 | — | 1 | 3 | — | 0 | 0 | 0 | 1 |

Por lo tanto `N = 31514192112201130001`. Resto por Horner (`r ← (r·10 + d) mod 97`, empezando en 0), uno por cada dígito de `N` en orden:

| d | 3 | 1 | 5 | 1 | 4 | 1 | 9 | 2 | 1 | 1 | 2 | 2 | 0 | 1 | 1 | 3 | 0 | 0 | 0 | 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| r | 3 | 31 | 24 | 47 | 86 | 85 | 83 | 56 | 76 | 82 | 46 | 74 | 61 | 29 | 0 | 3 | 30 | 9 | 90 | 28 |

Entonces `r = 28`; `r' = 28·100 mod 97 = 2800 mod 97 = 84`; **control = 98 − 84 = 14**. El mensaje completo es `CONSULTA;AC-0001;14`.

Implementación de referencia (la misma que usa el reemplazo, `src/core/checksum.ts`):

```ts
function control(payload: string): number {
  let r = 0;
  for (const ch of payload) {
    const d = /[0-9]/.test(ch) ? ch : /[a-z]/i.test(ch) ? String(ch.toUpperCase().charCodeAt(0) - 64) : '';
    for (const x of d) r = (r * 10 + Number(x)) % 97;
  }
  return 98 - ((r * 100) % 97);
}
```

**Vectores de prueba** (todos aceptados por el original; sirven para validar otra implementación):

| Mensaje sin control | Control | Evidencia |
|---|---|---|
| `PING` | 64 | 2, 52 |
| `ALTA;Lucia` | 82 | 4 |
| `ALTA;Mateo` | 3 | 5 |
| `CONSULTA;AC-0001` | 14 | 6, 56 |
| `DEPOSITO;AC-0001;250000` | 86 | 7 |
| `TRANSFER;AC-0001;AC-0002;40000` | 86 | 8 |
| `SALDOS;AC-0001` | 38 | 13 (comando inexistente: el control se valida igualmente) |
| `ANULA;OP-0003` | 66 | 14 |
| `CONSULTA;AC-0009` | 87 | 16 |
| `ALTA;Zoe` | 3 | 461, 1976 |

Comprobación rápida: subir en 1 el último dígito de `AC-000N` baja el control en 3 (módulo 97), porque el último dígito de `N` se multiplica por 100 y `100 ≡ 3 (mod 97)`; subir el penúltimo lo baja en 30 (ids 55–64 y 146).

## 3. Comandos
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CMD-0 | El nombre del comando no distingue mayúsculas (`ping`, `Ping`, `CONSULTa`). No se recortan espacios: `PING ` o ` PING` dan E301. | 12, 45, 46, 47, 48 | confirmado |
| CMD-0b | La conversión a mayúsculas del comando es **solo ASCII** (`a-z` → `A-Z`), no Unicode: `pıng` (ı sin punto) no es PING (E301 sugerencia PING); `haßß` no se expande a `HASSSS` (sugerencia HALT, distancia 2); `CONſULTA` (s larga) no es CONSULTA (E301 sugerencia CONSULTA); `ſing` → sugerencia PING. Con mayúsculas Unicode completas (`toUpperCase()` de JS o `upper()` de Python) `pıng` sería PING y `CONſULTA` daría E401. El control ignora esas letras (no son ASCII). | 4641, 4642, 4643, 4645, 4670, 4671 | confirmado |
| CMD-1 | Comando desconocido → `400 {"error":"E301","mensaje":"comando desconocido "}`, con espacio al final. | 13, 50, 525–604 | confirmado |
| CMD-1a | Se añade `"sugerencia":"<COMANDO>"` si la distancia de Levenshtein clásica, sin distinguir mayúsculas y sobre el segmento tal cual (incluidos los espacios), hasta algún comando conocido es ≤ 2. La sugerencia va siempre en mayúsculas. El umbral es absoluto, no depende de la longitud. | 47, 48, 539, 540, 574–576, 589–604, 609, 610 | confirmado |
| CMD-1a2 | Qué comando se sugiere: **el más cercano** (menor distancia de Levenshtein, siempre ≤ 2) **y, si hay empate, el primero en orden alfabético** (ALTA, ANULA, CONSULTA, DEPOSITO, HALT, PING, TRANSFER). No es "el primero de la lista a distancia ≤ 2": por ejemplo `AULA` → ANULA (distancia 1), no ALTA (distancia 2); `HLT` → HALT; `AINA` → ALTA, no PING. Esta regla reproduce las 146 respuestas E301 del log. | 3592–3606, 3608–3610 | confirmado |
| CMD-1a3 | La distancia de la sugerencia se mide en **code points** (caracteres Unicode), no en unidades UTF-16 ni en bytes: `PING😀😀` (2 code points de más, 4 unidades UTF-16, 8 bytes) → sugerencia PING; `PINGññ` y `PING😀` también. | 4667, 4668, 4669 | confirmado |
| CMD-1b | Con distancia ≥ 3 a todos los comandos no hay `sugerencia`: lo comprueban 61 nombres (59 de 525–588, más `XXXX` y `PNIGX`). Un intercambio de letras cuenta 2, no 1 (no es Damerau): `PNIGX` no sugiere nada. | 525–588, 604, 608 | confirmado |
| CMD-1c | Desempate alfabético: `AINA` empata PING y ALTA → ALTA; `HANG` empata PING y HALT → HALT; `CNSULA` empata CONSULTA y ANULA → ANULA; `HULA`, `NULT` y `HNLA` empatan ANULA y HALT → ANULA (no el más corto, HALT); `ALT`, `HALTA` y `AL` empatan ALTA y HALT → ALTA. | 593, 606, 607, 3592, 3593, 3606, 3608, 3609, 3610 | confirmado |
| CMD-1d | Comandos que existen: PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA y el oculto **HALT**. La lista cerrada es una inferencia: se probaron 64 nombres plausibles (BAJA, RETIRO, SALDO, HISTORIAL, AYUDA, HELP, VERSION, RESET…) y ninguno existe (todos E301), pero no se descarta un comando oculto a distancia ≥ 3 de todos los nombres probados. HALT se encontró por la `sugerencia` de `HELP`. | 525–588, 540 | probable |
| CMD-2 | Si el número de argumentos no es el del comando → `400 {"error":"E302","mensaje":"aridad inválida"}` | 21, 499–504 | confirmado |

### PING (0 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| PING-1 | `PING;<control>` → `200 {"pong":true}`. | 2, 45, 52, 53 | confirmado |
| PING-1b | `PING` no cambia el estado: entre dos `ALTA`, un `PING` no consume número de cuenta ni cambia el saldo. Solo hay una secuencia que lo muestre. | 611–616 | probable |
| PING-2 | `PING;x;<c>` → E302 | 499 | probable |

### ALTA;nombre (1 argumento)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ALTA-1 | Crea una cuenta con saldo 0 → `201 {"cuentaId":"AC-NNNN"}`: secuencial, empieza en 0001 tras el reset, 4 dígitos con ceros a la izquierda. | 4, 5, 6, 44, 461, 462, 472, 473 | confirmado |
| ALTA-2 | Acepta nombres con espacios internos, al principio o al final, solo espacios, tabuladores, números, 200 caracteres y caracteres no ASCII. El nombre se guarda tal cual, sin recortar: `"Zoe "` y `"Zoe"` son titulares distintos para TRA-7 (1990). Ningún comando devuelve el nombre. | 469, 506, 507, 508, 804–807, 810, 811, 1990 | confirmado |
| ALTA-3 | Nombre literalmente vacío (`ALTA;;c`) → E104. Un nombre de solo espacios no cuenta como vacío y crea la cuenta. Dos argumentos → E302. | 21, 505, 621, 622, 810, 812 | confirmado |
| ALTA-4 | Los nombres pueden repetirse: un `ALTA;Ana` duplicado crea otra cuenta. Dos cuentas con el mismo nombre se tratan como del mismo titular (TRA-7). | 619, 620, 1976, 1977 | confirmado |
| ALTA-5 | No se observó ningún límite de cuentas por nombre: se crearon 6 cuentas `Zoe` en una misma secuencia. No se probó con más. | 2461, 2462, 2471–2474 | probable |
| ALTA-6 | Más de 9999 cuentas: el log nunca pasa de 7 cuentas ni de 16 operaciones en una secuencia (ids 811 y 787), así que no se sabe qué hace el original a partir de la cuenta 10000 (`AC-10000`, error o reinicio). El reemplazo sigue contando sin tope, con `padStart(4)`: `AC-10000`, `OP-10000`. | — | supuesto |

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
| DEP-6 | Los saldos observados son exactos: 11099999999 (suma de tres depósitos) y 119999999987 (= 12·9999999999 − 1 por la transferencia de 1). | 774, 787, 788 | confirmado |
| DEP-6b | No hace falta BigInt: con el tope de 10 dígitos por operación, llegar a 2^53 exigiría unos 900 000 depósitos, y el log no tiene ningún saldo cercano a 2^53. Es una inferencia; el reemplazo usa `Number`. | 774, 788 | probable |
| DEP-7 | DEPOSITO no depende del nombre del titular: 100001 se acepta igual con los nombres `Ana`, `ADMIN`, `BANCO`, `SISTEMA`, `HALT` y `0`. | 2451–2457 | confirmado |
| DEP-4 | Cuenta inexistente con monto válido → `404 E401`. Con monto inválido gana E303. | 626, 515 | confirmado |
| DEP-5 | El monto con signo `+` → E303: solo se aceptan dígitos. | 646 | probable |

### TRANSFER;origen;destino;monto (3 argumentos)
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| TRA-1 | Mueve el monto de origen a destino → `200 {"status":"recieved","operacionId":"OP-NNNN"}` | 8, 9, 11, 464, 485, 494 | confirmado |
| TRA-2 | El resto de las reglas del monto de DEP-2 (ceros a la izquierda, notación exponencial, decimales, signo `+`, espacios) se aplican igual en TRANSFER. Solo se probaron en DEPOSITO; el reemplazo usa la misma comprobación para los dos comandos. | 476–483, 646 | probable |
| TRA-2b | Monto en TRANSFER → E303 con `0`, negativo (`-5`), no numérico (`abc`) y 11 dígitos. Con 10 dígitos se pasa a E506: el tope de dígitos va antes que el límite. | 492, 493, 517, 519, 814, 815 | confirmado |
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
| HAL-3 | `HALT;1` → `503 {"error":"E599","mensaje":"service halted"}` y **pone el token en estado halted**. | 3980, 3991 | confirmado |
| HAL-3b | `HALT;<arg>` con cualquier argumento distinto de `1` (probados: `0`, `2`, `01`, `true`, `si`, `confirmar`, `ok`, `yes`) → `409 E520` y **no** cambia el estado. | 3976, 3994–4023 | confirmado |
| HAL-4 | En estado halted, `POST /msg` autenticado responde `503 E599` sin importar el contenido (JSON inválido, control incorrecto, comando desconocido, HALT;1 repetido). | 3981–3983, 4027–4031 | confirmado |
| HAL-5 | En estado halted, `POST /msg` sin token → `401 E001`: la autenticación se evalúa antes que el halt. | 4032 | confirmado |
| HAL-6 | En estado halted, ruta inexistente → `404 E404`: la ruta se evalúa antes que el halt. | 4033 | confirmado |
| HAL-7 | En estado halted, `GET /health` → `200 {"ok":true}`. | 3984, 4034 | confirmado |
| HAL-8 | En estado halted, `POST /__reset` → `200 {"ok":true}` y **restaura el estado normal**, incluido el flag `halted`. | 3985, 4039–4040, 4042 | confirmado |
| HAL-9 | El estado halted persiste entre requests y es parte del estado del token; solo `HALT;1` lo activa y solo `POST /__reset` lo desactiva. | 4037–4042 | confirmado |

## 4. Memoria entre requests
| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| MEM-1 | El servicio guarda las cuentas (id, **nombre del titular** y saldo), las operaciones (tipo, cuentas, monto y si están anuladas) y dos contadores, AC y OP. El nombre no se devuelve nunca, pero decide si aplica el límite de TRANSFER (TRA-7). | 2–21, 1978, 1988, 2000 | confirmado |
| MEM-2 | Los contadores AC y OP son independientes. `/__reset` los reinicia a 0001 y borra todo el estado anterior. | 44, 461, 472, 474, 733–742 | confirmado |
| MEM-3 | Solo los éxitos consumen números. Las operaciones que fallan (E303, E401, E506, E507) no consumen número de OP. ANULA no genera ni consume número de OP. Las ALTA que fallan (E104, E302) no consumen número de AC. | 10, 11, 621–628, 633 | confirmado |
| MEM-3b | Contadores por encima de 9999: ver ALTA-6. | — | supuesto |
| MEM-4 | El estado de anulación se recuerda: la segunda ANULA da `ok:false`. | 14, 15, 635, 638 | confirmado |
| MEM-5 | Los saldos reflejan todas las operaciones válidas no anuladas. Los errores no cambian el estado. | 9, 20, 475, 484, 494 | confirmado |
| MEM-6 | `X-Req` cuenta los `POST /msg` autenticados (incluidos los que dan 400) y no se reinicia con `/__reset`. Viene vacío en `/__reset`, `/health`, 404 y 401. | 21–31, 36, 52, 53 | confirmado |
| MEM-7 | No hay dependencia del ritmo ni detección de duplicados: la misma secuencia de 10 pasos a 8,2 req/s y a 2 req/s da respuestas idénticas, y un DEPOSITO o una TRANSFER repetidos exactamente crean una operación nueva cada vez. | 3909–3918, 3920–3929 | confirmado |
| MEM-8 | El servicio tiene un estado `halted` por token. Solo `HALT;1` lo activa; `POST /__reset` lo desactiva. Mientras está activo, `POST /msg` autenticado responde `503 E599`. | 3980–3986, 4026–4042 | confirmado |

## 5. Errores
Todas las respuestas de error son JSON `{"error":"<código>","mensaje":"<texto>"}`, con el cuerpo exacto de la última columna (con tildes, y con el espacio final de E301). **Orden de evaluación: se recorre la tabla de arriba abajo y gana la primera regla que aplica**; la columna Orden da la posición (`O<n>`). Las reglas que comparten posición no compiten entre sí: pertenecen a comandos distintos o son excluyentes (por ejemplo un control es mal formado o es un número, nunca las dos cosas).

| ID | Comportamiento | Evidencia | Confianza | Orden | Status | Cuerpo exacto |
|---|---|---|---|---|---|---|
| ERR-1 | Ruta desconocida: el método y la ruta no son `POST /msg`, `POST /__reset` ni `GET /health` (la ruta se compara exacta; la query string se ignora). Se evalúa incluso sin token. | 24–26, 33, 34, 673–682, 684, 685, 688–690 | confirmado | O1 | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` |
| ERR-2 | No autorizado: la cabecera no es exactamente `Authorization: Bearer <token>`. | 27, 28, 35, 790–792, 795–800, 802 | confirmado | O2 | 401 | `{"error":"E001","mensaje":"no autorizado"}` |
| ERR-3 | Cuerpo demasiado grande: pasa de 8192 bytes. | 702, 703, 716, 725, 726, 728 | confirmado | O3 | 413 | `{"error":"E101","mensaje":"cuerpo demasiado grande"}` |
| ERR-4 | JSON inválido: el cuerpo no se puede parsear (vacío, ausente, truncado o con BOM). | 29, 706, 707, 712 | confirmado | O4 | 400 | `{"error":"E100","mensaje":"json inválido"}` |
| ERR-5 | Falta `m`: el JSON no es un objeto con la clave `m` de tipo string (`{}`, `[]`, `null`, `"texto"`, `m` numérico, nulo o array). | 30, 36–38, 708–710 | confirmado | O5 | 400 | `{"error":"E102","mensaje":"falta m"}` |
| ERR-6 | Falta control: `m` no contiene ningún `;`. | 31, 39 | confirmado | O6 | 400 | `{"error":"E103","mensaje":"falta control"}` |
| ERR-7 | Segmento vacío: alguno de los segmentos separados por `;` está vacío, incluido el control (`PING;`, `ALTA;;85`, un `;` final). | 40, 505, 509–511, 698, 699 | confirmado | O7 | 400 | `{"error":"E104","mensaje":"segmento vacío"}` |
| ERR-8 | Control mal formado: el último segmento no es solo dígitos de 1 o 2 caracteres (`5X`, `+14`, `14 `, `050`, `100`). No se evalúa para `PING`. | 18, 701, 730, 731, 4548–4551 | confirmado | O8 | 400 | `{"error":"E201","mensaje":"control mal formado"}` |
| ERR-9 | Control inválido: el control es numérico pero no coincide con el calculado (2.1). Incluye ceros a la izquierda (`03`). No se evalúa para `PING`. | 3, 41–43, 51, 809 | confirmado | O9 | 400 | `{"error":"E202","mensaje":"control inválido"}` |
| ERR-10 | Comando desconocido. Si el nombre está a distancia de Levenshtein ≤ 2 de un comando, la respuesta añade `"sugerencia":"<COMANDO>"` con el más cercano y, en empate, el primero alfabético (CMD-1a, CMD-1a2). | 13, 47, 48, 50, 539, 540, 589–604, 3592–3610 | confirmado | O10 | 400 | `{"error":"E301","mensaje":"comando desconocido "}` (con el espacio final; más `"sugerencia"` opcional) |
| ERR-11 | Aridad inválida: el número de argumentos (segmentos entre el comando y el control) no es el del comando: PING 0, ALTA 1, CONSULTA 1, DEPOSITO 2, TRANSFER 3, ANULA 1, HALT 1. | 21, 499–504, 514, 613, 617 | confirmado | O11 | 400 | `{"error":"E302","mensaje":"aridad inválida"}` |
| ERR-12 | Operación destructiva: `HALT` con un argumento distinto de `1`. `HALT;1` no usa este error; produce E599 (ERR-19). | 3976, 3994–4023 | confirmado | O12 | 409 | `{"error":"E520","mensaje":"operación destructiva: detiene el servicio; reenvía con confirmación"}` |
| ERR-13 | Monto inválido: en DEPOSITO y TRANSFER, el monto no cumple `^[1-9][0-9]{0,9}$`. | 476–483, 492, 493, 515, 517, 646, 767–773, 814 | confirmado | O13 | 400 | `{"error":"E303","mensaje":"monto inválido"}` |
| ERR-14 | Origen y destino iguales: TRANSFER con la misma cuenta en ambos lados (aunque no exista). | 487, 516, 518 | confirmado | O14 | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` |
| ERR-15 | Cuenta inexistente: CONSULTA, DEPOSITO o TRANSFER con un id de cuenta que no existe (comparación exacta). Si faltan origen y destino a la vez la respuesta es la misma, así que no importa cuál se evalúe primero. | 16, 488, 489, 490 | confirmado | O15 | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` |
| ERR-16 | Operación inexistente: ANULA con un id que no es una operación del estado actual (incluye ids de cuenta y de operaciones borradas por el reset). Comparte la posición O15 con E401 porque son comandos distintos. | 497, 498, 639, 640, 2487, 2488, 2491, 2492 | confirmado | O15 | 404 | `{"error":"E402","mensaje":"operación inexistente"}` |
| ERR-17 | Límite excedido: TRANSFER de más de 100000 entre cuentas con nombres de titular distintos (TRA-5, TRA-7). | 10, 486, 491, 1917, 1931, 1983 | confirmado | O16 | 422 | `{"error":"E506","mensaje":"límite excedido"}` |
| ERR-18 | Saldo insuficiente: el saldo del origen es menor que el monto. | 17, 627, 630, 1942, 1978 | confirmado | O17 | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` |
| ERR-19 | Servicio detenido: el token está en estado `halted`. Se evalúa después de la autenticación (O2) y antes del tamaño del cuerpo (O3). Solo afecta a `POST /msg`. | 3980–3983, 4026–4031 | confirmado | O2b | 503 | `{"error":"E599","mensaje":"service halted"}` |

### Pruebas de orden
Cada fila dice qué error ganó cuando se provocaron los dos a la vez.

| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| ORD-1 | E404 gana a E001: una ruta desconocida sin token responde 404. | 33, 34, 683 | confirmado |
| ORD-2 | E001 gana a E101 y a E100: sin token un cuerpo enorme o inválido responde 401. | 35, 727 | confirmado |
| ORD-3 | E404 gana a E101: la ruta se mira antes que el tamaño. | 729 | probable |
| ORD-4 | E101 gana a E100: un cuerpo enorme e inválido responde 413. | 728 | probable |
| ORD-5 | E104 gana a E201 y a E202: con un segmento vacío no se llega a mirar el control. | 510, 511 | confirmado |
| ORD-6 | E202 gana a E301 y a E302: un comando desconocido o con aridad errónea y control incorrecto responde E202. | 41, 42, 51 | confirmado |
| ORD-7 | E302 gana a E303 y a E401: con argumentos de más o de menos no se valida su contenido. | 504, 514 | confirmado |
| ORD-8 | E303 gana a E304 y a E401: el monto se valida antes que las cuentas. | 515, 517, 519 | confirmado |
| ORD-9 | E304 gana a E401 y a E506: la misma cuenta en ambos lados se detecta antes que su existencia y que el límite. | 516, 518 | confirmado |
| ORD-10 | E401 gana a E506: las cuentas deben existir antes de mirar el límite. | 490 | probable |
| ORD-11 | E506 gana a E507 (entre titulares distintos, con cualquier saldo: 0, 1, negativo o casi suficiente). | 491, 1917, 1921, 1926, 1931 | confirmado |
| ORD-12 | Entre cuentas del mismo titular no existe E506: si el saldo no alcanza responde E507. | 1602, 1942, 1952, 1978 | confirmado |

## 6. Cambios durante el día
Método: `probe/drift.ts` (y antes la misma secuencia lanzada a mano) repite contra el original los 20 ejemplos grabados por la mañana y compara estado y cuerpo con `pruebas/ejemplos.jsonl`. Además, el fuzzer diferencial compara cientos de secuencias aleatorias del original con nuestro reemplazo. Horas en UTC‑5.

| ID | Comportamiento | Evidencia | Confianza |
|---|---|---|---|
| CAM-0 | **No se detectó ningún cambio de versión** en las once comprobaciones hechas (la última con el canario, que además toca cada comando y cada error): los 20 ejemplos dieron siempre el mismo status y cuerpo que a la mañana, y 30 secuencias antiguas repetidas exactamente dieron lo mismo que cuando se grabaron. **"Sin cambios" se garantiza solo hasta la última comprobación: 15:41 (UTC‑5), ids 4690–5550.** Lo que pase después no está cubierto hasta que haya otra comprobación. | 2–21, 652–671, 744–763, 1502–1521, 2423–2442, 3558–3577, 3611–3907, 3931–3950, 4553–4622, 4690–5550 | confirmado |
| CAM-1 | Primera repetición de los 20 ejemplos: los ids 2–21 coinciden con `pruebas/ejemplos.jsonl` (mismo status y cuerpo). El log no guarda la hora de esa repetición. | 2–21 | confirmado |
| CAM-2 | 12:20, segunda repetición: idéntica. | 652–671 | confirmado |
| CAM-3 | 12:26, tercera repetición: idéntica. | 744–763 | confirmado |
| CAM-4 | 12:52, cuarta repetición: idéntica. Entre medias, 90 secuencias aleatorias de fuzz (semillas 101, 202 y 303) coincidieron por completo con el reemplazo. | 816–1500, 1502–1521 | confirmado |
| CAM-5 | ~13:08, quinta comprobación con `probe/drift.ts`: idéntica. | 2423–2442 | confirmado |
| CAM-6 | 13:21, sexta comprobación con `probe/drift.ts`: idéntica. Entre medias, 80 secuencias de fuzz de negocio v2 (semillas 707 y 808) coincidieron con el reemplazo. | 2494–3556, 3558–3577 | confirmado |
| CAM-7 | Varias reglas se descubrieron tarde (límite E101 de 8192 bytes, tope de 10 dígitos, comando HALT, regla TRA‑7 de homónimos), pero **no son cambios del servicio**: se repitieron pruebas hechas antes de la regla con el mismo resultado. Por ejemplo, el caso de E506 con saldo insuficiente del id 491 (12:06) dio lo mismo en el id 1920 (13:09). | 491, 1920, 1921 | confirmado |
| CAM-9 | 14:02–14:03, comprobación amplia (`probe/replay-drift.ts`, semilla 2026): 30 secuencias antiguas elegidas al azar (fuzz, fuzz de negocio, s2, s35), 267 pasos repetidos exactamente: 0 diferencias de status o cuerpo frente a lo grabado. | 3611–3907 | confirmado |
| CAM-10 | 14:04, séptima comprobación con `probe/drift.ts`: los 20 ejemplos, idénticos. | 3931–3950 | confirmado |
| CAM-11 | 15:29, canario `probe/canary.ts` (70 pasos en 2 secuencias que tocan cada comando y cada error: E001, E100–E104, E201, E202, E301 con y sin sugerencia y desempates, E302–E304, E401, E402, E404, E506, E507, E520, HALT;1/E599 y halted, TRA-7, límites 8192 bytes, 10 dígitos y 100000), comparado con nuestro `handle()`: 70/70 idénticos. | 4553–4622 | confirmado |
| CAM-12 | 15:35–15:41, línea base v1 antes de la v2 anunciada por los organizadores (que aclararon que la v2 aún no está activa): canario 70/70 (4690–4759), `drift.ts` 20/20 (4760–4780), batería de regresión `probe/regression.ts` con una secuencia de evidencia por cada regla de esta SPEC, 338 requests, 0 diferencias (4781–5118), y `replay-drift.ts` de 40 secuencias aleatorias más s9, s18, s20 y s34 completas, 388 pasos, 0 diferencias (5119–5550). `X-Req` es continuo de 1 en 1 desde el id 1 hasta el 5553 (4800 `POST /msg` autenticados): el proceso de nuestro token no se reinició en todo el día. | 4690–4780, 4781–5118, 5119–5550, 5553 | confirmado |
| CAM-8 | Después de la última comprobación (15:41) no hay datos. La versión que cuenta es la de las 20:00, así que se sigue comprobando con `probe/canary.ts` (bucle `probe/canary-loop.ts`) hasta las 19:45, y al activarse la v2 se repite la batería `probe/regression.ts`. Si el servicio cambiara, este apartado y las reglas afectadas se actualizan con la hora y los ids que lo prueben. | — | supuesto |

## 7. Riesgos
Comportamientos que un cliente nuevo no debería heredar. Las cuatro primeras columnas son las del formato del reto; después van la prioridad (alta, media o baja) y cómo cerrar el riesgo.

| ID | Comportamiento | Evidencia | Confianza | Prioridad | Cómo cerrarlo |
|---|---|---|---|---|---|
| RIE-8 | **HALT, comando oculto que detiene el servicio.** Cualquier cliente con token puede invocarlo, no está documentado y la `sugerencia` de E301 lo revela (`HELP` → `HALT`). Según el texto del propio error, un solo mensaje detiene el servicio; esto no se probó (HAL-4) y el servicio siguió vivo en las pruebas con `x` (614–616). | 540, 612, 613, 617 | probable | alta | quitar el comando de la API de clientes; si debe existir, moverlo a un canal de administración aparte (otra credencial, otra ruta y red interna), exigir una confirmación de dos pasos con un código de un solo uso en lugar de "reenviar con confirmación", y dejar un registro de auditoría. |
| RIE-1 | **Saldos negativos por ANULA.** ANULA no comprueba el saldo: anular un depósito ya gastado, o una transferencia cuyo destino ya gastó el dinero, deja saldos negativos (−1490, −100000), y se puede anular cualquier operación sin importar su antigüedad. | 495, 496, 632, 635–637, 2482–2484 | confirmado | alta | antes de anular, verificar que ninguna cuenta quedaría por debajo de 0 y rechazar con un error propio (por ejemplo 409 `saldo insuficiente para anular`); o, mejor, no revertir sino registrar un asiento compensatorio sujeto a las mismas reglas que una transferencia; y poner un plazo máximo para anular. |
| RIE-10 | **Límite esquivable con homónimos.** El límite de 100000 por transferencia no se aplica entre cuentas con el mismo nombre de titular, y el nombre es texto libre, sin verificar ni único: quien quiera mover 9999999999 solo tiene que abrir otra cuenta con el mismo nombre. | 1602, 1978, 1980, 1981, 2418, 2874, 2875 | confirmado | alta | identificar al titular con un identificador verificado (alta con KYC) y no con el nombre; aplicar el límite siempre, también entre cuentas propias, o con un tope propio y explícito para ese caso; y comprobar la unicidad o el parecido de nombres al dar de alta. |
| RIE-11 | **Sin límite acumulado.** Solo hay límite por operación: cuatro transferencias seguidas de 100000 pasan (400000), y 12 depósitos seguidos de 9999999999 también. | 2466–2470, 775–786 | confirmado | alta | límite por titular y por ventana de tiempo (por ejemplo diario), alertas por patrones de fraccionamiento y un tope de saldo. |
| RIE-2 | **Control público, no una firma.** El dígito de control es un MOD 97‑10 sin clave, que detecta errores de tecleo pero no autentica: cualquiera puede calcular uno válido para el mensaje que quiera (10 de 10 predicciones aceptadas). | 461–470 | confirmado | media | autenticar cada mensaje con un HMAC con clave secreta por cliente, y dejar el dígito de control solo como verificación de integridad. |
| RIE-12 | **Sin protección contra repetición.** Un mensaje válido se puede reenviar tantas veces como se quiera y cada vez crea una operación nueva (12 depósitos idénticos con el mismo control). | 775–786, 3911, 3912, 3913, 3914 | confirmado | media | exigir un identificador de idempotencia único por mensaje (nonce o clave de idempotencia) y rechazar repeticiones. |
| RIE-13 | **ANULA basta con conocer el id.** El mensaje de ANULA solo lleva el id de la operación y no identifica a quien anula; con el id (secuencial, RIE-4) se puede anular cualquier operación del token, también las más antiguas. | 14, 495, 631, 635 | confirmado | media | exigir que la operación pertenezca al solicitante autenticado, limitar el plazo de anulación y registrar quién anula y cuándo. |
| RIE-3 | **PING no valida el control.** Responde 200 con cualquier control, incluso mal formado, mientras que el resto de comandos sí lo exigen. | 458, 459, 700 | confirmado | baja | validar todos los comandos igual; si PING es un chequeo de salud, moverlo a `GET /health`. |
| RIE-4 | **Ids secuenciales y enumerables.** Las cuentas y las operaciones son `AC-0001`, `OP-0001`…, y E401/E402 revelan si un id existe. | 4, 5, 16, 497 | confirmado | media | ids no predecibles (UUID o aleatorios largos) y una respuesta uniforme para "no existe" y "no es tuyo". |
| RIE-9 | **La sugerencia de E301 enumera los comandos.** Probando nombres parecidos se descubren todos los comandos, incluidos los ocultos. | 539, 540, 574–576, 589–604 | confirmado | media | eliminar el campo `sugerencia`, o limitarlo a los comandos públicos. |
| RIE-6 | **Depósitos sin límite ni origen de fondos.** El único tope es el de DEP-2 (10 dígitos, 9999999999 por operación): no hay límite acumulado ni control del origen de fondos. | 474, 771, 775–786, 2451–2457 | confirmado | media | límite por operación y acumulado, verificación del origen de fondos y revisión manual por encima de un umbral. |
| RIE-14 | **Altas ilimitadas.** No hay tope de cuentas por nombre ni por token (6 cuentas `Zoe` en una misma secuencia, nombres de 200 caracteres), lo que facilita el abuso y alimenta RIE-10. | 506, 2461, 2471–2474 | confirmado | baja | limitar el número de cuentas por titular verificado, la longitud del nombre y el ritmo de altas. |
| RIE-5 | **Respuestas inconsistentes.** `cuentaId` en ALTA frente a `cuenta_id` en CONSULTA, `"recieved"` mal escrito, un espacio sobrante en el mensaje de E301 y `ok:false` con status 200 en una ANULA repetida. | 4, 6, 7, 13, 15 | confirmado | baja | versionar la API (v2) con un esquema coherente y status HTTP que reflejen el error; mantener v1 tal cual para los clientes que dependen de ella. |
| RIE-7 | **`X-Req` expone el volumen.** Es un contador de los mensajes del token que no se reinicia con `/__reset`. | 36, 52 | confirmado | baja | quitar la cabecera o sustituirla por un identificador opaco de petición. |
