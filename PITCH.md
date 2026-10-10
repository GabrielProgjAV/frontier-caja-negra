# PITCH · Black Box Replacement

5 slides. Each has a title, 3 bullets and speaker notes in plain English with a Spanish translation.
Numbers come from README.md, SPEC.md and PLAN.md (state at 13:24, UTC-5). Update them before the talk if they change.

---

## Slide 1 · The problem

- A service ran for years with no code and no docs.
- It gets `COMMAND;args;check` over `POST /msg` and answers JSON.
- We must answer the same status and body. Errors too.

**Speaker notes (EN):**
Nobody knows what this service does. It keeps accounts, balances and operations. We can only talk to it over HTTP. The copy must match every answer, even the wrong ones.

**Notas (ES):**
Nadie sabe qué hace este servicio. Guarda cuentas, saldos y operaciones. Solo podemos hablarle por HTTP. La copia debe coincidir en cada respuesta, incluso las erróneas.

---

## Slide 2 · Method: the original is the oracle

- One hypothesis, one request, one line in `experimentos.jsonl`.
- Our own scripts only. Maximum 5 requests per second.
- `SPEC.md` is written after, and cites the log ids.

**Speaker notes (EN):**
We did not guess. We asked the original and wrote down what it said. Each log line has the hypothesis, the request, the answer and what we learned. The spec comes after. A claim with no log line does not go in as confirmed.

**Notas (ES):**
No adivinamos. Le preguntamos al original y anotamos lo que dijo. Cada línea del log tiene la hipótesis, la solicitud, la respuesta y lo que aprendimos. La especificación viene después. Una afirmación sin línea de log no entra como confirmada.

---

## Slide 3 · What we found

- Check digit is ISO 7064 MOD 97-10, like an IBAN: `98 − (N·100 mod 97)`. 10 of 10 blind predictions were accepted.
- Errors have a fixed order (E404, E001, E101, E100 … E506, E507).
- Traps: same owner name skips the 100000 limit (TRA-7); hidden command `HALT` answers `409 E520`.

**Speaker notes (EN):**
The last number of each message is a check digit. It is the same math as an IBAN. Errors are checked in a fixed order, so the first one that applies wins. Two surprises: the 100000 limit does not apply between accounts with the same owner name, and a hidden command, HALT, asks for confirmation. We did not test the confirmation, because it is destructive.

**Notas (ES):**
El último número de cada mensaje es un dígito de control. Es la misma matemática de un IBAN. Los errores se revisan en un orden fijo, así que gana el primero que aplica. Dos sorpresas: el límite de 100000 no se aplica entre cuentas con el mismo nombre de titular, y un comando oculto, HALT, pide confirmación. No probamos la confirmación porque es destructiva.

---

## Slide 4 · Results we measured

- Examples 20/20. Full log replay 3577/3577 (a regression check).
- Deployed copy: examples 20/20, 299-line sample 299/299, p95 latency 243 ms.
- Fuzz against the original: 90 sequences, 595 messages, 0 differences. Business fuzz v2: 80 sequences, 983 messages, 0 differences.

**Speaker notes (EN):**
The log replay uses the same log we built the copy from, so it only shows no regressions. The fuzz tests are the independent measure. The first business fuzz found one difference, the TRA-7 rule. We fixed it, and the next 80 sequences found none. We have no hidden-test score yet, so we do not claim one.

**Notas (ES):**
La reproducción del log usa el mismo log con el que construimos la copia, así que solo muestra que no hay regresiones. Las pruebas de fuzz son la medida independiente. El primer fuzz de negocio encontró una diferencia, la regla TRA-7. La corregimos y las siguientes 80 secuencias no encontraron ninguna. Todavía no tenemos un resultado del set oculto, así que no afirmamos uno.

---

## Slide 5 · Change during the day, and what is next

- `drift.ts` repeats the 20 morning examples against the original. At 13:21: 20 of 20 identical.
- v2 incident: **[FILL IN: what changed, and when]**.
- Our response: **[FILL IN: what we changed, and the result]**. Known risks are in SPEC.md section 7.

**Speaker notes (EN):**
The service can change, and we are graded on the 20:00 version. So we check it again and again. **[FILL IN: tell the v2 story in two or three short sentences.]** The spec also lists risks a new client should not inherit, like negative balances after a cancel and the open HALT command.

**Notas (ES):**
El servicio puede cambiar y nos califican con la versión de las 20:00. Por eso lo revisamos una y otra vez. **[COMPLETAR: cuenta la historia del incidente v2 en dos o tres frases cortas.]** La especificación también lista riesgos que un cliente nuevo no debería heredar, como saldos negativos tras una anulación y el comando HALT abierto.
