# Nginx Proxy Manager (NPM) - App Parejas

1. **Hosts > Proxy Hosts > Add Proxy Host**
   - Domain Names: `parejas-api.TU-DOMINIO.com`
   - Scheme `http`, Forward Hostname/IP: la IP del host vista desde el contenedor de NPM
     (normalmente `172.17.0.1`, o `host.docker.internal` si lo configuraste), Forward Port:
     `KONG_HTTP_PORT` (18000 por defecto).
   - Activa **Websockets Support** (necesario para Realtime) y **Block Common Exploits**.
2. **SSL**: pide un certificado Let's Encrypt, activa *Force SSL* y *HTTP/2*.
3. **Advanced** (cuadro "Custom Nginx Configuration"), para limitar a las rutas del API y
   subir el tamaño de subida:

   ```nginx
   client_max_body_size 55m;
   proxy_read_timeout 3600s;
   location ~ ^/(?!(auth|rest|realtime|storage|functions)/v1/) {
       return 404;
   }
   ```

Importante: como el gateway solo escucha en `127.0.0.1` del host, NPM en contenedor NO lo
alcanza por la IP del bridge. Opciones: (a) correr NPM con `network_mode: host`; (b) conectar
NPM a la red `app-parejas-net` y usar como destino `app-parejas-gateway:8000` (el contenedor
del gateway); no hace falta tocar puertos publicados. Elige (b) si NPM ya está en Docker.
