import { memo, useCallback } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { fontFamilyFor } from '../../design/fonts';
import { Button, Typography } from '../../design/primitives';
import { ChevronIcon } from '../../design/primitives/TabIcon';
import { useTheme } from '../../design/ThemeProvider';
import { bidiIsolate } from '../../i18n';
import { chevronPointsLeft } from '../../i18n/layout';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Exercise } from '../../services/database/gymTypes';
import { ExerciseFigure } from './ExerciseFigure';
import {
  EXERCISE_ROW_HEIGHT, exerciseRowIdentityEqual, type ExerciseRowIdentity,
} from './exerciseRows';

export interface ExerciseResultRowProps {
  identity: ExerciseRowIdentity;
  exercise: Exercise;
  edges: ViewStyle;
  divider: boolean;
  onOpen: (id: string) => void;
  onAdd?: (id: string) => void;
  addLabel?: string;
  /** When set, the add control is a checkmark instead of a button. */
  marked?: boolean;
}

function sameRow(previous: ExerciseResultRowProps, next: ExerciseResultRowProps): boolean {
  return exerciseRowIdentityEqual(previous.identity, next.identity)
    && previous.divider === next.divider
    && previous.onOpen === next.onOpen
    && previous.onAdd === next.onAdd
    && previous.addLabel === next.addLabel
    && previous.marked === next.marked
    && previous.edges === next.edges
    && previous.exercise === next.exercise;
}

export const ExerciseResultRow = memo(function ExerciseResultRow({
  identity, exercise, edges, divider, onOpen, onAdd, addLabel, marked,
}: ExerciseResultRowProps) {
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const open = useCallback(() => onOpen(identity.id), [onOpen, identity.id]);
  const add = useCallback(() => { if (onAdd) onAdd(identity.id); }, [onAdd, identity.id]);
  const name = bidiIsolate(language, identity.title);
  return <View style={[edges, { height: EXERCISE_ROW_HEIGHT, overflow: 'hidden' }]}>
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('exerciseRow.open', { name })}
        onPress={open}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space[3] }}>
        <ExerciseFigure exercise={exercise} />
        <View style={{ flex: 1, gap: theme.space[1] }}>
          <Typography bold lines={1}>{identity.title}</Typography>
          <Typography tone="secondary" size="small" lines={1}>{identity.detail}</Typography>
        </View>
        {!onAdd && <ChevronIcon left={chevronPointsLeft('forward', isRTL)}
          color={theme.color.text.secondary} size={theme.space[4]} strokeWidth={theme.size.iconStroke} />}
      </Pressable>
      {onAdd && addLabel && marked === undefined ? <Button label={addLabel} size="sm" variant="secondary"
        accessibilityLabel={t('exerciseRow.addNamed', { name })} onPress={add} /> : null}
      {onAdd && marked !== undefined ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: marked }}
        accessibilityLabel={marked ? t('pick.selected') : (addLabel ?? t('exerciseRow.add'))} onPress={add}
        style={{ width: theme.size.touch.min, height: theme.size.touch.min, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 26, height: 26, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: marked ? theme.color.domain.train : theme.surface.hairline,
          backgroundColor: marked ? theme.color.domain.train : 'transparent',
        }}>
          {marked ? <Text style={{ color: theme.color.on.train,
            fontFamily: fontFamilyFor('Figtree', '700', language === 'ar') }}>✓</Text> : null}
        </View>
      </Pressable> : null}
    </View>
    {divider ? <View style={{ height: 1, backgroundColor: theme.surface.hairline }} /> : null}
  </View>;
}, sameRow);
