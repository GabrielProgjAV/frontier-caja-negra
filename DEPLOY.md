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
   | Instance Type | **Starter** o superior, no Free |
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

## Advertencias

- **No pongas Health Check Path en `/health`.** Ese endpoint exige el token (ids 648-650 del log) y Render no manda
  `Authorization`, así que recibiría 401 y marcaría el servicio como caído. Sin ese campo, Render solo comprueba que el puerto abre.
- **El plan Free se duerme** tras ~15 min sin tráfico y pierde el estado en memoria. Usa un plan de pago durante la evaluación,
  o llama a `/health` con el token justo antes de validar en `/evento`.
- Cada redeploy o reinicio vuelve el estado a cero. No redespliegues en medio de una validación.
- Para cambiar `TEAM_TOKEN` hay que editar la variable y esperar al redeploy.
- Para probar en local: `TEAM_TOKEN=x PORT=3000 npm start`.
