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

## Pendientes

- Nombre definitivo, icono y paleta (Fase 0.5 / 12).
