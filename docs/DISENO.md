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
  `cloudOff` (sin conexión), `heart` (solo para "pienso en ti" y reacciones, nunca decorativo).
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
| `Screen` | Contenedor de pantalla con `Paper`, safe area y gutters | `scroll` sí/no, `paper` | — |
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
| `Divider` | Línea a mano punteada | `dashed` · `solid` | — |
| `Icon` | Icono del set §3 | `name`, `size`, `color` | — |
| `DateField` | Fecha como sello de fechador: 3 casillas DD / MM / AAAA en Courier Prime 700, etiqueta a mano; solo captura dígitos y salta el foco (no valida) | `label` | foco (borde Jamaica 2 dp), error (borde y mensaje `chile`), deshabilitado |
| `InviteCode` | Código de 6 caracteres como boleto con cinta canario, agrupado "ABC 234" en Courier Prime 700 grande; botón de compartir y copiar opcionales | `onShare`, `onCopy`, `shareLabel` | `loading` (casillas punteadas vacías) |
| `CodeInput` | 6 casillas para escribir el código (una `TextInput` transparente encima); mayúsculas, ignora espacios/guiones, alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` | `value`, `onChangeText` | activa (Jamaica), error, deshabilitado |
| `AvatarPicker` | Polaroid grande (L) con inicial a mano y sticker de cámara para elegir foto | `person` · `couple` | sin foto, con foto, `loading` (se "revela" con pulso) |
| `TabBar` | Barra de pestañas para `Tabs` de expo-router (`tabBar`); `TAB_ICONS` mapea ruta → icono | — | activa (Jamaica), presionada |
| `ListRow` | Renglón tocable (icono + texto Figtree + flecha) separado por `Divider`, para "Más" y ajustes | `default` · `destructive` (Chile, sin flecha); `value`, `divider` | normal, presionado, deshabilitado |

## 8. Patrones de pantalla

- **Encabezado:** a la izquierda, `Stamp` con la fecha (o folio); debajo, título `display` a mano.
  Acciones a la derecha como `IconButton`. Sin barra de navegación con fondo.
- **Inicio (Fase 2):** página de diario: avatares como polaroids con mood en sticker, número de
  días `hero` con `Doodle underline`, racha en `Note`, distancia en `Card`, pregunta del día en
  `Card` tocable.
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
