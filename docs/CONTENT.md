# Contenido — formato y guía de estilo

Fuente de verdad del banco de preguntas. Todo vive en `content/` como JSON; la BD se llena con un
seed SQL **generado** (`supabase/seed/questions.sql`), nunca a mano.

```bash
node scripts/build-seed.ts          # valida content/ y regenera supabase/seed/questions.sql
node scripts/build-seed.ts --check  # solo valida y falla si el seed commiteado está desactualizado (CI)
node scripts/check-content.ts       # calidad: casi-duplicados, ortografía/estilo y reporte contra la taxonomía
node scripts/import-questions.ts lista.csv --source "mi lista"   # importa preguntas a content/imported/
```

## 1. Archivos

- `content/categories.json`: las categorías (`slug`, `name`, `emoji`, `intensity`, `position`,
  `description`). Agregar una categoría es agregarla aquí.
- `content/questions/<slug-de-categoría>.json`: las preguntas de esa categoría.
- `content/packs.json` y `content/packs/<slug-del-pack>.json`: los packs ("Temas"), ver §2.3.
- `content/imported/*.json`: preguntas importadas con `import-questions`, ver §2.4.
- `content/taxonomy.json`: metas de cantidad por celda, ver §4.
- `content/near-duplicates-ok.json`: pares de slugs que se permiten aunque se parezcan, ver §5.

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

### 2.3 Packs (`content/packs.json` y `content/packs/`)

Un pack es una serie **ordenada** de preguntas sobre un tema (quiz de "36 preguntas", Navidad, dinero…).
En la BD es una categoría con `kind = 'packs'`; no entra al rotador de la pregunta del día.

- `content/packs.json`: `{ "packs": [ { slug, name, emoji, intensity, position, description } ] }`, con
  las mismas reglas que una categoría (§1). Reglas extra: el slug empieza con `pack-`, no choca con una
  categoría ni con `juegos`, y `intensity` es `ligera`, `profunda` o `picante`.
- `content/packs/<slug-del-pack>.json`: `{ "pack": "<slug>", "questions": [...] }`, con el mismo formato
  de pregunta que las categorías. Cada pack tiene su archivo y viceversa; un pack puede estar vacío.
- El slug de cada pregunta empieza con `<slug-del-pack>-` y **el orden del archivo es el orden del quiz**:
  el seed guarda `position` = índice (1, 2, 3…). Reordenar cambia el orden; el slug nunca se renombra.
- Regla de picante por pack: en un pack `picante` todas sus preguntas son `picante`; en uno que no lo es,
  ninguna lo es.
- Los textos y slugs son únicos contra **todo** (categorías, packs, importadas y juegos).

### 2.4 Importadas (`content/imported/*.json`)

Las genera `scripts/import-questions.ts` (§6); también se pueden escribir a mano:

```json
{
  "source": "texto libre sobre el origen",
  "questions": [
    { "slug": "gustos-cafe-o-te", "category": "gustos", "type": "choice", "intensity": "ligera",
      "text": "¿Café o té para empezar el día?", "options": ["Café", "Té"] }
  ]
}
```

Cada pregunta trae su `category` (una categoría diaria de `categories.json`, no un pack) y sigue las
reglas de §2 con el slug `<categoría>-…`. En la BD van con esa categoría y entran al rotador diario
como cualquier otra. Si la carpeta no existe o está vacía no pasa nada.

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

## 4. Taxonomía (`content/taxonomy.json`)

Las **metas** de cantidad: preguntas diarias por categoría × intensidad × tipo (`open`/`choice`), ítems
por juego × intensidad, preguntas por pack, palabras de dibujo, y los mínimos duros (`min_total` de
diarias, de juegos y general). Son metas, no límites: `check-content` reporta cuánto falta.

## 5. `check-content` (calidad del contenido)

```bash
node scripts/check-content.ts          # reporta; sale con 1 solo si hay errores
node scripts/check-content.ts --strict # además exige los mínimos (diarias >= 2000, juegos >= 1000, total >= 3000)
```

1. **Esquema**: la misma validación de `build-seed` (§2). Un error aquí corta el resto.
2. **Casi-duplicados** (además de los exactos): se normaliza el texto, se quitan palabras vacías
   ("de", "la", "qué", "tu"…) y cada palabra se recorta a 6 letras (para que "canción"/"canciones"
   coincidan). Similitud = 0.6 × Dice de palabras + 0.4 × Dice de bigramas de caracteres.
   - **Error** (código 1): similitud >= **0.85**.
   - **Aviso** (solo se reporta): similitud >= **0.70**.
   - Un par que sí es distinto aunque se parezca (falso positivo) se permite en
     `content/near-duplicates-ok.json`: `{ "pairs": [["slug-a", "slug-b"]] }` (el orden no importa).
   - Usa un índice invertido: ~4,000 textos tardan menos de un segundo.
3. **Ortografía y estilo** (errores): signos `¿?` y `¡!` con su par; sin espacio antes de `, . ; : ? !`
   ni después de `¿`/`¡`; sin signos repetidos (`??`, `!!`) ni `..`; espacio después de `, ; :` y de
   `. ? !`; sin minúscula inicial; interrogativos con tilde tras `¿` (qué, cuál, cómo…); nada de
   "vosotros" (vosotros, vuestro, sois, habéis, `os`…) ni palabras de España (móvil, ordenador, guay);
   "Yo nunca" sin interrogación. Avisos: sin puntuación final y más de una pregunta en el mismo texto.
4. **Reporte**: metas vs. actual (y cuántas faltan) por categoría × intensidad × tipo, juego ×
   intensidad y pack; totales (diarias, juegos, packs, general) contra los mínimos. Las metas
   faltantes son aviso; con `--strict` los mínimos de `min_total` sí fallan.

El CI corre `node scripts/check-content.ts` (sin `--strict` hasta que el banco llegue a los mínimos).

## 6. `import-questions` (cargar preguntas en lote)

```bash
node scripts/import-questions.ts <archivo.csv|archivo.json> [--source "texto"] [--out nombre] [--force]
```

- **CSV** con encabezados `texto,categoria,tipo,intensidad,opciones` (UTF-8, con o sin BOM; comillas CSV
  estándar; `;` también se detecta como separador). `opciones` separadas por `|`. Si `tipo` va vacío
  es `open`; si `intensidad` va vacía es `ligera`.
- **JSON**: un arreglo de objetos con esas llaves (o en inglés: `text`, `category`, `type`,
  `intensity`, `options`; `options` puede ser arreglo).
- Genera el slug `<categoría>-<texto-slugificado>` (<= 80 caracteres, sin acentos, único; si choca se
  le agrega `-2`, `-3`…).
- Cada fila se valida con las reglas de §2. Las filas **inválidas, duplicadas o casi-duplicadas**
  (contra todo `content/`, umbral de error de §5) se reportan con su motivo y se saltan; las válidas se
  escriben en `content/imported/<nombre>.json` (`--out`, por defecto el nombre del archivo).
  No sobrescribe un archivo existente salvo `--force`.
- Después: `node scripts/check-content.ts` (ortografía y estilo) y `node scripts/build-seed.ts`.
  Importar no sustituye revisar el tono: la guía de §3 aplica igual.
