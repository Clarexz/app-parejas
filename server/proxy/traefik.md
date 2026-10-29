# Traefik - App Parejas

El gateway solo escucha en `127.0.0.1` del host. Si Traefik corre como binario/servicio en el
host, usa la opción A. Si corre en un contenedor (lo más común) no alcanza ese loopback: usa la
opción B (red Docker compartida). En ambas se limita a las rutas del API (Studio y `/pg` no deben salir a Internet) y el
WebSocket de Realtime funciona sin configuración extra.

Ajusta `TU-DOMINIO`, el nombre del entrypoint (`websecure`) y del resolver (`letsencrypt`) a
los que ya use tu Traefik. `18000` = `KONG_HTTP_PORT`.

## Opción A: file provider (Traefik en el host)

`/etc/traefik/dynamic/parejas-api.yml`:

```yaml
http:
  routers:
    parejas-api:
      rule: "Host(`parejas-api.TU-DOMINIO.com`) && PathRegexp(`^/(auth|rest|realtime|storage|functions)/v1/`)"
      entryPoints: [websecure]
      tls:
        certResolver: letsencrypt
      service: parejas-api
  services:
    parejas-api:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:18000"
```

## Opción B: labels sobre el gateway (Traefik en contenedor)

Conectar Traefik a la red `app-parejas-net` (`docker network connect app-parejas-net traefik`)
y añadir en `docker-compose.override.yml` (servicio `api-gw`):

```yaml
  api-gw:
    labels:
      - traefik.enable=true
      - traefik.docker.network=app-parejas-net
      - traefik.http.routers.parejas-api.rule=Host(`parejas-api.TU-DOMINIO.com`) && PathRegexp(`^/(auth|rest|realtime|storage|functions)/v1/`)
      - traefik.http.routers.parejas-api.entrypoints=websecure
      - traefik.http.routers.parejas-api.tls.certresolver=letsencrypt
      - traefik.http.services.parejas-api.loadbalancer.server.port=8000
```

Aquí Traefik llega por la red interna (puerto 8000 del contenedor), sin usar el puerto publicado.
Nota: conectar Traefik a `app-parejas-net` lo deja en la misma red que Postgres (sin puertos
publicados); es el único contacto con otros proyectos, así que hazlo solo si no hay otra salida.
Con Traefik < 3 usa `PathPrefix` en lugar de `PathRegexp` (varias reglas unidas con `||`).
