# Releases

Cada fase termina con un APK firmado publicado como _pre-release_ en GitHub Releases.

## Versiones

- Formato `v0.N.P`: **N** = número de fase, **P** = parche dentro de la fase (empieza en 0).
- Fase 0.5 no tiene número propio: usa el siguiente parche de `v0.0.P` (PLAN §9).
- **Una versión = un release:** antes de lanzar, revisa los releases existentes y usa el siguiente
  número libre. Si dos sesiones usan el mismo, el APK de una pisa al de la otra (D32).
- `v1.0.0` en adelante deja de ser pre-release.
- `versionName` = versión sin la "v"; `versionCode` = número de ejecución del workflow.

## Notas de cada release

Cada versión necesita `docs/releases/<version>.md`. **La primera línea es el encabezado de fase**,
con este formato exacto (el workflow lo lee en pushes de tags):

```
# Fase 0 — Cimientos
```

El resto es el cuerpo del release (requisitos previos, cómo instalar, qué probar).
Si falta el archivo, el workflow falla con un mensaje claro.

## Aviso dentro de la app (D107)

Desde la v0.12.3, la app revisa GitHub Releases al abrir y avisa en Inicio cuando hay un APK más
nuevo (y en **Más → Buscar versión nueva**). Se ofrece cualquier release `vN.N.N` con un `.apk`,
incluidos los pre-releases, en cuanto se publica.

- Si un APK **no debe instalarse todavía** (necesita un deploy del servidor que no se ha hecho, o es
  un spike de prueba), pon `<!-- sin-aviso -->` en sus notas. Cuando ya se pueda, quita la marca
  editando el release en GitHub (o `gh release edit vX.Y.Z --notes-file ...`): la app lo lee en
  vivo, no hace falta recompilar.
- El APK se descarga en el navegador del celular; Android lo instala encima (misma firma y
  `versionCode` mayor), sin perder la sesión.

## Cómo lanzar

- **Desde GitHub:** Actions → _Release APK_ → _Run workflow_; llena `ref` (rama o commit),
  `fase` (opcional si las notas tienen el encabezado) y `version` (p. ej. `v0.0.1`).
- **Con CLI:** `gh workflow run release-apk.yml -f ref=<rama-de-la-fase> -f version=v0.0.1 -f fase="0 — Cimientos"`.
- **Con tag:** `git tag v0.0.1 && git push origin v0.0.1` (la fase sale de las notas).

Si el release ya existe, se reemplaza el APK y las notas (útil para reintentos).

## Secretos (Settings → Secrets and variables → Actions)

Requeridos: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Opcionales (fases futuras): `GOOGLE_SERVICES_JSON_BASE64` (Fase 4), `GOOGLE_MAPS_API_KEY` (Fase 7).
