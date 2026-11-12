import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components';
import { useCouple } from '@/features/couple';
import { AddQuestionForm } from '@/features/questions/components/AddQuestionForm';
import { CustomQuestionList } from '@/features/questions/components/CustomQuestionList';
import { spicyState } from '@/lib/questions';
import { useTheme } from '@/theme';

/** Agregar una pregunta propia y ver/retirar las que ya agregaron. */
export default function AddQuestionScreen() {
  const { spacing } = useTheme();
  const { members, me } = useCouple();
  const spicyActive = spicyState(members, me?.id ?? '').active;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxl }}>
        <ScreenHeader title="Agregar pregunta" back="Preguntas" />
        <AddQuestionForm spicyActive={spicyActive} />
        <CustomQuestionList />
      </View>
    </Screen>
  );
}
