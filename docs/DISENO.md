# Sistema de diseño — "ahorita" (v2)

> **Este documento es ley** (PLAN §8.5). Toda pantalla lo sigue. Si una fase necesita algo que no
> está aquí, primero se extiende el sistema (token o componente, con su entrada en este archivo) y
> después se usa en la pantalla. Nunca se improvisan estilos sueltos en una pantalla.
>
> Fuente: manual de marca `docs/rebranding/ahorita-brand-guidelines.pdf` (y su HTML
> `docs/rebranding/noviecitos-brand/html/guidelines.html`). Los huecos del manual (modo oscuro,
> acento de acción, semánticos, movimiento) se resolvieron en el prototipo aprobado
> `docs/design/ahorita-prototipo.html` (Fase 12A, D97–D103). Reemplaza al sistema "Bitácora" (D24).

---

## 1. Concepto

**"Dos mitades que se buscan."** ahorita es el lugar chiquito donde dos personas lejos se sienten
cerca, todos los días. El símbolo son dos medias lunas —una por persona— que se acercan pero nunca
se tocan: siempre queda una **rendija**. Cada quien elige una **fruta**, y esa fruta es su color en
toda la app.

### Principios (del manual)

1. **Chiquito.** Poco, claro y con aire. Si estorba, se quita. *Si dudas, quita algo.*
2. **Juguetón.** Nos reímos primero y nos ponemos serios después.
3. **De a dos.** Privada, sin anuncios ni premium. Solo ustedes.
4. **Honesto.** Lo que ves es lo que hay: sin trucos ni culpas.

### Reglas que mandan sobre todo lo demás

- **La fruta dice quién es quién, nunca qué hacer.** Tu fruta marca lo tuyo (tu mitad del símbolo,
  tu respuesta, tu aro, la pestaña activa); la de tu pareja, lo suyo. Las acciones van en Tinta.
- **Números siempre en display** (Bricolage Grotesque ExtraBold, cifras tabulares).
- **Frases en minúscula con mayúscula inicial.** MAYÚSCULAS solo en etiquetas (`label`).
- **Mínimo 14 sp** para cualquier texto.
- **Aire:** mínimo una media luna de espacio alrededor de todo; un solo dato importante por bloque.

---

## 2. Tokens

Única fuente: `src/theme/tokens.ts`, consumidos con `useTheme()`. Nada de hex sueltos en
pantallas ni componentes (salvo `src/lib/fruits.ts`, que es dominio, y `src/widgets/`, que dibuja
fuera de React Native y lee las mismas constantes).

### 2.1 Color neutro

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `bg` | **Hueso** `#FFFDF8` | **Noche** `#141417` | Fondo de toda pantalla |
| `surface` | **Arena** `#F4EFE3` | **Carbón** `#1F1F24` | Tarjetas, inputs, filas agrupadas |
| `surface2` | **Arena 2** `#EAE3D3` | **Carbón 2** `#2A2A31` | Chips, botón secundario, cosas dentro de una tarjeta |
| `ink` | **Tinta** `#1B1B1F` | **Hueso** `#FFFDF8` | Texto e íconos |
| `inkMuted` | **Grafito** `#5E5E66` | **Niebla** `#A3A1A8` | Texto secundario, notas, etiquetas |
| `line` | Tinta 10 % | Hueso 10 % | Divisores de 1 dp |
| `action` | Tinta `#1B1B1F` | Hueso `#FFFDF8` | Botón principal (D99) |
| `onAction` | Hueso | Tinta | Texto del botón principal |
| `scrim` | Tinta 40 % | negro 60 % | Detrás de hojas y diálogos |

Modo oscuro (D98): parte del reverso del logo (Hueso sobre Tinta) con una Tinta más honda de
fondo. Se separa con superficies, **no con sombras**. Las frutas no cambian entre modos.

### 2.2 Frutas (`src/lib/fruits.ts`)

| Fruta | Hex | Encima | Sugerida |
|---|---|---|---|
| Sandía | `#F2495C` | Tinta | Mango |
| Mango | `#FFC24B` | Tinta | Sandía |
| Mandarina | `#FF8A3D` | Tinta | Uva |
| Limón | `#C5DC3A` | Tinta | Pitaya |
| Uva | `#8B5CF6` | Hueso | Limón |
| Arándano | `#3F6BFF` | Hueso | Mandarina |
| Pitaya | `#E83E9C` | Tinta | Limón |

- **Pares bloqueados:** Sandía–Pitaya, Sandía–Mandarina, Mango–Limón, Mango–Mandarina,
  Uva–Arándano, Uva–Pitaya, y nunca la misma fruta (D100).
- **Por defecto:** Sandía + Mango (id menor Sandía). Si solo uno eligió, el otro toma la sugerida.
  `resolveFruits()` decide; SQL lo replica en `private.effective_fruit`.
- En el tema: `theme.fruit.me` y `theme.fruit.partner` (objeto `Fruit`: `hex`, `on`, `name`).
- **Tinte de fruta** (respuestas, burbujas de mood): la fruta mezclada al **22 %** sobre Hueso en
  claro y al **16 %** sobre Noche en oscuro (`theme.tint(fruit)`). El texto encima siempre es `ink`.
- Texto directamente sobre una fruta sólida: usar `fruit.on`.

### 2.3 Semánticos (D101)

Ninguna fruta dice "error": una fruta es una persona. Solo dos colores fuera del sistema, **siempre
con ícono y texto**, nunca solo color:

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `danger` | **Chile** `#B3261E` | `#FF8A80` | Errores, "Salir de la pareja", borrar |
| `success` | **Nopal** `#1D7A4A` | `#6BD49A` | "Listo", confirmaciones |

Avisos e información: `ink` con ícono sobre `surface` (componente `Notice`, tono `info`).

### 2.4 Tipografía

**Bricolage Grotesque ExtraBold** (display, `@expo-google-fonts/bricolage-grotesque`) +
**Albert Sans** 400/500/600/700 (texto, `@expo-google-fonts/albert-sans`). Ambas OFL.

| Variante | Fuente | Tamaño / línea (dp) | Tracking | Uso |
|---|---|---|---|---|
| `display` | Bricolage 800 | 56 / 58 | −3 % | El número protagonista ("12 días") |
| `h1` | Bricolage 800 | 40 / 44 | −2.5 % | Título de pantalla |
| `h2` | Bricolage 800 | 28 / 32 | −2 % | La pregunta del día, títulos de hoja |
| `h3` | Bricolage 800 | 22 / 28 | −1.5 % | Títulos de tarjeta y de sección |
| `num` | Bricolage 800 | 32 / 36 | −2 % | Números secundarios (412, 47) |
| `body` | Albert 400 | 18 / 26 | 0 | Texto corrido, respuestas |
| `bodyStrong` | Albert 700 | 18 / 26 | 0 | Renglones de lista, énfasis |
| `ui` | Albert 600 | 16 / 22 | 0 | Botones, nombres, chips grandes |
| `note` | Albert 400 | 14 / 20 | 0 | Notas, fechas, "hace 5 min" (`inkMuted`) |
| `label` | Albert 600 | 14 / 20 | +10 %, MAYÚSCULAS | Etiquetas de sección |

Wordmark: Bricolage 800, tracking −4.5 %, **siempre** "ahorita" en minúsculas; la "o" se parte en
las dos frutas con una rendija de 8 % (componente `Wordmark`). Nunca "Ahorita" en el logo; en
texto corrido sí se escribe "ahorita" en minúscula también.

### 2.5 Espaciado, radios y elevación

- Espaciado: `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`.
  Gutter de pantalla **20 dp**; separación entre bloques de una pantalla **24 dp**.
- Radios: `sm 12` (chips, inputs chicos) · `md 18` (avisos, comentarios) · `card 24` (tarjetas y
  fotos) · `sheet 28` (hojas) · `pill 999` (botones, segmentos).
- Elevación: **sin sombras** en tarjetas. Solo `Sheet` y `Toast` llevan una sombra suave
  (`0 8px 24px -8px` del scrim). Nada de bordes gruesos ni efectos 3D.

### 2.6 Tamaños fijos

Toque mínimo 48 dp. Botón 50 dp de alto. Avatar 64 (Inicio), 40 (listas), 28 (comentarios).
Símbolo en app 24, 48 y 96 dp. Pestaña activa: círculo de 48 dp.

---

## 3. Símbolo y logo

- `Symbol`: dos medias lunas (izquierda = tú, derecha = tu pareja, salvo que se indique) con
  rendija de 8 % del diámetro. Se dibuja en código (react-native-svg) para cambiar de fruta.
  Geometría en `viewBox 0 0 100 100`: `M46 4 A46 46 0 0 0 46 96 Z` y `M54 4 A46 46 0 0 1 54 96 Z`.
- `Wordmark`: horizontal (símbolo + nombre), apilado o solo nombre. Sin estirar, girar, sombras,
  colores que no sean frutas ni cambiar tipografía.
- Espacio libre: la mitad del ancho de una media luna. Tamaño mínimo del símbolo: 16 dp.

---

## 4. Iconografía

Set propio en `src/components/icons/paths.ts`: **trazo 2 dp en retícula de 24, puntas y uniones
redondas, círculos y arcos primero, esquinas con radio generoso**. Color `ink` en reposo; activo =
relleno de tu fruta detrás (pestañas). Base del manual: `home`, `question`, `mood`, `stories`,
`memories`, `countdown`, `distance`, `lists`, `games`, `love`, `stats`, `bell`. Extendidos en el
mismo estilo: `more`, `person`, `couple`, `fruit`, `suitcase`, `widgets`, `signal`, `door`,
`leave`, `chevron`, `back`, `plus`, `lock`, `send`, `spark`, `pin`, `alert`, `check`, `close`,
`map`, `camera`, `photo`, `pencil`, `trash`, `download`, `eye`, `archive`, `calendar`, `clock`,
`gift`, `settings`, `search`, `undo`, `type`, `sticker`, `envelope`, `chart`, `cloudOff`, `smile`. Si falta
uno, se dibuja con estas reglas (referencia: Material Symbols Rounded peso 500), nunca se usa un
emoji como ícono del sistema. Los emojis solo existen como **contenido** (moods, reacciones).

---

## 5. Movimiento y háptica (D102)

Juguetón pero corto. Tokens en `theme.motion`:

| Token | Valor | Para |
|---|---|---|
| `tap` | 120 ms, escala 0.97 | Presionar botones y tarjetas |
| `base` | 220 ms, `Easing.bezier(.2,.8,.2,1)` | Cambios de estado, fundidos |
| `exit` | 160 ms, ease-in | Salidas |
| `spring` | damping 14, stiffness 180 (un rebote) | Lo que "llega": pestaña activa, símbolo, racha |

- **Firma — la rendija:** las dos mitades llegan desde fuera (±26 dp) con `spring` y se quedan sin
  tocarse. Se usa en el splash animado, al contestar la pregunta (cuando ya contestaron los dos) y
  al completar algo "de a dos" (`ArrivalOverlay`, reemplaza a `SealOverlay`).
- **Cargando:** `LoadingSymbol`, las mitades respiran (se separan 4 dp y regresan, 1.2 s). No hay
  spinners ni esqueletos de renglones.
- **Pestaña activa:** el círculo de fruta crece de 0.6 a 1 con `spring`.
- **Se abre la respuesta:** de desenfoque/opacidad 0.3 y +8 dp a nítida, 320 ms.
- **La racha se enciende:** la chispa escala de 0.4 a 1 girando −12° → 0°.
- **Reducir movimiento** (`useReducedMotion`): todo se vuelve un fundido de 150 ms.
- Háptica: `light` al tocar mood, pestañas y reacciones; `success` al contestar y al completar algo
  de a dos; `warning` en confirmaciones destructivas.

---

## 6. Voz y tono

Habla como te escribirías con quien quieres: **juguetona, cálida, breve, directa**. Español de
México, de tú, "ustedes" y "celular". Nada de regaños ni culpas.

| Dónde | Ejemplo |
|---|---|
| Título | Falta menos de lo que parece. |
| Cuerpo | Ya contestó la pregunta de hoy. Ahora te toca a ti. |
| Botón | Contestar |
| Notificación | **Ximena** · Cambió su mood. Entra a ver cómo está. |
| Error | No pudimos mandarlo. Tu celular está sin señal; lo intentamos otra vez. |
| Vacío | Aquí irá su primera memoria. ¿Cuál sería? |

**Nunca decimos:** "usuario", "premium", "desbloquear", "conectar con tu pareja", "experiencia".
Nada de signos de admiración en cadena. Si una frase se puede decir más chiquito, se dice más
chiquito. Ya no se habla de "libreta", "cuaderno", "hoja" ni "pegar" (era "Bitácora").

---

## 7. Componentes

En `src/components/`, exportados desde `@/components`, solo con tokens. Cada uno con sus estados
en el Catálogo de diseño (`/catalogo`).

| Componente | Qué es | Variantes / props | Estados |
|---|---|---|---|
| `Screen` | Fondo `bg`, safe area, gutter 20, `scroll`, `refreshing`/`onRefresh` (indicador en tu fruta) | `scroll`, `padded` | refrescando |
| `ScreenHeader` | Título `h1` + `label` opcional arriba + acción a la derecha; con `back` muestra flecha y texto de regreso | `title`, `label`, `right`, `back` | — |
| `Text` | Escala §2.4 | `variant`; `tone` = `ink`·`muted`·`danger`·`success`·`onFruit` | — |
| `Button` | Píldora de 50 dp | `primary` (`action`), `secondary` (`surface2` + `ink`), `ghost` (solo texto `ink` 600), `danger` (texto Chile); `fullWidth`, `icon`, `size: 'md'|'sm'`; sin `fullWidth` mide su contenido y respeta la alineación del padre (en un padre que estira, envuélvelo en `alignItems: 'flex-start'`) | normal, presionado (`tap`), deshabilitado (40 % opacidad), cargando (`LoadingSymbol` chico) |
| `IconButton` | Ícono tocable 48×48 | `plain`, `filled` (círculo `action`), `soft` (círculo `surface2`) | normal, presionado, deshabilitado |
| `Card` | Superficie `surface`, radio 24, padding 18, sin sombra | `tone`: `surface` · `me` · `partner` (tinte de fruta); `onPress` | normal, presionado |
| `Symbol` | §3 | `size`, `left`/`right` (`Fruit` o llave), `animate`: `none`·`arrive`·`breathe` | — |
| `Wordmark` | §3 | `size`, `layout`: `name`·`horizontal`·`stacked` | — |
| `Avatar` | Foto o inicial sobre `surface2`; aro de fruta 3 dp con separación `bg` | `size`, `fruit`, `ring`, `newDot` (punto de story nueva); `initialOf(nombre)` se exporta aparte | cargando, sin foto |
| `MoodBubble` | Burbuja con pico arriba en el tinte de la fruta: emoji + mood + nota | `fruit`, `empty` (contorno `line`, "¿Y tú?"), `note` (varias líneas), `pulse` (sube al llegar un mood nuevo: resorte; fundido con reducir movimiento) | vacío, cargando |
| `FruitDot` | Punto de 12 dp de la fruta: "esto es de…" | `fruit`, `size` | — |
| `FruitPicker` | Rejilla 4 columnas de las 7 frutas con nombre; bloqueadas con candado y motivo ("es de X", "se parece a la suya"), sugerida marcada; vista previa con `Symbol` | `value`, `partnerFruit`, `partnerName`, `onChange` | seleccionada (aro `ink`), bloqueada (30 %) |
| `AnswerCard` | Respuesta de una persona: `FruitDot` + nombre + texto, fondo tinte de su fruta; `locked` muestra renglones borrosos y "Se abre cuando contestes." | `fruit`, `name`, `text`, `locked` | revelándose (§5) |
| `StatTile` | Número `num` + nota, sobre `surface`; tocable se achica al presionar | `value`, `label`, `icon`, `iconColor` (p. ej. tu fruta en la racha), `onPress`, `accessibilityHint` | presionado (si es tocable) |
| `Chip` | Píldora `surface2` | `selected` (fondo `ink`, texto `bg`), `icon`, `iconColor` | seleccionado, deshabilitado |
| `Segmented` | Píldora `surface` con opciones; la activa en `ink`. Mide lo que dicen (cada opción con `minWidth` 88); `fullWidth` la estira y reparte por igual | `options`, `value`, `fullWidth` | — |
| `Input` | Campo `surface`, radio 18, texto `body`; foco = contorno 2 dp de tu fruta | `label`, `error`, `multiline`, `icon` (a la izquierda, p. ej. `search`) | foco, error (texto Chile + ícono), deshabilitado |
| `ListRow` / `ListGroup` | Renglón de 52 dp: ícono `ink`, texto `body`, chevrón `inkMuted`; divisor `line`. `ListGroup` pone la etiqueta arriba | `tone: 'danger'`, `right`, `divider` | presionado (`surface`), deshabilitado |
| `Sheet` | Hoja inferior radio 28, `bg`, agarradera | `title` | — |
| `Toast` | Píldora `ink` con texto `bg` y ícono | `tone` `info`·`success`·`danger` | — |
| `Notice` | Aviso en `surface`, radio 18, ícono + texto; `danger`/`success` colorean el ícono | `tone`, `action`; `children` acepta texto suelto o varias partes (`Text` anidados) | — |
| `EmptyState` | `Symbol` (o forma de widget) + `h3` + nota + acción opcional; con humor | `art`: `symbol`·`heart`·`bubble`·`dome`·`spark`·`circles`, `title`, `body`, `action` | — |
| `LoadingSymbol` | Símbolo que respira (§5) | `size` | — |
| `ArrivalOverlay` | Las mitades llegan y aparece una frase corta | `text`, `onDone` | — |
| `TabBar` | 5 pestañas solo ícono (con `accessibilityLabel`); activa = círculo de tu fruta (`on` encima) | — | activa (`spring`) |
| `Checkbox` | Casilla redonda; marcada = círculo de tu fruta con palomita | `size`: `md` (26) · `lg` (círculo de 32, detalle de listas) | — |
| `PermissionNote` | Estado de un permiso: activo, por pedir, bloqueado o solo-celular | `kind`: `notifications` · `location` (cada uno con sus textos) | — |
| `Toggle`, `DateField`, `TimeField`, `CodeInput`, `InviteCode`, `AvatarPicker`, `SoftAskNote`, `Divider`, `FieldError` | Mismos contratos que antes, redibujados con estos tokens (Toggle encendido = tu fruta) | — | — |
| `Sticker` | Sticker de stories: círculo de fruta con frase corta en display (manual §15) | `text`, `fruit` | — |

**Retirados** (no se usan más): `Paper`, `Tape`, `Polaroid`, `Stamp`, `Doodle`, `FoldedNote`,
`Note` (post-it), `PageHeader`, `GridColumns`, `GridScore`, `Tally`, `SealOverlay`,
`LoadingLines` y las ilustraciones `PencilNote`, `EmptyPolaroid`, `Scene`, `CloudOff`,
`WaitingIllustration`.

---

## 8. Patrones de pantalla

- **Estructura:** `ScreenHeader` (o el encabezado propio de Inicio) → bloques separados 24 dp →
  acción principal. Una sola acción principal (`primary`) por pantalla.
- **Pestañas:** Inicio · Pregunta · Stories · Memorias · Más (íconos del manual).
- **Inicio:** encabezado con `Symbol` + `Wordmark` y la fecha en `note`. Debajo, ustedes dos
  (avatar con aro de su fruta —el aro con punto es "story nueva" y abre el visor— y `MoodBubble`;
  tocar tu burbuja abre el selector de mood). Luego la tarjeta **La próxima vez** ("Faltan" `h3`
  + "12 días" `display` + fecha y lugar; media luna llenándose), la tarjeta de la **pregunta del
  día** con su estado y "Contestar", `StatTile` de días juntos y racha, y "Un día como hoy". No hay
  fila aparte de stories (D103).
- **Pregunta del día:** `label` + racha en `Chip` con chispa; la pregunta en `h2`; `AnswerCard`
  de tu pareja (cerrada hasta que contestes) y tu `Input`; al contestar, `ArrivalOverlay` y las dos
  respuestas en su tinte; comentarios en burbujas `surface` con `FruitDot`.
- **Listas de cosas** (memorias, eventos, listas, visitas): agrupadas por mes con `h3` en
  minúscula ("noviembre") y conteo en `note`. Fotos con radio 24, sin marco.
- **Más:** `ListGroup` "De a dos" (Cuentas regresivas, Listas, Juegos, Distancia, Visitas,
  Lenguajes del amor, Estadísticas), "Ustedes" (Tu fruta, Mi perfil, Nuestra pareja, Avisos,
  Widgets) y "Cuenta" (Estado del servidor, Cerrar sesión, Salir de la pareja en `danger`). Arriba,
  tarjeta con tu avatar, nombre y fruta.
- **Formularios:** `ScreenHeader` con `back`, campos `Input`, botón `primary` `fullWidth` abajo.
- **Errores:** `Notice tone="danger"` cerca de donde pasó, con qué hacer. **Vacíos:** `EmptyState`.
  **Cargando:** `LoadingSymbol` centrado.
- **Stories (visor):** siempre de noche (`ThemeProvider scheme="dark"`); barra de progreso en la
  fruta de quien publicó.

---

## 9. Widgets (D103, manual §09–10)

Seis widgets **1×1**, cada uno con su forma, **sin fondo**: la forma ocupa 60 % del cuadro y un
solo dato va debajo.

| Widget | Forma | Dato |
|---|---|---|
| Días juntos | Corazón partido en las dos frutas con rendija | "412 días" |
| Mood de tu pareja | Burbuja de diálogo en su fruta con carita | "feliz" (el mood) |
| La próxima vez | Media luna de tu fruta que se llena con la de tu pareja conforme se acerca la visita | "faltan 12" |
| Distancia | Dos círculos (tú, tu pareja) con ruta punteada; más cerca, menos espacio | "1,240 km" |
| Story de tu pareja | Foto en círculo con aro de las dos frutas y punto si hay nueva | "nueva" |
| Racha (nuevo) | Chispa grande (tu fruta) y chica (su fruta) | "47 días" |

- **Vidrio simulado** (Android no difumina detrás de un widget): relleno de fruta al 80 % (90 % en
  oscuro), degradado blanco encima (62 % → 14 % → 28 %; 40 % arriba en oscuro), borde de 1.8 con
  brillo y **contorno oscuro fino** (negro 24 %, 4) para que se lea sobre claro, oscuro y foto.
- Texto blanco 600 con contorno oscuro (negro 50 %). Geometría exacta: prototipo y manual.
- Una fruta es tú; la otra, tu pareja.

---

## 10. Ícono, splash y notificaciones

- **Ícono adaptativo:** símbolo Sandía + Mango sobre Hueso, dentro del 66 % central (foreground
  432×432); monocromo para Android 13. Play/legacy 512×512.
- **Splash:** símbolo + "ahorita" sobre Hueso (Noche en oscuro), 1 s.
- **Notificaciones:** nombre de quien escribe + una frase corta; el ícono chico es el símbolo en
  monocromo y el **color del aviso es la fruta de quien lo manda**.

---

## 11. Prohibido

- Fondo de color en un widget; juntar frutas que se parecen; usar una fruta para "error" o para
  una acción.
- Cuadrícula, washi, post-its, polaroids, sellos, texturas, garabatos, inclinaciones (todo lo de
  "Bitácora").
- Sombras en tarjetas, degradados decorativos fuera de los widgets, glassmorphism en la app.
- Emojis como íconos del sistema; "TODO EN MAYÚSCULAS" fuera de etiquetas; texto < 14 sp.
- Anuncios, "premium", cosas "por desbloquear", fotos de stock, filtros pastel, corazones de neón.

## 12. Checklist de revisión (cada pantalla, claro y oscuro)

1. ¿Solo tokens del tema y componentes de `@/components`?
2. ¿Una acción principal en Tinta/Hueso? ¿Las frutas solo dicen quién es quién?
3. ¿Números en display? ¿Etiquetas en MAYÚSCULAS y lo demás en minúscula inicial? ¿≥ 14 sp?
4. ¿Hay aire? ¿Se puede quitar algo?
5. ¿Estados vacío, cargando y error diseñados?
6. ¿Copy según §6 (sin palabras prohibidas, sin "libreta")?
7. ¿Se ve bien en oscuro (sin tintes lodosos, contraste suficiente)?
8. ¿Respeta reducir movimiento? ¿Áreas de toque ≥ 48 dp y `accessibilityLabel` en íconos?
