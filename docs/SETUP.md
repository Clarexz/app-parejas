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
| `GOOGLE_SERVICES_JSON_BASE64` | Fase 4 | `base64 -w0 google-services.json` (Firebase) |
| `GOOGLE_MAPS_API_KEY` | Fase 7 | Google Cloud Console (Maps SDK for Android) |

> La `ANON_KEY` es pública por diseño (va dentro del APK); la seguridad la dan las políticas RLS.
> La `SERVICE_ROLE_KEY` **nunca** sale del servidor.

**Keystore:** es único para todo el proyecto. Si se pierde, los APK nuevos ya no se pueden
instalar encima de los anteriores (habría que desinstalar y volver a iniciar sesión). Guarda una
copia del keystore y sus contraseñas en tu gestor de contraseñas.

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
