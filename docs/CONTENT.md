# Contenido — formato y guía de estilo

Fuente de verdad del banco de preguntas. Todo vive en `content/` como JSON; la BD se llena con un
seed SQL **generado** (`supabase/seed/questions.sql`), nunca a mano.

```bash
node scripts/build-seed.ts          # valida content/ y regenera supabase/seed/questions.sql
node scripts/build-seed.ts --check  # solo valida y falla si el seed commiteado está desactualizado (CI)
```

## 1. Archivos

- `content/categories.json`: las categorías (`slug`, `name`, `emoji`, `intensity`, `position`,
  `description`). Agregar una categoría es agregarla aquí.
- `content/questions/<slug-de-categoría>.json`: las preguntas de esa categoría.

```json
{
  "category": "conocernos",
  "questions": [
    {
      "slug": "conocernos-cancion-de-la-infancia",
      "type": "open",
      "intensity": "ligera",
      "text": "¿Qué canción te transporta directito a cuando tenías diez años?"
    },
    {
      "slug": "conocernos-desayuno-ideal",
      "type": "choice",
      "intensity": "ligera",
      "text": "Domingo sin prisas: ¿qué desayuno te hace más feliz?",
      "options": ["Chilaquiles", "Hot cakes", "Fruta y café", "Lo que sobró de anoche"]
    }
  ]
}
```

## 2. Reglas (las valida `build-seed.ts`)

| Campo | Regla |
|---|---|
| `category` | Debe existir en `categories.json` y coincidir con el nombre del archivo. |
| `slug` | Único en todo `content/`, minúsculas, números y guiones (`^[a-z0-9]+(-[a-z0-9]+)*$`), ≤ 80 caracteres, empieza con `<categoría>-`. **Nunca se renombra ni se reutiliza**: las respuestas guardadas apuntan a la pregunta. |
| `type` | `open` (respuesta libre) o `choice` (opción múltiple). Los tipos de juegos (`wyr`, `nhie`, `most_likely`, `agree`) llegan en la Fase 9. |
| `intensity` | `ligera`, `profunda` o `picante`. `picante` solo en la categoría `picantes`, y todo `picantes` es `picante`. |
| `text` | 10–220 caracteres, sin espacios al inicio/fin ni dobles. Sin duplicados (se comparan sin acentos, mayúsculas ni signos). |
| `options` | Solo en `choice`: 2–4 opciones distintas, cada una de 1–60 caracteres. Prohibido en `open`. |

Quitar una pregunta de `content/` no la borra: el seed la marca `is_active = false` (las respuestas
viejas se conservan) y deja de salir en el rotador.

## 3. Guía de estilo

- **Español de México**, tuteo, "ustedes" (nunca "vosotros"), "celular", "platicar", "padre",
  "chamba", "antojo"… sin forzar modismos en cada pregunta.
- **Originales.** No copies Couple Joy ni transcribas barajas comerciales (We're Not Really
  Strangers, Gottman, etc.). Inspirarse en una mecánica está bien; copiar el texto, no.
- Se lee **a la otra persona**: la pregunta la contestan los dos por separado, así que se escribe
  en segunda persona del singular ("¿Qué fue lo primero que pensaste de mí?").
- **Neutral en género**: evita adjetivos con género sobre quien contesta o su pareja ("¿Te sentiste
  nervioso?" → "¿Te dieron nervios?"). Nada heteronormativo por default.
- **Concretas** mejor que abstractas: "¿Qué olor te recuerda a la casa de tu abuela?" gana a
  "¿Qué significa para ti la familia?".
- Una sola pregunta por texto (nada de "¿X? ¿Y también Z?").
- `choice`: opciones cortas, paralelas y con una salida chistosa o honesta cuando venga al caso.
  Sirven para comparar y reírse ("¡pusimos lo mismo!"), no para calificar.
- **A distancia** (prioridad, D4): extrañarse, videollamadas, reencuentros, rutinas en paralelo,
  zonas horarias. Esperanzadoras, nunca culposas.
- **Picantes** (opt-in de los dos, RF-23): sugerentes, juguetonas y con consentimiento; deseo,
  fantasías, química, confianza. Sin lenguaje gráfico ni vulgar, nada que presione.
- Nada de preguntas que puedan doler sin necesidad (exes con morbo, comparaciones, celos para
  provocar). Lo profundo se pregunta con cariño.
- **Intensidad**: `ligera` = se contesta en 10 segundos y da risa o ternura; `profunda` = pide
  pensarle un poco o abrirse.
