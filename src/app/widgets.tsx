import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, IconButton, Note, PageHeader, Screen, Text, useToast } from '@/components';
import { PREVIEW_SIZE, WidgetPreview } from '@/components/widget-preview';
import { pinWidget } from '@/components/widget-preview/requestPin';
import { useCouple } from '@/features/couple';
import { previewModel } from '@/lib/widgetPreview';
import { tiltFor } from '@/lib/tilt';
import { WIDGET_NAMES, type WidgetName } from '@/lib/widgets';
import { useTheme } from '@/theme';

const STEPS = [
  'Mantén presionado un espacio vacío de tu pantalla de inicio.',
  'Elige “Widgets” y busca App Parejas.',
  'Arrastra el widget que quieras a tu pantalla.',
  'Para el tamaño mediano, mantenlo presionado y estira los bordes hasta que ocupe 4 columnas.',
];

const INFO: Record<WidgetName, { title: string; text: string }> = {
  DaysTogether: {
    title: 'Días juntos',
    text: 'El conteo de su historia, escrito a mano. Toca para abrir el inicio.',
  },
  PartnerMood: {
    title: 'Mood de tu pareja',
    text: 'Cómo se siente, justo ahora. Toca para ver los moods de los dos.',
  },
  Countdown: {
    title: 'Cuenta regresiva',
    text: 'Lo próximo que viene: su aniversario, sus cumples y sus hitos.',
  },
  PartnerStory: {
    title: 'Story de tu pareja',
    text: 'Lo último que pegó tu pareja, foto, nota o dibujo. Toca para verla completa.',
  },
};

function WidgetCard({ name, model }: { name: WidgetName; model: ReturnType<typeof previewModel> }) {
  const { spacing } = useTheme();
  const toast = useToast();
  const [pinning, setPinning] = useState(false);
  const info = INFO[name];

  const add = async () => {
    setPinning(true);
    const ok = await pinWidget(name);
    setPinning(false);
    toast.show(
      ok
        ? { message: 'Confirma en tu pantalla de inicio para pegarlo.', tone: 'success' }
        : {
            message: 'Tu celular no deja agregarlo desde aquí. Hazlo con el paso a paso de arriba.',
            tone: 'info',
          },
    );
  };

  return (
    <Card tilt={tiltFor(name, 1)} style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" accessibilityRole="header">
          {info.title}
        </Text>
        <Text variant="small" tone="muted">
          {info.text}
        </Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        <WidgetPreview
          name={name}
          model={model}
          width={PREVIEW_SIZE.width}
          height={PREVIEW_SIZE.height}
        />
      </View>
      {Platform.OS === 'android' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            title="Agregar a mi pantalla"
            variant="secondary"
            icon="plus"
            loading={pinning}
            onPress={add}
          />
        </View>
      ) : (
        <Text variant="caption" tone="muted">
          Los widgets se agregan desde el celular.
        </Text>
      )}
    </Card>
  );
}

export default function WidgetsScreen() {
  const { spacing, colors } = useTheme();
  const router = useRouter();
  const { couple, me, partner } = useCouple();
  const model = previewModel({
    anniversary: couple?.anniversary_date,
    timezone: couple?.timezone,
    meName: me?.nickname || me?.display_name,
    meBirthday: me?.birthday,
    partnerName: partner?.nickname || partner?.display_name,
    partnerBirthday: partner?.birthday,
  });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ alignItems: 'flex-start', marginLeft: -spacing.sm }}>
            <IconButton name="back" accessibilityLabel="Volver" onPress={() => router.back()} />
          </View>
          <PageHeader stamp="Widgets" title="Cómo agregar widgets" />
        </View>

        <View style={{ gap: spacing.md }}>
          {STEPS.map((step, i) => (
            <View key={step} style={{ flexDirection: 'row', gap: spacing.md }}>
              <Text variant="title" tone="jamaica" style={{ width: 24 }}>
                {i + 1}
              </Text>
              <Text variant="body" style={{ flex: 1 }}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Note tape={false} tilt={-1}>
          <Text variant="small" style={{ color: colors.onPostit }}>
            Se actualizan solos más o menos cada 30 minutos, al abrir la app y cuando tu pareja
            cambia su mood o pega una story.
          </Text>
        </Note>

        <View style={{ gap: spacing.lg }}>
          {WIDGET_NAMES.map((name) => (
            <WidgetCard key={name} name={name} model={model} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
