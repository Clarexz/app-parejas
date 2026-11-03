import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  Avatar,
  AvatarPicker,
  AnswerCard,
  ArrivalOverlay,
  Button,
  Card,
  Checkbox,
  Chip,
  CodeInput,
  DateField,
  Divider,
  EmptyState,
  FruitDot,
  FruitPicker,
  Icon,
  IconButton,
  ICON_NAMES,
  Input,
  InviteCode,
  ListGroup,
  ListRow,
  LoadingSymbol,
  MoodBubble,
  Notice,
  PermissionNote,
  Screen,
  ScreenHeader,
  Segmented,
  Sheet,
  SoftAskNote,
  StatTile,
  Sticker,
  BrandSymbol,
  TabBar,
  type EmptyArt,
  type TabBarProps,
  Text,
  TimeField,
  Toggle,
  useToast,
  Wordmark,
} from '@/components';
import { FRUITS, FRUIT_KEYS, type FruitKey } from '@/lib/fruits';
import { ThemeProvider, useTheme, type Colors, type TypeVariant } from '@/theme';

// Catálogo de diseño (DISENO §7): ruta oculta, solo para revisar el sistema en claro y oscuro y
// con distintos pares de frutas.

const PAIRS = {
  default: { label: 'Sandía y Mango', me: 'sandia', partner: 'mango' },
  cool: { label: 'Uva y Limón', me: 'uva', partner: 'limon' },
  blue: { label: 'Arándano y Mandarina', me: 'arandano', partner: 'mandarina' },
} as const satisfies Record<string, { label: string; me: FruitKey; partner: FruitKey }>;

type PairKey = keyof typeof PAIRS;

const SWATCHES: { token: keyof Colors; name: string }[] = [
  { token: 'bg', name: 'bg · Hueso / Noche' },
  { token: 'surface', name: 'surface · Arena / Carbón' },
  { token: 'surface2', name: 'surface2 · Arena 2 / Carbón 2' },
  { token: 'ink', name: 'ink · Tinta / Hueso' },
  { token: 'inkMuted', name: 'inkMuted · Grafito / Niebla' },
  { token: 'line', name: 'line · 10 %' },
  { token: 'action', name: 'action · botón principal' },
  { token: 'danger', name: 'danger · Chile' },
  { token: 'success', name: 'success · Nopal' },
  { token: 'scrim', name: 'scrim · velo' },
];

const TYPE_SAMPLES: { variant: TypeVariant; sample: string }[] = [
  { variant: 'display', sample: '12 días' },
  { variant: 'h1', sample: 'Falta menos' },
  { variant: 'h2', sample: '¿Qué te hizo reír hoy?' },
  { variant: 'h3', sample: 'La próxima vez' },
  { variant: 'num', sample: '412' },
  { variant: 'body', sample: 'Ya contestó la pregunta de hoy. Ahora te toca a ti.' },
  { variant: 'bodyStrong', sample: 'Cuentas regresivas' },
  { variant: 'ui', sample: 'Contestar' },
  { variant: 'note', sample: 'hace 5 min · CDMX' },
  { variant: 'label', sample: 'De a dos' },
];

const EMPTY_ARTS: { art: EmptyArt; title: string; body: string }[] = [
  { art: 'symbol', title: 'Aquí irá su primera memoria', body: '¿Cuál sería?' },
  { art: 'heart', title: 'Todavía no hay días juntos', body: 'Pongan su fecha en ajustes.' },
  {
    art: 'bubble',
    title: 'Sin moods por ahora',
    body: 'Cuando alguien cambie el suyo, aparece aquí.',
  },
  { art: 'dome', title: 'Falta una fecha', body: '¿Cuándo se vuelven a ver?' },
  { art: 'spark', title: 'Hoy empieza la racha', body: 'Contesten la pregunta de hoy.' },
  { art: 'circles', title: 'Esperando a que llegue', body: 'En cuanto use el código, aparece.' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.xxl }}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
      {children}
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text variant="note" muted>
      {children}
    </Text>
  );
}

/** Props mínimas para ver la TabBar fuera de un navegador (solo catálogo). */
function fakeTabBar(index: number, setIndex: (i: number) => void): TabBarProps {
  const routes = [
    { key: 'index', name: 'index', title: 'Inicio' },
    { key: 'questions', name: 'questions', title: 'Pregunta' },
    { key: 'stories', name: 'stories', title: 'Stories' },
    { key: 'memories', name: 'memories', title: 'Memorias' },
    { key: 'more', name: 'more', title: 'Más' },
  ];
  return {
    state: { index, routes: routes.map(({ key, name }) => ({ key, name })) },
    descriptors: Object.fromEntries(routes.map((r) => [r.key, { options: { title: r.title } }])),
    emitter: { emit: () => ({ defaultPrevented: false }) },
    navigateToTab: (key: string) => setIndex(routes.findIndex((r) => r.key === key)),
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as TabBarProps;
}

function Catalog({ pair, onPair }: { pair: PairKey; onPair: (p: PairKey) => void }) {
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing, radius, isDark, fruit } = useTheme();
  const [sheet, setSheet] = useState(false);
  const [arrival, setArrival] = useState(false);
  const [chip, setChip] = useState('Cena');
  const [segment, setSegment] = useState<'diario' | 'mapa'>('diario');
  const [toggle, setToggle] = useState(true);
  const [ticked, setTicked] = useState(true);
  const [date, setDate] = useState({ day: '14', month: '', year: '' });
  const [code, setCode] = useState('AB7');
  const [time, setTime] = useState('21:00');
  const [tab, setTab] = useState(0);
  const [picked, setPicked] = useState<FruitKey>(PAIRS[pair].me);
  const partnerFruit = PAIRS[pair].partner;

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <ScreenHeader
          label={`Modo ${isDark ? 'noche' : 'día'}`}
          title="Catálogo"
          back="Volver"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          <Text variant="body" muted>
            Todo el sistema ahorita en una sola pantalla.
          </Text>
          <Segmented
            fullWidth
            accessibilityLabel="Par de frutas"
            value={pair}
            onChange={onPair}
            options={[
              { value: 'default', label: 'Sandía' },
              { value: 'cool', label: 'Uva' },
              { value: 'blue', label: 'Arándano' },
            ]}
          />
        </View>

        <Section title="Símbolo y logo">
          <Row>
            <BrandSymbol size={96} />
            <BrandSymbol size={48} />
            <BrandSymbol size={24} />
            <BrandSymbol size={96} animate="arrive" left="uva" right="limon" />
            <LoadingSymbol />
          </Row>
          <Wordmark size={40} layout="name" />
          <Wordmark size={28} layout="horizontal" />
          <Wordmark size={22} layout="stacked" />
        </Section>

        <Section title="Frutas">
          <Row>
            {FRUIT_KEYS.map((key) => (
              <View key={key} style={{ alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.pill,
                    backgroundColor: FRUITS[key].hex,
                  }}
                />
                <Label>{FRUITS[key].name}</Label>
              </View>
            ))}
          </Row>
          <Row>
            <FruitDot fruit={fruit.me} />
            <Label>tuya</Label>
            <FruitDot fruit={fruit.partner ?? fruit.me} />
            <Label>de tu pareja</Label>
          </Row>
          <FruitPicker
            value={picked}
            partnerFruit={partnerFruit}
            partnerName="Ximena"
            onChange={setPicked}
          />
        </Section>

        <Section title="Color neutro">
          <View style={{ gap: spacing.sm }}>
            {SWATCHES.map(({ token, name }) => (
              <View
                key={token}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <View
                  style={{
                    width: 44,
                    height: 32,
                    backgroundColor: colors[token],
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                />
                <Text variant="note">{name}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Tipografía">
          <View style={{ gap: spacing.md }}>
            {TYPE_SAMPLES.map(({ variant, sample }) => (
              <View key={variant} style={{ gap: spacing.xxs }}>
                <Label>{variant}</Label>
                <Text variant={variant}>{sample}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Íconos">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
            {ICON_NAMES.map((name) => (
              <View key={name} style={{ alignItems: 'center', width: 64, gap: spacing.xs }}>
                <Icon name={name} />
                <Text variant="note" muted numberOfLines={1}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Botones">
          <Row>
            <Button title="Contestar" onPress={() => undefined} />
            <Button title="Cancelar" variant="secondary" onPress={() => undefined} />
            <Button title="Ahora no" variant="ghost" onPress={() => undefined} />
            <Button title="Salir de la pareja" variant="danger" onPress={() => undefined} />
          </Row>
          <Row>
            <Button title="Compartir" icon="send" onPress={() => undefined} />
            <Button title="Chico" size="sm" onPress={() => undefined} />
            <Button title="Deshabilitado" disabled />
            <Button title="Cargando" loading />
          </Row>
          <Button title="Continuar" fullWidth onPress={() => undefined} />
          <Row>
            <IconButton name="plus" accessibilityLabel="Agregar" />
            <IconButton name="plus" variant="filled" accessibilityLabel="Agregar" />
            <IconButton name="settings" variant="soft" accessibilityLabel="Ajustes" />
            <IconButton name="trash" accessibilityLabel="Borrar" disabled />
          </Row>
        </Section>

        <Section title="Chips y segmentos">
          <Row>
            {['Cena', 'Viaje', 'Casa'].map((label) => (
              <Chip
                key={label}
                label={label}
                selected={chip === label}
                onPress={() => setChip(label)}
              />
            ))}
            <Chip label="47 días" icon="spark" iconColor={fruit.me.hex} onPress={() => undefined} />
            <Chip label="Cerrado" disabled onPress={() => undefined} />
          </Row>
          <Segmented
            accessibilityLabel="Vista"
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'diario', label: 'Diario' },
              { value: 'mapa', label: 'Mapa' },
            ]}
          />
        </Section>

        <Section title="Tarjetas">
          <Card>
            <Text variant="label" muted>
              La próxima vez
            </Text>
            <Text variant="h3">Faltan</Text>
            <Text variant="display">12 días</Text>
            <Text variant="note" muted>
              para el sábado 15 nov · CDMX
            </Text>
          </Card>
          <Card tone="me">
            <Text variant="ui">Tu tinte</Text>
            <Text variant="body">Tarjeta con el tinte de tu fruta.</Text>
          </Card>
          <Card tone="partner" onPress={() => toast.show({ message: 'Tarjeta tocada' })}>
            <Text variant="ui">Tinte de tu pareja, tocable</Text>
            <Text variant="note" muted>
              Se achica al presionar.
            </Text>
          </Card>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <StatTile value={412} label="días juntos" icon="love" />
            <StatTile
              value={47}
              label="días de racha"
              icon="spark"
              iconColor={fruit.me.hex}
              onPress={() => toast.show({ message: 'Ficha tocada' })}
            />
          </View>
        </Section>

        <Section title="Personas y moods">
          <Row>
            <Avatar name="Ximena" size={64} fruit={fruit.partner ?? fruit.me} ring newDot />
            <Avatar name="Tú" size={64} fruit={fruit.me} ring />
            <Avatar name="Ale" size={40} />
            <Avatar name="Sam" size={28} />
            <Avatar name="Ale" size={64} mood="😄" />
          </Row>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <MoodBubble
                fruit={fruit.partner ?? fruit.me}
                emoji="😄"
                mood="feliz"
                note={'Ximena · hace 5 min\nAcábate el café antes de salir, que hace frío.'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <MoodBubble fruit={fruit.me} empty onPress={() => undefined} />
            </View>
          </View>
          <MoodBubble fruit={fruit.me} loading />
        </Section>

        <Section title="Respuestas">
          <AnswerCard
            fruit={fruit.partner ?? fruit.me}
            name="Ximena"
            text="Que nos veamos en una semana y no sepamos qué hacer de tanta emoción."
          />
          <AnswerCard fruit={fruit.partner ?? fruit.me} name="Ximena" locked />
          <AnswerCard fruit={fruit.me} name="Tú" text="Una cena larga y caminar sin rumbo." />
        </Section>

        <Section title="Listas y avisos">
          <ListGroup label="De a dos">
            <ListRow icon="countdown" label="Cuentas regresivas" onPress={() => undefined} />
            <ListRow icon="lists" label="Listas" value="3" onPress={() => undefined} />
            <ListRow
              icon="bell"
              label="Avisos"
              right={
                <Toggle value={toggle} onValueChange={setToggle} accessibilityLabel="Avisos" />
              }
            />
          </ListGroup>
          <View style={{ height: spacing.md }} />
          <ListGroup label="Cuenta">
            <ListRow icon="door" label="Cerrar sesión" onPress={() => undefined} />
            <ListRow
              icon="leave"
              label="Salir de la pareja"
              tone="danger"
              onPress={() => undefined}
            />
          </ListGroup>
          <Notice>Ximena todavía no entra. Mientras, pueden ir armando sus listas.</Notice>
          <Notice tone="success">Listo, guardamos su aniversario.</Notice>
          <Notice>
            Faltan <Text variant="bodyStrong">12 días</Text> para su visita.
          </Notice>
          <Notice tone="danger" action={{ label: 'Reintentar', onPress: () => undefined }}>
            No pudimos mandarlo. Tu celular está sin señal; lo intentamos otra vez.
          </Notice>
        </Section>

        <Section title="Campos">
          <Input label="Apodo" placeholder="Cómo te dice tu pareja" />
          <Input icon="search" placeholder="Buscar" accessibilityLabel="Buscar" />
          <Input label="Con error" defaultValue="Ale!!" error="Usa solo letras y espacios." />
          <Input label="Deshabilitado" defaultValue="No se puede editar" disabled />
          <Input label="Tu respuesta" variant="multiline" placeholder="Escribe lo que sientes" />
          <DateField label="Su aniversario" value={date} onChange={setDate} />
          <DateField
            label="Con error"
            value={{ day: '31', month: '02', year: '2026' }}
            onChange={() => undefined}
            error="Esa fecha no existe."
          />
          <TimeField label="Hora del aviso" value={time} onChange={setTime} />
          <CodeInput value={code} onChangeText={setCode} />
          <InviteCode code="ABC234" onShare={() => undefined} onCopy={() => undefined} />
          <InviteCode code="" loading />
          <Row>
            <Checkbox
              checked={ticked}
              onPress={() => setTicked((v) => !v)}
              accessibilityLabel="Tachar"
            />
            <Checkbox checked={false} onPress={() => undefined} accessibilityLabel="Sin tachar" />
            <Checkbox
              size="lg"
              checked={ticked}
              onPress={() => setTicked((v) => !v)}
              accessibilityLabel="Tachar, grande"
            />
            <Toggle value={toggle} onValueChange={setToggle} accessibilityLabel="Interruptor" />
            <Toggle value={false} onValueChange={() => undefined} accessibilityLabel="Apagado" />
            <Toggle value disabled onValueChange={() => undefined} accessibilityLabel="Bloqueado" />
          </Row>
          <AvatarPicker name="Ale" onPick={() => undefined} />
        </Section>

        <Section title="Permisos y avisos previos">
          <PermissionNote
            status="undetermined"
            canAskAgain
            onRequest={() => undefined}
            onOpenSettings={() => undefined}
          />
          <PermissionNote
            status="denied"
            canAskAgain={false}
            onRequest={() => undefined}
            onOpenSettings={() => undefined}
          />
          <PermissionNote
            status="granted"
            canAskAgain
            onRequest={() => undefined}
            onOpenSettings={() => undefined}
          />
          <PermissionNote
            kind="location"
            status="denied"
            canAskAgain={false}
            onRequest={() => undefined}
            onOpenSettings={() => undefined}
          />
          <SoftAskNote
            partnerName="Ximena"
            onAccept={() => undefined}
            onDismiss={() => undefined}
          />
        </Section>

        <Section title="Vacíos">
          {EMPTY_ARTS.map(({ art, title, body }) => (
            <Card key={art}>
              <EmptyState
                art={art}
                title={title}
                body={body}
                action={{ label: 'Empezar', onPress: () => undefined }}
              />
            </Card>
          ))}
        </Section>

        <Section title="Movimiento y feedback">
          <Row>
            <Button
              title="Toast info"
              variant="secondary"
              onPress={() => toast.show({ message: 'Ximena cambió su mood.' })}
            />
            <Button
              title="Toast listo"
              variant="secondary"
              onPress={() => toast.show({ message: 'Guardado', tone: 'success' })}
            />
            <Button
              title="Toast error"
              variant="secondary"
              onPress={() => toast.show({ message: 'No pudimos mandarlo.', tone: 'danger' })}
            />
          </Row>
          <Row>
            <Button title="Abrir hoja" variant="secondary" onPress={() => setSheet(true)} />
            <Button title="Llegada" variant="secondary" onPress={() => setArrival(true)} />
          </Row>
          <Row>
            <Sticker text="te extraño" />
            <Sticker text="ya casi" fruit={fruit.partner ?? fruit.me} size={80} />
          </Row>
        </Section>

        <Section title="Barra de pestañas">
          <View
            style={{
              borderRadius: radius.card,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <TabBar {...fakeTabBar(tab, setTab)} />
          </View>
        </Section>
        <View style={{ marginTop: spacing.xl }}>
          <Divider />
        </View>
      </Screen>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="¿Cómo te sientes?">
        <Text variant="body" muted>
          Así se ve una hoja: radio 28, agarradera y sombra suave.
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button title="Listo" fullWidth onPress={() => setSheet(false)} />
        </View>
      </Sheet>
      {arrival ? (
        <ArrivalOverlay text="Ya contestaron los dos." onDone={() => setArrival(false)} />
      ) : null}
    </View>
  );
}

export default function CatalogScreen() {
  const [pair, setPair] = useState<PairKey>('default');
  return (
    <ThemeProvider fruits={{ me: PAIRS[pair].me, partner: PAIRS[pair].partner }}>
      <Catalog pair={pair} onPair={setPair} />
    </ThemeProvider>
  );
}
