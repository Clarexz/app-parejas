import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  Avatar,
  AvatarPicker,
  Button,
  Card,
  Checkbox,
  Chip,
  CloudOff,
  CodeInput,
  DateField,
  PermissionNote,
  SoftAskNote,
  TimeField,
  Divider,
  Doodle,
  EmptyPolaroid,
  EmptyState,
  FoldedNote,
  Icon,
  IconButton,
  ICON_NAMES,
  Input,
  InviteCode,
  ListRow,
  Note,
  PencilNote,
  Polaroid,
  Scene,
  Screen,
  Sheet,
  Stamp,
  Sticker,
  TabBar,
  type TabBarProps,
  Tally,
  Tape,
  Text,
  useToast,
  WaitingIllustration,
} from '@/components';
import { StoriesRowView, StoryFrame, StoryProgress } from '@/features/stories';
import { formatStampDate } from '@/lib/stampDate';
import { useTheme, type Colors, type TypeVariant } from '@/theme';

// Catálogo de diseño (DISENO §7): ruta oculta, solo para revisar el sistema en claro y oscuro.

const SWATCHES: { token: keyof Colors; name: string }[] = [
  { token: 'paper', name: 'Cuaderno' },
  { token: 'paperRaised', name: 'Ficha' },
  { token: 'ink', name: 'Tinta BIC' },
  { token: 'inkMuted', name: 'Tinta seca' },
  { token: 'inkFaint', name: 'Lápiz' },
  { token: 'grid', name: 'Cuadrícula' },
  { token: 'margin', name: 'Margen' },
  { token: 'ruled', name: 'Renglón' },
  { token: 'jamaica', name: 'Jamaica' },
  { token: 'cempasuchil', name: 'Cempasúchil' },
  { token: 'nopal', name: 'Nopal' },
  { token: 'chile', name: 'Chile' },
  { token: 'postit', name: 'Post-it' },
  { token: 'polaroid', name: 'Polaroid' },
  { token: 'tapeYellow', name: 'Cinta canario' },
  { token: 'tapeMint', name: 'Cinta menta' },
  { token: 'tapePink', name: 'Cinta rosa' },
  { token: 'shadow', name: 'Sombra' },
  { token: 'scrim', name: 'Velo' },
];

const TYPE_SAMPLES: { variant: TypeVariant; sample: string }[] = [
  { variant: 'hero', sample: '1,284' },
  { variant: 'display', sample: 'Nuestra libreta' },
  { variant: 'title', sample: '¿Qué te hizo reír hoy?' },
  { variant: 'hand', sample: 'Te toca, Ale' },
  { variant: 'handSmall', sample: 'cena de viernes' },
  { variant: 'heading', sample: 'Ajustes de ustedes' },
  { variant: 'body', sample: 'Sam y Ale llevan 23 días seguidos contestando.' },
  { variant: 'bodyStrong', sample: 'Ale ya escribió y la dobló.' },
  { variant: 'small', sample: 'Hace 5 minutos' },
  { variant: 'caption', sample: 'Solo lo ven ustedes dos' },
  { variant: 'stamp', sample: 'NUEVO' },
  { variant: 'mono', sample: 'pág. 1,284' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        <Divider />
      </View>
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
    <Text variant="mono" muted>
      {children}
    </Text>
  );
}

/** Props mínimas para ver la TabBar fuera de un navegador (solo catálogo). */
function fakeTabBar(index: number, setIndex: (i: number) => void): TabBarProps {
  const routes = [
    { key: 'index', name: 'index', title: 'Inicio' },
    { key: 'questions', name: 'questions', title: 'Preguntas' },
    { key: 'stories', name: 'stories', title: 'Fotos' },
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

export default function CatalogScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors, spacing, radius, isDark } = useTheme();
  const [folded, setFolded] = useState(false);
  const [ticked, setTicked] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState('Cena');
  const [date, setDate] = useState({ day: '14', month: '', year: '' });
  const [code, setCode] = useState('AB7');
  const [tab, setTab] = useState(0);
  const [time, setTime] = useState('21:00');

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton
          name="back"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Stamp>{formatStampDate(new Date())}</Stamp>
      </View>
      <Text variant="display" accessibilityRole="header">
        Catálogo de diseño
      </Text>
      <Text variant="body" muted>
        Todo el sistema Bitácora de {isDark ? 'noche' : 'día'}, en una sola hoja.
      </Text>

      <Section title="Colores">
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
                  borderWidth: 1,
                  borderColor: colors.ruled,
                  borderRadius: radius.xs,
                }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{name}</Text>
                <Label>{token}</Label>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Tipografía">
        <View style={{ gap: spacing.md }}>
          {TYPE_SAMPLES.map(({ variant, sample }) => (
            <View key={variant}>
              <Label>{variant}</Label>
              <Text variant={variant}>{sample}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Iconos">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
          {ICON_NAMES.map((name) => (
            <View key={name} style={{ width: '25%', alignItems: 'center', gap: spacing.xs }}>
              <Icon name={name} />
              <Text variant="caption" muted numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Botones">
        <Row>
          <Button title="Pegar mi respuesta" />
          <Button title="Deshabilitado" disabled />
          <Button title="Guardando" loading />
        </Row>
        <Row>
          <Button title="Reintentar" variant="secondary" />
          <Button title="Deshabilitado" variant="secondary" disabled />
          <Button title="Guardando" variant="secondary" loading />
        </Row>
        <Row>
          <Button title="Ahora no" variant="ghost" />
          <Button title="Deshabilitado" variant="ghost" disabled />
          <Button title="Guardando" variant="ghost" loading />
        </Row>
        <Row>
          <IconButton name="settings" accessibilityLabel="Ajustes" />
          <IconButton name="settings" accessibilityLabel="Ajustes (deshabilitado)" disabled />
          <IconButton name="plus" variant="sticker" accessibilityLabel="Agregar" />
          <IconButton
            name="plus"
            variant="sticker"
            accessibilityLabel="Agregar (deshabilitado)"
            disabled
          />
        </Row>
      </Section>

      <Section title="Fichas">
        <Card>
          <Text variant="bodyStrong">Ficha lisa</Text>
          <Text variant="small" muted>
            Para datos sueltos, como la distancia entre ustedes.
          </Text>
        </Card>
        <Card variant="ruled" tilt={1}>
          <Text variant="bodyStrong">Ficha de renglones</Text>
          <Text variant="body" muted>
            Para lo que se escribe largo.
          </Text>
        </Card>
        <Card tilt={-1} onPress={() => toast.show({ message: 'Ficha tocada', tone: 'info' })}>
          <Text variant="bodyStrong">Ficha tocable</Text>
          <Text variant="small" muted>
            Presiónala y se levanta.
          </Text>
        </Card>
      </Section>

      <Section title="Objetos">
        <Note id="catalogo-nota">
          <Text variant="hand" style={{ color: colors.onPostit }}>
            No olvides la cena del viernes
          </Text>
        </Note>
        <Note id="catalogo-sin-cinta" tape={false}>
          <Text variant="hand" style={{ color: colors.onPostit }}>
            Post-it sin cinta
          </Text>
        </Note>
        <Row>
          <Polaroid size="S" id="s" caption="Playa" tape="yellow">
            <Scene kind="hill" />
          </Polaroid>
          <Polaroid size="M" id="m" caption="Sam y Ale" date="29 OCT" tape="mint">
            <Scene kind="sea" />
          </Polaroid>
        </Row>
        <Row>
          <Polaroid size="L" id="l" caption="Primer viaje juntos" date="12 MAR" tape="pink">
            <Scene kind="city" />
          </Polaroid>
          <Polaroid size="S" id="t" caption="Tacos" tape="mint">
            <Scene kind="tacos" />
          </Polaroid>
        </Row>
        <Row>
          <Polaroid
            size="M"
            id="cargando"
            caption="Foto que no carga"
            source="https://invalido.invalid/foto.jpg"
          />
          <Polaroid size="M" id="error" caption="Sin foto" />
        </Row>
        <Row>
          <Tape color="yellow" />
          <Tape color="mint" />
          <Tape color="pink" />
        </Row>
        <Row>
          <Stamp tone="jamaica">NUEVO</Stamp>
          <Stamp tone="ink">{formatStampDate(new Date())}</Stamp>
          <Stamp tone="nopal">YA CONTESTÓ</Stamp>
        </Row>
        <Row>
          <Sticker label="Sam" tone="jamaica" />
          <Sticker icon="flame" tone="cempasuchil" />
          <Sticker emoji="😴" tone="postit" />
          <Sticker label="Ale" icon="check" tone="nopal" />
        </Row>
      </Section>

      <Section title="Avatares">
        <Row>
          <Avatar name="Sam" variant="polaroid" size={72} />
          <Avatar name="Ale" variant="polaroid" size={72} mood="😴" />
          <Avatar name="Sam" variant="round" size={72} />
          <Avatar name="Ale" variant="round" size={72} mood="😴" />
        </Row>
      </Section>

      <Section title="Chips">
        <Row>
          <Chip
            label="Cena"
            color="yellow"
            selected={selected === 'Cena'}
            onPress={() => setSelected('Cena')}
          />
          <Chip
            label="Viaje"
            color="mint"
            selected={selected === 'Viaje'}
            onPress={() => setSelected('Viaje')}
          />
          <Chip label="Cita" color="pink" onPress={() => setSelected('Cita')} />
          <Chip label="Pasado" color="pink" disabled />
        </Row>
      </Section>

      <Section title="Inputs">
        <Input label="Tu apodo" placeholder="Escribe algo" />
        <Input label="Tu respuesta" variant="multiline" placeholder="Cuéntale a Ale" />
        <Input label="Correo" defaultValue="sam@ejemplo" error="Ese correo no parece completo." />
        <Input label="Código de pareja" defaultValue="ALE-2910" disabled />
      </Section>

      <Section title="Nota doblada">
        <FoldedNote open={false} lockedLabel="Primero contesta tú">
          <Text variant="body">Nunca se ve</Text>
        </FoldedNote>
        <FoldedNote open={folded} onPress={() => setFolded((v) => !v)}>
          <Text variant="body">Me hizo reír que te quedaras dormido en el cine.</Text>
        </FoldedNote>
        <Row>
          <Button
            title={folded ? 'Doblar' : 'Desdoblar'}
            variant="secondary"
            onPress={() => setFolded((v) => !v)}
          />
        </Row>
      </Section>

      <Section title="Hoja (Sheet)">
        <Row>
          <Button title="Abrir hoja" variant="secondary" onPress={() => setSheet(true)} />
        </Row>
      </Section>

      <Section title="Avisos (Toast)">
        <Row>
          <Button
            title="Info"
            variant="secondary"
            onPress={() => toast.show({ message: 'Ale ya escribió. Te toca.', tone: 'info' })}
          />
          <Button
            title="Éxito"
            variant="secondary"
            onPress={() => toast.show({ message: 'Respuesta pegada', tone: 'success' })}
          />
          <Button
            title="Error"
            variant="secondary"
            onPress={() =>
              toast.show({ message: 'No hay señal. Vuelve a intentar.', tone: 'error' })
            }
          />
        </Row>
      </Section>

      <Section title="Estados vacíos">
        <EmptyState
          illustration={<EmptyPolaroid />}
          title="Hoja en blanco"
          body="Todavía no pegan ninguna foto. La primera siempre sale chueca, y está bien."
          actionLabel="Pegar la primera"
          onAction={() => undefined}
        />
        <EmptyState
          illustration={<PencilNote />}
          title="Nada escrito"
          body="Hoy no han contestado la pregunta."
        />
        <EmptyState
          illustration={<WaitingIllustration />}
          title="Esperando a Ale"
          body="Ya tienen su código. En cuanto Ale lo escriba, empiezan."
          actionLabel="Compartir código"
          onAction={() => undefined}
        />
        <EmptyState
          illustration={<CloudOff />}
          title="Sin señal"
          body="No hay señal con el servidor. Revisa tu internet y vuelve a intentar."
          actionLabel="Reintentar"
          onAction={() => undefined}
        />
      </Section>

      <Section title="Fecha (DateField)">
        <DateField label="Su aniversario" value={date} onChange={setDate} />
        <DateField
          label="Tu cumpleaños"
          value={{ day: '31', month: '02', year: '1995' }}
          onChange={() => undefined}
          error="Esa fecha no existe. Revisa el día y el mes."
        />
        <DateField
          label="Fecha fija"
          value={{ day: '12', month: '03', year: '2021' }}
          onChange={() => undefined}
          disabled
        />
      </Section>

      <Section title="Casilla (Checkbox)">
        <Row>
          <Checkbox
            checked={ticked}
            onPress={() => setTicked((v) => !v)}
            accessibilityLabel="Casilla de muestra"
          />
          <Checkbox checked={false} onPress={() => undefined} accessibilityLabel="Sin tachar" />
          <Checkbox checked disabled onPress={() => undefined} accessibilityLabel="Deshabilitada" />
        </Row>
      </Section>

      <Section title="Palitos (Tally)">
        <Tally total={10} count={3} accessibilityLabel="3 de 10" />
        <Tally total={10} count={10} accessibilityLabel="10 de 10" />
        <Tally total={10} count={4} tone="chile" accessibilityLabel="4 intentos gastados de 10" />
      </Section>

      <Section title="Hora (TimeField)">
        <TimeField label="A qué hora" value={time} onChange={setTime} />
        <TimeField label="Apagado" value="08:45" onChange={() => undefined} disabled />
      </Section>

      <Section title="Permiso de avisos (PermissionNote)">
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
          canAskAgain={false}
          onRequest={() => undefined}
          onOpenSettings={() => undefined}
        />
        <PermissionNote
          status="unavailable"
          canAskAgain={false}
          onRequest={() => undefined}
          onOpenSettings={() => undefined}
        />
      </Section>

      <Section title="Aviso previo (SoftAskNote)">
        <SoftAskNote partnerName="Ale" onAccept={() => undefined} onDismiss={() => undefined} />
      </Section>

      <Section title="Código de invitación">
        <InviteCode code="K7M2QX" onShare={() => undefined} onCopy={() => undefined} />
        <InviteCode code="" loading />
        <CodeInput value={code} onChangeText={setCode} />
        <CodeInput value="ABC23" onChangeText={() => undefined} error="Ese código no existe." />
        <CodeInput value="K7M2QX" onChangeText={() => undefined} disabled />
      </Section>

      <Section title="Foto de perfil (AvatarPicker)">
        <Row>
          <AvatarPicker name="Ale" onPick={() => undefined} />
          <AvatarPicker name="Sam y Ale" variant="couple" onPick={() => undefined} />
        </Row>
        <AvatarPicker name="Sam" loading onPick={() => undefined} />
      </Section>

      <Section title="Renglones (ListRow)">
        <View>
          <ListRow icon="bell" label="Avisos" value="Activados" onPress={() => undefined} />
          <ListRow icon="calendar" label="Nuestra fecha" onPress={() => undefined} />
          <ListRow icon="settings" label="Ajustes de ustedes" onPress={() => undefined} />
          <ListRow
            icon="lock"
            label="Cerrar sesión"
            tone="destructive"
            divider={false}
            onPress={() => undefined}
          />
        </View>
      </Section>

      <Section title="Pestañas (TabBar)">
        <View>
          <TabBar {...fakeTabBar(tab, setTab)} />
        </View>
      </Section>

      <Section title="Stories (StoryFrame, StoriesRow, StoryProgress)">
        <Row>
          <StoryFrame
            width={120}
            story={{ kind: 'text', text: 'Hay café', bg: 'postit', font: 'hand' }}
          />
          <StoryFrame
            width={120}
            story={{
              kind: 'text',
              text: 'Nos vemos a las 8',
              bg: 'jamaica',
              font: 'stamp',
              stickers: [{ e: '🌮', x: 0.5, y: 0.8, s: 1.2, r: 8 }],
            }}
          />
          <StoryFrame
            width={120}
            story={{
              kind: 'drawing',
              bg: 'paper',
              strokes: [{ c: 'jamaica', w: 18, p: [150, 300, 450, 800, 750, 300] }],
            }}
          />
        </Row>
        <StoriesRowView
          myName="Alita"
          partnerName="Caleb"
          mineCount={0}
          partnerCount={2}
          partnerUnseen={1}
          onPressMine={() => {}}
          onPressPartner={() => {}}
        />
        <StoryProgress count={3} index={1} durationMs={60000} paused onComplete={() => {}} />
      </Section>

      <Section title="Garabatos y divisores">
        <Row>
          <View style={{ gap: spacing.xs }}>
            <Text variant="hand">23 días</Text>
            <Doodle kind="underline" width={90} />
          </View>
          <Doodle kind="circle" width={90} />
          <Doodle kind="arrow" width={90} />
          <Doodle kind="star" width={28} />
        </Row>
        <Divider />
        <Divider variant="solid" />
      </Section>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Hoja de ejemplo">
        <Text variant="body">
          Así se ve una hoja que sube desde abajo. Aquí van los ajustes o las opciones.
        </Text>
        <Button title="Listo" onPress={() => setSheet(false)} />
      </Sheet>
    </Screen>
  );
}
