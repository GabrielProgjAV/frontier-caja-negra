# PLAN · caja-negra (hasta las 20:00 del 2026-10-10, hora UTC-5)

> **REGLA para todos los agentes:** lee este archivo antes de empezar una tarea. Al terminar cada tarea,
> actualiza su estado y la hora (`HH:MM`), haz commit y push.
> **Solo UN agente prueba el original a la vez**, porque el token comparte estado y presupuesto. Antes de
> probar, apúntate en "Sonda activa" y libérala al terminar.

**Sonda activa:** SONDEADOR: incidente v2 (desde 16:17): regression.ts + caracterización. canary-loop detenido por ALERTA a las 16:16.

**FRONTERA v1/v2 = id 5554** (16:16, primer request de canary-loop). Último id v1 = 5553 (15:41). El proceso se reinició entre 15:41 y 16:16:
X-Req volvió a 1 en el id 5560 (era 4800 en el 5553). Canario completo 16:16: 7/70 diferencias (ids 5554–5623). Todo id ≥ 5554 es v2.
