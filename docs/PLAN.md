# Plan de implementación — App de parejas (réplica personal de Couple Joy)

> Documento vivo. Cada sesión de fase **lee este archivo primero** y, al terminar,
> actualiza la sección [Estado del proyecto](#10-estado-del-proyecto) y el registro de decisiones.

---

## 1. Contexto y objetivo

Replicar, para uso **exclusivamente personal (2 usuarios: yo y mi novia)**, la experiencia de
la app **Couple Joy – Relationship App** (HEARTBIT S.R.L., iOS/Android). No se publica en
tiendas, no hay monetización, no hay paywall, no hay analítica ni infraestructura propia que
mantener.

Principios:

1. **Cero servidores propios.** Backend gestionado (Supabase, plan gratuito).
2. **Simple > escalable.** Diseñado para 1 pareja; nada de multi-tenant complejo más allá de lo
   que RLS da gratis.
3. **Todo desbloqueado.** Lo que en Couple Joy es premium (preguntas ilimitadas, todos los
   widgets, reparar racha) aquí es gratis.
4. **Contenido propio.** No se copian textos/preguntas/assets de Couple Joy; se generan
   preguntas originales en español con la misma mecánica.
5. **Nombre propio.** La app tendrá su propio nombre e icono (placeholder: **"Nosotros"**).

---

## 2. Investigación: qué hace Couple Joy

Fuentes: ficha de App Store (descripción + historial de versiones 4.10 → 4.29), reseñas y
análisis de UX de terceros.

| Área | Funcionalidad en Couple Joy |
|---|---|
| **Emparejamiento** | Cada uno crea cuenta y se conectan como pareja al inicio del onboarding. |
| **Dashboard** | Foto de ambos, días juntos, mood (se cambia tocando la foto de perfil), accesos a quizzes/memorias. |
| **Mood** | Compartir estado de ánimo; el de la pareja se ve en tiempo real (y en widget). |
| **Contador de relación** | Días/meses/años juntos. |
| **Distancia** | Distancia entre ambos (widget de pantalla de inicio y de bloqueo). |
| **Preguntas diarias** | Una pregunta al día por pareja; +3.000 preguntas; respuesta de la pareja visible al responder ambos; chat en tiempo real sobre cada respuesta; respuestas por audio; búsqueda de quizzes; temas personalizados; recordar a la pareja que conteste; borrar respuestas de un quiz. |
| **Tipos de quiz** | Pregunta abierta, opción múltiple / "¿quién es más probable?", "Yo nunca" (Never Have I Ever), "¿Qué prefieres?" (Would You Rather), modo de acuerdo/desacuerdo; resultados con coincidencias. |
| **Racha (streak)** | Racha diaria al responder ambos; reparar racha hasta 7 días perdidos; reparar la racha de la pareja. |
| **Juegos** | Los quizzes anteriores + reto de dibujo (drawing challenge). |
| **Stories** | Foto/vídeo/texto/dibujo/stickers que desaparecen a las 24 h; aparecen en el widget de la pareja; respuestas, reacciones emoji, "visto", archivo de stories, descargar foto. |
| **Chat** | Mensajes con reacciones, responder deslizando, indicador "escribiendo…", animaciones. |
| **Memorias** | Diario/timeline compartido de fotos + texto; reordenar fotos; descargar. |
| **Mapa de pareja** | Memorias vinculadas a lugares reales en un mapa. |
| **Cuentas atrás** | Cumpleaños, aniversarios, próxima visita, planes; widget de cuenta atrás. |
| **Notas compartidas** | Listas para viajes, compras, bucket list. |
| **Widgets** | Días juntos, distancia, mood, story propia + de la pareja, cuenta atrás, último mensaje; pantalla de inicio y bloqueo. |
| **Notificaciones** | Tipos configurables; recordatorios de quiz. |
| **Compartir** | Compartir racha/respuestas/días juntos en redes (imagen). |
| **Monetización** | Premium (~30 USD/año) y compras de reparación de racha. → **Se elimina.** |

---

## 3. Alcance

### 3.1 Dentro del alcance (MVP → completo)

**Imprescindible (MVP, fases 0–5):**
- Registro/inicio de sesión (email + contraseña) y **emparejamiento por código de invitación**.
- Perfil: nombre, foto, cumpleaños. Pareja: fecha de inicio de la relación, foto de pareja.
- Home: días juntos, mood de ambos, pregunta del día, racha, próxima cuenta atrás.
- **Mood** compartido en tiempo real.
- **Pregunta diaria** + respuestas ocultas hasta que ambos respondan + **chat por pregunta**.
- **Racha** con reparación (gratis, hasta 7 días).
- **Banco de preguntas** propio en español (≥ 400 al inicio), por categorías.
- **Notificaciones push** (la pareja respondió, mensaje nuevo, cambió el mood, recordatorio diario).
- **Widgets** (Android y/o iOS): días juntos, mood de la pareja, cuenta atrás, distancia.

**Completo (fases 6–9):**
- **Chat general** de pareja (texto, foto, reacciones, responder, "escribiendo…", "visto").
- **Stories** de 24 h (foto, texto, dibujo) + widget de story + reacciones/respuestas + archivo.
- **Memorias** (timeline de fotos + texto) con ubicación opcional y **mapa**.
- **Cuentas atrás / eventos** (aniversarios automáticos, cumpleaños, visitas, planes).
- **Notas/listas compartidas** (viajes, compras, bucket list) con checkboxes.
- **Distancia** entre ambos.
- **Juegos**: ¿Qué prefieres?, Yo nunca, ¿Quién es más probable?, De acuerdo/desacuerdo, reto de dibujo.
- Respuestas por **audio** (opcional, fase de pulido).
- Compartir tarjeta (imagen) de racha/días juntos.
- Bloqueo con biometría/PIN (opcional).

### 3.2 Fuera del alcance

- Publicación en App Store / Google Play, ASO, legal (privacidad pública, términos).
- Pagos, suscripciones, paywall, anuncios, analítica, A/B tests.
- Soporte multi-idioma (solo español), accesibilidad avanzada, tablets.
- Múltiples parejas por usuario, desemparejar/re-emparejar sofisticado.
- Vídeo en stories (se puede añadir luego), Liquid Glass, chat con los fundadores, onboarding de 12 pasos.
- Backend propio, CI/CD complejo, entornos staging/prod separados.

---

## 4. Requisitos

### 4.1 Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | El usuario puede registrarse e iniciar sesión con email y contraseña; la sesión persiste. |
| RF-02 | Un usuario crea una pareja y obtiene un **código de 6 caracteres**; el otro lo introduce y quedan vinculados. Una pareja tiene máximo 2 miembros. |
| RF-03 | Cada usuario edita su perfil (nombre, apodo, foto, cumpleaños). La pareja tiene fecha de aniversario y foto. |
| RF-04 | La Home muestra días juntos (y desglose años/meses/días), mood de ambos, pregunta del día, racha y próxima cuenta atrás. |
| RF-05 | El usuario elige su mood (emoji + texto corto opcional); la pareja lo ve en tiempo real y recibe push. |
| RF-06 | Cada día (zona horaria de la pareja) se asigna **la misma pregunta** a ambos, sin repetir hasta agotar el banco. |
| RF-07 | La respuesta de la pareja permanece **oculta** hasta que el usuario responde. Al responder ambos, se notifica. |
| RF-08 | Cada pregunta respondida tiene un **hilo de chat** en tiempo real. |
| RF-09 | La **racha** sube cuando ambos responden la pregunta del día; se rompe si un día queda incompleto. |
| RF-10 | Se puede **reparar la racha** respondiendo las preguntas de los días perdidos (máx. 7 días atrás). |
| RF-11 | Historial de preguntas respondidas, con búsqueda por texto y filtro por categoría. Se puede responder preguntas extra (no diarias) por categoría. |
| RF-12 | Se puede enviar un **recordatorio** ("toque") a la pareja para que conteste. |
| RF-13 | Notificaciones push por: respuesta de la pareja, mensaje nuevo, mood, story nueva, recordatorio; recordatorio local diario a hora configurable; cada tipo activable/desactivable. |
| RF-14 | **Widgets** en pantalla de inicio: días juntos, mood de la pareja, cuenta atrás, distancia, story de la pareja. Se actualizan al abrir la app y periódicamente. |
| RF-15 | **Chat** general: texto, imagen, reacción emoji, responder a un mensaje, "escribiendo…", "visto". |
| RF-16 | **Stories**: foto (cámara/galería), texto o dibujo a mano; caducan a las 24 h; la pareja puede ver, reaccionar y responder (la respuesta va al chat); archivo personal de stories. |
| RF-17 | **Memorias**: entrada con título, fecha, texto, 1–10 fotos (reordenables) y ubicación opcional; vista timeline y vista mapa. |
| RF-18 | **Cuentas atrás**: eventos con fecha, emoji y recurrencia anual opcional; aniversario y cumpleaños generados automáticamente. |
| RF-19 | **Listas compartidas**: crear listas, ítems con check, sincronización en tiempo real. |
| RF-20 | **Distancia**: cada usuario comparte (opt-in) su ubicación aproximada; se muestra la distancia en km. |
| RF-21 | **Juegos**: ¿Qué prefieres?, Yo nunca, ¿Quién es más probable?, De acuerdo/desacuerdo — ambos responden y se muestran coincidencias; reto de dibujo (uno dibuja una palabra, el otro adivina). |
| RF-22 | Compartir una tarjeta-imagen con racha / días juntos. |

### 4.2 Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Coste mensual **0 €** (planes gratuitos). Único coste opcional: Apple Developer (99 USD/año) si hay iPhone — ver §6. |
| RNF-02 | Privacidad: todos los datos protegidos con **Row Level Security**; solo los 2 miembros de la pareja acceden a sus datos. Buckets de Storage privados con URLs firmadas. |
| RNF-03 | Tiempo real: cambios de mood/respuestas/chat visibles en < 2 s con la app abierta. |
| RNF-04 | Imágenes comprimidas en cliente (máx. ~1600 px, JPEG ~0.7) para no superar 1 GB de Storage. |
| RNF-05 | UI en español, modo claro/oscuro, estética "romántica" coherente (paleta, tipografía, iconos). |
| RNF-06 | Código TypeScript estricto, lint y tests unitarios de la lógica (racha, fechas, asignación de pregunta). |
| RNF-07 | Instalación directa en nuestros móviles (APK / build interno), sin tiendas. |
| RNF-08 | Funcionamiento razonable sin conexión para lectura (caché de consultas). |

---

## 5. Stack tecnológico

| Capa | Elección | Por qué |
|---|---|---|
| App | **React Native + Expo (SDK más reciente estable) + TypeScript** | Un solo código para iOS y Android, builds sin Mac (EAS), soporte de módulos nativos (widgets) vía *config plugins*. |
| Navegación | **expo-router** (tabs + stacks) | Estándar actual en Expo. |
| UI | **NativeWind** (Tailwind) o StyleSheet + tokens de tema propios; **react-native-reanimated** para animaciones; **expo-image** | Rápido de iterar, buen rendimiento. |
| Estado / datos | **TanStack Query** (caché + offline) + **Zustand** para estado local mínimo | Separar estado de servidor y de UI. |
| Formularios / validación | **react-hook-form + zod** | Tipado y validación. |
| Backend | **Supabase** (plan Free): Postgres, Auth, Realtime, Storage, Edge Functions, pg_cron | Todo gestionado; sin servidores. |
| Tipos BD | `supabase gen types typescript` | Tipos end-to-end. |
| Push | **expo-notifications** + **Expo Push Service**; disparadas por *Database Webhooks/trigger → Edge Function* | Sin gestionar FCM/APNs a mano (solo credenciales). |
| Notificaciones locales | expo-notifications (recordatorio diario programado) | No requiere backend. |
| Widgets Android | **react-native-android-widget** | Widgets renderizados desde JS, actualización periódica y por tarea *headless*. |
| Widgets iOS | **@bacons/apple-targets** (target WidgetKit en SwiftUI) + **App Group** compartido | Única vía fiable con Expo *prebuild*; datos compartidos vía `UserDefaults(suiteName:)`. |
| Ubicación / mapa | **expo-location**, **react-native-maps** | Distancia y mapa de memorias. |
| Dibujo | **@shopify/react-native-skia** | Stories con dibujo y reto de dibujo. |
| Media | expo-image-picker, expo-camera, expo-image-manipulator, expo-av/expo-audio (audio) | Captura y compresión. |
| Seguridad local | expo-secure-store (sesión), expo-local-authentication (bloqueo opcional) | |
| Calidad | ESLint + Prettier, **Jest + @testing-library/react-native**, `tsc --noEmit` | Comprobaciones que pueden correr en sesiones en la nube. |
| Builds | **EAS Build** (plan gratuito) → APK Android / build interno iOS; **development build** (no Expo Go, porque widgets y push lo requieren) | Instalación directa. |

**Alternativas descartadas:**
- *PWA*: sin widgets nativos y push limitado en iOS → pierde el núcleo de la experiencia.
- *Flutter*: válido, pero widgets también requieren código nativo y el ecosistema Expo/EAS simplifica builds sin Mac.
- *Firebase*: válido, pero Postgres + RLS + SQL simplifica lógica de racha/preguntas y el modelo relacional.

---

## 6. Distribución / instalación (sin tiendas)

| Plataforma | Opción | Notas |
|---|---|---|
| **Android** | `eas build -p android --profile preview` → **APK** que se instala directamente (permitir "orígenes desconocidos"). | Gratis. Actualizaciones: nuevo APK o **EAS Update** (OTA) para cambios solo-JS. |
| **iOS (recomendado)** | **Apple Developer Program (99 USD/año)** + `eas build --profile preview` con *ad hoc* (registrando los UDID de los 2 iPhones con `eas device:create`) o TestFlight interno. | Necesario para **push** y builds que no caducan en 7 días. |
| **iOS (gratis)** | Apple ID gratuito + Xcode en un **Mac** (`npx expo run:ios --device`). | La app **caduca cada 7 días**, sin push remotas; requiere Mac. Solo como último recurso. |

> ⚠️ **Decisión pendiente del usuario:** ¿qué móvil tiene cada uno? Si ambos son Android, todo es
> gratis y la fase de widgets iOS se omite. Ver §11.

**Mantenimiento Supabase Free:** el proyecto se pausa tras ~7 días sin actividad (con uso diario
no ocurre). Límites relevantes: 500 MB BD, 1 GB Storage, 2 proyectos activos.

---

## 7. Arquitectura

```
┌──────────────── Móvil (Expo / RN) ────────────────┐
│  expo-router screens ─ TanStack Query ─ Zustand    │
│        │  supabase-js (Auth, PostgREST, Realtime,  │
│        │              Storage)                     │
│  Widgets ◄── App Group / SharedPrefs (snapshot) ◄──┤
└────────┼───────────────────────────────────────────┘
         ▼
┌──────────────── Supabase ─────────────────────────┐
│ Postgres + RLS ─ RPC (funciones SQL)               │
│ Realtime (postgres_changes en tablas de la pareja) │
│ Storage (buckets privados: avatars, media)         │
│ Triggers/Webhooks ─► Edge Function `notify`        │
│                       └─► Expo Push API ─► APNs/FCM│
│ pg_cron: limpieza de stories caducadas             │
└────────────────────────────────────────────────────┘
```

**Decisiones clave:**
- **Lógica sensible en SQL (RPC `security definer`)**: `create_couple()`, `join_couple(code)`,
  `get_daily_question(date)` (crea la asignación si no existe, idempotente),
  `submit_answer(...)`, `compute_streak()`, `repair_streak(date)`. Así ambos clientes ven lo mismo
  y no hay *race conditions*.
- **Respuestas ocultas**: vista/RPC que solo devuelve la respuesta de la pareja si el usuario
  ya respondió esa pregunta (la RLS de `answers` permite leer las propias; la de la pareja vía RPC).
- **Zona horaria**: la pareja guarda `timezone` (IANA); "el día" se calcula con ella en SQL.
- **Widgets**: la app escribe un *snapshot* JSON (días juntos, mood pareja, próximo evento,
  distancia, URL de story) en almacenamiento compartido y pide recargar el widget. Para que el
  widget se actualice con la app cerrada: Android → actualización periódica + tarea headless al
  recibir push de datos; iOS → *timeline* periódica que lee el snapshot y, si es viable, una
  llamada REST ligera a Supabase con un token guardado en el App Group (se evalúa en la fase 5).
- **Push**: tabla `push_tokens`; triggers en tablas (`answers`, `messages`, `moods`, `stories`,
  `nudges`) → Edge Function `notify` → Expo Push API al otro miembro, respetando
  `notification_prefs`.

### 7.1 Modelo de datos (borrador)

```
profiles(id uuid pk = auth.users.id, display_name, nickname, avatar_path, birthday, created_at)
couples(id, invite_code unique, anniversary_date, photo_path, timezone, created_at)
couple_members(couple_id, user_id unique, joined_at)          -- máx. 2 por pareja
moods(id, couple_id, user_id, emoji, note, created_at)         -- último = actual
questions(id, category, type[open|choice|wyr|nhie|most_likely|agree], text, options jsonb, is_active)
daily_questions(couple_id, day date, question_id, pk(couple_id, day))
answers(id, couple_id, question_id, user_id, day date null, text, choice, audio_path, created_at,
        unique(couple_id, question_id, user_id))
answer_comments(id, couple_id, question_id, user_id, body, created_at)   -- chat por pregunta
streaks(couple_id pk, current, best, last_completed_day)       -- o calculada por vista
nudges(id, couple_id, from_user, kind, created_at)
messages(id, couple_id, user_id, body, image_path, reply_to, reactions jsonb, seen_at, created_at)
stories(id, couple_id, user_id, kind[photo|text|drawing], media_path, text, bg, expires_at, created_at)
story_views(story_id, user_id, seen_at) ; story_reactions(story_id, user_id, emoji)
memories(id, couple_id, created_by, title, body, happened_on, lat, lng, place_name, created_at)
memory_photos(id, memory_id, path, position)
events(id, couple_id, title, emoji, date, recurring_yearly, kind[custom|anniversary|birthday|visit])
lists(id, couple_id, title, emoji, kind) ; list_items(id, list_id, text, done, position, done_by)
locations(user_id pk, couple_id, lat, lng, updated_at)          -- solo la última, redondeada
game_rounds(id, couple_id, game, question_id/prompt, state jsonb, created_at)
push_tokens(user_id, token, platform) ; notification_prefs(user_id, prefs jsonb, daily_reminder_time)
```

Función auxiliar de RLS: `is_couple_member(couple_id)`; todas las tablas con `couple_id` usan
`using (is_couple_member(couple_id))`.

### 7.2 Estructura del repositorio (objetivo)

```
app/                 # expo-router (auth), (onboarding), (tabs)/home|questions|chat|memories|more
src/
  components/ features/<feature>/{api,hooks,components}  lib/ (supabase, dates, streak)  theme/
supabase/
  migrations/  functions/notify/  seed/questions.sql
widgets/             # android (react-native-android-widget) e ios (targets/widget, SwiftUI)
docs/PLAN.md  docs/DECISIONS.md
CLAUDE.md
```

### 7.3 Navegación (tabs)

1. **Inicio** – días juntos, moods, pregunta del día, racha, cuenta atrás, stories.
2. **Preguntas** – pregunta del día, historial, categorías, juegos.
3. **Chat**.
4. **Memorias** – timeline / mapa.
5. **Más** – cuentas atrás, listas, distancia, perfil, pareja, notificaciones, widgets (ayuda).

---

## 8. Cómo trabajan las sesiones (instrucciones comunes)

- Cada fase = **una sesión de Claude Code** (en la nube o local) sobre este repo.
- Rama: cada sesión trabaja en su rama `fase-N-<nombre>` (o la que asigne el entorno) y abre PR
  contra `main` al terminar; el usuario hace *merge* antes de la siguiente fase.
- Al empezar: leer `CLAUDE.md`, `docs/PLAN.md` y `docs/DECISIONS.md`.
- Al terminar: `npm run lint && npm run typecheck && npm test` en verde; actualizar §10 (estado)
  y `docs/DECISIONS.md`; describir en el PR **cómo probarlo en el móvil**.
- **Limitación de sesiones en la nube:** no hay emulador ni móvil. Se valida con typecheck, lint,
  tests y `npx expo export` (bundle). La prueba en dispositivo la hace el usuario con el
  *development build*. Las migraciones SQL se escriben en `supabase/migrations/` y se aplican con
  `supabase db push` (el usuario, o la sesión si el entorno tiene el secreto
  `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` configurados).
- No commitear secretos: `.env` en `.gitignore`; solo `EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (públicas por diseño) en `.env` local / variables de EAS.

---

## 9. Fases

Resumen:

| Fase | Nombre | Resultado visible | Depende de |
|---|---|---|---|
| 0 | Cimientos | Proyecto Expo + Supabase + CI local, app "hola mundo" en el móvil | — |
| 1 | Auth, emparejamiento y perfil | Ambos se registran y se vinculan con código | 0 |
| 2 | Home, contador y mood | Home con días juntos y mood en tiempo real | 1 |
| 3 | Preguntas diarias, racha y chat por pregunta | Núcleo de Couple Joy funcionando | 2 |
| 4 | Notificaciones push | Avisos de respuestas, mood, toques, recordatorio diario | 3 |
| 5 | Widgets | Widgets de días juntos, mood, cuenta atrás | 4 |
| 6 | Chat general y stories | Mensajería y stories 24 h (+ widget de story) | 4, 5 |
| 7 | Memorias y mapa | Diario de fotos con mapa | 1 |
| 8 | Cuentas atrás, listas y distancia | Eventos, notas compartidas, distancia (+ widgets) | 2, 5 |
| 9 | Juegos | Qué prefieres, Yo nunca, Quién es más probable, dibujo | 3 |
| 10 | Pulido, rendimiento y entrega | Diseño final, icono, extras, builds definitivas | todas |

Las fases 7, 8 y 9 son relativamente independientes y pueden reordenarse.

---

### Fase 0 — Cimientos

**Objetivo:** esqueleto del proyecto, herramientas y backend listos; un *development build*
instalado en el móvil.

**Tareas:**
1. `create-expo-app` con TypeScript y expo-router; estructura de §7.2; alias `@/`.
2. ESLint, Prettier, Jest + RNTL; scripts `lint`, `typecheck`, `test`, `format`.
3. Tema base (tokens de color claro/oscuro, tipografía, espaciado) y componentes primitivos
   (`Screen`, `Text`, `Button`, `Card`, `Avatar`, `Input`).
4. Cliente Supabase (`src/lib/supabase.ts`) con sesión en SecureStore/AsyncStorage; TanStack
   Query provider.
5. `supabase init`; primera migración: `profiles` + trigger que crea perfil al registrarse +
   helper `is_couple_member` (stub) y tablas `couples`/`couple_members`.
6. `eas.json` con perfiles `development`, `preview` (APK / ad hoc) y `production` (no se usa);
   `app.config.ts` con `name`, `slug`, `scheme`, `bundleIdentifier`/`package`.
7. `CLAUDE.md` con convenciones, comandos y estructura; `docs/DECISIONS.md`;
   `docs/SETUP.md` con pasos manuales para el usuario (crear proyecto Supabase, claves, EAS login,
   build, instalar).
8. GitHub Actions mínima (opcional): lint + typecheck + test en PR.

**Criterios de aceptación:** `npm run lint/typecheck/test` en verde; `npx expo export` compila;
`docs/SETUP.md` permite al usuario crear Supabase, aplicar migración e instalar el dev build.

**Prompt de arranque:**
```
Lee docs/PLAN.md completo. Vamos a ejecutar la **Fase 0 — Cimientos**.
Crea el proyecto Expo (SDK estable más reciente, TypeScript estricto, expo-router) en la raíz del
repo con la estructura de §7.2, configura ESLint/Prettier/Jest/RNTL y los scripts lint, typecheck,
test. Crea el tema base (claro/oscuro, estética romántica) y componentes primitivos. Configura el
cliente Supabase y TanStack Query, inicializa supabase/ con la primera migración (profiles con
trigger on auth signup, couples, couple_members, helper is_couple_member, RLS activada). Crea
eas.json (development, preview APK/ad hoc), app.config.ts leyendo variables EXPO_PUBLIC_*,
.env.example, CLAUDE.md (convenciones, comandos, estructura), docs/DECISIONS.md y docs/SETUP.md con
los pasos manuales que debo hacer yo (crear proyecto Supabase, aplicar migraciones, eas login,
generar e instalar el development build en Android/iOS). Verifica con lint, typecheck, test y
`npx expo export`. Actualiza §10 de docs/PLAN.md, haz commit y push, y abre un PR.
```

---

### Fase 1 — Autenticación, emparejamiento y perfil

**Objetivo:** ambos crean cuenta, se vinculan como pareja y configuran perfiles.

**Tareas:**
1. Pantallas `(auth)`: login, registro, recuperar contraseña (email de Supabase).
2. Guardas de navegación: sin sesión → auth; con sesión sin pareja → onboarding; con pareja → tabs.
3. Onboarding: nombre/apodo, foto (Storage bucket `avatars` privado, compresión), cumpleaños;
   **crear pareja** (genera código de 6 caracteres, compartible con Share sheet) o **unirse con
   código**; fecha de aniversario y zona horaria (autodetectada).
4. RPC `create_couple()`, `join_couple(code)` (valida máx. 2 miembros), `leave_couple()` simple.
5. RLS completas para `profiles`, `couples`, `couple_members` (un miembro puede leer el perfil
   de su pareja).
6. Pantalla de "esperando a tu pareja" con suscripción Realtime a `couple_members`.
7. Ajustes: editar perfil y datos de pareja; cerrar sesión.
8. Hooks `useSession`, `useCouple`, `usePartner`; tipos generados de BD.
9. Tests de validaciones y de utilidades.

**Criterios:** dos cuentas reales quedan vinculadas; un tercero no puede unirse; ningún usuario
lee datos de otra pareja (probar políticas con SQL en la migración o test documentado).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 1 — Autenticación,
emparejamiento y perfil** según el plan (RF-01, RF-02, RF-03). Implementa auth con email/contraseña
de Supabase, guardas de navegación (auth → onboarding → tabs), onboarding de perfil con avatar
(bucket privado, imagen comprimida), crear pareja con código de invitación de 6 caracteres o unirse
con código (RPC security definer create_couple/join_couple con límite de 2 miembros), fecha de
aniversario y zona horaria, pantalla de espera con Realtime y ajustes de perfil/pareja. Escribe las
migraciones con RLS estrictas y regenera los tipos. Añade tests de la lógica. Verifica lint,
typecheck, test y expo export. Documenta en el PR cómo probarlo con dos cuentas, actualiza §10 y
DECISIONS.md, commit, push y PR.
```

---

### Fase 2 — Home, contador de relación y mood

**Objetivo:** pantalla principal con la información de la pareja y mood en tiempo real.

**Tareas:**
1. Tabs base (Inicio, Preguntas, Chat, Memorias, Más) con placeholders.
2. Home: cabecera con avatares de ambos (o foto de pareja), **días juntos** grande + desglose
   (años/meses/días) + próximo hito (100, 365, 500, 1000 días, aniversarios).
3. **Mood**: tocar tu avatar abre selector (emojis + nota corta); tabla `moods`; Realtime para ver
   el de la pareja al instante; historial simple del mood.
4. Tarjetas placeholder para pregunta del día, racha y cuenta atrás (se conectan después).
5. Utilidades de fechas puras y testeadas (`src/lib/dates.ts`: días juntos, desglose, hitos,
   "día local" de la pareja).
6. Pull-to-refresh, estados vacíos y de carga bonitos.

**Criterios:** el cambio de mood en un móvil aparece en el otro en < 2 s; tests de fechas
(bisiestos, zona horaria, cambio de horario).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 2 — Home, contador y mood**
(RF-04, RF-05). Crea las 5 tabs de §7.3, la Home con avatares, días juntos con desglose y próximos
hitos, selector de mood al tocar el avatar (tabla moods + RLS + Realtime para ver el mood de la
pareja al instante) y tarjetas placeholder para pregunta del día, racha y cuenta atrás. Implementa
src/lib/dates.ts con funciones puras y tests exhaustivos (bisiestos, zonas horarias, DST). Cuida el
diseño (tema romántico, animaciones sutiles con reanimated, estados vacíos). Verifica lint,
typecheck, test y expo export. Actualiza §10 y DECISIONS.md, commit, push y PR.
```

---

### Fase 3 — Preguntas diarias, racha y chat por pregunta

**Objetivo:** el núcleo de Couple Joy.

**Tareas:**
1. Tablas `questions`, `daily_questions`, `answers`, `answer_comments`, `nudges` (+ RLS).
2. **Seed de ≥ 400 preguntas originales en español** (`supabase/seed/questions.sql`), en
   categorías: Conocernos, Recuerdos, Futuro, Amor e intimidad (suave), Divertidas, Hipotéticas,
   Valores, Viajes, Familia, Picantes (opt-in). Tipos: `open` y `choice` (los demás en fase 9).
3. RPC `get_daily_question(p_day)`: asigna de forma idempotente una pregunta no usada por la
   pareja (aleatoria por categoría rotativa), usando el día local de la pareja.
4. RPC `submit_answer` y vista/RPC `get_question_with_answers(question_id)` que **solo revela la
   respuesta de la pareja si el usuario ya respondió**.
5. **Racha**: función `get_streak()` (actual, mejor, días completados) calculada desde
   `daily_questions` + `answers`; **reparar racha**: listar días perdidos (≤ 7) y responderlos.
   Lógica también en TS pura con tests (fuente de verdad: SQL; TS para UI/tests).
6. UI: tarjeta de pregunta del día en Home (estados: sin responder / esperando a tu pareja /
   ambos respondieron), pantalla de pregunta con respuestas y **chat por pregunta** (Realtime),
   historial con búsqueda y filtro por categoría, responder preguntas extra por categoría,
   borrar mis respuestas de una pregunta, botón **"recordar a mi pareja"** (inserta `nudge`).
7. Animación de celebración al completar el día y al subir la racha.

**Criterios:** ambos reciben la misma pregunta el mismo día; la respuesta ajena nunca llega al
cliente antes de responder (verificado en la RPC); tests de racha (rotura, reparación, zona horaria).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 3 — Preguntas diarias, racha y
chat por pregunta** (RF-06 a RF-12). Crea las tablas y RLS de §7.1 para preguntas, asignaciones
diarias, respuestas, comentarios y nudges. Escribe un seed de al menos 400 preguntas ORIGINALES en
español (no copies las de Couple Joy) en las categorías del plan, tipos open y choice. Implementa
las RPC get_daily_question (idempotente, día local de la pareja, sin repetir), submit_answer,
get_question_with_answers (solo revela la respuesta de la pareja si yo ya respondí), get_streak y
la reparación de racha hasta 7 días. Replica la lógica de racha en TS puro con tests. Construye la
UI: tarjeta de pregunta del día en Home con sus 3 estados, pantalla de pregunta con chat en tiempo
real, historial con búsqueda/filtros, preguntas extra por categoría, borrar respuestas, botón de
recordar a la pareja y celebración al completar. Verifica lint, typecheck, test y expo export.
Actualiza §10 y DECISIONS.md, commit, push y PR.
```

---

### Fase 4 — Notificaciones push

**Objetivo:** que la app "avise" como Couple Joy.

**Tareas:**
1. Registro de token con `expo-notifications` (permisos en el momento adecuado), tabla
   `push_tokens`, `notification_prefs` (por tipo + hora del recordatorio diario).
2. Edge Function `notify` (Deno): recibe evento, resuelve el otro miembro de la pareja, respeta
   preferencias, envía vía Expo Push API; limpia tokens inválidos.
3. Database Webhooks / triggers `pg_net` en: `answers` (tu pareja respondió / ya podéis ver las
   respuestas), `answer_comments`, `moods`, `nudges` (y dejar preparado para `messages`,
   `stories`, `memories`).
4. Recordatorio diario **local** programado a la hora elegida si no has respondido.
5. *Deep links*: tocar la notificación abre la pantalla correspondiente (expo-router).
6. Pantalla de ajustes de notificaciones.
7. `docs/SETUP.md`: credenciales FCM (Android) y APNs (iOS, vía EAS) y despliegue de la función
   (`supabase functions deploy notify`), secretos necesarios.

**Criterios:** cada evento genera una sola notificación al otro miembro; desactivar un tipo lo
silencia; tocarla navega bien.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 4 — Notificaciones push**
(RF-13). Registra tokens con expo-notifications en tablas push_tokens/notification_prefs, crea la
Edge Function `notify` que envía por Expo Push API al otro miembro respetando preferencias y
limpiando tokens inválidos, y conéctala con triggers/webhooks en answers, answer_comments, moods y
nudges (deja el mecanismo genérico para messages/stories/memories). Añade recordatorio diario local
configurable, deep links desde la notificación y pantalla de ajustes de notificaciones. Documenta
en docs/SETUP.md las credenciales FCM/APNs vía EAS y el despliegue de la función. Tests para la
lógica de la función (separada en módulo puro). Verifica lint, typecheck, test y expo export.
Actualiza §10 y DECISIONS.md, commit, push y PR.
```

---

### Fase 5 — Widgets

**Objetivo:** widgets de pantalla de inicio (y bloqueo en iOS) — la seña de identidad de la app.

**Tareas:**
1. Módulo `src/features/widgets/`: construye un **snapshot** (`{ daysTogether, partnerName,
   partnerMood, nextEvent, distanceKm, partnerStoryUrl, updatedAt }`) y lo escribe en
   almacenamiento compartido; se llama al abrir la app, al cambiar datos relevantes y al recibir
   push de datos.
2. **Android** (`react-native-android-widget`): widgets *Días juntos*, *Mood de mi pareja*,
   *Cuenta atrás* (tamaños pequeño/mediano), actualización periódica + headless task.
3. **iOS** (`@bacons/apple-targets`): target WidgetKit SwiftUI con App Group
   (`group.<bundle>.shared`), mismos widgets + **widget de pantalla de bloqueo** (accessory).
   Recarga con `WidgetCenter.reloadAllTimelines()` desde un pequeño módulo nativo/plugin.
   Evaluar fetch directo a Supabase desde el TimelineProvider; documentar decisión.
4. Push "silenciosa"/de datos para que el cambio de mood de la pareja refresque el widget con la
   app cerrada (best effort).
5. Diseño visual de los widgets coherente con la app; pantalla "Cómo añadir widgets" en Más.

> Si ambos usamos Android, omitir el punto 3 (registrarlo en DECISIONS.md).

**Criterios:** widgets instalables en el dev build; muestran datos reales; se actualizan al abrir
la app y, en Android, periódicamente.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 5 — Widgets** (RF-14).
Plataformas a cubrir: [ANDROID / iOS / AMBAS — indicar]. Implementa el snapshot compartido de
widgets y su actualización (al abrir la app, al cambiar datos y al recibir push de datos). Android
con react-native-android-widget: Días juntos, Mood de mi pareja y Cuenta atrás, con actualización
periódica y headless task. iOS con @bacons/apple-targets: target WidgetKit en SwiftUI con App Group,
mismos widgets más widget de pantalla de bloqueo, y recarga de timelines desde la app; evalúa y
documenta si el widget hace fetch a Supabase por sí mismo. Añade la pantalla "Cómo añadir widgets".
Como no puedes ejecutar un móvil, valida con prebuild (`npx expo prebuild --clean` sin errores),
lint, typecheck, test y expo export, y deja en el PR instrucciones precisas para probar en el
dispositivo. Actualiza §10 y DECISIONS.md, commit, push y PR.
```

---

### Fase 6 — Chat general y stories

**Objetivo:** comunicación diaria dentro de la app.

**Tareas:**
1. **Chat**: tabla `messages` (+ Storage `media`), lista invertida paginada, envío optimista,
   imágenes, reacciones emoji (long-press), responder (swipe), "escribiendo…" con Realtime
   *presence/broadcast*, "visto", push de mensaje nuevo.
2. **Stories**: crear desde cámara/galería, **texto** con fondo, **dibujo** con Skia (pinceles,
   colores, deshacer); caducan a las 24 h (`expires_at` + pg_cron que borra media caducada);
   visor a pantalla completa con barra de progreso; "visto", reacciones, responder (al chat);
   archivo personal; descargar a galería; push de story nueva.
3. Fila de stories en Home (tuya + de tu pareja) y **widget de story** (fase 5 ampliada).

**Criterios:** mensajes en tiempo real y ordenados; stories desaparecen a las 24 h para la pareja
y quedan en mi archivo.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 6 — Chat general y stories**
(RF-15, RF-16). Chat: tabla messages con RLS, bucket privado media, lista paginada invertida, envío
optimista, imágenes comprimidas, reacciones emoji, responder con swipe, indicador "escribiendo…"
con Realtime presence/broadcast, "visto" y push. Stories: foto (cámara/galería), texto con fondo y
dibujo con @shopify/react-native-skia, caducidad de 24 h con pg_cron que limpia media, visor con
progreso, vistos, reacciones, respuesta que va al chat, archivo personal y descarga a galería; push
de story nueva; fila de stories en Home y widget de story de la pareja reutilizando la
infraestructura de la Fase 5. Verifica lint, typecheck, test, prebuild y expo export. Actualiza §10
y DECISIONS.md, commit, push y PR.
```

---

### Fase 7 — Memorias y mapa

**Objetivo:** diario compartido de recuerdos.

**Tareas:**
1. Tablas `memories`, `memory_photos`; subida múltiple (1–10 fotos) con progreso y compresión.
2. Timeline agrupada por mes/año, detalle con carrusel, edición, reordenar fotos (drag & drop),
   borrar, descargar foto.
3. Ubicación opcional: usar la de la foto (EXIF) o buscar/poner chincheta en el mapa.
4. **Mapa** (`react-native-maps`) con marcadores/clusters de memorias.
5. "Un día como hoy" en Home (memorias de años anteriores).
6. Push cuando la pareja añade una memoria.

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 7 — Memorias y mapa** (RF-17).
Tablas memories y memory_photos con RLS y Storage privado; crear/editar memoria con título, fecha,
texto, 1–10 fotos comprimidas con progreso de subida y reordenables por drag & drop; timeline
agrupada por mes, detalle con carrusel, borrar y descargar; ubicación opcional (EXIF o elegir en
mapa) y vista de mapa con react-native-maps y clusters; tarjeta "Un día como hoy" en Home y push al
añadir memoria. Verifica lint, typecheck, test, prebuild y expo export. Actualiza §10 y
DECISIONS.md, commit, push y PR.
```

---

### Fase 8 — Cuentas atrás, listas compartidas y distancia

**Tareas:**
1. **Eventos**: CRUD con emoji, fecha, recurrencia anual; eventos automáticos (aniversario,
   cumpleaños de ambos, hitos de días); próxima cuenta atrás en Home y en el widget.
2. **Listas**: listas con emoji/tipo (viaje, compras, bucket list, pelis), ítems con check,
   reordenar, Realtime, quién lo marcó.
3. **Distancia**: opt-in de ubicación (`expo-location`, precisión reducida), tabla `locations`
   (solo última posición, redondeada), cálculo haversine, tarjeta en Home, **widget de distancia**;
   actualización al abrir la app y en segundo plano con baja frecuencia (si es viable sin agotar
   batería; documentar).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 8 — Cuentas atrás, listas
compartidas y distancia** (RF-18, RF-19, RF-20). Eventos con recurrencia anual y eventos
automáticos (aniversario, cumpleaños, hitos), próxima cuenta atrás en Home y widget; listas
compartidas con ítems, check, reordenación y Realtime; distancia opt-in con expo-location de baja
precisión, tabla locations (solo última posición, redondeada), haversine con tests, tarjeta en Home
y widget de distancia, con actualización en segundo plano de baja frecuencia si es viable
(documenta la decisión). Verifica lint, typecheck, test, prebuild y expo export. Actualiza §10 y
DECISIONS.md, commit, push y PR.
```

---

### Fase 9 — Juegos

**Tareas:**
1. Ampliar `questions.type` con `wyr`, `nhie`, `most_likely`, `agree` + seed original (≥ 80 por juego).
2. Motor genérico de ronda: ambos responden en paralelo, resultados al terminar ambos con
   **% de coincidencia** y pantalla de resultados.
3. Juegos: **¿Qué prefieres?**, **Yo nunca**, **¿Quién es más probable?** (yo / mi pareja),
   **De acuerdo / En desacuerdo**.
4. **Reto de dibujo**: uno recibe una palabra y dibuja (Skia), el otro adivina; turnos con Realtime
   o asíncrono.
5. Contribución opcional de juegos a la racha (decidir y documentar).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 9 — Juegos** (RF-21). Amplía
los tipos de pregunta (wyr, nhie, most_likely, agree) con un seed ORIGINAL en español de al menos 80
ítems por juego, crea un motor genérico de rondas (ambos responden, resultados con % de
coincidencia) y las pantallas de ¿Qué prefieres?, Yo nunca, ¿Quién es más probable? y De acuerdo/En
desacuerdo dentro de la tab Preguntas. Añade el reto de dibujo (dibujar con Skia, la pareja adivina,
asíncrono con Realtime y push). Decide y documenta si los juegos cuentan para la racha. Verifica
lint, typecheck, test y expo export. Actualiza §10 y DECISIONS.md, commit, push y PR.
```

---

### Fase 10 — Pulido, rendimiento y entrega

**Tareas:**
1. Revisión de diseño completa (consistencia, micro-interacciones, haptics, modo oscuro), icono y
   *splash* propios, nombre definitivo.
2. Extras: respuestas por **audio**, tarjeta compartible (imagen) de racha/días juntos
   (`react-native-view-shot`), bloqueo biométrico opcional.
3. Rendimiento: listas virtualizadas, caché de imágenes, persistencia de TanStack Query para
   offline de lectura.
4. Robustez: manejo de errores y reintentos, *error boundary*, revisión de RLS (auditoría de
   seguridad de todas las políticas y RPC), limpieza de Storage huérfano.
5. **EAS Update** para actualizaciones OTA; builds `preview` finales para ambos móviles; guía
   final en `docs/SETUP.md` (instalar, actualizar, copias de seguridad de la BD con `pg_dump`).

**Prompt de arranque:**
```
Lee CLAUDE.md, docs/PLAN.md y docs/DECISIONS.md. Ejecuta la **Fase 10 — Pulido, rendimiento y
entrega**. Haz una revisión de diseño de toda la app (consistencia, haptics, animaciones, modo
oscuro), icono y splash propios; añade respuestas por audio, tarjeta compartible de racha/días
juntos y bloqueo biométrico opcional; mejora rendimiento y modo offline de lectura (persistencia de
TanStack Query); añade error boundaries y reintentos; audita todas las políticas RLS y RPC; configura
EAS Update para OTA y completa docs/SETUP.md con instalación, actualización y copias de seguridad.
Verifica lint, typecheck, test, prebuild y expo export. Actualiza §10 y DECISIONS.md, commit, push
y PR.
```

---

## 10. Estado del proyecto

| Fase | Estado | PR | Notas |
|---|---|---|---|
| 0 Cimientos | ⏳ Pendiente | | |
| 1 Auth y emparejamiento | ⏳ Pendiente | | |
| 2 Home y mood | ⏳ Pendiente | | |
| 3 Preguntas y racha | ⏳ Pendiente | | |
| 4 Push | ⏳ Pendiente | | |
| 5 Widgets | ⏳ Pendiente | | |
| 6 Chat y stories | ⏳ Pendiente | | |
| 7 Memorias y mapa | ⏳ Pendiente | | |
| 8 Eventos, listas, distancia | ⏳ Pendiente | | |
| 9 Juegos | ⏳ Pendiente | | |
| 10 Pulido y entrega | ⏳ Pendiente | | |

---

## 11. Decisiones pendientes (a responder antes de la Fase 0 / Fase 5)

1. **Plataformas:** ¿qué móvil tiene cada uno (iPhone / Android)? Determina coste (Apple
   Developer 99 USD/año) y si se hacen widgets iOS.
2. **¿Tienes Mac?** Solo relevante para la vía iOS gratuita (no recomendada).
3. **Nombre de la app** e idea de icono/paleta (placeholder "Nosotros", tonos rosa/coral).
4. **¿Relación a distancia?** Si no, la distancia baja de prioridad (se puede quitar de la Fase 8).
5. **Categoría "picante"** de preguntas: ¿incluir (opt-in)?
6. **Chat general**: ¿lo queréis o preferís seguir con WhatsApp y dejar solo el chat por pregunta?
   (simplifica la Fase 6).

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| Widgets iOS con Expo son la parte más frágil | Aislados en su fase; prebuild verificado; fallback: widgets solo con datos del snapshot. |
| Sesiones en la nube no pueden probar en dispositivo | Lógica en funciones puras testeadas; PR con pasos de prueba manual; dev build instalado desde la Fase 0. |
| Límite de builds EAS gratis | Usar EAS Update (OTA) para cambios solo-JS; builds nativas solo cuando cambian dependencias nativas. |
| Pausa de Supabase por inactividad | Uso diario; si ocurre, reactivar desde el panel. |
| Storage 1 GB | Compresión en cliente; limpieza de stories caducadas. |
| Pérdida de datos | `pg_dump` periódico documentado (Fase 10). |
