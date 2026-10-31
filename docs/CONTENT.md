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
| `type` | `open` (respuesta libre) o `choice` (opción múltiple). Los tipos de juegos (`wyr`, `nhie`, `most_likely`, `agree`) van aparte, en `content/games/` (ver §2.1). |
| `intensity` | `ligera`, `profunda` o `picante`. `picante` solo en la categoría `picantes`, y todo `picantes` es `picante`. |
| `text` | 10–220 caracteres, sin espacios al inicio/fin ni dobles. Sin duplicados (se comparan sin acentos, mayúsculas ni signos). |
| `options` | Solo en `choice`: 2–4 opciones distintas, cada una de 1–60 caracteres. Prohibido en `open`. |

### 2.1 Juegos (`content/games/`)

Cada juego tiene su archivo `content/games/<juego>.json` (`wyr`, `nhie`, `most_likely`, `agree`).
Si un archivo falta, cuenta como lista vacía. Los ítems se guardan en `public.questions` con
`type = <juego>` y `category = 'juegos'`: esa categoría (con `kind = 'games'`) la crea el seed sola,
**no** va en `categories.json` y no sale en la lista de preguntas de la app.

```json
{
  "game": "wyr",
  "items": [
    {
      "slug": "prefieres-viajar-pasado-futuro",
      "intensity": "ligera",
      "text": "¿Prefieres viajar en el tiempo al pasado o al futuro?",
      "options": ["Al pasado", "Al futuro"]
    }
  ]
}
```

| Juego | Prefijo de slug | `text` | `options` |
|---|---|---|---|
| `wyr` (¿Qué prefieres?) | `prefieres-` | pregunta completa | **exactamente 2**, 1–60 caracteres, distintas |
| `nhie` (Yo nunca) | `yo-nunca-` | empieza con "Yo nunca", sin signos de interrogación | prohibido |
| `most_likely` (¿Quién es más probable?) | `quien-` | empieza con "¿Quién es más probable que" | prohibido |
| `agree` (De acuerdo o no) | `acuerdo-` | afirmación u opinión | prohibido |

Reglas comunes: `game` debe coincidir con el nombre del archivo; slug con las mismas reglas de §2
(≤ 80 caracteres, único en todo `content/`, nunca se renombra); `intensity` `ligera`, `profunda` o
`picante` (en juegos sí se permite `picante` en cualquier juego: solo sale en rondas picantes, que
requieren que los dos activen picantes); `text` de 10–220 caracteres, sin espacios al borde ni
dobles y **sin duplicados contra todo el contenido** (preguntas y juegos, normalizado).

### 2.2 Palabras del reto de dibujo (`content/games/drawing.json`)

```json
{
  "game": "drawing",
  "words": [
    { "slug": "dibujo-pinata", "word": "Piñata", "alternates": ["pinata de picos"], "intensity": "ligera" }
  ]
}
```

- `slug` con prefijo `dibujo-` (mismas reglas que los demás); `word` de 2–40 caracteres, en Unicode
  NFC (acentos compuestos) y sin espacios al borde ni dobles.
- `alternates`: de 0 a 6 formas más de nombrarla (cada una de 2–40) que también cuentan como
  acierto. La comparación ignora mayúsculas, acentos, signos y el artículo inicial
  (el/la/los/las/un/una).
- `intensity`: solo `ligera` (fácil de dibujar) o `profunda` (difícil). Sin duplicados entre palabras
  y alternates (normalizados).
- Van a la tabla `public.drawing_words` (la app no la lee: solo vía RPC). Quitar una palabra de
  `drawing.json` la marca `is_active = false`. Las palabras **no** cuentan en el "Total: N preguntas"
  que compara el CI; `build-seed` las imprime aparte ("Palabras de dibujo: N").

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
