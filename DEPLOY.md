# Despliegue en Render

El reemplazo no tiene dependencias en ejecución: Node 24 ejecuta `src/server.ts` directamente. Escucha en
`0.0.0.0:$PORT` (Render inyecta `PORT`). El estado vive en memoria, así que **debe correr una sola instancia**.

## Pasos

1. Sube el repo a GitHub (`GabrielProgjAV/frontier-caja-negra`) con `package.json` y `src/` en la raíz. No subas `.env`.
2. En <https://dashboard.render.com> → **New +** → **Web Service** → **Build and deploy from a Git repository** → conecta GitHub y elige el repo.
3. Configura:

   | Campo | Valor |
   |---|---|
   | Name | `caja-negra` (o el que quieras) |
   | Region | la más cercana al evaluador |
   | Branch | `master` |
   | Runtime | **Node** |
   | Root Directory | vacío |
   | Build Command | `npm install --omit=dev` |
   | Start Command | `npm start` (equivale a `node src/server.ts`) |
   | Instance Type | **Free** (no hay tarjeta) |
   | Health Check Path | **vacío** (ver advertencia) |

4. En **Environment** → **Add Environment Variable**:

   | Clave | Valor |
   |---|---|
   | `TEAM_TOKEN` | el token del equipo que aparece en `/evento`, en la tarjeta de tu reto |
   | `NODE_VERSION` | `24` |

   No definas `PORT`: Render lo pone solo.
5. En **Scaling** deja **1 instancia** y sin autoscaling.
6. **Create Web Service** y espera a que el deploy pase a *Live*.

## Verificación

Con `URL` la dirección pública `https://<nombre>.onrender.com` y `TOKEN` el token del equipo:

```bash
curl -i -H "Authorization: Bearer $TOKEN" $URL/health
curl -i -X POST -H "Authorization: Bearer $TOKEN" $URL/__reset
curl -i -X POST -H "Authorization: Bearer $TOKEN" $URL/msg -d '{"m":"PING;64"}'
curl -i $URL/health
```

Esperado: `200 {"ok":true}`, `200 {"ok":true}`, `200 {"pong":true}` y `401 {"error":"E001",...}` en la última, sin token.

## Ping externo cada 5 minutos

Crea un monitor gratuito (cron-job.org o UptimeRobot) que haga `GET $URL/health` cada 5 minutos.
- Cualquier request despierta y mantiene vivo el servicio, aunque la respuesta sea `401`. Si el monitor no puede mandar el header
  `Authorization`, acepta `401` como "arriba". cron-job.org permite headers propios: ahí usa `Authorization: Bearer <TEAM_TOKEN>` y espera `200`.
- Actívalo desde ya y comprueba que el primer request tras 20 min de silencio responde en menos de 5 s.
- Antes de cada validación en `/evento`, haz un `curl` a `/health` a mano por si el monitor falló.

## Advertencias

- **No pongas Health Check Path en `/health`.** Ese endpoint exige el token (ids 648-650 del log) y Render no manda
  `Authorization`, así que recibiría 401 y marcaría el servicio como caído. Sin ese campo, Render solo comprueba que el puerto abre.
- **Plan Free: el estado perdido al dormir no importa**, porque cada test empieza con `POST /__reset`. El riesgo real es el
  **arranque en frío**: tras ~15 min sin tráfico Render duerme el servicio y el primer request tarda más de 5 s (el límite por paso).
  Solución: un ping externo cada 5 minutos que lo mantenga despierto (ver más abajo).
- Free incluye 750 horas al mes, suficiente para un solo servicio encendido todo el día.
- Cada redeploy o reinicio vuelve el estado a cero (inocuo por el `/__reset`), pero no redespliegues en medio de una validación: el servicio no responde durante el deploy.
- Para cambiar `TEAM_TOKEN` hay que editar la variable y esperar al redeploy.
- Para probar en local: `TEAM_TOKEN=x PORT=3000 npm start`.
