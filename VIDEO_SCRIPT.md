# VIDEO SCRIPT · Black Box Replacement (max 2:00)

Plain English, short sentences. About 240 words in total, so it fits in 2 minutes at a slow, clear pace.
Every number comes from README.md, SPEC.md or PLAN.md (state at 13:24, UTC-5). Update them if they change before you record.
Spanish translation is under each part.

| Part | Time | Words |
|---|---|---|
| 1. Problem | 0:00–0:15 | ~30 |
| 2. Method: "original as oracle" | 0:15–0:40 | ~50 |
| 3. Discoveries | 0:40–1:15 | ~75 |
| 4. Measurable results | 1:15–1:40 | ~50 |
| 5. Incident v2 response | 1:40–1:55 | ~30 |
| 6. Close | 1:55–2:00 | ~10 |

---

## 1. Problem (0:00–0:15)

**On screen:** RETO.md title. Then one line of the service: `POST /msg  {"m": "PING;64"}`. Show "no code, no docs".

**Say:**
> A service ran for ten years. Nobody knows what it does.
> It gets messages over HTTP and it answers.
> Our job: build a copy that answers exactly the same. Even the errors.

**Español:**
> Un servicio funcionó durante diez años. Nadie sabe qué hace.
> Recibe mensajes por HTTP y responde.
> Nuestro trabajo: construir una copia que responda exactamente igual. Incluso los errores.

---

## 2. Method: "the original is the oracle" (0:15–0:40)

**On screen:** the diagram from DESIGN.md (probe → original → experimentos.jsonl → SPEC.md → replacement). Then a few lines of `experimentos.jsonl` with the fields `hipotesis`, `request`, `response`, `conclusion`.

**Say:**
> We did not guess. We asked the original.
> Every test starts with a hypothesis.
> Our script sends one request, and saves it in a log.
> We keep five requests per second at most.
> Then we write the spec, and we cite the log lines.
> No line in the spec without proof.

**Español:**
> No adivinamos. Le preguntamos al original.
> Cada prueba empieza con una hipótesis.
> Nuestro script manda una solicitud y la guarda en un log.
> Mantenemos máximo cinco solicitudes por segundo.
> Después escribimos la especificación y citamos las líneas del log.
> Ninguna línea de la especificación sin prueba.

---

## 3. Discoveries (0:40–1:15)

**On screen:** four short cards, about 8 seconds each.
1. The formula `control = 98 − (N·100 mod 97)` and the word IBAN.
2. The error order: `404 → 401 → 413 → 400 E100 → E102 → E103 → E104 → E201 → E202 → E301 → E302 → E303 → E304 → E401 → E506 → E507`.
3. Trap rule TRA-7: two accounts with the same name, limit 100000 does not apply.
4. `HALT;x;42` → `409 E520`, plus the hint that showed it (`HELP` → `"sugerencia":"HALT"`).

**Say:**
> One. The last number is a check digit. It is the same math as an IBAN: mod 97.
> We predicted ten new messages. All ten were accepted.
> Two. Errors have an order. Wrong route comes first. Then login. Then the body. Then the check digit. Then the command. Then the money rules.
> Three. A hidden trap. The limit of 100000 does not apply between two accounts with the same owner name.
> Four. A secret command: HALT. It asks for confirmation. We did not confirm it.

**Español:**
> Uno. El último número es un dígito de control. Es la misma matemática que un IBAN: módulo 97.
> Predijimos diez mensajes nuevos. Los diez fueron aceptados.
> Dos. Los errores tienen un orden. Primero la ruta equivocada. Luego la autenticación. Luego el cuerpo. Luego el dígito de control. Luego el comando. Luego las reglas de dinero.
> Tres. Una trampa escondida. El límite de 100000 no se aplica entre dos cuentas con el mismo nombre de titular.
> Cuatro. Un comando secreto: HALT. Pide confirmación. No la dimos.

---

## 4. Measurable results (1:15–1:40)

**On screen:** the results table from README.md, with these rows highlighted.

| Measure | Result |
|---|---|
| 20 examples against our replacement | 20/20 |
| Full experiment log replayed locally (`diff.ts`) | 3577/3577 |
| Deployed replacement on Render, 20 examples | 20/20 |
| Deployed replacement, 299-line sample | 299/299 (p95 latency 243 ms) |
| Random fuzz against the original | 90 sequences, 595 messages, 0 differences |
| Business fuzz v2 against the original | 80 sequences, 983 messages, 0 differences |

**Say:**
> Now the numbers.
> Our twenty examples pass: twenty out of twenty.
> We replay the whole log: 3577 out of 3577.
> The live copy passes the same examples.
> Its 95th percentile response time is 243 milliseconds.
> Random tests against the original found zero differences, in 90 sequences.
> Our first business tests found one trap. We fixed it. The next 80 sequences found none.

**Español:**
> Ahora los números.
> Nuestros veinte ejemplos pasan: veinte de veinte.
> Reproducimos todo el log: 3577 de 3577.
> La copia en vivo pasa los mismos ejemplos.
> Su percentil 95 de tiempo de respuesta es 243 milisegundos.
> Las pruebas aleatorias contra el original encontraron cero diferencias, en 90 secuencias.
> Nuestras primeras pruebas de negocio encontraron una trampa. La corregimos. Las siguientes 80 secuencias no encontraron ninguna.

> Note for the speaker: the log replay checks for regressions only. The log is what we built the copy from. The fuzz tests are the independent measure (README.md says this). Do not claim a hidden-test score: none is recorded yet.

---

## 5. Response to the v2 incident (1:40–1:55)

**On screen:** `probe/drift.ts` output, 20 of 20 identical, then the filled-in details below.

**Say:**
> The service can change during the day.
> So we check it again and again.
> At 13:21 our drift check said: no change.
> Then came the v2 incident. **[FILL IN: what changed, when you saw it, how you found it.]**
> **[FILL IN: what you changed in the replacement, and the result.]**

**Español:**
> El servicio puede cambiar durante el día.
> Por eso lo revisamos una y otra vez.
> A las 13:21 nuestra revisión de cambios dijo: sin cambios.
> Luego vino el incidente v2. **[COMPLETAR: qué cambió, cuándo lo viste, cómo lo encontraste.]**
> **[COMPLETAR: qué cambiaste en el reemplazo y el resultado.]**

> The files do not describe the v2 incident. Fill the two slots with facts only, and keep the part to about 30 words.

---

## 6. Close (1:55–2:00)

**On screen:** repo name `GabrielProgjAV/frontier-caja-negra` and the words SPEC.md · experimentos.jsonl.

**Say:**
> Every claim has proof in the log.
> Thank you.

**Español:**
> Cada afirmación tiene su prueba en el log.
> Gracias.
