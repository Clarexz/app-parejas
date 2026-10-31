# Setup — secretos, builds e instalación

## 1. Secretos de GitHub

Se cargan en el repo: **Settings → Secrets and variables → Actions → New repository secret**.
Los valores salen del servidor: `/opt/app-parejas/secrets/CREDENCIALES.md` (lo crea la sesión de
servidor en S1).

| Secreto | Desde | De dónde sale |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Fase 0 | `base64 -w0 /opt/app-parejas/secrets/android-release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Fase 0 | `CREDENCIALES.md` (keystore) |
| `ANDROID_KEY_ALIAS` | Fase 0 | `CREDENCIALES.md` (keystore) |
| `ANDROID_KEY_PASSWORD` | Fase 0 | `CREDENCIALES.md` (keystore) |
| `EXPO_PUBLIC_SUPABASE_URL` | Fase 0 | URL pública de la API, p. ej. `https://parejas-api.<dominio>` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Fase 0 | `ANON_KEY` del `.env` del stack |
| `GOOGLE_SERVICES_JSON_BASE64` | Fase 4 | `base64 -w0 google-services.json` (Firebase, ver §1.1) |
| `GOOGLE_MAPS_API_KEY` | Fase 7 | Google Cloud Console (Maps SDK for Android) |

> La `ANON_KEY` es pública por diseño (va dentro del APK); la seguridad la dan las políticas RLS.
> La `SERVICE_ROLE_KEY` **nunca** sale del servidor.

**Keystore:** es único para todo el proyecto. Si se pierde, los APK nuevos ya no se pueden
instalar encima de los anteriores (habría que desinstalar y volver a iniciar sesión). Guarda una
copia del keystore y sus contraseñas en tu gestor de contraseñas.

## 1.1 Firebase para notificaciones push (Fase 4)

Los push viajan por **Firebase Cloud Messaging** (gratis). Firebase solo se usa para eso: la BD
sigue en el VPS. Se hace una vez:

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google → **Agregar proyecto**
   (p. ej. `app-parejas`). Google Analytics no hace falta (desactívalo).
2. En el proyecto: **Agregar app → Android**. *Nombre del paquete*: **`com.appparejas.app`** (el `ANDROID_PACKAGE`
   de `src/constants/app.ts`; tiene que coincidir exacto). El apodo y el SHA-1 son opcionales.
3. Descarga **`google-services.json`** (no lo subas al repo; está en `.gitignore`).
   - En tu computadora: `base64 -i google-services.json | tr -d '\n'` (Mac) o
     `base64 -w0 google-services.json` (Linux).
   - Crea el secreto de GitHub **`GOOGLE_SERVICES_JSON_BASE64`** con esa salida.
     `release-apk.yml` lo decodifica antes de `expo prebuild`; sin él el APK compila, pero el
     celular no obtiene token y no le llegan push (el recordatorio diario local sí funciona).
4. **Cuenta de servicio** (para que el servidor pueda enviar): ⚙️ *Configuración del proyecto →
   Cuentas de servicio → Generar nueva clave privada*. Se descarga un JSON con una llave privada:
   trátalo como contraseña.
   - Cópialo al VPS **sin pasarlo por el chat**: `scp archivo.json root@<IP-del-VPS>:/opt/app-parejas/secrets/firebase-service-account.json`
     y luego en el VPS `chmod 600` sobre él.
   - Bórralo de tu computadora (o guárdalo en tu gestor de contraseñas).
5. Verifica en *Configuración del proyecto → Cloud Messaging* que **"Firebase Cloud Messaging API
   (V1)"** esté habilitada (en proyectos nuevos ya viene así).
6. Pídele a la sesión de la fase el "Prompt para el servidor": corre
   `scripts/server/set-notify-config.sh`, que genera el secreto compartido entre la BD y la función
   `notify`, guarda la cuenta de servicio en `secrets/functions.env` y recarga el contenedor.

Cómo funciona por dentro: al insertar una respuesta, comentario, mood o toque, un trigger de
Postgres (pg_net) llama a la Edge Function `notify` con el evento; la función revisa las
preferencias de quien recibe, arma el texto y lo manda por FCM HTTP v1 a sus celulares, y borra
los tokens que FCM rechaza. Detalles en `docs/SERVIDOR.md` §5.1.

## 1.2 API key de Google Maps (Fase 7, opcional)

El mapa de las memorias usa Google Maps. La key es **opcional**: si el APK se compila sin
`GOOGLE_MAPS_API_KEY`, todo funciona igual y el mapa se dibuja con el "mapa de papel" propio de la
app (sin calles). Para tener el mapa de Google, una sola vez:

1. Entra a <https://console.cloud.google.com> con tu cuenta de Google → selector de proyectos →
   **Proyecto nuevo** (p. ej. `app-parejas`). Google pide una tarjeta para activar la facturación,
   pero el uso de Maps SDK for Android (mapas móviles) no tiene costo ni cuota para este volumen.
2. **APIs y servicios → Biblioteca** → busca **Maps SDK for Android** → **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**. Copia la key.
4. Ábrela para **restringirla** (así, aunque alguien la extraiga del APK, no la puede usar):
   - *Restricciones de la aplicación*: **Apps de Android** → **Agregar un elemento**:
     - Nombre del paquete: **`com.appparejas.app`** (el `ANDROID_PACKAGE` de `src/constants/app.ts`).
     - Huella digital del certificado SHA-1: la del **keystore de release** (ver abajo).
   - *Restricciones de API*: **Restringir clave** → solo **Maps SDK for Android**.
5. Crea el secreto de GitHub **`GOOGLE_MAPS_API_KEY`** con la key. `release-apk.yml` lo exporta
   antes de `expo prebuild`; `app.config.ts` agrega el plugin `react-native-maps` y enciende
   `extra.mapsEnabled` solo cuando existe.

**SHA-1 del keystore de release.** El keystore vive en el VPS
(`/opt/app-parejas/secrets/android-release.keystore`; alias y contraseña en `CREDENCIALES.md`):

```bash
ssh root@<IP-del-VPS>
keytool -list -v \
  -keystore /opt/app-parejas/secrets/android-release.keystore \
  -alias <ANDROID_KEY_ALIAS> -storepass '<ANDROID_KEYSTORE_PASSWORD>' | grep 'SHA1'
```

Copia el valor `SHA1: AB:CD:...` en la restricción del paso 4. Si no tienes `keytool` en el VPS,
decodifica el keystore del secreto `ANDROID_KEYSTORE_BASE64` en tu computadora y corre el mismo
comando ahí. No se necesita SHA-1 de depuración: la app solo se instala con el APK firmado de
release.

**Ubicación de las fotos.** `app.config.ts` activa `isAccessMediaLocationEnabled` en
`expo-media-library` (permiso `ACCESS_MEDIA_LOCATION`) para poder leer el GPS que traen las fotos
de la galería y proponer el lugar de la memoria. Es opcional para quien la usa: si la persona no
lo concede, el lugar se elige a mano en el mapa.

## 1.3 Distancia: permisos y batería (Fase 8)

La distancia entre los dos es **opt-in**: la app nunca pide ubicación al abrirse; solo cuando
alguien activa "Compartir mi distancia" en la pantalla **Distancia** (Más → Distancia, o tocando la
tarjeta de Inicio).

**Qué pide** (`expo-location` en `app.config.ts`):

- `ACCESS_COARSE_LOCATION`: ubicación **aproximada**. La precisa (`ACCESS_FINE_LOCATION`) se
  bloquea en el manifiesto, así que Android no ofrece "Exacta".
- `ACCESS_BACKGROUND_LOCATION` (+ `RECEIVE_BOOT_COMPLETED`): solo se solicita si eliges **También
  en segundo plano**. No hay servicio en primer plano ni notificación fija.

**Modos** (preferencia local de cada celular):

1. *Apagado*: se borra tu fila de `locations` y se detiene la tarea.
2. *Al abrir la app*: al abrir la app o volver a ella se lee la última ubicación conocida (o una
   lectura de precisión baja), se redondea a 2 decimales (~1 km), se obtiene la ciudad y se manda
   con `set_my_location`. No se manda si pasaron menos de 10 minutos y no te moviste más de 1 km.
3. *También en segundo plano*: igual que el anterior, más una tarea de `expo-task-manager` de baja
   frecuencia (precisión baja, cada ~1 km o ~30 min, agrupada).

**Activar "Permitir todo el tiempo"** (modo en segundo plano). La app primero pide el permiso
normal; después Android 11+ te manda a Ajustes: **Permisos → Ubicación → Permitir todo el tiempo**
(y deja "Usar ubicación precisa" apagado). Si ya lo habías negado: Ajustes → Apps → App Parejas →
Permisos → Ubicación. Si lo niegas, la app se queda en *Al abrir la app* y lo avisa.

**Consumo esperado.** En primer plano es una sola lectura al abrir la app. En segundo plano Android
entrega pocas actualizaciones por hora y las agrupa; con precisión baja el gasto de batería es
mínimo, pero depende del celular (algunos fabricantes matan las tareas en segundo plano; en ese caso
la ubicación se actualiza al abrir la app). Si notas gasto, vuelve a *Al abrir la app*.

**Privacidad.** El servidor guarda solo la última ubicación de cada quien (redondeada, sin
historial) y la borra al apagar la distancia o al salir de la pareja. Solo la ve tu pareja (RLS).

## 2. Publicar un APK

Lo hace la sesión de cada fase al cerrar, pero también puedes tú:

1. GitHub → pestaña **Actions** → **Release APK** → **Run workflow**.
2. `ref`: la rama de la fase; `fase`: p. ej. `0 — Cimientos`; `version`: p. ej. `v0.0.1`
   (debe existir `docs/releases/<version>.md`).
3. Al terminar aparece un *pre-release* en **Releases** con `app-parejas-<version>.apk`.

Detalles de versiones y notas en `docs/releases/README.md`.

## 3. Instalar en el celular

1. En el celular, abre el release en GitHub (app de GitHub o navegador con tu sesión iniciada; el
   repo es privado).
2. Descarga `app-parejas-<version>.apk` y ábrelo.
3. La primera vez Android pide permitir **"Instalar apps desconocidas"** para la app desde la que
   lo abriste (Chrome / GitHub / Archivos).
4. Las siguientes versiones se instalan **encima** (misma firma) y conservan la sesión.

## 4. Desarrollo local (opcional, con la Mac)

```bash
npm ci
cp .env.example .env   # y pon la URL y la ANON_KEY reales
npx expo run:android   # build de desarrollo en un emulador o celular conectado por USB
npm run web            # solo para revisar UI; la app real es Android
```
