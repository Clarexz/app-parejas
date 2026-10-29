# App Parejas — guía para sesiones de Claude Code

App privada de pareja (2 usuarios, Android) inspirada en Couple Joy. **Lee primero** `docs/PLAN.md`
(plan por fases y estado en §10), `docs/DECISIONS.md`, `docs/SERVIDOR.md` y, desde la Fase 0.5,
`docs/DISENO.md`.

## Stack

- Expo SDK 58 + React Native 0.88 + TypeScript estricto. Rutas de **expo-router en `src/app/`**
  (cada archivo es una pantalla; código que no es ruta va fuera de `src/app/`). Alias `@/` → `src/`.
- Solo **Android** (+ web únicamente para QA visual en desarrollo). Nada específico de iOS.
- Datos: supabase-js + TanStack Query (estado de servidor) + Zustand (estado local mínimo).
- Backend: Supabase **self-hosted** en el VPS (`docs/SERVIDOR.md`). Las sesiones de fase **no**
  tienen acceso al VPS: los cambios de backend se entregan como "Prompt para el servidor" (§8.3).
- El nombre de la app vive solo en `src/constants/app.ts` (`APP_NAME`); `app.config.ts` lo importa.

## Expo cambia: no confíes en tu memoria

Antes de usar una API de Expo/RN, revisa la versión de `expo` en `package.json` y consulta
`https://docs.expo.dev/versions/v58.0.0/` (o `https://docs.expo.dev/llms.txt`). Instala paquetes
solo con `npx expo install <pkg>`. `android/` se genera con `expo prebuild`: nunca se edita ni se
commitea; lo nativo se configura en `app.config.ts` y config plugins (`plugins/`).

## Comandos

```bash
npm run lint          # ESLint (expo lint)
npm run typecheck     # tsc --noEmit
npm test              # Jest + RNTL
npm run format:check  # Prettier
npx expo export -p android --output-dir /tmp/exp   # que el bundle compile
npx expo prebuild -p android --clean --no-install  # si hubo cambios nativos (luego borra android/)
npm run shots         # capturas web (claro/oscuro) en shots/ con Playwright
npm run db:types      # regenerar src/types/database.ts (requiere DB_URL a un Postgres con migraciones)
```

Todo debe quedar en verde antes de cerrar una tarea. El CI (`.github/workflows/ci.yml`) además
aplica todas las migraciones contra un `supabase/postgres` efímero, corre `supabase/tests/` y exige
que `src/types/database.ts` coincida con lo generado.

## Convenciones

- **Código** (identificadores, nombres de archivo) en **inglés**; **comentarios, docs, commits, UI,
  notificaciones y contenido** en **español de México** (tuteo, "ustedes", "celular").
- Commits: mensaje corto en español en imperativo/descriptivo (`Fase N: ...` para el trabajo de una
  fase).
- Lógica de negocio en **funciones puras** con tests (`src/lib/`), la UI solo las usa.
- Componentes desde `@/components`; colores/espaciados solo desde el tema (`useTheme()`), nunca
  valores sueltos en pantallas.
- SQL: una migración nueva por cambio (`supabase/migrations/YYYYMMDDHHMMSS_desc.sql`), **nunca
  editar una ya aplicada**; RLS en toda tabla; funciones `security definer` con
  `set search_path = ''`; lógica sensible en RPC.
- **Nada de secretos en git**: solo `.env.example` y plantillas. Valores reales en el VPS
  (`/opt/app-parejas/secrets/`) y en GitHub Secrets.

## Orquestación con agentes (§8.4 del plan)

La sesión principal (Opus) **orquesta**: planea la fase, decide arquitectura, revisa seguridad de
SQL/RLS, hace la crítica de diseño, redacta prompts para el servidor e integra. Delega la
implementación en los agentes de `.claude/agents/`:

| Agente | Modelo | Úsalo para |
|---|---|---|
| `explorador` | Haiku | Búsquedas de solo lectura (rutas y conclusiones). |
| `mecanico` | Haiku | Lint/tipos triviales, renombres, docs, notas de release, validar JSON. |
| `implementador` | Sonnet | Pantallas, hooks, migraciones, Edge Functions, CI, tests. |
| `disenador-ui` | Sonnet | UI según `docs/DISENO.md`, animaciones, estados, QA con capturas. |
| `contenido` | Sonnet | Preguntas, juegos, copy y notificaciones en es-MX. |

Reglas: el modelo más barato que lo haga bien; encargos **autocontenidos** (objetivo, archivos,
contrato, criterios, comandos de verificación y archivos que no debe tocar); paralelizar lo
independiente (worktrees si se pisan archivos); los agentes responden con resumen corto y el
orquestador revisa con `git diff` enfocado; si algo está mal se devuelve al mismo agente con la
corrección concreta. Registrar en el PR qué agente hizo qué.

## Cierre de fase

Protocolo de `docs/PLAN.md` §8.2: checks y CI en verde → prompt para el servidor (si toca backend)
y esperar su reporte → secretos nuevos → lanzar `release-apk.yml` (notas en `docs/releases/`) →
actualizar §10 del plan y `docs/DECISIONS.md` → PR.
