# Plan de implementación — App Parejas (réplica personal de Couple Joy)

> Documento vivo. Cada sesión de fase **lee este archivo primero** y, al terminar,
> actualiza la sección [Estado del proyecto](#10-estado-del-proyecto) y `docs/DECISIONS.md`.

---

## 1. Contexto y objetivo

Replicar, para uso **exclusivamente personal (2 usuarios: mi novia y yo, ambos con Android)**, la
experiencia de **Couple Joy – Relationship App** (HEARTBIT S.R.L.) y agregarle cosas extra. No se
publica en tiendas, no hay monetización, ni paywall, ni analítica, ni infraestructura propia que
mantener.

Principios:

1. **Infraestructura que ya tenemos.** Backend Supabase *self-hosted* en Docker en nuestro VPS de
   Hostinger, aislado de los demás proyectos; nada de servicios de pago.
2. **Simple > escalable.** Pensado para 1 pareja; nada de complejidad multi-tenant más allá de lo
   que RLS da gratis.
3. **Todo desbloqueado.** Lo que en Couple Joy es premium (preguntas ilimitadas, todos los widgets,
   reparar racha) aquí es gratis.
4. **Contenido.** Uso privado (regalo de aniversario, 2 personas). El banco base lo genera Claude
   (preguntas originales + clásicos de dominio popular + las 36 preguntas de Aron). Además la app
   y el repo permiten **importar preguntas propias** (CSV/JSON o desde la app), para que podamos
   meter las de cualquier baraja o fuente que tengamos. El repo debe ser **privado**. Ver §9, Fase 10.
5. **Nombre provisional:** **"App Parejas"** (se cambia cuando haya nombre definitivo; debe vivir en
   un solo lugar: `app.config.ts` + constante `APP_NAME`).
6. **Idioma:** toda la UI y el contenido en **español de México** (tuteo, "celular", "ustedes",
   expresiones naturales mexicanas, nada de "vosotros").
7. **Solo Android.** Nada de código/configuración específica de iOS.

---

## 2. Investigación: qué hace Couple Joy

Fuentes: ficha de App Store / Google Play (descripción + historial de versiones 4.10 → 4.29),
reseñas y análisis de UX de terceros.

| Área | Funcionalidad en Couple Joy | ¿En App Parejas? |
|---|---|---|
| **Emparejamiento** | Cada quien crea cuenta y se conectan como pareja al inicio. | Sí (código de invitación) |
| **Dashboard** | Fotos de ambos, días juntos, mood (se cambia tocando tu foto), accesos rápidos. | Sí |
| **Mood** | Compartir estado de ánimo; el de tu pareja se ve en tiempo real (y en widget). | Sí |
| **Contador** | Días/meses/años juntos. | Sí |
| **Distancia** | Distancia entre ambos (widget). | Sí |
| **Preguntas diarias** | Una al día; +3,000 preguntas; la respuesta de tu pareja se revela al contestar ambos; chat en tiempo real sobre cada respuesta; respuestas en audio; búsqueda; temas personalizados; recordarle a tu pareja; borrar respuestas. | Sí, todo |
| **Tipos de quiz** | Abierta, opción múltiple, "¿Quién es más probable?", "Yo nunca", "¿Qué prefieres?", de acuerdo/desacuerdo; resultados con coincidencias. | Sí |
| **Racha** | Racha diaria al responder ambos; reparar hasta 7 días perdidos; reparar la de tu pareja. | Sí (gratis) |
| **Juegos** | Los anteriores + reto de dibujo. | Sí |
| **Stories** | Foto/video/texto/dibujo/stickers que desaparecen en 24 h; salen en el widget de tu pareja; respuestas, reacciones, "visto", archivo, descargar. | Sí (sin video al inicio) |
| **Chat general** | Mensajes con reacciones, responder, "escribiendo…". | **No** (decisión: solo chat por pregunta) |
| **Memorias** | Diario/timeline compartido de fotos + texto; reordenar fotos. | Sí |
| **Mapa de pareja** | Memorias ligadas a lugares en un mapa. | Sí |
| **Cuentas regresivas** | Cumpleaños, aniversarios, próxima visita, planes; widget. | Sí |
| **Notas compartidas** | Listas para viajes, súper, bucket list. | Sí |
| **Widgets** | Días juntos, distancia, mood, stories, cuenta regresiva; pantalla de inicio y bloqueo. | Sí (Android) |
| **Notificaciones** | Tipos configurables; recordatorios. | Sí |
| **Compartir** | Imagen de racha/respuestas/días juntos para redes. | Sí |
| **Monetización** | Premium (~30 USD/año) y compra de reparación de racha. | **Eliminado** |

---

## 3. Alcance

### 3.1 Dentro del alcance

**MVP (fases 0–5):**
- Registro/inicio de sesión (email + contraseña) y **emparejamiento por código de invitación**.
- Perfil: nombre, foto, cumpleaños. Pareja: fecha de inicio de la relación, foto de pareja.
- Inicio: días juntos, mood de ambos, pregunta del día, racha, próxima cuenta regresiva, distancia.
- **Mood** compartido en tiempo real.
- **Pregunta diaria** + respuestas ocultas hasta que ambos contesten + **chat por pregunta**.
- **Racha** con reparación (gratis, hasta 7 días).
- **Banco inicial** de ~300 preguntas en español mexicano (se amplía a 3,000+ en la Fase 10).
- **Notificaciones push** (tu pareja contestó, comentario nuevo, cambió su mood, "toque", recordatorio).
- **Widgets Android**: días juntos, mood de tu pareja, cuenta regresiva, distancia.

**Completo (fases 6–12):**
- **Stories** de 24 h (foto, texto, dibujo) + widget de story + reacciones/respuestas + archivo.
- **Memorias** (timeline de fotos + texto) con ubicación y **mapa**.
- **Cuentas regresivas / eventos** (aniversario y cumpleaños automáticos, visitas, planes).
- **Listas compartidas** (viajes, súper, bucket list, pelis) con checkboxes.
- **Distancia** entre ambos (relación a distancia → prioridad alta).
- **Juegos**: ¿Qué prefieres?, Yo nunca, ¿Quién es más probable?, De acuerdo/desacuerdo, reto de dibujo.
- **Banco de contenido completo**: 3,000+ preguntas e ítems de juegos, con categoría picante opt-in.
- **Extras más allá de Couple Joy** (Fase 11, ver lista).
- Respuestas en **audio**, tarjeta compartible, bloqueo biométrico (Fase 12).

### 3.2 Fuera del alcance

- Publicación en Play Store, iOS en general, ASO, términos legales públicos.
- Pagos, suscripciones, anuncios, analítica, A/B tests.
- **Chat general** (se usa WhatsApp; solo hay chat por pregunta y respuestas a stories).
- Multi-idioma, tablets, múltiples parejas por usuario.
- Video en stories (posible extra futuro), backend propio, CI/CD complejo, ambientes staging/prod.

---

## 4. Requisitos

### 4.1 Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | Registro e inicio de sesión con email y contraseña; la sesión persiste. |
| RF-02 | Un usuario crea la pareja y obtiene un **código de 6 caracteres**; el otro lo ingresa y quedan vinculados. Máximo 2 miembros. |
| RF-03 | Cada quien edita su perfil (nombre, apodo, foto, cumpleaños). La pareja tiene fecha de aniversario y foto. |
| RF-04 | El Inicio muestra días juntos (y desglose años/meses/días), mood de ambos, pregunta del día, racha, próxima cuenta regresiva y distancia. |
| RF-05 | El usuario elige su mood (emoji + nota corta opcional); su pareja lo ve en tiempo real y recibe push. |
| RF-06 | Cada día (zona horaria de la pareja) se asigna **la misma pregunta** a ambos, sin repetir hasta agotar el banco. |
| RF-07 | La respuesta de tu pareja queda **oculta** hasta que tú contestas. Cuando ambos contestan, se notifica. |
| RF-08 | Cada pregunta contestada tiene un **hilo de comentarios** en tiempo real (el "chat" de la app). |
| RF-09 | La **racha** sube cuando ambos contestan la pregunta del día; se rompe si un día queda incompleto. |
| RF-10 | Se puede **reparar la racha** contestando las preguntas de los días perdidos (máx. 7 días atrás). |
| RF-11 | Historial de preguntas contestadas con búsqueda y filtro por categoría; preguntas extra (no diarias) por categoría/tema. |
| RF-12 | Mandar un **"toque"/recordatorio** a tu pareja para que conteste. |
| RF-13 | Push por: respuesta de tu pareja, comentario nuevo, mood, story nueva, memoria nueva, toque; recordatorio local diario a hora configurable; cada tipo activable/desactivable. |
| RF-14 | **Widgets Android**: días juntos, mood de tu pareja, cuenta regresiva, distancia, story de tu pareja. Se actualizan al abrir la app, periódicamente y al llegar un push de datos. |
| RF-15 | *(eliminado: chat general)* |
| RF-16 | **Stories**: foto (cámara/galería), texto o dibujo; caducan a las 24 h; tu pareja puede verla, reaccionar y responder (respuesta privada ligada a la story); archivo personal de stories. |
| RF-17 | **Memorias**: título, fecha, texto, 1–10 fotos (reordenables) y ubicación opcional; vista timeline y vista mapa. |
| RF-18 | **Cuentas regresivas**: eventos con fecha, emoji y recurrencia anual; aniversario y cumpleaños automáticos. |
| RF-19 | **Listas compartidas**: listas con ítems con check, sincronización en tiempo real. |
| RF-20 | **Distancia**: cada quien comparte (opt-in) su ubicación aproximada; se muestra la distancia en km, también en widget. |
| RF-21 | **Juegos**: ¿Qué prefieres?, Yo nunca, ¿Quién es más probable?, De acuerdo/desacuerdo — ambos contestan y se muestran coincidencias; reto de dibujo (uno dibuja, el otro adivina). |
| RF-22 | Compartir una tarjeta-imagen con racha / días juntos. |
| RF-23 | Categorías de contenido con **nivel de intensidad** (ligera, profunda, picante); la picante es opt-in y ambos deben activarla. |

### 4.2 Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Costo adicional **$0**: VPS existente, GitHub Actions (minutos incluidos) y Firebase gratis solo para FCM. |
| RNF-02 | Privacidad: **Row Level Security** en todo; solo los 2 miembros acceden a sus datos. Buckets de Storage privados con URLs firmadas. |
| RNF-03 | Tiempo real: mood/respuestas/comentarios visibles en < 2 s con la app abierta. |
| RNF-04 | Imágenes comprimidas en el cliente (máx. ~1600 px, JPEG ~0.7) para cuidar disco y datos móviles. |
| RNF-05 | UI en español de México, modo claro/oscuro, **diseño propio, bonito y llamativo** según `docs/DISENO.md` (nada genérico ni "AI slop", ver §8.5). |
| RNF-06 | TypeScript estricto, lint y tests unitarios de la lógica (racha, fechas, asignación de pregunta, distancia). |
| RNF-07 | Instalación directa en nuestros celulares Android vía **APK**, sin Play Store. |
| RNF-08 | Lectura razonable sin conexión (caché persistente de consultas). |
| RNF-09 | Consumo de batería bajo: ubicación en segundo plano solo con baja frecuencia y precisión reducida. |

---

## 5. Stack tecnológico

| Capa | Elección | Por qué |
|---|---|---|
| App | **React Native + Expo (SDK estable más reciente) + TypeScript** | Desarrollo rápido, módulos nativos vía *config plugins*, `expo prebuild` genera el proyecto Android que se compila en CI. |
| Navegación | **expo-router** (tabs + stacks) | Estándar actual de Expo. |
| UI | **NativeWind** (Tailwind) + tokens de tema propios; **react-native-reanimated**; **expo-image**; **expo-haptics** | Iteración rápida y buen rendimiento. |
| Datos | **TanStack Query** (caché + persistencia offline) + **Zustand** para estado local mínimo | Separar estado de servidor y de UI. |
| Formularios | **react-hook-form + zod** | Tipado y validación. |
| Backend | **Supabase self-hosted** (Docker Compose oficial) en **nuestro VPS de Hostinger**: Postgres, Auth (GoTrue), PostgREST, Realtime, Storage, Edge Functions (edge-runtime), pg_cron, pg_net; detrás del reverse proxy existente con **HTTPS** | Usamos la infraestructura que ya tenemos, sin límites del plan gratis y con los mismos APIs que Supabase Cloud (si el VPS no da, el plan B es Supabase Cloud Free sin cambiar código). |
| Tipos BD | `supabase gen types typescript --db-url` (en CI contra un Postgres efímero con las migraciones) | Tipos de punta a punta sin acceso al servidor desde las sesiones. |
| Push | **expo-notifications** (token FCM del dispositivo) + **FCM HTTP v1** llamado directo desde la Edge Function `notify` (cuenta de servicio de Firebase guardada en el servidor) | Sin depender de servicios de Expo; Firebase solo se usa para FCM (gratis). |
| Notificaciones locales | expo-notifications (recordatorio diario) | Sin backend. |
| Widgets | **react-native-android-widget** | Widgets renderizados desde JS, actualización periódica y tarea *headless*. |
| Ubicación / mapa | **expo-location** + **expo-task-manager** (segundo plano), **react-native-maps** (Google Maps, API key gratuita) | Distancia y mapa de memorias. |
| Dibujo | **@shopify/react-native-skia** | Stories con dibujo y reto de dibujo. |
| Media | expo-image-picker, expo-camera, expo-image-manipulator, expo-audio, expo-media-library | Captura, compresión, audio, descargar. |
| Seguridad local | expo-secure-store, expo-local-authentication (bloqueo opcional) | |
| Calidad | ESLint + Prettier, **Jest + @testing-library/react-native**, `tsc --noEmit` | Validaciones que corren en sesiones en la nube y en CI. |
| CI / Builds | **GitHub Actions**: `ci.yml` (lint, typecheck, tests, validación de migraciones) y `release-apk.yml` (`expo prebuild` + Gradle `assembleRelease`, APK **firmado** publicado en **GitHub Releases**) | Cada fase entrega un APK descargable; gratis (minutos de Actions incluidos), sin EAS. |

**Alternativas descartadas:** PWA (sin widgets), Kotlin nativo (más lento de iterar desde sesiones
en la nube), Firebase como BD (SQL + RLS simplifica racha/preguntas), PocketBase (más ligero, pero
sin Postgres/RLS/RPC; queda como plan C si el VPS anda muy justo de RAM).

---

## 6. Distribución: un APK probable por fase (GitHub Releases)

- **Cada fase termina con un APK release firmado** publicado en GitHub Releases del repo (privado),
  como *pre-release* con nombre `Fase N — <nombre>` y tag `v0.N.P` (P = parche dentro de la fase).
  Las notas del release dicen **qué probar** y cualquier paso previo (p. ej. "aplicar migraciones
  en el servidor").
- **Firma:** un único keystore (generado en la Fase 0, guardado en el servidor con las demás
  credenciales y como secretos de GitHub). Misma firma ⇒ cada APK **se instala encima del
  anterior** conservando la sesión; los datos viven en el servidor.
- **versionCode** = número de ejecución del workflow; **versionName** = tag.
- **Cómo se dispara:** la sesión de la fase, cuando todo está verde y el servidor ya tiene los
  cambios, lanza el workflow `release-apk.yml` (`workflow_dispatch` con la rama de la fase y el
  número de fase, usando las herramientas de GitHub) o empuja el tag. También lo puedes lanzar tú
  desde la pestaña *Actions* → *Release APK* → *Run workflow*. El workflow vuelve a correr
  lint/typecheck/tests antes de compilar.
- **Instalar:** desde el celular, abrir el release en GitHub (app de GitHub o navegador con sesión
  iniciada), descargar el `.apk` y abrirlo (permitir "instalar apps desconocidas" la primera vez).
- **Builds de desarrollo (opcional):** con la Mac se puede correr `npx expo run:android` para
  iterar rápido; no es necesario para probar las fases.
- **Secretos de GitHub** (los cargas tú en *Settings → Secrets and variables → Actions*):
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASSWORD`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, y en fases
  posteriores `GOOGLE_SERVICES_JSON_BASE64` (Fase 4) y `GOOGLE_MAPS_API_KEY` (Fase 7).

---

## 7. Arquitectura

```
┌──────────── Celular Android (Expo / RN) ──────────┐
│  expo-router ─ TanStack Query ─ Zustand            │
│        │  supabase-js (Auth, PostgREST, Realtime,  │
│        │              Storage)                     │
│  Widgets ◄── snapshot en almacenamiento compartido │
│  Headless task ◄── push de datos (FCM)             │
└────────┼───────────────────────────────────────────┘
         │ HTTPS  (https://<subdominio>, p. ej. parejas-api.<dominio>)
         ▼
┌────────── VPS Hostinger (Docker) ─────────────────┐
│ Reverse proxy existente (nginx/Traefik/Caddy/NPM)  │
│   └─► Kong (gateway de Supabase)                   │
│        ├─ Auth (GoTrue)      ├─ PostgREST          │
│        ├─ Realtime           ├─ Storage (+imgproxy)│
│        └─ Edge Functions: `notify` ─► FCM HTTP v1  │
│ Postgres (supabase/postgres: RLS, RPC, pg_cron,    │
│           pg_net) ─ volumen persistente            │
│ Studio (solo vía túnel SSH o con auth básica)      │
│ Cron del host: pg_dump diario + rotación           │
│ /opt/app-parejas/  (repo, .env, credenciales)      │
└────────────────────────────────────────────────────┘
```

**Decisiones clave:**
- **Lógica sensible en SQL (RPC `security definer`)**: `create_couple()`, `join_couple(code)`,
  `get_daily_question(day)` (idempotente), `submit_answer(...)`, `get_streak()`,
  `repair_streak(day)`. Ambos clientes ven lo mismo y no hay *race conditions*.
- **Respuestas ocultas**: RPC que solo devuelve la respuesta de tu pareja si tú ya contestaste.
- **Zona horaria**: la pareja guarda `timezone` (IANA, p. ej. `America/Mexico_City`); "el día" se
  calcula con ella. Si viven en zonas distintas, manda la de la pareja (configurable).
- **Widgets**: la app escribe un *snapshot* (días juntos, mood de la pareja, próximo evento,
  distancia, story) y pide redibujar. Con la app cerrada: actualización periódica del widget +
  push de datos que despierta una *headless task* que vuelve a leer del backend.
- **Push**: tabla `push_tokens`; triggers en `answers`, `answer_comments`, `moods`, `stories`,
  `story_replies`, `memories`, `nudges` → Edge Function `notify` → FCM al otro miembro,
  respetando `notification_prefs`.
- **Contenido como datos versionados**: el banco de preguntas vive en `content/*.json` en el repo
  y un script lo convierte en migración/seed SQL idempotente (upsert por `slug`).
- **El repo es la fuente de verdad del backend**: migraciones en `supabase/migrations/`, funciones
  en `supabase/functions/`, y un script `scripts/server/deploy.sh` que el servidor ejecuta
  (`git pull` → aplicar migraciones pendientes → sincronizar funciones → reiniciar el contenedor
  de funciones → *smoke test*). Nadie modifica la BD "a mano".
- **Aislamiento en el VPS**: stack propio (`docker compose -p app-parejas`), red Docker propia,
  sin publicar puertos de Postgres al exterior, sin tocar los contenedores/BD de otros proyectos.

### 7.1 Modelo de datos (borrador)

```
profiles(id uuid pk = auth.users.id, display_name, nickname, avatar_path, birthday, created_at)
couples(id, invite_code unique, anniversary_date, photo_path, timezone, spicy_enabled bool, created_at)
couple_members(couple_id, user_id unique, spicy_opt_in bool, joined_at)      -- máx. 2
moods(id, couple_id, user_id, emoji, note, created_at)                        -- el último = actual
question_categories(id, slug, name, emoji, intensity[ligera|profunda|picante])
questions(id, slug unique, category_id, type[open|choice|wyr|nhie|most_likely|agree],
          text, options jsonb, intensity, is_active, created_by null)
daily_questions(couple_id, day date, question_id, pk(couple_id, day))
answers(id, couple_id, question_id, user_id, day date null, text, choice, audio_path, created_at,
        unique(couple_id, question_id, user_id))
answer_comments(id, couple_id, question_id, user_id, body, reactions jsonb, created_at)
nudges(id, couple_id, from_user, kind, created_at)
stories(id, couple_id, user_id, kind[photo|text|drawing], media_path, text, bg, expires_at, created_at)
story_views(story_id, user_id, seen_at) ; story_reactions(story_id, user_id, emoji)
story_replies(id, story_id, user_id, body, created_at)
memories(id, couple_id, created_by, title, body, happened_on, lat, lng, place_name, created_at)
memory_photos(id, memory_id, path, position)
events(id, couple_id, title, emoji, date, recurring_yearly, kind[custom|anniversary|birthday|visit])
lists(id, couple_id, title, emoji, kind) ; list_items(id, list_id, text, done, position, done_by)
locations(user_id pk, couple_id, lat, lng, updated_at)          -- solo la última, redondeada
game_rounds(id, couple_id, game, item_ids, state jsonb, created_at) ; game_answers(...)
push_tokens(user_id, token, platform) ; notification_prefs(user_id, prefs jsonb, daily_reminder_time)
```

Helper de RLS: `is_couple_member(couple_id)`; toda tabla con `couple_id` usa
`using (is_couple_member(couple_id))`.

### 7.2 Estructura del repositorio (objetivo)

```
app/                 # expo-router: (auth), (onboarding), (tabs)/inicio|preguntas|stories|memorias|mas
src/
  components/  features/<feature>/{api,hooks,components}  lib/ (supabase, dates, streak, geo)  theme/
  widgets/           # react-native-android-widget
content/             # banco de preguntas/juegos en JSON (fuente de verdad del contenido)
scripts/             # generar seed SQL desde content/, validar duplicados, importar CSV
  server/            # deploy.sh, backup.sh, smoke-test.sh (se ejecutan EN el VPS)
supabase/
  migrations/  functions/notify/  seed/
server/              # docker-compose override, .env.example del stack, config del proxy (sin secretos)
.github/workflows/   # ci.yml, release-apk.yml
docs/PLAN.md  docs/DECISIONS.md  docs/SETUP.md  docs/SERVIDOR.md  docs/CONTENT.md
CLAUDE.md
```

### 7.3 Navegación (tabs)

1. **Inicio** – días juntos, moods, pregunta del día, racha, cuenta regresiva, distancia, fila de stories.
2. **Preguntas** – pregunta del día, historial, categorías, juegos.
3. **Stories** – crear story, ver la de tu pareja, archivo.
4. **Memorias** – timeline / mapa.
5. **Más** – cuentas regresivas, listas, distancia, extras, perfil, pareja, notificaciones, widgets.

---

## 8. Cómo trabajan las sesiones

Hay **dos tipos de sesión**:

| Sesión | Dónde | Qué hace |
|---|---|---|
| **Sesión de fase** | Claude Code (app de escritorio / nube) sobre este repo | Escribe código, migraciones, funciones, tests, CI; coordina; **redacta los prompts para el servidor**; publica el APK. No tiene acceso al VPS. |
| **Sesión de servidor** | Claude Code en la terminal del VPS de Hostinger | Levanta/actualiza el stack Docker, aplica migraciones, despliega funciones, guarda credenciales, configura respaldos. Solo hace lo que dice el prompt que le pegas. |

### 8.1 Reglas generales

- Rama por fase (la que asigne el entorno o `fase-N-<nombre>`) y PR contra `main`; tú haces
  *merge* después de probar el APK.
- Al empezar: leer `CLAUDE.md`, `docs/PLAN.md`, `docs/DECISIONS.md`, `docs/SERVIDOR.md` y `docs/DISENO.md`.
- **Idioma:** UI, notificaciones y contenido en **español de México**; convención de código y
  commits definida en Fase 0.
- Las sesiones de fase no tienen celular ni acceso al VPS: validan con lint, typecheck, tests,
  `npx expo export -p android`, `npx expo prebuild -p android --clean` y el CI (que además aplica
  todas las migraciones contra un Postgres efímero de `supabase/postgres` y regenera los tipos).
- **Nada de secretos en git.** En el repo solo van `.env.example` y plantillas. Los valores reales
  viven en el VPS (`/opt/app-parejas/secrets/`) y en los secretos de GitHub.

### 8.2 Definición de terminado de cada fase (protocolo de cierre)

1. Código + tests; `lint`, `typecheck`, `test`, `expo export` (y `prebuild` si hubo cambios
   nativos) en verde; CI verde en la rama.
2. **Si la fase toca el backend** (migraciones, funciones, buckets, secretos, cron): la sesión
   escribe en el chat un **"Prompt para el servidor"** (formato §8.3), te lo da para pegarlo en la
   sesión del VPS y **espera tu confirmación** con el resultado (salida del smoke test). Si algo
   falla, corrige y genera un nuevo prompt.
3. Si la fase necesita **secretos nuevos en GitHub**, te dice exactamente cuáles y de dónde salen
   (normalmente del archivo de credenciales del servidor).
4. La sesión lanza **`release-apk.yml`** sobre la rama de la fase, revisa que el job termine bien
   (y lo arregla si falla) y te pasa el **link del release** con la lista "Qué probar".
5. Actualiza §10 de este plan y `docs/DECISIONS.md`, hace commit/push y abre el PR con: resumen,
   cambios en backend, link al APK y checklist de pruebas manuales.
6. Tú pruebas en tu celular (y en el de tu novia si aplica) y haces *merge*. Si encuentras
   errores, se los dices a la misma sesión → nuevo parche `v0.N.(P+1)`.

### 8.3 Coordinación con el servidor

**Formato de todo "Prompt para el servidor"** (la sesión de fase lo genera completo, listo para
copiar):

```
[Contexto] Proyecto App Parejas, stack en /opt/app-parejas. Fase N.
[Objetivo] ...
[Pasos] 1) cd /opt/app-parejas/repo && git fetch && git checkout <rama> && git pull
        2) ./scripts/server/deploy.sh   (o pasos específicos)
        3) ...
[Restricciones] No toques contenedores, redes, volúmenes ni BD de otros proyectos. No publiques
        puertos de Postgres. No borres datos. Si algo no cuadra con lo esperado, detente y
        repórtalo en lugar de improvisar.
[Credenciales] Si generas o cambias alguna, actualiza /opt/app-parejas/secrets/CREDENCIALES.md
        (chmod 600) y dime cuáles debo copiar a GitHub Secrets.
[Verificación] Corre ./scripts/server/smoke-test.sh y muéstrame la salida completa.
[Reporte] Termina con un resumen corto que yo pueda pegar de vuelta en la sesión de la fase.
```

**Guardado de credenciales en el VPS** (lo hace la sesión de servidor desde S1):
- `/opt/app-parejas/secrets/` con permisos `700` (archivos `600`), dueño tu usuario.
- `.env` del stack (JWT secret, `ANON_KEY`, `SERVICE_ROLE_KEY`, contraseña de Postgres, contraseña
  del dashboard, SMTP si aplica).
- `CREDENCIALES.md`: inventario legible de todo (URLs, usuarios, contraseñas, llaves, para qué
  sirve cada una, fecha de creación, dónde más está copiada).
- `android-release.keystore` + contraseñas; `firebase-service-account.json` (Fase 4).
- Recomendación: además guardar una copia en tu gestor de contraseñas; el respaldo diario **no**
  debe incluir los secretos en el mismo lugar que el dump si se copia fuera del VPS.

**Prompts de servidor base** (la Fase 0 los entrega adaptados; aquí queda el esqueleto):

- **S0 — Reconocimiento (solo lectura).** Inventario del VPS: SO, CPU/RAM/disco libres, versión de
  Docker/Compose, contenedores y redes existentes, puertos en uso, qué reverse proxy hay y cómo se
  configuran los hosts/certificados, dominios/subdominios disponibles, si existe `git` y acceso al
  repo (deploy key de solo lectura o token), firewall. **No cambia nada.** Su reporte decide:
  Supabase self-hosted (si hay ≥ ~2 GB RAM libres; se apagan servicios no usados como analytics/
  vector si hace falta) o plan B (Supabase Cloud Free).
- **S1 — Instalación del stack.** Clonar el repo en `/opt/app-parejas/repo`; preparar el
  `docker-compose` oficial de Supabase self-hosted con nuestro override (`server/`), nombre de
  proyecto `app-parejas`, red propia, volúmenes persistentes; generar secretos fuertes (JWT,
  anon/service keys firmadas con ese JWT, contraseñas) y guardarlos (ver arriba); conectar Kong al
  reverse proxy con HTTPS en el subdominio elegido; Studio solo accesible por túnel SSH o con
  auth básica; configurar Auth (registro por email, `SITE_URL`, sin confirmación de email o con
  SMTP si se configura); generar el **keystore de Android**; instalar `scripts/server/backup.sh`
  en cron (pg_dump diario comprimido, retención 14 días + Storage semanal); correr el smoke test.
- **S-deploy — Aplicar cambios de una fase.** `git pull` de la rama + `scripts/server/deploy.sh`
  (migraciones pendientes con registro en `supabase_migrations.schema_migrations`, sincronizar
  `supabase/functions` al volumen del edge-runtime y reiniciarlo, crear buckets/secretos nuevos
  si la fase lo indica) + smoke test.
- **S-restore — Restaurar respaldo** (documentado en `docs/SERVIDOR.md`, por si acaso).

### 8.4 Orquestación con agentes (optimizar tokens)

La sesión principal de cada fase corre en **Opus** y actúa como **orquestador**: entiende la fase,
la divide en tareas, delega, revisa y cierra. **No implementa todo ella misma.**

**Agentes del proyecto** (definidos en Fase 0 en `.claude/agents/*.md`, con `model` en el
frontmatter, para que todas las sesiones deleguen igual):

| Agente | Modelo | Para qué |
|---|---|---|
| `explorador` | Haiku 5.5 | Búsquedas de solo lectura en el repo: "¿dónde está X?", "¿qué hooks existen para Y?". Devuelve rutas y conclusiones, no volcados de archivos. |
| `mecanico` | Haiku 5.5 | Trabajo mecánico y acotado: arreglar errores de lint/tipos triviales, renombres, formateo, actualizar docs/§10/DECISIONS.md, notas de release, validar/convertir JSON de contenido, boilerplate repetitivo. |
| `implementador` | Sonnet 5.5 | Implementar una tarea concreta de una feature: pantallas, hooks, componentes, migraciones SQL, funciones Edge, workflows de CI, tests. |
| `disenador-ui` | Sonnet 5.5 | Maquetar pantallas y componentes siguiendo `docs/DISENO.md` al pie de la letra, animaciones, estados vacíos/carga/error; QA visual con capturas (ver §8.5). |
| `contenido` | Sonnet 5.5 | Escribir preguntas, ítems de juegos, ideas de citas, textos de UI y notificaciones en español de México siguiendo `docs/CONTENT.md`. |

**Qué se queda el orquestador (Opus):** plan de la fase y orden de tareas; decisiones de
arquitectura; diseño de RLS/RPC y **revisión de seguridad** de toda migración; dirección de arte
y crítica de diseño; redactar los **prompts para el servidor**; integrar, revisar los diffs de los
agentes, correr la verificación final y cerrar la fase (§8.2); hablar contigo.

**Reglas de delegación:**
1. Elegir el modelo más barato que pueda hacer bien la tarea: Haiku para lo mecánico, Sonnet para
   construir, Opus solo para decidir/revisar. Ante la duda entre Haiku y Sonnet, Sonnet.
2. Cada encargo es **autocontenido**: objetivo, archivos involucrados, contrato (tipos, props,
   tablas), criterios de aceptación y comandos para verificar. Los agentes no heredan el contexto.
3. **Paralelizar** tareas independientes (p. ej. migración + pantalla + tests) en el mismo turno;
   usar `isolation: "worktree"` cuando dos agentes editarían los mismos archivos.
4. Los agentes responden con un **resumen corto** (qué cambió, archivos, resultado de los checks,
   dudas), no con el código completo; el orquestador revisa con `git diff` enfocado, no releyendo
   todo el repo.
5. El orquestador **no repite** trabajo de un agente: si algo está mal, devuelve el encargo con la
   corrección concreta al mismo agente (SendMessage) en vez de rehacerlo.
6. Contenido masivo (Fase 10): varios agentes `contenido` en paralelo, uno por categoría/lote, y un
   `mecanico` que valida y deduplica.
7. Registrar en el PR un mini resumen de la delegación (qué agente hizo qué), para ajustar las
   reglas si algo sale caro o mal.

### 8.5 Diseño: reglas para todas las fases

- **`docs/DISENO.md` es ley** (se crea en la Fase 0.5): concepto, tokens, tipografía, iconografía,
  ilustración, motion, componentes y la lista de "prohibido". Toda pantalla nueva lo sigue; si una
  fase necesita algo que no existe, se extiende el sistema primero (componente/tokens), no se
  improvisa en la pantalla.
- **Anti "AI slop" / genérico — prohibido:** degradados morado-azul, *glassmorphism* por todos
  lados, tarjetas blancas idénticas con sombra suave en una cuadrícula, Inter/Roboto en todo,
  emojis usados como iconos del sistema, ilustraciones 3D genéricas de stock, corazones
  rosa chicle como única idea, layouts de "dashboard SaaS", textos tipo "¡Bienvenido a tu
  experiencia!". Nada de pantallas que parezcan plantilla.
- **Sí:** un concepto con personalidad propia y consistente (p. ej. *diario/scrapbook* de pareja:
  papel, polaroids, cinta, garabatos a mano, stickers, tinta), jerarquía tipográfica con una
  display con carácter + una sans legible, paleta propia con nombre de cada color, micro-
  interacciones con significado (la racha "se enciende", el mood "late"), estados vacíos
  ilustrados y con humor, copy cálido y mexicano.
- **QA visual en cada fase:** la app tiene un target **web solo para desarrollo** (react-native-web)
  y un script `npm run shots` que, con Playwright y Chromium (preinstalado en las sesiones),
  renderiza las pantallas nuevas en viewport de celular (claro y oscuro) y guarda capturas. El
  `disenador-ui` las revisa contra `docs/DISENO.md`, el orquestador hace la crítica final, y las
  capturas van en el PR. (Widgets, Skia y mapas se revisan en el APK.)

---

## 9. Fases

| Fase | Nombre | Resultado visible | Depende de |
|---|---|---|---|
| 0 | Cimientos | APK `v0.0.x` que se conecta al Supabase del VPS; CI y releases funcionando | — |
| 0.5 | Dirección de arte y sistema de diseño | 3 conceptos para elegir, `docs/DISENO.md`, app con identidad propia | 0 |
| 1 | Auth, emparejamiento y perfil | Ambos se registran y se vinculan | 0.5 |
| 2 | Inicio, contador y mood | Inicio con días juntos y mood en tiempo real | 1 |
| 3 | Preguntas diarias, racha y comentarios | Núcleo de Couple Joy | 2 |
| 4 | Notificaciones push | Avisos de respuestas, mood, toques, recordatorio | 3 |
| 5 | Widgets Android | Widgets de días juntos, mood, cuenta regresiva | 4 |
| 6 | Stories | Stories 24 h + widget de story | 4, 5 |
| 7 | Memorias y mapa | Diario de fotos con mapa | 1 |
| 8 | Cuentas regresivas, listas y distancia | Eventos, listas, distancia (+ widgets) | 2, 5 |
| 9 | Juegos | Qué prefieres, Yo nunca, Quién es más probable, dibujo | 3 |
| 10 | Banco de contenido completo | 3,000+ preguntas e ítems de juegos | 3, 9 |
| 11 | Extras más allá de Couple Joy (11A y 11B) | Pienso en ti, cápsula, cupones, ruleta de citas, lenguajes del amor, visitas, estadísticas | 2, 8, 9 |
| 12 | Pulido, rendimiento y entrega | Diseño final, audio, APK definitivo | todas |

Las fases 7, 8, 9 y 11 son bastante independientes y se pueden reordenar.

---

### Fase 0 — Cimientos (app + CI/APK + servidor)

**Objetivo:** esqueleto del proyecto, pipeline que publica APKs firmados en GitHub Releases y
backend Supabase levantado en el VPS de Hostinger.

**Tareas (sesión de fase):**
1. `create-expo-app` con TypeScript y expo-router; estructura de §7.2; alias `@/`.
   Configuración **solo Android**, `package` = `com.appparejas.app` (provisional), nombre
   centralizado en `APP_NAME`.
2. ESLint, Prettier, Jest + RNTL; scripts `lint`, `typecheck`, `test`, `format`.
3. Tema base **mínimo y provisional** (tokens claro/oscuro, estructura de `theme/` lista para
   que la Fase 0.5 defina la identidad) y primitivos sin estilo final. Target **web solo para
   desarrollo** (react-native-web) y script `npm run shots` (Playwright, viewport de celular,
   claro/oscuro) para QA visual (§8.5).
3b. **Agentes del proyecto** en `.claude/agents/` (`explorador` y `mecanico` con Haiku 5.5;
   `implementador`, `disenador-ui` y `contenido` con Sonnet 5.5) según §8.4, y sección de
   orquestación en `CLAUDE.md`.
4. Cliente Supabase (`src/lib/supabase.ts`) con sesión persistente; provider de TanStack Query;
   pantalla temporal con **estado de conexión al servidor** (health check de Auth/REST) y versión
   de la app.
5. `supabase/` con la primera migración: `profiles` + trigger al registrarse, `couples`,
   `couple_members`, helper `is_couple_member`, RLS activada.
6. **CI:** `.github/workflows/ci.yml` (lint, typecheck, test; job `db` que levanta
   `supabase/postgres` como *service*, aplica todas las migraciones y regenera tipos, fallando si
   difieren de los commiteados).
7. **Release:** `.github/workflows/release-apk.yml` (`workflow_dispatch` con inputs `ref` y
   `fase`, y en push de tags `v*`): instala deps, corre checks, `expo prebuild -p android`,
   inyecta keystore y variables desde secretos, `./gradlew assembleRelease`, publica *pre-release*
   con el APK `app-parejas-v0.N.P.apk` y notas desde `docs/releases/v0.N.P.md`. Config de firma vía
   config plugin (sin commitear `android/`).
8. `server/`: override de docker-compose y `.env.example` del stack (sin secretos), notas para
   el reverse proxy. `scripts/server/deploy.sh`, `backup.sh`, `smoke-test.sh`.
9. `CLAUDE.md`, `docs/DECISIONS.md`, `docs/SETUP.md` (secretos de GitHub, instalar el APK),
   `docs/SERVIDOR.md` (arquitectura en el VPS, rutas, cómo desplegar, respaldar y restaurar).
10. **Coordinación con el servidor:** generar el prompt **S0**, esperar el reporte, decidir
    (y registrar en DECISIONS.md) self-hosted vs. plan B, generar el prompt **S1** adaptado al
    reverse proxy y recursos reales, esperar el reporte, y decirte qué secretos cargar en GitHub.
11. Publicar el primer release **`v0.0.x`**.

**Entregable APK:** app que abre, muestra "App Parejas", tema claro/oscuro y
**"Servidor: conectado ✅"** contra el backend del VPS.

**Criterios:** CI verde; release publicado con APK instalable; el APK conecta por HTTPS al
servidor; credenciales guardadas en `/opt/app-parejas/secrets/`; respaldo diario programado.

**Prompt de arranque:**
```
Lee docs/PLAN.md completo (sobre todo §5–§8). Actúa como orquestador según §8.4: planea, delega
en agentes Sonnet/Haiku y revisa. Vamos a ejecutar la **Fase 0 — Cimientos**.
Crea el proyecto Expo (SDK estable más reciente, TypeScript estricto, expo-router) en la raíz del
repo con la estructura de §7.2, configurado SOLO para Android (package provisional
com.appparejas.app, nombre "App Parejas" centralizado en APP_NAME). Configura
ESLint/Prettier/Jest/RNTL y los scripts lint, typecheck, test. Crea el tema base (claro/oscuro,
provisional; la identidad llega en la Fase 0.5), componentes primitivos, target web solo para
desarrollo con `npm run shots` (Playwright), los agentes de .claude/agents/ de §8.4, cliente
Supabase + TanStack Query y una pantalla
temporal que muestre la versión y el estado de conexión con el servidor. Crea supabase/ con la
primera migración (profiles con trigger al registrarse, couples, couple_members, helper
is_couple_member, RLS). Crea los workflows ci.yml (incluyendo validación de migraciones contra
supabase/postgres efímero y generación de tipos) y release-apk.yml (prebuild + Gradle
assembleRelease firmado con secretos, pre-release en GitHub Releases con notas de
docs/releases/), los archivos de server/ y scripts/server/ (deploy.sh, backup.sh, smoke-test.sh),
CLAUDE.md, docs/DECISIONS.md, docs/SETUP.md y docs/SERVIDOR.md. Después coordina conmigo el
servidor según §8.3: dame el prompt S0 (solo lectura) para la sesión de Claude Code de mi VPS de
Hostinger, espera su reporte, decide self-hosted vs. plan B, dame el prompt S1 adaptado, espera su
reporte y dime exactamente qué secretos cargar en GitHub. Finalmente cierra la fase con el
protocolo de §8.2 publicando el release v0.0.x.
```

---

### Fase 0.5 — Dirección de arte y sistema de diseño

**Objetivo:** que la app tenga una identidad visual propia, bonita y llamativa **antes** de
construir pantallas, y que todas las fases la sigan.

**Tareas:**
1. Investigación rápida de referencias (apps de pareja, diarios/scrapbooks, editorial, papelería)
   y de qué hace genérica a una app; resumen de hallazgos.
2. Proponer **3 conceptos de dirección de arte** distintos (nombre, idea, paleta con nombres,
   tipografías, textura, estilo de iconos/ilustración, motion, ejemplo de copy). Uno puede ser el
   de *diario/scrapbook*; los otros dos deben ser realmente diferentes.
3. Presentarlos como **prototipo visual HTML** (un artifact/página con las 3 propuestas aplicadas
   a 3 pantallas clave: Inicio, Pregunta del día, Memorias, en claro y oscuro) para que elijas
   uno (o una mezcla).
4. Con el concepto elegido: `docs/DISENO.md` completo (principios, tokens de color/espaciado/
   radios/sombras/tipografía, iconografía, ilustraciones y texturas, motion y haptics, voz y tono
   del copy, componentes con variantes y estados, patrones de pantallas, lista de "prohibido" de
   §8.5, checklist de revisión).
5. Implementar el sistema en código: tokens de tema (claro/oscuro), fuentes (expo-font,
   licencias libres p. ej. Google Fonts), set de iconos (uno con estilo propio o custom SVG),
   assets/texturas, y los componentes base rediseñados (`Screen`, `Text`, `Button`, `Card`,
   `Avatar`, `Input`, `Chip`, `Sheet`, `EmptyState`, `Toast`, `Sticker`, `Polaroid`/equivalentes
   según el concepto).
6. Pantalla oculta **"Catálogo de diseño"** dentro de la app con todos los componentes y tokens,
   y capturas con `npm run shots`.
7. Ícono de la app y splash provisionales coherentes con el concepto.

**Entregable APK (`v0.0.x`, parche siguiente):** la app ya con la nueva identidad (splash, ícono,
pantalla de conexión rediseñada) + "Catálogo de diseño" para revisar componentes en tu celular.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md (sobre todo §8.4 y §8.5) y docs/DECISIONS.md. Actúa como orquestador
según §8.4. Ejecuta la **Fase 0.5 — Dirección de arte y sistema de diseño**. Quiero una app
bonita, llamativa y linda, con personalidad: nada de estilos genéricos ni "AI slop". Investiga
referencias, propón 3 conceptos de dirección de arte realmente distintos y preséntalos en un
prototipo visual HTML (Inicio, Pregunta del día y Memorias, en claro y oscuro) para que yo elija.
Con el concepto elegido escribe docs/DISENO.md completo (tokens, tipografía, iconografía,
ilustración/texturas, motion/haptics, voz del copy en español de México, componentes y estados,
patrones, lista de prohibidos y checklist), impleméntalo en código (tema claro/oscuro, fuentes,
iconos, assets y componentes base), crea la pantalla "Catálogo de diseño", ícono y splash
provisionales y el script `npm run shots` de capturas con Playwright. Verifica lint, typecheck,
test y expo export, y cierra con el protocolo de §8.2 (APK con la nueva identidad).
```

---

### Fase 1 — Autenticación, emparejamiento y perfil

**Tareas:**
1. Pantallas `(auth)`: iniciar sesión, crear cuenta, recuperar contraseña.
2. Guardas: sin sesión → auth; con sesión sin pareja → onboarding; con pareja → tabs.
3. Onboarding: nombre/apodo, foto (bucket `avatars` privado, compresión), cumpleaños; **crear
   pareja** (código de 6 caracteres compartible por WhatsApp con el Share sheet) o **unirse con
   código**; fecha de aniversario y zona horaria (autodetectada).
4. RPC `create_couple()`, `join_couple(code)` (máx. 2 miembros), `leave_couple()` simple.
5. RLS completas para `profiles`, `couples`, `couple_members` (puedes leer el perfil de tu pareja).
6. Pantalla "esperando a tu pareja" con Realtime en `couple_members`.
7. Ajustes: editar perfil y datos de pareja; cerrar sesión.
8. Hooks `useSession`, `useCouple`, `usePartner`; tipos generados.

**Criterios:** dos cuentas quedan vinculadas; un tercero no puede unirse; nadie lee datos de
otra pareja.

**Entregable APK (`v0.1.x`):** registro/inicio de sesión, crear pareja o unirse con código, perfil con foto. Prueban los dos celulares.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 1 — Autenticación,
emparejamiento y perfil** (RF-01, RF-02, RF-03). Implementa auth con email/contraseña de Supabase,
guardas de navegación (auth → onboarding → tabs), onboarding de perfil con avatar (bucket privado,
imagen comprimida), crear pareja con código de invitación de 6 caracteres compartible o unirse con
código (RPC security definer create_couple/join_couple con límite de 2 miembros), fecha de
aniversario y zona horaria, pantalla de espera con Realtime y ajustes de perfil/pareja. Migraciones
con RLS estrictas y tipos regenerados. Tests de la lógica. Todos los textos en español de México.
Verifica lint, typecheck, test y expo export. En el PR explica cómo probarlo con dos cuentas;
cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 2 — Inicio, contador de relación y mood

**Tareas:**
1. Tabs de §7.3 con placeholders.
2. Inicio: avatares de ambos (o foto de pareja), **días juntos** en grande + desglose + próximo
   hito (100, 365, 500, 1000 días, "mesesitos", aniversarios).
3. **Mood**: tocar tu avatar abre selector (emojis + nota); tabla `moods`; Realtime; historial simple.
4. Tarjetas placeholder: pregunta del día, racha, cuenta regresiva, distancia.
5. `src/lib/dates.ts` con funciones puras y tests (bisiestos, zonas horarias, horario de verano).
6. Pull-to-refresh, estados vacíos y de carga cuidados.

**Entregable APK (`v0.2.x`):** Inicio con días juntos, desglose e hitos; cambiar mood y verlo aparecer en el otro celular.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 2 — Inicio, contador y mood**
(RF-04, RF-05). Crea las 5 tabs de §7.3, el Inicio con avatares, días juntos con desglose y
próximos hitos (incluyendo cumplemeses), selector de mood al tocar el avatar (tabla moods + RLS +
Realtime para ver el mood de tu pareja al instante) y tarjetas placeholder para pregunta del día,
racha, cuenta regresiva y distancia. Implementa src/lib/dates.ts con funciones puras y tests
exhaustivos (bisiestos, zonas horarias, DST). Cuida el diseño (tema romántico, animaciones sutiles
con reanimated, haptics, estados vacíos). Textos en español de México. Verifica lint, typecheck,
test y expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 3 — Preguntas diarias, racha y comentarios por pregunta

**Tareas:**
1. Tablas `question_categories`, `questions`, `daily_questions`, `answers`, `answer_comments`,
   `nudges` (+ RLS).
2. Formato de contenido en `content/questions/*.json` (`slug`, categoría, tipo, intensidad, texto,
   opciones) + `scripts/build-seed.ts` que genera SQL idempotente y valida duplicados.
   `docs/CONTENT.md` describe el formato y las reglas de estilo.
3. **Banco inicial de ~300 preguntas originales** en español de México, en categorías: Conocernos,
   Recuerdos, Nuestro futuro, Amor, A distancia, Divertidas, Hipotéticas, Valores, Viajes,
   Familia, Picantes (opt-in). Tipos `open` y `choice`.
4. RPC `get_daily_question(day)`: asigna idempotentemente una pregunta no usada por la pareja
   (rotando categorías, respetando el opt-in picante).
5. RPC `submit_answer` y `get_question_with_answers(question_id)` (solo revela la respuesta de tu
   pareja si ya contestaste).
6. **Racha**: `get_streak()` (actual, mejor) + reparación de días perdidos (≤ 7) contestándolos.
   Lógica espejo en TS puro con tests.
7. UI: tarjeta de pregunta del día en Inicio (sin contestar / esperando a tu pareja / ambos
   contestaron), pantalla de pregunta con respuestas y **comentarios en tiempo real** (con
   reacciones emoji), historial con búsqueda y filtros, preguntas extra por categoría, borrar mis
   respuestas, botón **"recuérdale a tu pareja"**, ajuste para activar picantes (requiere ambos).
8. Animación de celebración al completar el día y al subir la racha.

**Entregable APK (`v0.3.x`):** pregunta del día con respuestas ocultas, comentarios en tiempo real, racha y reparación, historial y búsqueda.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 3 — Preguntas diarias, racha y
comentarios** (RF-06 a RF-12, RF-23). Crea tablas y RLS de §7.1 para categorías, preguntas,
asignaciones diarias, respuestas, comentarios y nudges. Define el formato de contenido en
content/questions/*.json, un script scripts/build-seed.ts que genere SQL idempotente (upsert por
slug) y valide duplicados, y docs/CONTENT.md con formato y guía de estilo. Escribe ~300 preguntas
ORIGINALES en español de México (no copies Couple Joy ni juegos comerciales) en las categorías del
plan, incluida "A distancia" y "Picantes" opt-in, tipos open y choice. Implementa las RPC
get_daily_question (idempotente, día local de la pareja, sin repetir, respeta opt-in picante),
submit_answer, get_question_with_answers (solo revela la respuesta de tu pareja si ya contestaste),
get_streak y reparación de racha hasta 7 días; replica la lógica de racha en TS puro con tests.
UI: tarjeta de pregunta del día con sus 3 estados, pantalla de pregunta con comentarios en tiempo
real y reacciones, historial con búsqueda/filtros, preguntas extra por categoría, borrar respuestas,
botón para recordarle a tu pareja, ajuste de picantes y celebración al completar. Verifica lint,
typecheck, test y expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 4 — Notificaciones push

**Tareas:**
1. Registro de token con `expo-notifications` (pedir permiso en el momento adecuado), tablas
   `push_tokens` y `notification_prefs` (por tipo + hora del recordatorio diario).
2. Edge Function `notify` (Deno): resuelve al otro miembro, respeta preferencias, envía con
   **FCM HTTP v1** (OAuth con la cuenta de servicio de Firebase guardada en el servidor), limpia
   tokens inválidos; soporta mensajes visibles y **de datos** (para widgets).
3. Triggers con `pg_net` en `answers`, `answer_comments`, `moods`, `nudges` (mecanismo genérico
   listo para `stories`, `story_replies`, `memories`).
4. Recordatorio diario **local** a la hora elegida si no has contestado.
5. Deep links: tocar la notificación abre la pantalla correcta.
6. Pantalla de ajustes de notificaciones; textos de notificación con personalidad (es-MX).
7. `docs/SETUP.md`: crear proyecto Firebase (gratis) y app Android; `google-services.json` →
   secreto `GOOGLE_SERVICES_JSON_BASE64` (lo inyecta `release-apk.yml`); cuenta de servicio →
   prompt de servidor para guardarla en `/opt/app-parejas/secrets/` y exponerla a edge-runtime.

**Entregable APK (`v0.4.x`):** notificaciones reales entre ambos celulares (respuesta, comentario, mood, toque) y recordatorio diario.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 4 — Notificaciones push**
(RF-13). Registra tokens con expo-notifications en push_tokens/notification_prefs, crea la Edge
Function `notify` que envía por FCM HTTP v1 al otro miembro respetando preferencias, limpiando
tokens inválidos y soportando push de datos (para refrescar widgets después), y conéctala con
triggers pg_net en answers, answer_comments, moods y nudges (mecanismo genérico reutilizable para
stories, story_replies y memories). Agrega recordatorio diario local configurable, deep links desde
la notificación y pantalla de ajustes. Documenta en docs/SETUP.md cómo crear Firebase, el secreto
GOOGLE_SERVICES_JSON_BASE64 y dame el prompt de servidor para guardar la cuenta de servicio y
desplegar la función. Separa la lógica de la función en un módulo puro con tests. Textos en español de
México. Verifica lint, typecheck, test y expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 5 — Widgets Android

**Tareas:**
1. `src/widgets/`: construir el **snapshot** (`daysTogether`, `partnerName`, `partnerMood`,
   `nextEvent`, `distanceKm`, `partnerStoryThumb`, `updatedAt`) y persistirlo; actualizar al abrir
   la app, al cambiar datos relevantes y al recibir push de datos (headless task).
2. Widgets con `react-native-android-widget`: **Días juntos**, **Mood de mi pareja**, **Cuenta
   regresiva** (tamaños chico y mediano; los de distancia y story se agregan en fases 6 y 8 con la
   misma infraestructura).
3. Actualización periódica (`updatePeriodMillis` / WorkManager según la librería), tocar el
   widget abre la sección correspondiente.
4. Diseño visual coherente; pantalla "Cómo agregar widgets" en Más.

**Entregable APK (`v0.5.x`):** widgets de Días juntos, Mood de mi pareja y Cuenta regresiva en la pantalla de inicio.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 5 — Widgets Android** (RF-14).
Con react-native-android-widget implementa el snapshot compartido y su actualización (al abrir la
app, al cambiar datos, periódicamente y al recibir push de datos mediante headless task que vuelve a
leer de Supabase). Crea los widgets Días juntos, Mood de mi pareja y Cuenta regresiva (chico y
mediano), con tap que abre la pantalla correspondiente, dejando la infraestructura lista para los
widgets de distancia y story. Agrega la pantalla "Cómo agregar widgets". Como no puedes usar un
celular, valida con `npx expo prebuild -p android --clean` sin errores, lint, typecheck, test y
expo export, y deja en el PR instrucciones precisas para probar en el dispositivo (requiere nueva
build). Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 6 — Stories

**Tareas:**
1. Crear story desde cámara/galería, **texto** con fondo y tipografías, **dibujo** con Skia
   (pinceles, colores, deshacer), stickers/emojis básicos.
2. Caducidad de 24 h (`expires_at` + pg_cron que borra media caducada del bucket pero conserva
   el archivo personal si se decide así — documentar).
3. Visor a pantalla completa con barra de progreso; "visto"; reacciones emoji; **respuesta**
   (`story_replies`) que tu pareja ve en la story y le llega como push.
4. Archivo personal de stories; descargar a galería.
5. Fila de stories en Inicio y **widget de story de mi pareja**.

**Entregable APK (`v0.6.x`):** crear/ver stories de foto, texto y dibujo; reacciones/respuestas; widget de story.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 6 — Stories** (RF-16). Crear
stories con foto (cámara/galería, comprimida), texto con fondo y dibujo con
@shopify/react-native-skia (pinceles, colores, deshacer) y stickers básicos; caducidad de 24 h con
pg_cron que limpia media (decide y documenta qué pasa con el archivo); visor con progreso, vistos,
reacciones y respuestas (tabla story_replies, NO hay chat general) con push; archivo personal y
descarga a galería; fila de stories en Inicio y widget "Story de mi pareja" reutilizando la
infraestructura de la Fase 5. Verifica lint, typecheck, test, prebuild y expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 7 — Memorias y mapa

**Tareas:**
1. Tablas `memories`, `memory_photos`; subida múltiple (1–10 fotos) con progreso y compresión.
2. Timeline agrupada por mes/año, detalle con carrusel, editar, reordenar fotos (drag & drop),
   borrar, descargar.
3. Ubicación opcional: EXIF de la foto o elegir en el mapa.
4. **Mapa** (`react-native-maps`, Google Maps API key gratuita) con marcadores agrupados.
5. "Un día como hoy" en Inicio. Push cuando tu pareja agrega una memoria.

**Entregable APK (`v0.7.x`):** memorias con fotos, timeline, mapa y "Un día como hoy".

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 7 — Memorias y mapa** (RF-17).
Tablas memories y memory_photos con RLS y Storage privado; crear/editar memoria con título, fecha,
texto y 1–10 fotos comprimidas con progreso de subida, reordenables con drag & drop; timeline
agrupada por mes, detalle con carrusel, borrar y descargar; ubicación opcional (EXIF o elegir en
mapa) y vista de mapa con react-native-maps y clusters (documenta en SETUP.md la API key de Google
Maps como secreto GOOGLE_MAPS_API_KEY inyectado por release-apk.yml); tarjeta "Un día como hoy" en Inicio y push al agregar memoria. Verifica lint, typecheck,
test, prebuild y expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 8 — Cuentas regresivas, listas compartidas y distancia

**Tareas:**
1. **Eventos**: CRUD con emoji, fecha y recurrencia anual; automáticos (aniversario, cumplemeses,
   cumpleaños, hitos de días); **"próxima vez que nos vemos"** destacada (relación a distancia);
   próxima cuenta regresiva en Inicio y widget.
2. **Listas**: viaje, súper, bucket list, pelis/series, lugares por visitar; ítems con check,
   reordenar, Realtime, quién lo marcó.
3. **Distancia**: opt-in de ubicación (`expo-location`, precisión reducida), tabla `locations`
   (solo última posición, redondeada), haversine con tests, tarjeta en Inicio con ciudad de cada
   quien, **widget de distancia**; actualización en segundo plano de baja frecuencia con
   `expo-task-manager` (o *significant changes*), documentando el consumo de batería.

**Entregable APK (`v0.8.x`):** cuentas regresivas, listas compartidas y distancia (con sus widgets).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 8 — Cuentas regresivas, listas
compartidas y distancia** (RF-18, RF-19, RF-20). Eventos con recurrencia anual y automáticos
(aniversario, cumplemeses, cumpleaños, hitos), evento destacado "la próxima vez que nos vemos" (es
relación a distancia), próxima cuenta regresiva en Inicio y widget; listas compartidas con ítems,
check, reordenación y Realtime; distancia opt-in con expo-location de baja precisión, tabla
locations (solo última posición, redondeada), haversine con tests, tarjeta en Inicio con la ciudad
de cada quien y widget de distancia, con actualización en segundo plano de baja frecuencia vía
expo-task-manager (documenta batería y permisos). Verifica lint, typecheck, test, prebuild y expo
export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 9 — Juegos

**Tareas:**
1. Tipos `wyr`, `nhie`, `most_likely`, `agree` + seed inicial original (~50 por juego).
2. Motor genérico de rondas (10 ítems): ambos contestan en paralelo/asíncrono, resultados con
   **% de coincidencia** y pantalla de resultados compartible.
3. Juegos: **¿Qué prefieres?**, **Yo nunca**, **¿Quién es más probable?** (yo / mi pareja),
   **De acuerdo / En desacuerdo**, cada uno con variante picante opt-in.
4. **Reto de dibujo**: uno recibe una palabra y dibuja (Skia), el otro adivina; asíncrono con
   Realtime y push.
5. Decidir si los juegos cuentan para la racha (documentar).

**Entregable APK (`v0.9.x`):** los 5 juegos jugables entre los dos con resultados de coincidencia.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 9 — Juegos** (RF-21). Amplía los
tipos de pregunta (wyr, nhie, most_likely, agree) usando el formato de content/ con ~50 ítems
ORIGINALES por juego en español de México (con variante picante opt-in), crea un motor genérico de
rondas (ambos contestan de forma asíncrona, resultados con % de coincidencia) y las pantallas de
¿Qué prefieres?, Yo nunca, ¿Quién es más probable? y De acuerdo/En desacuerdo dentro de la tab
Preguntas. Agrega el reto de dibujo (dibujar con Skia, tu pareja adivina, asíncrono con Realtime y
push). Decide y documenta si los juegos cuentan para la racha. Verifica lint, typecheck, test y
expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 10 — Banco de contenido completo

**Sobre de dónde sacar las preguntas (uso privado, regalo de aniversario):**
- **Las preguntas de Couple Joy no son públicas** (viven en su backend), así que no hay forma
  confiable de obtenerlas; tampoco hay una base de datos abierta buena en español.
- Claude **no transcribe barajas comerciales completas** (We're Not Really Strangers, Gottman,
  BestSelf, etc.) — además de derechos de autor, de memoria saldrían inexactas. En su lugar:
  - **36 preguntas de Arthur Aron** (estudio académico de 1997, ampliamente difundido) como pack especial.
  - **Clásicos de dominio popular** ("¿Qué prefieres…?", "Yo nunca…", "¿Quién es más probable…?")
    y temas inspirados en las mecánicas de esas barajas (niveles de profundidad, Love Maps,
    lenguajes del amor).
  - El grueso **generado por Claude** en lotes con la guía de `docs/CONTENT.md`.
- **Importador**: si tenemos una baraja física, capturas o una lista de preguntas que nos gusten,
  se meten con `scripts/import-questions.ts` (CSV/JSON → `content/imported/`) o desde la app
  ("Agregar pregunta"). El repo debe ser **privado**.
- Deduplicación automática y feedback 👍/👎 desde la app.

**Tareas:**
1. Taxonomía final: categorías × intensidad (ligera / profunda / picante) × tipo, con metas de
   cantidad por celda.
2. Generar hasta **≥ 3,000 preguntas** en total (≥ 2,000 diarias `open`/`choice` + ≥ 1,000 de
   juegos), en lotes por categoría en `content/`, más el set "36 preguntas para enamorarse" como
   tema especial.
3. `scripts/check-content.ts`: valida esquema, duplicados exactos y casi-duplicados
   (normalización + similitud), longitud, ortografía básica; reporte por categoría.
4. **Temas personalizados**: packs temáticos (p. ej. "A distancia", "Navidad", "Antes de vivir
   juntos", "Sexualidad y deseo", "Dinero", "Hijos y familia") que se pueden jugar como quiz.
5. Feedback desde la app: 👍/👎 por pregunta (tabla `question_feedback`), que el asignador use
   para evitar preguntas descartadas.
6. **Importar contenido propio**: `scripts/import-questions.ts` (CSV/JSON con columnas
   texto, categoría, tipo, intensidad, opciones) y pantalla "Agregar pregunta" en la app (preguntas
   sueltas creadas por nosotros entran al rotador diario; sin packs propios).

**Entregable APK (`v0.10.x`):** banco completo de 3,000+ preguntas, packs temáticos, "Agregar pregunta" y 👍/👎.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md, docs/DECISIONS.md y docs/CONTENT.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 10 — Banco de
contenido completo**. Define la taxonomía final (categoría × intensidad × tipo) con metas por celda
y genera contenido ORIGINAL en español de México, por lotes en content/, hasta llegar a al menos
3,000 ítems (≥ 2,000 preguntas diarias open/choice y ≥ 1,000 ítems de juegos), incluyendo una
adaptación propia de las 36 preguntas de Arthur Aron como pack especial y packs temáticos (a
distancia, fechas especiales, dinero, familia, deseo/picante opt-in, etc.) y clásicos de dominio
popular de "¿Qué prefieres?", "Yo nunca" y "¿Quién es más probable?". No transcribas barajas
comerciales completas. Crea scripts/check-content.ts que valide esquema, duplicados y
casi-duplicados, y genera el seed. Crea scripts/import-questions.ts (CSV/JSON → content/imported/)
y la pantalla "Agregar pregunta" en la app (preguntas sueltas que entran al rotador diario; NO
hay creación de packs propios). Agrega feedback 👍/👎 por pregunta (tabla
question_feedback) y haz que el asignador diario evite las descartadas. Verifica lint, typecheck,
test y el script de contenido. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 11 — Extras más allá de Couple Joy

Extras confirmados (todos se hacen). Son 7, así que la fase se divide en dos sesiones: **11A** y **11B**.

| Sesión | Extra | Descripción |
|---|---|---|
| 11A | **"Pienso en ti"** | Botón de un toque que le manda a tu pareja una vibración/notificación con un corazón (y contador diario). |
| 11A | **Cápsula del tiempo** | Mensaje/foto que se abre en una fecha futura (p. ej. en el próximo aniversario). |
| 11A | **Cupones de amor** | Cupones canjeables ("un masaje", "yo elijo la peli") con estado canjeado/pendiente. |
| 11A | **Ruleta de citas** | Ideas de citas (presenciales y **a distancia**: ver una peli sincronizados, cocinar lo mismo por videollamada) con filtro y "girar". |
| 11B | **Test de lenguajes del amor** | Quiz propio para conocer el lenguaje de cada quien y mostrar resultados comparados. |
| 11B | **Calendario de visitas** | Historial de veces que se han visto, días juntos en persona vs. separados, estadísticas. |
| 11B | **Estadísticas de la relación** | Preguntas contestadas, % de coincidencia en juegos, racha récord, memorias por mes. |

**Entregable APK (`v0.11.x`):** 11A → Pienso en ti, cápsula, cupones y ruleta; 11B → lenguajes del amor, visitas y estadísticas (11B continúa la numeración de parches de 11A).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 11 — Extras más allá de Couple
Joy**, sesión **11A**: "Pienso en ti", Cápsula del tiempo, Cupones de amor y Ruleta de citas
(incluye un banco original de ideas de citas presenciales y a distancia en content/). Cada uno con su tabla y
RLS, pantalla dentro de la tab Más (o donde tenga más sentido), push cuando aplique, contenido
original en español de México y tests de la lógica. Verifica lint, typecheck, test y expo export.
Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

**Prompt de arranque (11B):**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 11 — Extras más allá de Couple
Joy**, sesión **11B**: Test de lenguajes del amor (quiz propio, resultados de cada quien y
comparados), Calendario de visitas (registrar cada vez que se ven, días juntos en persona vs.
separados, ligado a la cuenta regresiva "la próxima vez que nos vemos" de la Fase 8) y Estadísticas
de la relación (preguntas contestadas, % de coincidencia en juegos, racha récord, memorias por mes,
visitas). Cada uno con su tabla/vistas y RLS, pantallas en la tab Más, contenido original en
español de México y tests de la lógica. Verifica lint, typecheck, test y expo export. Cierra la fase con el protocolo de §8.2 (prompt de servidor si aplica,
APK en GitHub Releases, §10, DECISIONS.md y PR).
```

---

### Fase 12 — Pulido, rendimiento y entrega

**Tareas:**
1. Revisión de diseño completa (consistencia, micro-interacciones, haptics, modo oscuro), icono y
   *splash* propios; aplicar el **nombre definitivo** si ya existe.
2. Respuestas en **audio** (preguntas), tarjeta compartible (imagen) de racha/días juntos
   (`react-native-view-shot`), bloqueo biométrico opcional.
3. Rendimiento: listas virtualizadas (FlashList), caché de imágenes, persistencia offline de
   TanStack Query.
4. Robustez: manejo de errores y reintentos, *error boundary*, auditoría de todas las políticas
   RLS y RPC, limpieza de Storage huérfano.
5. Aviso de actualización en la app: compara su versión con un endpoint/tabla `app_versions`
   del backend y muestra "hay una versión nueva" con el link al release.
6. Servidor: verificar respaldos (prueba de restauración en una BD temporal con S-restore),
   revisar recursos/logs, endurecer (rate limits de Auth, Studio cerrado).
7. Release final **`v1.0.0`** (no pre-release) y `docs/SETUP.md` / `docs/SERVIDOR.md` finales.

**Entregable APK:** `v1.0.0`, la versión de regalo de aniversario 🎁.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md, docs/DECISIONS.md y docs/SERVIDOR.md. Actúa como orquestador según §8.4 y sigue docs/DISENO.md. Ejecuta la **Fase 12 — Pulido,
rendimiento y entrega**. Haz una revisión de diseño de toda la app (consistencia, haptics,
animaciones, modo oscuro), icono y splash propios [y aplica el nombre definitivo: NOMBRE si ya lo
tengo]; agrega respuestas en audio, tarjeta compartible de racha/días juntos y bloqueo biométrico
opcional; mejora rendimiento (FlashList, caché de imágenes) y modo offline de lectura; agrega error
boundaries y reintentos; audita todas las políticas RLS y RPC; agrega el aviso de versión nueva
(tabla app_versions). Dame el prompt de servidor para aplicar cambios, probar la restauración de
un respaldo en una BD temporal y endurecer Auth/Studio. Cierra con el protocolo de §8.2, pero esta
vez publica el release v1.0.0 como release normal (no pre-release).
```

---

## 10. Estado del proyecto

| Fase | Estado | PR | Notas |
|---|---|---|---|
| 0 Cimientos | ✅ Cerrada (2026-10-30) | #1, #3 | Expo SDK 58, CI y release; Supabase self-hosted en el VPS (Traefik, `parejas-api.srv1574981.hstgr.cloud`). APK final v0.0.3 (con la 0.5). |
| 0.5 Diseño | ✅ Cerrada (2026-10-30) | #2 | Concepto "Bitácora" (D24); `docs/DISENO.md`, componentes base y Catálogo de diseño oculto (`/catalogo`) |
| 1 Auth y emparejamiento | ✅ Cerrada (2026-10-30) | #5 | Cuentas, perfil con foto, crear/unirse con código, espera en tiempo real, ajustes y cambio de contraseña (D34–D41). APK v0.1.0. |
| 2 Inicio y mood | ✅ Cerrada (2026-10-30) | #6 | 5 pestañas, días juntos con desglose e hitos, mood con Realtime e historial (D42–D47). APK v0.2.0. |
| 3 Preguntas y racha | ⏳ Pendiente | | |
| 4 Push | ⏳ Pendiente | | |
| 5 Widgets Android | ⏳ Pendiente | | |
| 6 Stories | ⏳ Pendiente | | |
| 7 Memorias y mapa | ⏳ Pendiente | | |
| 8 Eventos, listas, distancia | ⏳ Pendiente | | |
| 9 Juegos | ⏳ Pendiente | | |
| 10 Banco de contenido | ⏳ Pendiente | | |
| 11A Extras (pienso en ti, cápsula, cupones, ruleta) | ⏳ Pendiente | | |
| 11B Extras (lenguajes del amor, visitas, estadísticas) | ⏳ Pendiente | | |
| 12 Pulido y entrega | ⏳ Pendiente | | |

### 10.1 Verificaciones pendientes en el celular

- **Fases 0 y 0.5:** ✅ verificadas: la v0.0.3 instala y dice "conectados" (2026-10-30).
- **Fase 1:** se cerró el 2026-10-30 con el servidor ya desplegado (migración `20261030010000`,
  bucket `avatars`, smoke test OK) mientras se compilaba el APK **v0.1.0**. Falta probarlo en los
  dos celulares con la lista de `docs/releases/v0.1.0.md`. Si sale un error, se corrige como
  parche `v0.1.P` siguiente; la Fase 2 no lo espera (D31).
- **Fase 2:** servidor desplegado el 2026-10-30 (`deploy.sh` de la rama de la fase en `fb87659`;
  migración `20261031000000_moods.sql`, `moods` en Realtime, smoke test OK). Falta probar el APK
  **v0.2.0** en los dos celulares con la lista de `docs/releases/v0.2.0.md`.
- **Nota para el servidor (vigente desde la Fase 2):** el clon del VPS (`/opt/app-parejas/repo`)
  quedó en la rama de la Fase 2 (`claude/sweet-ride-xx0i0m`, commit `fb87659`), con 3 migraciones
  aplicadas. Al preparar el siguiente "Prompt para el servidor":
  - Si la Fase 2 (PR #6) ya está mergeada, despliega **`./scripts/server/deploy.sh main`** o la
    rama de la fase nueva. `deploy.sh` hace `git fetch`/`checkout`/`pull` de la rama que reciba, así
    que cambiar de rama no requiere pasos extra.
  - **Nunca** vuelvas a desplegar una rama de una fase anterior: las migraciones son
    acumulativas y el smoke test compara las registradas con los archivos del repo.
  - Al empezar una fase, revisa con `git log origin/main` que la fase anterior ya esté en `main`.
    Si no lo está, la rama nueva debe partir de la de la fase anterior para no "perder" migraciones
    que ya están en el servidor.

---

## 11. Decisiones tomadas

| # | Decisión | Fecha |
|---|---|---|
| D1 | Ambos usamos **Android** → solo Android, APK sin Play Store, sin costo de Apple. | 2026-10-29 |
| D2 | Hay **Mac** disponible → se puede compilar localmente como respaldo del CI. | 2026-10-29 |
| D3 | Nombre provisional **"App Parejas"** (centralizado para cambiarlo fácil). | 2026-10-29 |
| D4 | **Relación a distancia** → distancia, "próxima vez que nos vemos" y categoría "A distancia" con prioridad alta. | 2026-10-29 |
| D5 | Contenido **picante** incluido como opt-in; meta de **todo lo de Couple Joy y más** (3,000+ preguntas, extras de la Fase 11). | 2026-10-29 |
| D6 | **Sin chat general**: solo comentarios por pregunta y respuestas a stories. | 2026-10-29 |
| D7 | UI y contenido en **español de México**. | 2026-10-29 |
| D8 | Uso privado (regalo de aniversario): contenido generado + Aron 36 + clásicos populares, más **importador** para meter preguntas de fuentes propias; repo privado. | 2026-10-29 |
| D9 | Sin packs de preguntas propios (solo "Agregar pregunta" suelta + importador CSV/JSON). | 2026-10-29 |
| D11 | **Cada fase entrega un APK release firmado en GitHub Releases** (GitHub Actions + Gradle, sin EAS). | 2026-10-29 |
| D12 | **Backend: Supabase self-hosted en el VPS de Hostinger** (Docker), coordinado con prompts para la sesión de Claude Code del servidor; credenciales en `/opt/app-parejas/secrets/`. Plan B: Supabase Cloud Free. | 2026-10-29 |
| D13 | Push directo con **FCM HTTP v1** desde la Edge Function (sin Expo Push). | 2026-10-29 |
| D14 | **Diseño propio y llamativo, anti "AI slop"**: Fase 0.5 de dirección de arte (3 conceptos a elegir) y `docs/DISENO.md` obligatorio + QA visual con capturas. | 2026-10-29 |
| D15 | **Opus orquesta, Sonnet 5.5 / Haiku 5.5 ejecutan** mediante agentes del proyecto (§8.4). | 2026-10-29 |
| D10 | Extras confirmados: Pienso en ti, Cápsula del tiempo, Cupones, Ruleta de citas, Lenguajes del amor, Calendario de visitas, Estadísticas. Sin cartas "Ábrela cuando…". | 2026-10-29 |

Pendiente: nombre definitivo, icono/paleta y **subdominio** para la API (p. ej. `parejas-api.<tu-dominio>`); recursos del VPS (los mide S0).

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| El VPS no tiene RAM suficiente para todo Supabase | S0 lo mide; apagar servicios no usados (analytics, vector); plan B Supabase Cloud Free sin cambiar código. |
| Afectar otros proyectos del VPS | Stack con nombre y red propios, sin puertos de BD públicos, prompts de servidor con restricciones explícitas. |
| Migración rompe la BD en producción | CI aplica todas las migraciones en un Postgres efímero antes; respaldo diario; `deploy.sh` hace dump previo a migrar. |
| Perder el keystore (no se podría actualizar el APK encima) | Guardado en el VPS + secretos de GitHub + copia en tu gestor de contraseñas. |
| Build de Android falla en CI | La sesión revisa el job y lo corrige antes de cerrar la fase; Mac como respaldo para compilar local. |
| Widgets dependen de una librería de terceros | Aislados en su fase; prebuild verificado; snapshot simple en JSON. |
| Las sesiones en la nube no pueden probar en el celular | Lógica en funciones puras con tests; APK por fase con checklist de pruebas. |
| Ubicación en segundo plano gasta batería / Android la restringe | Baja frecuencia, precisión reducida, opt-in, actualizar también al abrir la app. |
| Calidad/repetición del contenido generado | Guía de estilo, validación de casi-duplicados, feedback 👍/👎. |
| Pérdida de datos | `pg_dump` diario con retención + prueba de restauración en Fase 12. |
