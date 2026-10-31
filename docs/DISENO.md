# Sistema de diseño — "Bitácora"

> **Este documento es ley** (PLAN §8.5). Toda pantalla nueva lo sigue. Si una fase necesita algo
> que no está aquí, primero se extiende el sistema (tokens o componente, con su entrada en este
> archivo) y después se usa en la pantalla. Nunca se improvisan estilos sueltos en una pantalla.
>
> Concepto elegido en la Fase 0.5 entre tres propuestas (`docs/design/conceptos.html`).

---

## 1. Concepto

**"Lo nuestro, pegado con cinta."** La app es un **cuaderno de cuadro chico** (el escolar de
toda la vida, con cuadrícula azul y margen rojo) que los dos van llenando. Cada pantalla es una
página.

- Las **fotos** son polaroids con cinta washi.
- Lo que **escribe una persona** se ve a mano; lo que dice **el sistema** se ve impreso.
- Las **fechas** llevan sello de fechador.
- La **respuesta de tu pareja** es una notita doblada que se desdobla cuando contestas.
- Los **avisos** son post-its.

### Principios

1. **Objetos, no tarjetas.** Todo lo que se separa de la hoja es un objeto físico reconocible:
   ficha, polaroid, post-it, sello, cinta, sticker. Si no puedes decir qué objeto es, no debe
   tener fondo ni sombra: va escrito directo sobre la hoja.
2. **A mano solo lo humano.** La letra a mano (Gochi Hand) es para títulos y para lo que "escribió
   alguien" (notas cortas, pies de foto, apodos). Botones del sistema, listas largas, ajustes y
   textos de lectura van en Figtree.
3. **Nada se pega porque sí.** Cinta, sellos y stickers marcan algo (nuevo, fecha, categoría,
   pareja). Máximo **3 objetos decorativos por pantalla** (cinta, sticker, garabato).
4. **Chueco con orden.** Los objetos se inclinan entre −3° y 3°, siempre con el mismo ángulo para
   el mismo elemento (`tiltFor(id)`), nunca al azar en cada render. El texto de lectura nunca se
   inclina más de 1.5°.
5. **De noche es la misma libreta bajo la lámpara del buró**: cartón oscuro, tinta de gis. No se
   invierte; se re-ilumina.
6. **Ritual sobre métrica.** Los números importantes (días, racha) se escriben grandes a mano y se
   subrayan, no se meten en "tiles" de dashboard.

---

## 2. Tokens

Todos viven en `src/theme/tokens.ts` y se usan solo con `useTheme()`. Ningún color, tamaño,
radio o sombra literal en pantallas.

### 2.1 Color

Cada color tiene nombre propio. Columna "Noche" = modo oscuro ("Lámpara de buró").

| Token | Nombre | Día | Noche | Uso |
|---|---|---|---|---|
| `paper` | Cuaderno | `#F7F4EC` | `#23201B` | Fondo de toda pantalla |
| `paperRaised` | Ficha | `#FFFDF7` | `#2E2A24` | Fichas, hojas, sheets, inputs |
| `ink` | Tinta BIC | `#1E3270` | `#EDE6D6` | Texto principal, trazos de iconos |
| `inkMuted` | Tinta seca | `#5F6690` | `#ACA390` | Texto secundario, iconos inactivos |
| `inkFaint` | Lápiz | `#9AA0BF` | `#6F685C` | Placeholder, deshabilitado |
| `grid` | Cuadrícula | `rgba(74,120,190,0.16)` | `rgba(237,230,214,0.06)` | Cuadrícula de la hoja |
| `margin` | Margen | `rgba(214,64,84,0.42)` | `rgba(232,106,122,0.30)` | Línea de margen, borde superior de fichas |
| `ruled` | Renglón | `rgba(74,120,190,0.28)` | `rgba(237,230,214,0.12)` | Renglones de fichas e inputs |
| `jamaica` | Jamaica | `#C23B6B` | `#EC7397` | Acento principal: botón primario, sellos, selección |
| `onJamaica` | — | `#FFFDF7` | `#23201B` | Texto sobre Jamaica |
| `cempasuchil` | Cempasúchil | `#E8932A` | `#F2B25A` | Racha, logros, cinta amarilla |
| `nopal` | Nopal | `#4F7A4A` | `#92BA84` | Éxito, "ya contestó", tu pareja |
| `chile` | Chile | `#B3261E` | `#F2867A` | Errores y acciones destructivas |
| `postit` | Post-it | `#FFE27A` | `#D6B34E` | Notas y avisos (Toast, Note) |
| `onPostit` | — | `#3B2F12` | `#2A2208` | Texto sobre post-it |
| `polaroid` | Polaroid | `#FFFEFA` | `#DDD4C2` | Marco de fotos y avatares |
| `onPolaroid` | — | `#1E3270` | `#2A2620` | Pie de foto |
| `photoEmpty` | — | `#E6E0D0` | `#4A443A` | Área de foto vacía, cargando o con error |
| `tapeYellow` | Cinta canario | `rgba(242,169,59,0.60)` | `rgba(242,169,59,0.50)` | Cinta washi |
| `tapeMint` | Cinta menta | `rgba(110,190,165,0.60)` | `rgba(110,190,165,0.45)` | Cinta washi |
| `tapePink` | Cinta rosa | `rgba(194,59,107,0.45)` | `rgba(232,105,143,0.45)` | Cinta washi |
| `shadow` | Sombra | `rgba(60,40,10,0.20)` | `rgba(0,0,0,0.50)` | Sombra de objetos |
| `scrim` | Velo | `rgba(30,50,112,0.35)` | `rgba(0,0,0,0.55)` | Fondo detrás de sheets |

Reglas:
- **Jamaica es el único acento de acción.** Cempasúchil y Nopal son semánticos (racha / éxito),
  no se usan para botones.
- Texto sobre `paper`: solo `ink`, `inkMuted`, `jamaica` o `chile` (todos ≥ 4.5:1).
- `inkFaint` nunca para texto que haya que leer (solo placeholder o deshabilitado).

### 2.2 Tipografía

Fuentes libres (Google Fonts, OFL) vía `@expo-google-fonts/*` y `expo-font`.

| Familia | Rol | Pesos |
|---|---|---|
| **Gochi Hand** | Títulos y lo escrito a mano | 400 |
| **Figtree** | Lectura, UI del sistema, botones secundarios | 400, 500, 600, 700 |
| **Courier Prime** | Sellos de fecha, folios ("pág. 1,284"), datos | 400, 700 |

Escala (tokens `type.*`, tamaño / interlineado en dp):

| Token | Familia | Tamaño | Interlineado | Uso |
|---|---|---|---|---|
| `hero` | Gochi Hand | 56 | 52 | Número protagonista (días juntos) |
| `display` | Gochi Hand | 40 | 40 | Título de pantalla |
| `title` | Gochi Hand | 28 | 30 | Título de sección, la pregunta del día |
| `hand` | Gochi Hand | 20 | 22 | Notas, pies de foto, botón primario |
| `handSmall` | Gochi Hand | 16 | 18 | Chips, etiquetas a mano |
| `heading` | Figtree 700 | 18 | 24 | Encabezado de bloque de UI |
| `body` | Figtree 400 | 16 | 23 | Texto de lectura |
| `bodyStrong` | Figtree 600 | 16 | 23 | Énfasis, botón secundario |
| `small` | Figtree 500 | 14 | 19 | Texto secundario |
| `caption` | Figtree 500 | 12.5 | 16 | Metadatos, ayudas |
| `stamp` | Courier Prime 700 | 11 | 13 | Sellos (MAYÚSCULAS, tracking 1) |
| `mono` | Courier Prime 400 | 13 | 17 | Folios, cifras secundarias |

Reglas:
- Gochi Hand nunca por debajo de 16 dp ni en textos de más de ~140 caracteres.
- Respuestas y comentarios de los usuarios: `body` (Figtree). Notas cortas (mood, pie de foto,
  apodo): `hand`.
- Cifras alineadas en columnas: `fontVariant: ['tabular-nums']` (Figtree lo soporta).
- Respetar el escalado de fuente del sistema (no desactivar `allowFontScaling`); tope
  `maxFontSizeMultiplier` = 1.4 en `hero`/`display`.

### 2.3 Espaciado y página

Base 4: `xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`.

- **Cuadrícula de la hoja:** celdas de **14 dp**.
- **Margen rojo** a **32 dp** del borde izquierdo (`page.marginX`).
- **Gutter de contenido:** izquierdo **44 dp** (a la derecha del margen), derecho **20 dp**
  (`page.contentLeft`, `page.contentRight`). Los objetos grandes (polaroids, fichas a todo lo
  ancho) pueden invadir el margen hasta 24 dp desde el borde, nunca el texto de lectura.
- Separación vertical entre bloques: `xl` (24); dentro de un bloque: `sm`–`md`.

### 2.4 Radios

El papel está cortado a escuadra: casi todo es recto.

| Token | Valor | Uso |
|---|---|---|
| `none` | 0 | Fichas, polaroids, post-its, cinta, hojas |
| `xs` | 2 | Sellos, inputs |
| `sm` | 6 | Chips |
| `pill` | 999 | Avatares circulares, FAB, toggles |
| `hand` | `{ tl: 18, tr: 6, br: 16, bl: 8 }` | Botón primario (forma "recortada a mano") |

### 2.5 Sombras (`boxShadow`)

Sombras **cortas y cálidas**, de objeto encima de la hoja. Nada de sombras grandes difusas.

| Token | Valor | Uso |
|---|---|---|
| `object` | `0 4px 8px -3px {shadow}` | Polaroid, post-it, ficha |
| `lifted` | `0 10px 18px -8px {shadow}` | Objeto arrastrado o presionado, sheet |
| `ink` | `2px 3px 0 {ink}` | Botón primario (sombra "dibujada") |

### 2.6 Inclinación

`tilt`: `-3, -2, -1, 0, 1, 2, 3` grados. `tiltFor(seed, range)` (función pura en
`src/lib/tilt.ts`) da siempre el mismo ángulo para el mismo id. Polaroids ±3, post-its ±2,
fichas ±1, sellos −2 fijo, texto de lectura 0.

---

## 3. Iconografía

Set propio en `src/components/icons/` (SVG con `react-native-svg`), **dibujados como con pluma**:

- Cuadrícula 24×24, trazo **2 dp**, puntas y uniones **redondeadas**, sin relleno (salvo puntos).
- Trazos con **ligero temblor intencional** (curvas que no cierran perfecto, líneas apenas
  curvas). No se usan filtros; el temblor está en el path.
- Color = `currentColor` (por defecto `ink`; activo `jamaica`; inactivo `inkMuted`).
- Tamaños: 16, 20, **24** (default), 28.
- Set base: `home`, `ask`, `photo`, `more`, `flame`, `pin`, `lock`, `plus`, `send`, `calendar`,
  `close`, `check`, `back`, `bell`, `camera`, `smile`, `map`, `list`, `gift`, `clock`, `settings`,
  `cloudOff` (sin conexión), Fase 6: `pencil` (dibujar), `type` (texto), `download`, `undo`, `eye` (visto), `trash`, `archive`, `sticker`; Fase 7 reutiliza `pin`, `map`, `photo`, `camera`, `pencil` (editar), `download` y `trash` (sin iconos nuevos); `heart` (solo para "pienso en ti" y reacciones, nunca decorativo); Fase 11B: `envelope` (lenguajes del amor), `suitcase` (visitas), `chart` (estadísticas).
- **Prohibido**: librerías de iconos genéricas (Ionicons, Material, Lucide) sin redibujar, y
  emojis como iconos del sistema. Los emojis solo aparecen en contenido de los usuarios (mood).

## 4. Ilustración y texturas

- **Hoja:** `Paper` dibuja la cuadrícula (14 dp) y el margen rojo con SVG. Variantes `notebook`
  (cuadrícula + margen, por defecto), `plain` (solo color, para sheets y modales) y `ruled`
  (renglones, para pantallas de escritura larga).
- **Cinta washi** (`Tape`): rectángulo semitransparente 48×16 con bordes ligeramente dentados,
  en canario, menta o rosa. Se pega en el borde superior de polaroids y post-its.
- **Ilustraciones:** planas, con trazo de pluma `ink` 2 dp y relleno de colores de la paleta
  "como crayón" (sin degradados ni 3D). Personajes simples o, mejor, objetos (lápiz, polaroid
  vacía, taza, cuaderno). Viven en `src/components/illustrations/`.
- **Garabatos** (`Doodle`): subrayado, círculo, flechita, estrellita. Para enfatizar **un** dato
  por pantalla.
- Grano de papel: no en la v0.0.x (rendimiento); se evalúa en la Fase 12.

## 5. Movimiento y háptica

Con `react-native-reanimated`. Respetar `useReducedMotion()`: si está activo, todo aparece en su
estado final con un fundido de 120 ms, sin rebotes ni giros.

| Token | Valor | Uso |
|---|---|---|
| `fast` | 120 ms | Presionar, fundidos |
| `base` | 220 ms | Entradas, cambios de estado |
| `slow` | 420 ms | Revelar, desdoblar |
| `springStick` | `{ damping: 12, stiffness: 180, mass: 0.8 }` | "Pegar" un objeto |
| `springSoft` | `{ damping: 18, stiffness: 140 }` | Sheets, toasts |

Movimientos con significado (no decorativos):

- **Pegar:** un objeto nuevo (foto, nota, toast) cae 12 dp desde arriba con 4° extra y se asienta
  en su `tilt` con `springStick`. Háptica `impactLight`.
- **Presionar:** los objetos se "levantan": escala 0.97, sombra `lifted`, `fast`.
- **Desdoblar:** la respuesta de tu pareja pasa de borrosa/doblada a legible (`slow`), con
  `notificationSuccess` al revelarse.
- **Dibujar:** subrayados y la flama de la racha se trazan (stroke-dashoffset) en 600 ms la
  primera vez que se ven.
- **Sellar:** al confirmar algo importante (contestar, guardar), un sello baja con escala 1.15→1
  en `base`. Háptica `impactMedium`.

Háptica (`expo-haptics`) solo en esos momentos; nunca en scroll ni en cada toque.

## 6. Voz y tono (español de México)

- **Tuteo** con tu pareja y **"ustedes"** para los dos. "Celular", "foto", "platicar".
- Cálida, breve, con humor ligero. Como una nota que te dejan en el cuaderno.
- Nombra a la pareja por su nombre o apodo, nunca "tu usuario vinculado".
- Errores: qué pasó y qué hacer, sin culpas ni tecnicismos.
- Prohibido: "¡Bienvenido a tu experiencia!", "Oops!", "Algo salió mal :(", "Usuario",
  anglicismos innecesarios ("feed", "match"), "vosotros", signos de exclamación en cada frase.

| Momento | Sí | No |
|---|---|---|
| Pareja contestó | "Ale ya escribió y la dobló. Te toca." | "¡Tu pareja ha respondido!" |
| Vacío (memorias) | "Todavía no pegan ninguna foto. La primera siempre sale chueca, y está bien." | "No hay memorias aún." |
| Sin conexión | "No hay señal con el servidor. Revisa tu internet y vuelve a intentar." | "Error de red." |
| Racha | "23 días seguidos contestando." | "¡Racha de 23! 🔥🔥🔥" |
| Botón primario | "Pegar mi respuesta" | "Enviar" |
| Borrar | "Arrancar esta hoja" (con confirmación) | "Eliminar elemento" |

## 7. Componentes

Todos en `src/components/`, exportados desde `@/components`, con tokens del tema. Cada uno tiene
sus estados en el **Catálogo de diseño** (`/catalogo`).

| Componente | Qué es | Variantes | Estados |
|---|---|---|---|
| `Paper` | La hoja de fondo | `notebook` · `plain` · `ruled` | — |
| `PageHeader` | Encabezado de página (§8): `Stamp` con la fecha/folio, título `display` y acción opcional a la derecha | `stamp`, `title`, `right` | — |
| `Screen` | Contenedor de pantalla con `Paper`, safe area y gutters. Con `scroll`, acepta `refreshing` y `onRefresh` para jalar y refrescar (indicador Jamaica sobre `paperRaised`) | `scroll` sí/no, `paper` | refrescando |
| `Text` | Texto con la escala §2.2 | `variant` = token de tipo; `tone` = `ink`·`muted`·`faint`·`jamaica`·`chile`·`nopal` | — |
| `Button` | Acción (`fullWidth` para auth y onboarding) | `primary` (Jamaica, forma `hand`, Gochi Hand 20, sombra `ink`) · `secondary` (contorno tinta 1.5 dp, Figtree 600) · `ghost` (solo texto subrayado a mano) | normal, presionado (se hunde 2 dp y pierde sombra), deshabilitado (`inkFaint`, sin sombra), cargando (lápiz que garabatea) |
| `IconButton` | Icono tocable 44×44 | `plain` · `sticker` (círculo Jamaica) | normal, presionado, deshabilitado |
| `Card` (ficha) | Ficha bibliográfica | `plain` · `ruled` (renglones) ; `tilt` | normal, presionado (si es tocable) |
| `Note` | Post-it | `yellow` (default) ; `tape` sí/no ; `tilt` | aparece con "pegar" |
| `Polaroid` | Foto con marco | `size` S/M/L ; `caption` ; `date` (sello) ; `tape` color | cargando (marco con foto "revelándose" en `paperRaised`), error (polaroid vacía con "no cargó") |
| `Tape` | Cinta washi | `yellow` · `mint` · `pink` | — |
| `Stamp` | Sello de fechador | `jamaica` · `ink` · `nopal` | — |
| `Chip` | Etiqueta de cinta washi | color por categoría | seleccionado (contorno tinta 1.5 dp), deshabilitado |
| `Input` | Renglón para escribir | `line` (un renglón) · `multiline` (ficha con renglones) ; `label` a mano | foco (renglón Jamaica 2 dp), error (renglón y mensaje `chile`), deshabilitado |
| `Avatar` | Mini polaroid o círculo con foto/inicial | `polaroid` · `round` ; `size` ; `mood` (sticker) | sin foto (inicial a mano sobre color de la paleta) |
| `Sticker` | Sticker troquelado (borde blanco) | `mood` · `label` · `icon` | aparece con "pegar" |
| `FoldedNote` | Respuesta doblada | `folded` · `open` | transición "desdoblar" |
| `Sheet` | Hoja que sube desde abajo | `plain` ; título a mano | abierta/cerrada, con `scrim` |
| `Toast` | Post-it que se pega arriba | `info` · `success` (Nopal) · `error` (Chile) | entra con "pegar", se va solo en 3.5 s |
| `EmptyState` | Página vacía con ilustración | ilustración + título a mano + texto + acción opcional | — |
| `Doodle` | Garabato de énfasis | `underline` · `circle` · `arrow` · `star` | se dibuja una vez |
| `LoadingLines` | Estado de carga: renglones que se escriben solos (sin spinner) | `count` | con "reducir movimiento" quedan fijos |
| `Divider` | Línea a mano punteada | `dashed` · `solid` | — |
| `Icon` | Icono del set §3 | `name`, `size`, `color`, `draw` (se dibuja una vez, §5) | — |
| `DateField` | Fecha como sello de fechador: 3 casillas DD / MM / AAAA en Courier Prime 700, etiqueta a mano; solo captura dígitos y salta el foco (no valida) | `label` | foco (borde Jamaica 2 dp), error (borde y mensaje `chile`), deshabilitado |
| `InviteCode` | Código de 6 caracteres como boleto con cinta canario, agrupado "ABC 234" en Courier Prime 700 grande; botón de compartir y copiar opcionales | `onShare`, `onCopy`, `shareLabel` | `loading` (casillas punteadas vacías) |
| `CodeInput` | 6 casillas para escribir el código (una `TextInput` transparente encima); mayúsculas, ignora espacios/guiones, alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` | `value`, `onChangeText` | activa (Jamaica), error, deshabilitado |
| `AvatarPicker` | Polaroid grande (L) con inicial a mano y sticker de cámara para elegir foto | `person` · `couple` | sin foto, con foto, `loading` (se "revela" con pulso) |
| `TabBar` | Barra de pestañas para `Tabs` de expo-router (`tabBar`); `TAB_ICONS` mapea ruta → icono | — | activa (Jamaica), presionada |
| `MoodSheet` | Selector de mood sobre `Sheet` (`src/features/mood/components/`): título a mano "¿Cómo te sientes?", rejilla 4×4 de los 16 moods (emoji grande + `caption`, ≥ 44 dp), nota opcional de 80 letras con contador y botón "Pegar mi mood" a la izquierda | `current` preselecciona | seleccionado (contorno tinta 1.5 dp), guardando, error (Toast) |
| `ListRow` | Renglón tocable (icono + texto Figtree + flecha) separado por `Divider`, para "Más" y ajustes | `default` · `destructive` (Chile, sin flecha); `value`, `divider` | normal, presionado, deshabilitado |
| `DailyQuestionCard` | Pregunta del día en Inicio (`src/features/questions/components/`): `Card` ruled tocable con `Stamp`, la pregunta a mano y una línea de estado | sin contestar (`TE TOCA`, Jamaica) · esperando (`ESPERANDO`, tinta) · ambos (`LOS DOS CONTESTARON`, Nopal + nº de comentarios) | carga (`LoadingLines`), error y sin preguntas (toca para reintentar) |
| `StreakNote` | Racha en un `Note` sin cinta: "N días seguidos contestando." a mano con flama Cempasúchil que se dibuja; si hay días por reparar, enlace a Preguntas | racha · arranque (racha 0) | sin datos: no se muestra |
| `Celebration` | "Sellar" en grande: sello "¡Día completo!" con la racha nueva que baja con `springStick` sobre el velo, 2 estrellas `Doodle`, háptica `notificationSuccess`; se cierra a los 2.5 s o al tocar. Lo monta `QuestionsEvents` | — | con "reducir movimiento" solo se funde |
| `QuestionsEvents` | Sin UI propia, se monta una vez en el layout raíz: Realtime de preguntas con `Toast` (toque, pareja contestó) y la celebración | — | — |
| `QuestionView` | Pantalla de pregunta (`/question?id=` · `?day=` · hoy): sello + `Chip` de categoría, pregunta a mano, formulario (renglones o fichas de opciones con contador), respuesta propia con `PEGADA`, `FoldedNote` de la pareja que se desdobla, "Recuérdale a…" e hilo de comentarios (notitas amarillas mías a la derecha, fichas de tu pareja a la izquierda, reacciones con pulsación larga en `Sheet`) | sin contestar · editando · contestada · ambos | carga, error, sin preguntas, no encontrada |
| `Toggle` | Interruptor de pastilla (`pill`): contorno de tinta, encendido en Jamaica con perilla `onJamaica`; 56×32 con `hitSlop`; `role=switch` | `value`, `onValueChange`, `accessibilityLabel` | apagado, encendido, presionado, deshabilitado (`inkFaint`) |
| `TimeField` | Hora como sello de fechador: dos casillas HH : MM en Courier Prime 700 con botones − / + de 44 dp (hora de 1 en 1 con vuelta al día, minutos de 15 en 15 dentro de la hora) y la hora en lenguaje normal debajo ("9:00 p. m."). Lógica en `src/lib/timeField.ts` | `label`, `value` ('HH:MM', 24 h), `onChange` | normal, deshabilitado |
| `PermissionNote` | Estado del permiso de avisos: activos (palomita Nopal + línea), por pedir (`Note` sin cinta + botón primario "Activar avisos"), bloqueado (`Note` + botón secundario a los ajustes del celular), solo-celular (texto muted, web) | `status`, `canAskAgain`, `onRequest`, `onOpenSettings` | `loading` en el botón |
| `SoftAskNote` | Aviso previo al permiso en Inicio, debajo de la pregunta del día: `Note` con cinta menta, "¿Te aviso cuando Ale conteste?", botón "Sí, avísame" y enlace "Ahora no" | `partnerName`, `onAccept`, `onDismiss` | aparece con "pegar" |
| `SpicyOptIn` | Bloque de ajuste "Preguntas picantes" (`src/features/questions/components/`): `Toggle` con mi opt-in, línea de la pareja ("Caleb ya las activó.") y resultado ("Activas para los dos." en Nopal) | — | pendiente, activo, error (Toast) |
| `HistoryCard` | Ficha del historial (`Card` tilt ±1): `Stamp` con la fecha, `Chip` de categoría, pregunta y extractos de las dos respuestas; la de la pareja solo si ya contestaste | `item`, `partnerName` | con las dos, solo la mía, solo de la pareja ("Te toca para leerla") |
| `StoryFrame` | Una story en marco 9:16 a cualquier ancho (`src/features/stories/components/`): foto (`expo-image`, `cover`) con pie a mano en etiqueta `polaroid`; texto centrado sobre un fondo de la paleta (`paper`·`postit`·`jamaica`·`cempasuchil`·`nopal`·`ink`) en `hand`·`body`·`stamp` con tamaño según el largo; dibujo vectorial (SVG, 900×1600). Stickers (emoji) encima. Texto con contraste ≥ 4.5:1 en claro y noche (`storyTextColor`, con prueba) | `story`, `width`, `mediaUrl`, `caption` | foto cargando (`photoEmpty`) |
| `StoryPolaroid` | Miniatura de story como `Polaroid` (foto: su miniatura; texto/dibujo: `StoryFrame` recortado al centro) | `size`, `tilt`, `date`, `caption` | — |
| `DrawingPad` | Lienzo para dibujar (`Pan` de gesture-handler + SVG, trazo en curso con throttle por cuadro, `simplifyStroke` al soltar): 3 pinceles como `Chip`, colores como puntitos de tinta (seleccionado con contorno tinta 1.5 dp), Deshacer y Borrar todo (con confirmación en `Sheet`); tope `MAX_STROKES` | `strokes`, `onChange`, `bg`, `width`, `children` (stickers) | vacío (Deshacer/Borrar deshabilitados) |
| `StickerLayer` | Stickers sobre el lienzo: se eligen de `STORY_STICKERS` en un `Sheet`, aparecen al centro, se arrastran; al tocar uno salen `Chip`s Más grande / Más chico / Girar / Quitar; pulsación larga lo quita. Usa `clampSticker`, máx. 10 | `stickers`, `onChange`, `width`, `pickerVisible` | seleccionado (contorno punteado Jamaica) |
| `StoryProgress` | Renglones de tinta arriba del visor, uno por story: vistos llenos, el actual se llena en Jamaica según `storyDurationMs`. Con "reducir movimiento" el actual no se anima | `count`, `index`, `durationMs`, `paused`, `onComplete` | en pausa |
| `StoriesRow` | Fila de stories de Inicio: dos mini polaroids (`Avatar`): "Tú" (sticker `plus` si no tienes story activa) y tu pareja (`Stamp` NUEVA si hay sin ver; sin story se apaga con "sin story") | `StoriesRowView` presentacional; `StoriesRow` conectada | cargando, sin story, nueva, vista |
| `StoryComposer` | Pantalla `/story/new?kind=camera\|library\|text\|drawing`: vista previa en `StoryFrame`, pie (con contador) o texto editable dentro del marco, fondo en cuadritos de papel, letra con `Chip`s, dibujo y stickers; "Pegar story" con avance de subida y sello PEGADA (`impactMedium`); cerrar con "¿Tirar esta hoja?" | `kind` | permiso de cámara denegado (`Note` + ajustes), pegando, error (Toast) |
| `StoryViewer` | Visor a pantalla completa, siempre en modo noche (`ThemeProvider scheme="dark"`): progreso, encabezado con `Avatar` y `storyAgo`, toque izquierdo/derecho anterior/siguiente, mantener = pausa, deslizar abajo = cierra. De tu pareja: reacciones (`STORY_REACTIONS`, la elegida con contorno; tocar otra vez quita) y respuesta; tuya: "Visto por …", respuestas en `Sheet`, descargar (foto) y arrancar (con confirmación) | `userId` \| `storyId` | cargando, error, "Esta story ya se borró", caducada |
| `SealOverlay` | Sello grande "Sellar" (§5) sobre el velo (`scrim`): `Stamp` nopal (por defecto `PEGADA`) que baja con escala 1.15→1 en `base`; con "reducir movimiento" solo se funde. La háptica `stamp` la dispara quien lo monta. Lo usan `StoryComposer` y `MemoryEditor` | `label` | — |
| `MemoryPolaroid` | Memoria como `Polaroid` (`src/features/memories/components/`): miniatura de la portada, título a mano como pie, fecha en sello ("29 OCT") y, debajo, lugar (icono `pin`) y "N fotos" | `size`, `tilt`, `tape` | sin foto (marco vacío) |
| `MemoriesTimeline` | Diario: memorias agrupadas por mes con `Stamp` ("OCTUBRE 2026"), polaroids en 2 columnas con `tiltFor`; la columna derecha baja 24 dp | — | — |
| `MemoriesMap` | Mapa de memorias. Android con API key: `MapView` de Google (`MemoriesMap.tsx`) con marcadores mini polaroid y contador en sello, agrupados con `clusterPoints` (tocar un grupo acerca con `zoomInRegion`; si no se separa, `ClusterSheet` las lista). Web o sin key: `PaperMap` (`MemoriesMap.web.tsx`). Solo el archivo nativo importa `react-native-maps` | `memories`, `onOpen`, `height` | sin lugares ("Aquí van a aparecer sus lugares.") |
| `PaperMap` | "Mapa de papel": hoja cuadriculada (`paperRaised`, borde superior de margen, sombra `object`) con los lugares proyectados (`projectEquirect`), pines de tinta Jamaica tocables (≥ 44 dp), contador en `Stamp` si agrupan y línea punteada que los une por fecha. Tocar un grupo acerca la hoja ("Ver todo el mapa" regresa). `compact` = mini mapa del detalle | `points`, `onOpen`, `height`, `compact` | vacío |
| `PhotoFrame` / `PhotoCarousel` | Foto grande en marco polaroid con cinta canario (proporción real de la foto, entre 3:4 y 7:5) y carrusel horizontal paginado (`FlatList`) con puntitos de página (activo = pastilla Jamaica). Invade el margen hasta 24 dp del borde | `photos`, `urls`, `width`, `onIndexChange` | foto cargando (miniatura como placeholder) |
| `MemoryDetail` | Pantalla `/memory/<id>`: acciones (`pencil` editar, `download` la foto que ves, `trash` arrancar con `Sheet` "¿Arrancar esta hoja?"), sello de fecha + "hace 2 meses", título `display`/`title` a mano, carrusel, texto en `body`, lugar (nombre + `PaperMap` compact o `LiteMap` de Google con key) y autor | `id` | carga, error, no encontrada ("Esa hoja ya no está") |
| `PhotoGrid` | Rejilla de miniaturas de 3 columnas reordenable: pulsación larga (250 ms) y arrastrar con un `Pan` de gesture-handler + reanimated; la celda sigue al dedo (escala 1.06) y las demás se acomodan (`indexFromOffset`, `moveItem`). La primera lleva `Stamp` PORTADA; X de 44 dp para quitar; acciones de accesibilidad "Mover antes/después" | `items`, `width`, `onMove`, `onRemove`, `onDragChange` | arrastrando |
| `PlacePicker` | `Modal` a pantalla completa para elegir el lugar: con Google Maps, tocar pone el pin y "Aquí fue" confirma; sin API key o en web explica con un `Note` que el mapa llega con la llave y que solo se puede escribir el nombre | `visible`, `initial`, `onConfirm`, `onClose` | sin pin, con pin, sin mapas |
| `MemoryEditor` | Pantalla `/memory/edit` (crear) y `?id=` (editar): botones Galería y Cámara (hasta 10 fotos, EXIF: con la primera foto que traiga fecha/lugar se llenan los vacíos y un `Toast` lo avisa), `PhotoGrid`, título con contador, `DateField` (hoy por defecto), texto multiline, lugar (`Input` + "Elegir en el mapa" + "Quitar lugar"), "Pegar memoria" a la izquierda con barra de subida y `SealOverlay`; cerrar con cambios pregunta "¿Tirar esta hoja?" | `id?` | permiso de cámara denegado (`Note` + ajustes), validación por campo, pegando, error (Toast), carga/error/no encontrada al editar |
| `OnThisDayCard` | Inicio: `Card` tocable (tilt 1) con `Polaroid` S de la memoria más reciente de este mismo día en años anteriores y "Un día como hoy, hace N años" (`onThisDayLabel`), título a mano y "y N memorias más ese día"; sin memorias de ese día no se muestra. Sin cinta (Inicio ya lleva sus adornos) | `OnThisDayCardView` presentacional | sin datos: no se muestra |
| `MemoriesEvents` | Sin UI, en el layout raíz: Realtime de memorias y fotos | — | — |
| Widgets de Android | Cuatro widgets dibujados con `react-native-android-widget` en `src/widgets/components/` (fuera de React: importan los tokens directo y `renderWidget` devuelve `{ light, dark }`): **Días juntos** (número `hero` a mano con subrayado Jamaica, "días juntos"; mediano suma sello con la fecha y "con {pareja}"; antes del aniversario "Faltan N días"), **Mood de tu pareja** (emoji en sticker, nombre a mano, etiqueta y `ago`; mediano con la nota en post-it de 2 líneas) **Cuenta regresiva** ("en N días"/"mañana"/"¡hoy!" a mano, título y fecha en sello) y **Story de tu pareja** (su story activa más nueva: foto en marco polaroid con la miniatura incrustada, nota sobre su fondo de la paleta y tipografía, o dibujo vectorial con los colores del tema; chico: imagen y "{pareja} · hace 2 h" a mano; mediano: imagen a la izquierda, nombre a mano, `ago` y pie de foto; sin story "{pareja} no ha pegado nada hoy" + "Pégale una tú"; sin stickers). Hoja de cuaderno con cuadrícula de 14 dp y una cinta washi (canario, menta, rosa); mediano añade el margen rojo. Chico < 220 dp de ancho, mediano ≥ 220 dp. Todo el widget abre `appparejas://<ruta>` (`WIDGET_ROUTES`; el de story abre `story/view?user=<pareja>`, o `stories` si no hay) y lleva `accessibilityLabel` | `DaysTogether` · `PartnerMood` · `Countdown` · `PartnerStory`; chico · mediano | listo, sin aniversario / sin mood / sin evento / sin story ("Pongan su aniversario…"), `signed_out` ("Abre la app para empezar"), `no_couple` ("Falta tu pareja") |
| `WidgetsScreen` | Pantalla `/widgets` ("Cómo agregar widgets", desde Más → Widgets): pasos numerados en Jamaica, post-it con la frecuencia de actualización y una `Card` por widget con vista previa y "Agregar a mi pantalla" (`requestPinWidget`; si el launcher no lo soporta, un `Toast` manda al paso a paso). La vista previa es el widget real (`WidgetPreview` de la librería) en Android y un sustituto con `Stamp`/`Sticker`/`Note`/`Tape` en web (`src/components/widget-preview/`) | — | sin pareja/aniversario: modelo de ejemplo |
| `DistanceCard` | Inicio (`src/features/distance/components/`): `Card` tocable (tilt `tiltFor('distancia')`) con `Stamp` DISTANCIA, los km en `display` a mano subrayados con `Doodle`, ciudades en `small`, frase tierna en `handSmall` y, si aplica, "{nombre}: hace 2 h". Sin los dos: invitación (activar / esperar a la pareja). Abre `/distance`. `DistanceCardView` es la presentacional | `view`, `partnerName`, `onPress` | cargando (`LoadingLines`), los dos, solo yo, solo mi pareja, nadie |
| `DistanceScreen` | Pantalla `/distance` ("Distancia"): km en `hero` a mano con `Doodle underline`, frase en `hand`, renglones con `pin` por persona (ciudad y "hace cuánto" de la pareja); después, "Compartir mi distancia" con `Toggle` y dos `Chip` (Al abrir la app / También en segundo plano) con su explicación, y un bloque Figtree "Qué se guarda y qué gasta" (última ubicación redondeada a ~1 km, sin historial, batería). Segundo plano pasa por un `Sheet` que explica "Permitir todo el tiempo". Permiso negado o revocado: `Note` sin cinta + botón secundario a los ajustes del celular (`PermissionNote` es solo de avisos, así que se compone con `Note` + `Button`). En web solo se ve; no se activa | — | cargando, error (`cloudOff`), los dos, solo yo, solo mi pareja, nadie, permiso negado, web |
| Widget Distancia | Quinto widget de Android (`src/widgets/components/DistanceWidget.tsx`, cinta canario): km en Gochi Hand ("1,240 km") y "Ciudad ↔ Ciudad" (o "Tú ↔ nombre" sin ciudades); mediano suma "{nombre}: hace 2 h". Si falta alguien, título corto y una línea que dice quién falta. Toca: `/distance` | chico · mediano | los dos, solo yo, solo mi pareja, nadie, sin sesión/pareja |
| `NextVisitCard` | Cuenta regresiva destacada (`src/features/events/components/`): `Card` ficha (tilt `tiltFor`) con los días en `hero` a mano subrayados con `Doodle`, la unidad `title`, título con emoji de la pareja a mano y la fecha en `Stamp` ink; "Hoy" cuando es el día | `countdown`, `heading`, `onPress` | normal, presionada |
| `CountdownRow` | Renglón de "Lo que viene" / "Ya pasaron": título a mano, "en N días", fecha en `mono` y nota sutil (`caption`: "Sale de su aniversario", "Se repite cada año"); las propias son tocables con icono `pencil`, las automáticas no | `countdown`, `onPress`, `trailing`, `note` | normal, presionado |
| `CountdownsScreen` / `EventEditor` | Pantallas `/events` (visita destacada o invitación "¿Cuándo se vuelven a ver?", lo que viene, ya pasaron) y `/events/edit` (`?id=` editar, `?kind=visit`): `Input`, emoji opcional, `Toggle`s "Es una visita" y "Se repite cada año" (oculto en visitas), `DateField`, nota; borrar con `Alert` "¿Arrancar esta hoja?" | — | cargando, error, vacío |
| `CountdownHomeCard` / `EventsEvents` | Inicio: la visita (o la cuenta más próxima) en `NextVisitCard` con acceso a `/events`, o invitación a apuntar la visita; `EventsEvents` monta el Realtime de `events` sin UI | — | cargando (`LoadingLines`), vacío |
| `Tally` | Conteo a mano con palitos (`src/components/Tally.tsx`): grupos de cinco con su tachón en pluma; los marcados en tinta (`tone` `chile` para intentos gastados) y los pendientes en lápiz tenue. El progreso de una ronda ("3 de 10") y los intentos del reto de dibujo. `TallyLine` le suma una etiqueta `small` | `total`, `count`, `tone`, `accessibilityLabel` | normal, completo |
| `Checkbox` | Casilla dibujada a pluma (cuadrito de tinta con trazo irregular; tachada, palomita Jamaica y tinta tenue), área táctil 44×44; `role=checkbox` | `checked`, `onPress`, `accessibilityLabel` | normal, tachada, presionada, deshabilitada |
| `ListsView` | Pantalla `/lists` (desde Más → Listas): `PageHeader` con `Stamp` "3 LISTAS" y sticker `plus`, `Card`s apiladas con `tiltFor(id, 1)` (emoji + título a mano, "Súper · 3 de 8" y renglón de avance en tinta, Nopal al completarse); `ListEditorSheet` para crear | — | carga (`LoadingLines`), error (`CloudOff` + Reintentar), vacío (`PencilNote` con humor), jalar para refrescar |
| `ListDetail` | Pantalla `/lists/<id>`: acciones (`list` acomodar, `pencil` editar, `trash` arrancar con `Sheet`), sello del tipo + avance, título, renglones separados por renglón punteado de cuaderno (`Checkbox` + texto Figtree; tachado = línea y tinta seca + "Lo tachó Caleb"), tachados abajo con "Borrar los tachados", y al pie el `Input` para agregar renglones seguidos (enter agrega y deja abierto). Tocar el texto lo edita en el renglón. "Acomodar" muestra flechas subir/bajar de 44 dp (el arrastre en una lista con renglones de alto variable dentro de un scroll es frágil) | — | carga, error, no encontrada, vacía ("Una hoja en blanco"), acomodando |
| `ListEditorSheet` | `Sheet` para crear/editar una lista: título (`Input`), tipo en `Chip`s de cinta alternando canario/menta y emoji opcional | `list` (edita) · sin `list` (crea) | error del servidor en `chile` |
| `GamesHub` / `GameRoundView` / `DrawingView` | Fase 9 (`src/features/games/components/`, rutas `/games`, `/game/<id>`, `/drawing/<id>`): hub con "Te toca" y cinco fichas apiladas (`Card` tilt ±1 + `Chip` de cinta; picante en rosa; `Sheet` con cómo se juega), ronda con la pregunta en ficha que se "pega", respuestas como papelitos `postit` y `Tally`; resultados con `hero` + `Doodle circle`, renglones con palomita Nopal en coincidencias; reto de dibujo con `Note` de la palabra, `DrawingPad`, hoja del dibujo, pista en `Stamp`, intentos tachados y `SealOverlay` "¡ADIVINASTE!" | — | carga, error (`CloudOff`), vacío, no encontrada, jugando, esperando, terminada |
| `VisitsScreen` / `VisitEditor` / `VisitCalendar` | Fase 11B (`src/features/visits/components/`, rutas `/visits` y `/visits/edit`, `?id=` editar, `?eventId=` prellena desde una cuenta regresiva): `PageHeader` con `Stamp` "N VISITAS" y sticker `plus`; arriba a mano "Están juntos" o "N días sin verse" y, si hay próxima visita, enlace `ghost` "Faltan N días" a `/events`; días juntos en `hero` con `Doodle underline` y la proporción en `body`; `VisitCalendar` = el año como página de cuaderno (12 mini meses en 3 columnas, casilla ≤ 14 dp, semana desde lunes; juntos en Jamaica, hoy con contorno de tinta, futuro solo cuadrícula) con `Chip`s para cambiar de año; `Note` "¿Ya se vieron el 12 de oct?" + "Apuntarla" por cada cuenta regresiva pasada sin visita; fichas (`Card` tilt `tiltFor(id, 1)`) con `Stamp` del rango, días a mano, lugar con `pin` y nota; "En números" en renglones Figtree. El editor: `DateField`s Llegada/Despedida (o "Fue un solo día" con `Toggle`), lugar, nota con contador, "Apuntar visita" a la izquierda, `SealOverlay` "APUNTADA", errores por campo y borrar con "¿Arrancar esta hoja?" | — | carga (`LoadingLines`), error (`CloudOff` + Reintentar), vacío con humor, no encontrada, jalar para refrescar |
| `GridScore` | Fase 11B (`src/components/GridScore.tsx`): puntos como cuadritos de la cuadrícula del cuaderno, coloreados (`value` de `total` casillas; `tone` `jamaica` · `nopal` · `ink`); sustituye a las barras de progreso, nunca se usan barras de dashboard | `tone` | — |
| `LoveLanguages` | Fase 11B (`src/features/love-languages/components/`, rutas `/love-languages` y `/love-languages/quiz`): inicio con `PageHeader` (sello TEST), explicación de los cinco idiomas y, según el estado, invitación (`Note` "Ale ya lo hizo…" sin revelar nada), aviso a la pareja o resultados; test con una pregunta por pantalla (`Card` "¿Qué te llega más?" que se pega, dos papelitos `postit`/menta como en `GameRoundView`, `Tally`, "Pregunta anterior", `Sheet` de confirmación al salir y `SealOverlay` "LISTO"); resultados con el lenguaje principal en `title` a mano y cinco `GridScore` de 12 casillas (Jamaica para ti, Nopal para tu pareja), comparación en `title`, y "Cómo querer a Ale en su idioma" en `Card` + `Note` sin cinta | — | carga (`LoadingLines`), error (`CloudOff` + Reintentar), nadie lo ha hecho, pareja ya lo hizo, yo sí / pareja no, los dos |
| `GridColumns` | Fase 11B (`src/components/GridColumns.tsx`): gráfica de columnas hecha de cuadritos de la cuadrícula del cuaderno coloreados (`columns` `{label, value}`, `rows` casillas de alto, escala si hay más; etiqueta en `caption` debajo; `tone` `jamaica` · `nopal` · `ink`); sin ejes ni barras de dashboard | `tone` | — |
| `StatsScreen` | Fase 11B (`src/features/stats/components/`, ruta `/stats`, desde Más → Estadísticas): `PageHeader` (sello "DESDE 12 MAR 2026"), secciones escritas en la hoja con título `title` a mano separadas por `Divider`: Preguntas (días que contestaron los dos en `hero` con un `Doodle underline`), Racha (flama Cempasúchil), Juegos (`GridScore` por juego), Memorias por mes (`GridColumns` de 12 meses), Visitas, Lenguajes del amor y cierre con stories y moods; ceros con copy amable | — | carga (`LoadingLines`), error (`cloudOff` + Reintentar), jalar para refrescar |

## 8. Patrones de pantalla

- **Encabezado:** a la izquierda, `Stamp` con la fecha (o folio); debajo, título `display` a mano.
  Acciones a la derecha como `IconButton`. Sin barra de navegación con fondo.
- **Inicio (Fase 2):** página de diario: avatares como polaroids con mood en sticker, número de
  días `hero` con `Doodle underline`, racha en `Note`, distancia en `Card`, pregunta del día en
  `Card` tocable.
- **Preguntas (Fase 3):** categorías como renglones con `Chip` de cinta (canario/menta alternan por categoría; rosa solo para picantes, con `lock` si no están activas), racha como número `hero` con `Doodle`, días por reparar como `Stamp` tocables, historial como fichas apiladas.
- **Stories (Fase 6):** pestaña con la story más nueva de tu pareja como `Polaroid` grande (sello NUEVA, "Ale · hace 2 h · quedan 22 h") y las tuyas como polaroids chicas con tilt y "Visto por Ale"; botón primario "Pegar una story" abre un `Sheet` de `ListRow` (foto, galería, texto, dibujo). Crear y ver son pantallas completas sin encabezado; el visor es siempre "de noche" (la libreta bajo la lámpara) y las stories se re-iluminan con la paleta nocturna. "Mi archivo": galería de polaroids en 2 columnas con tilt alternado agrupada por mes con `Stamp`. Inicio lleva `StoriesRow`.
- **Memorias (Fase 7):** pestaña con botón primario "Pegar una memoria" arriba, `Chip`s "Diario | Mapa" y, en Diario, polaroids en 2 columnas agrupadas por mes con `Stamp` (la derecha baja para que no parezca tabla). El Mapa es el de Google en Android con key y, si no, el "mapa de papel" (hoja cuadriculada con pines Jamaica y ruta punteada); las memorias sin lugar se cuentan en una línea. El detalle es una página: acciones arriba, sello y título, un solo carrusel de fotos grandes con marco y cinta, texto de lectura recto, lugar con mini mapa. Crear/editar es pantalla completa sin encabezado de sello (como las stories): rejilla de fotos reordenable arrastrando, la primera es la portada. Inicio suma `OnThisDayCard` ("Un día como hoy") solo cuando hay memorias de ese día.
- **Juegos (Fase 9):** pestaña Preguntas con una ficha "Juegos"; el hub es una página con "Te toca" arriba, fichas apiladas por juego y "Últimas rondas" como renglones con sello de fecha y % a mano. Jugar es una ficha grande por pregunta con dos papelitos de respuesta y palitos de avance.
- **Estadísticas (Fase 11B):** página de diario sin tableros ni tiles: secciones escritas con título a mano y renglones Figtree, un solo garabato (el `hero` de los días que contestaron los dos), gráfica de memorias con cuadritos de la cuadrícula (`GridColumns`) y frases a mano ("Coinciden en el 72 % de los juegos").
- **Listas:** fichas apiladas (`Card`, tilt ±1) o renglones con `Divider`. Nunca cuadrícula de
  tarjetas idénticas.
- **Galerías:** polaroids en 2 columnas con tilt alternado y separación generosa (16 dp).
- **Formularios:** `Input` de renglón con etiqueta a mano; botón primario al final, alineado a
  la izquierda (como firma), no a todo lo ancho salvo en onboarding.
- **Navegación por pestañas (Fase 1+):** fondo `paper`, línea superior punteada `inkMuted`,
  etiquetas `handSmall`, activo en `jamaica`, iconos del set (`TabBar`, `TAB_ICONS`).
- **Carga:** renglones que se escriben solos (líneas `ruled` que se dibujan) o lápiz garabateando.
  Nada de spinners genéricos salvo dentro de botones pequeños.
- **Vacío:** `EmptyState` con humor y una acción clara. "Esperando a tu pareja": ilustración `WaitingIllustration` (dos tazas, una vacía).
- **Auth y onboarding:** formularios con `Input`/`DateField` y botón primario a todo lo ancho; el código de pareja se muestra con `InviteCode` y se escribe con `CodeInput`; la foto se elige con `AvatarPicker`.
- **Más / ajustes:** lista de `ListRow` sin fichas; la acción destructiva (cerrar sesión) al final, en Chile.
- **Error:** `EmptyState` con ilustración `cloudOff`, mensaje §6 y botón "Reintentar".

## 9. Prohibido

- Degradados morado-azul (y degradados en general), *glassmorphism*, blur decorativo.
- Tarjetas blancas idénticas con sombra suave en cuadrícula; layouts de "dashboard SaaS".
- Inter/Roboto/fuente del sistema como tipografía visible.
- Emojis como iconos del sistema; iconos de librería sin redibujar.
- Ilustraciones 3D o de stock; fotos de stock.
- Corazones rosa chicle como única idea visual.
- Más de 3 adornos (cinta, sticker, garabato) por pantalla; adornos sin significado.
- Inclinaciones aleatorias en cada render; texto de lectura inclinado > 1.5°.
- Colores, tamaños o sombras literales en pantallas (todo sale de `useTheme()`).
- Copy genérico ("¡Bienvenido a tu experiencia!", "Oops!", "Usuario").
- Spinners genéricos a pantalla completa.

## 10. Checklist de revisión (cada pantalla, claro y oscuro)

- [ ] Fondo `Paper` correcto y texto respetando el margen (gutter izquierdo 44 dp).
- [ ] Cada objeto con fondo/sombra es un objeto reconocible (ficha, polaroid, post-it…).
- [ ] Letra a mano solo en títulos y en lo "escrito por alguien"; lectura en Figtree.
- [ ] Un solo acento de acción (Jamaica); Cempasúchil/Nopal/Chile solo con su significado.
- [ ] ≤ 3 adornos; inclinaciones de `tiltFor`, texto de lectura recto.
- [ ] Iconos del set propio; ningún emoji como icono.
- [ ] Estados de carga, vacío y error diseñados.
- [ ] Movimiento con significado y respeta "reducir movimiento"; háptica solo en momentos clave.
- [ ] Copy en español de México, cálido y claro (§6).
- [ ] Contraste ≥ 4.5:1 en texto; áreas táctiles ≥ 44×44 dp.
- [ ] Capturas de `npm run shots` revisadas en claro y oscuro.

## 11. Ícono y splash

- **Ícono (provisional):** polaroid inclinada (−8°) con escena de cerro y sol, cinta Cempasúchil
  arriba, sobre cuadrícula de cuaderno. Adaptativo: fondo = cuadrícula sobre `Cuaderno`; frente =
  polaroid; monocromo = silueta de la polaroid.
- **Splash:** fondo `Cuaderno` (`#F7F4EC`; noche `#23201B`) con la polaroid del ícono al centro.
- Fuentes de los assets en `assets/brand/*.svg`; los PNG se regeneran con
  `npm run brand` (`scripts/gen-brand-assets.mjs`).
