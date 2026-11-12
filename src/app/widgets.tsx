import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, Notice, Screen, ScreenHeader, Text, useToast } from '@/components';
import { PREVIEW_SIZE, WidgetPreview } from '@/components/widget-preview';
import { pinWidget } from '@/components/widget-preview/requestPin';
import { APP_NAME } from '@/constants/app';
import { useCouple } from '@/features/couple';
import { coupleDayZone } from '@/lib/coupleDay';
import { detectTimeZone } from '@/lib/timezone';
import { previewModel } from '@/lib/widgetPreview';
import { WIDGET_NAMES, type WidgetName } from '@/lib/widgets';
import { useTheme } from '@/theme';

const STEPS = [
  'Mantén presionado un espacio vacío de tu pantalla de inicio.',
  `Elige “Widgets” y busca ${APP_NAME}.`,
  'Arrastra el widget que quieras a tu pantalla.',
  'Cada widget ocupa un solo cuadro: acomoda los que quieras sobre tu fondo de pantalla.',
];

const INFO: Record<WidgetName, { title: string; text: string }> = {
  DaysTogether: {
    title: 'Días juntos',
    text: 'El conteo de su historia. Toca para abrir el inicio.',
  },
  PartnerMood: {
    title: 'Mood de tu pareja',
    text: 'Cómo se siente, justo ahora. Toca para ver los moods de los dos.',
  },
  Countdown: {
    title: 'La próxima vez',
    text: 'Una media luna que se llena conforme se acerca lo próximo: su visita, su aniversario o sus cumples.',
  },
  PartnerStory: {
    title: 'Story de tu pareja',
    text: 'Lo último que subió tu pareja: foto, nota o dibujo. Toca para verla completa.',
  },
  Distance: {
    title: 'Distancia',
    text: 'A cuántos kilómetros están ahorita. Solo se ve si los dos activan su distancia.',
  },
  Streak: {
    title: 'Racha',
    text: 'Cuántos días seguidos llevan contestando la pregunta del día. Toca para contestar.',
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
        ? { message: 'Confirma en tu pantalla de inicio para agregarlo.', tone: 'success' }
        : {
            message: 'Tu celular no deja agregarlo desde aquí. Hazlo con el paso a paso de arriba.',
            tone: 'info',
          },
    );
  };

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="h3" accessibilityRole="header">
          {info.title}
        </Text>
        <Text variant="note" tone="muted">
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
        <Button
          title="Agregar a mi pantalla"
          variant="secondary"
          icon="plus"
          loading={pinning}
          onPress={add}
          fullWidth
        />
      ) : (
        <Text variant="note" tone="muted">
          Los widgets se agregan desde el celular.
        </Text>
      )}
    </Card>
  );
}

export default function WidgetsScreen() {
  const { spacing, colors, radius } = useTheme();
  const { couple, me, partner } = useCouple();
  const model = previewModel({
    anniversary: couple?.anniversary_date,
    timezone: couple
      ? coupleDayZone([detectTimeZone(), partner?.timezone], couple.timezone)
      : undefined,
    meName: me?.nickname || me?.display_name,
    meBirthday: me?.birthday,
    partnerName: partner?.nickname || partner?.display_name,
    partnerBirthday: partner?.birthday,
  });

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xl }}>
        <ScreenHeader title="Widgets" back="Más" />

        <View style={{ gap: spacing.lg }}>
          {STEPS.map((step, i) => (
            <View
              key={step}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="bodyStrong">{i + 1}</Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Notice>
          Se actualizan solos más o menos cada 30 minutos, al abrir la app y cuando tu pareja cambia
          su mood o sube una story.
        </Notice>

        <View style={{ gap: spacing.lg }}>
          {WIDGET_NAMES.map((name) => (
            <WidgetCard key={name} name={name} model={model} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
