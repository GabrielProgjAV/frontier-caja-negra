| T5 | **v2 cambio A** (desde 16:16, frontera 5554): CONSULTA devuelve `saldo` como **string**: el saldo interno (entero, igual que en v1) dividido entre 100 con exactamente 2 decimales, sin separador de miles y con `-` delante si es negativo. Ejemplos: 0 → `"0.00"`, 1 → `"0.01"`, 10 → `"0.10"`, 23556 → `"235.56"`, -3 → `"-0.03"`, -150000 → `"-1500.00"`, 11099999999 → `"110999999.99"`. Solo cambia la respuesta de CONSULTA: montos, validaciones, DEPOSITO y TRANSFER no cambian. | En `src/core/handle.ts`, `case 'CONSULTA'`: `saldo: cuentas[c]` → `saldo: fmt(cuentas[c])`, con `const fmt = (n: number) => (n < 0 ? '-' : '') + Math.floor(Math.abs(n) / 100) + '.' + String(Math.abs(n) % 100).padStart(2, '0');` | 5952, 5954, 5956, 5958, 5960, 5963, 5965, 5969, 5971 (s46b) y regresión 5629, 5632, 5743, 5748, 5833 | hecho (785d595, desplegado; superseded en probe/v2.json ad3d365): v2 418/418, v1 vigentes 5122/5122 + ejemplos 12/12, npm test 6/6, tsc limpio |
| T6 | **v2 cambio B** (desde 16:16): el límite de TRANSFER entre titulares distintos (E506) baja de 100000 a **50000**, inclusivo: 50000 pasa, 50001 → 422 E506. TRA-7 igual (mismo titular sin límite: 150000 pasa, 5601). Orden de errores igual. | En `src/core/handle.ts`: `const LIMITE_TRANSFER = 100000;` → `50000` (actualizar el comentario: 50000 ok 5943, 50001 E506 5942). | 5941, 5942, 5943 (s46a), 5600, 5603, 5634, 5669 | hecho (785d595, desplegado; superseded en probe/v2.json ad3d365): v2 418/418, v1 vigentes 5122/5122 + ejemplos 12/12, npm test 6/6, tsc limpio |
# PLAN · caja-negra (hasta las 20:00 del 2026-10-10, hora UTC-5)

> **REGLA para todos los agentes:** lee este archivo antes de empezar una tarea. Al terminar cada tarea,
> actualiza su estado y la hora (`HH:MM`), haz commit y push.
> **Solo UN agente prueba el original a la vez**, porque el token comparte estado y presupuesto. Antes de
> probar, apúntate en "Sonda activa" y libérala al terminar.

**Sonda activa:** SONDEADOR (16:50): esperando T5+T6 del builder para rearrancar canary-loop (el canario compara con handle(); sin T5/T6 daría ALERTA en falso).

**FRONTERA v1/v2 = id 5554** (16:16, primer request de canary-loop). Último id v1 = 5553 (15:41). El proceso se reinició entre 15:41 y 16:16:
X-Req volvió a 1 en el id 5560 (era 4800 en el 5553). Canario completo 16:16: 7/70 diferencias (ids 5554–5623). Todo id ≥ 5554 es v2.
