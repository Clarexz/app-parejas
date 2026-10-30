# Registro de decisiones

Decisiones del proyecto con fecha y motivo. Las D1–D15 vienen de la planeación (`docs/PLAN.md` §11);
de la D16 en adelante se toman durante las fases. Cada fase agrega aquí lo que decida.

| # | Decisión | Motivo | Fecha |
|---|---|---|---|
| D1 | Solo **Android**; APK sin Play Store. | Ambos usamos Android; sin costo de Apple. | 2026-10-29 |
| D2 | Hay Mac disponible para compilar local como respaldo del CI. | | 2026-10-29 |
| D3 | Nombre provisional **"App Parejas"**, centralizado en `APP_NAME`. | Cambiarlo fácil. | 2026-10-29 |
| D4 | Relación a distancia → distancia, "próxima vez que nos vemos" y categoría "A distancia" con prioridad. | | 2026-10-29 |
| D5 | Contenido picante opt-in; meta: todo lo de Couple Joy y más. | | 2026-10-29 |
| D6 | Sin chat general (solo comentarios por pregunta y respuestas a stories). | Usamos WhatsApp. | 2026-10-29 |
| D7 | UI y contenido en español de México. | | 2026-10-29 |
| D8 | Contenido generado + Aron 36 + clásicos populares + importador; repo privado. | Uso privado. | 2026-10-29 |
| D9 | Sin packs propios (solo "Agregar pregunta" e importador). | | 2026-10-29 |
| D10 | Extras: Pienso en ti, Cápsula, Cupones, Ruleta de citas, Lenguajes del amor, Visitas, Estadísticas. | | 2026-10-29 |
| D11 | Cada fase entrega un APK firmado en GitHub Releases (Actions + Gradle, sin EAS). | Gratis y sin dependencias externas. | 2026-10-29 |
| D12 | Backend Supabase self-hosted en el VPS de Hostinger; plan B Supabase Cloud Free. | Infra existente. | 2026-10-29 |
| D13 | Push directo con FCM HTTP v1 desde la Edge Function. | Sin depender de Expo Push. | 2026-10-29 |
| D14 | Diseño propio anti "AI slop": Fase 0.5 + `docs/DISENO.md` + QA visual. | | 2026-10-29 |
| D15 | Opus orquesta; Sonnet/Haiku ejecutan con agentes de `.claude/agents/`. | Optimizar tokens. | 2026-10-29 |
| D16 | **Expo SDK 58** (RN 0.88, React 19.3, TS 6) con rutas en **`src/app/`** en lugar de `app/` en la raíz. | Es la convención de la plantilla oficial del SDK 58; todo el código vive bajo `src/`. | 2026-10-29 |
| D17 | **NativeWind se pospone a la Fase 0.5**: en Fase 0 el tema son tokens en TS + `StyleSheet`. La 0.5 decide si se adopta según el sistema de diseño. | Evitar configurar Tailwind/Babel antes de tener identidad visual; menos fragilidad en el build. | 2026-10-29 |
| D18 | Convención de idioma: identificadores y nombres de archivo en inglés; comentarios, docs, commits, UI y contenido en español de México. | | 2026-10-29 |
| D19 | El target web se exporta como SPA (`web.output: 'single'`) y solo sirve para QA visual (`npm run shots`). | Capturas estáticas sin servidor SSR. | 2026-10-29 |
| D20 | Migraciones aplicadas por `scripts/apply-migrations.sh` (mismo script en CI y en el VPS), registradas en `supabase_migrations.schema_migrations`; tipos con `supabase gen types` en CI. | Una sola forma de migrar; el CI prueba exactamente lo que se aplica en el servidor. | 2026-10-29 |
| D21 | **Self-hosted confirmado** (S0: 4 vCPU, 15 GiB RAM, ~10 GiB disponibles, sin swap). API en `https://parejas-api.srv1574981.hstgr.cloud` detrás del **Traefik compartido** (labels en el gateway + red externa `n8n_default`); solo se exponen `/auth|rest|realtime|storage|functions/v1`. Subred propia `10.77.0.0/24`, límites de memoria (~2.75 GB en total; uso real ~800 MiB). Compose oficial fijado en `b7d1044d`. | Cabe sin afectar a los otros 7 proyectos del VPS. | 2026-10-29 |
| D22 | El proyecto vive en `/opt/app-parejas` aunque los demás del VPS usan `/docker/<nombre>`. | Lo indica el plan; los scripts aceptan `APP_ROOT`. | 2026-10-29 |
| D23 | El primer APK se lanza tras mergear la Fase 0 a `main`: `workflow_dispatch` solo funciona con el workflow en la rama por defecto y la sesión no puede empujar tags. Desde ahí, cada fase lanza `release-apk.yml` sobre su rama. | Restricciones de GitHub y del entorno de las sesiones. | 2026-10-29 |
| D24 | **Dirección de arte "Bitácora"** (cuaderno de cuadro chico, polaroids, cinta washi, post-its, sellos), elegida entre tres conceptos (Bitácora, Lotería, Cianotipo; prototipo en `docs/design/conceptos.html`). `docs/DISENO.md` es la referencia obligatoria. | Elección del usuario: el más cálido y personal para un regalo de aniversario. | 2026-10-29 |
| D25 | **Sin NativeWind** (cierra D17): el tema son tokens en TS (`src/theme/tokens.ts`) + `StyleSheet`/estilos en línea vía `useTheme()`; sombras con la prop `boxShadow` de RN. | El sistema es de objetos con inclinaciones, sombras y SVG; las clases utilitarias no aportan y suman fragilidad al build. | 2026-10-29 |
| D26 | Tipografías **Gochi Hand** (a mano), **Figtree** (lectura) y **Courier Prime** (sellos), de Google Fonts (OFL) con `@expo-google-fonts/*` y `useFonts`; el splash espera a que carguen. | Licencias libres y funcionan igual en Android y en web (capturas). | 2026-10-29 |
| D27 | Iconos **propios** dibujados "a pluma" (paths con temblor) sobre `react-native-svg`; sin librerías de iconos. Háptica con `expo-haptics` solo en momentos clave (`src/lib/haptics.ts`). | Anti "AI slop": los iconos genéricos delatan una plantilla. | 2026-10-29 |
| D28 | El **Catálogo de diseño** vive en `/catalogo`, oculto: se abre con pulsación larga sobre el título de la pantalla principal. `npm run shots` lo captura completo. | Revisar el sistema en el celular sin agregar navegación visible. | 2026-10-29 |
| D29 | Ícono, ícono adaptativo y splash se generan de SVG en `assets/brand/` con `npm run brand` (Playwright); los PNG resultantes sí se commitean. | Assets reproducibles y editables sin herramientas de diseño. | 2026-10-29 |
| D30 | La Fase 0.5 publica el APK **v0.0.2** (siguiente parche de la Fase 0, como indica `docs/releases/README.md`). | La 0.5 no tiene número propio. | 2026-10-29 |
| D31 | Las fases siguientes **no esperan** a cerrar las pruebas pendientes de la Fase 0 (PLAN §10.1): siguen con código, CI y releases. | El usuario no podía probar en ese momento; no frenar el avance. | 2026-10-29 |
| D32 | **Una versión = un release.** Las sesiones de la Fase 0 y la 0.5 publicaron ambas `v0.0.2` y el APK de una pisó al de la otra. Antes de lanzar `release-apk.yml`, cada sesión revisa los releases existentes y usa el siguiente número libre. La 0.5 + el parche del chequeo de conexión salen como **v0.0.3**. | Evitar releases revueltos. | 2026-10-30 |
| D33 | La rama principal pasa a llamarse **`main`** (antes `claude/tender-brown-oe85rt`). Los PR de cada fase van contra `main`. | La rama por defecto con nombre de sesión era confusa. | 2026-10-30 |
| D34 | Emparejamiento solo por RPC `security definer` (`create_couple`, `join_couple`, `leave_couple`). Los errores son claves estables (`already_in_couple`, `invalid_code`, `code_not_found`, `couple_full`, `invalid_timezone`) que la app traduce en `src/lib/errors.ts`. Al salir alguien se **rota el código**; si la pareja queda vacía se borra. | Una sola fuente de verdad, sin carreras (bloqueo de la fila de la pareja) y mensajes en español desde el cliente. | 2026-10-30 |
| D35 | **Sin SMTP no hay correo de recuperación**: la pantalla "Olvidé mi contraseña" lo explica y la contraseña temporal se genera en el VPS con `scripts/server/reset-password.sh <correo>`; después se cambia en Más → Mi perfil. | Son 2 usuarios y el dueño del servidor es uno de ellos; montar SMTP no vale la pena por ahora. | 2026-10-30 |
| D36 | Fotos en el bucket privado `avatars` (solo JPEG ≤ 2 MB): `<user_id>/<ts>.jpg` y `couples/<couple_id>/<ts>.jpg`, comprimidas a 512 px / JPEG 0.7 y servidas con URL firmada (1 h). Las políticas de `storage.objects` viven en la migración; el CI crea un stub de las tablas de Storage (`supabase/tests/fixtures/storage_stub.sql`) con el mismo dueño que en el servidor para probarlas, y corre todo `supabase/tests/`. | Nombre único por subida (sin caché vieja ni `upsert`); RLS probada antes de llegar al VPS. | 2026-10-30 |
| D37 | Formularios con **validadores puros** (`src/lib/validation.ts`, `dateParts.ts`) en lugar de react-hook-form + zod (§5). | Formularios cortos; menos dependencias y lógica testeada igual. Se reconsidera si llegan formularios grandes. | 2026-10-30 |
| D38 | Fechas con el componente propio `DateField` (sello DD/MM/AAAA) en vez de un date picker nativo. | Funciona igual en Android y en web (capturas) y encaja con Bitácora. | 2026-10-30 |
| D39 | Guardas con `Stack.Protected` + `redirectTo` y una etapa calculada por la función pura `onboardingStage` (signed_out → profile → couple → waiting → ready). La espera usa Realtime y, de respaldo, refresco cada 15 s. Un refresco fallido con datos en caché no manda a la pantalla de error. | Navegación declarativa y testeable; tolerante a señal mala. | 2026-10-30 |
| D40 | `npm run shots -- --scenarios` captura las pantallas con sesión simulando el servidor en Playwright (`scripts/shots-scenarios.mjs`), sin código especial en la app. | QA visual de todas las etapas sin backend. | 2026-10-30 |
| D41 | La Fase 1 se publica como **v0.1.0**. | Convención `v0.N.P` (D32). | 2026-10-30 |
| D42 | **Días juntos: el aniversario es el día 1** (conteo "D+1", como Couple Joy). El día N cae en `aniversario + (N−1)`. Hitos: cada 100 días hasta 1,000, luego cada 500, más 1,111…9,999; cumplemés cada mes (los múltiplos de 12 son aniversarios); un aniversario del 29 de febrero se celebra el 28 en años no bisiestos. Todo en `src/lib/dates.ts` con aritmética de fechas en UTC (sin efectos de horario de verano). | Es como lo cuentan las apps de pareja y hace que el primer día ya "cuente". | 2026-10-30 |
| D43 | **"Hoy" se calcula con la zona horaria de la pareja** (`couples.timezone`, `todayIn`), no con la del celular; se recalcula cada minuto y al volver a primer plano. | Que los dos celulares vean el mismo día aunque uno viaje. | 2026-10-30 |
| D44 | **Moods: tabla `moods` de solo historial** (el último de cada quien es el actual) y escritura **solo con la RPC `set_mood`** (pone pareja, usuario y hora del servidor). La lectura por RLS solo deja ver los moods de los miembros **actuales** de tu pareja: si alguien sale y entra otra persona, no ve el historial anterior. Errores `no_couple`, `invalid_mood`. Realtime en `moods` (INSERT). | Una sola forma de escribir, sin falsificar autor ni pareja; privacidad si cambia la pareja. | 2026-10-30 |
| D45 | 16 moods fijos (`MOOD_OPTIONS`, etiquetas neutras en género) + nota opcional de 80 caracteres; la app actualiza de forma optimista. La BD acepta cualquier emoji de 1–16 caracteres para no atarla a la lista. | Simple y rápido; la lista puede cambiar sin migración. | 2026-10-30 |
| D46 | Componentes nuevos `PageHeader`, `LoadingLines`, `MoodSheet` y pull-to-refresh en `Screen` (`refreshing`/`onRefresh`), documentados en `docs/DISENO.md` §7. Escenarios de capturas `ready`, `ready_empty`, `ready_hito` y `ready_sheet` (con `actions`). | Extender el sistema antes que improvisar en pantallas. | 2026-10-30 |
| D47 | La Fase 2 se publica como **v0.2.0**. | Convención `v0.N.P` (D32). | 2026-10-30 |

## Pendientes

- Nombre definitivo (Fase 12). Ícono definitivo (el de la Fase 0.5 es provisional).
