import { memo, useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { pluralForm, weightUnitLabel, type TranslationKey } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { formatEditableNumber } from '../../i18n/editableNumber';
import {
  SET_HOLD_DELETE_MS, commitSetDraft, previousCellText, previousForWorkingSet,
  setMarkGlyph, setRowAccessibilityLabel, setTableColumns, setTablePropsEqual, type PlannedRow, type SetMark,
} from './setTable';
import { suggestionForSlot, type PreviousSet } from './workoutData';
import { fromKg, sideLabel, toKg, type WeightUnit } from './workoutUnits';

export type SetDraft = { weight: string; reps: string; effort: string };
export type LoggedValues = { weight: number; reps: number; effort: string };

/**
 * Compact set table. Placeholders are not saved. Memoised on its own rows, drafts and
 * logged values, so typing in one exercise does not re-render the others. The callbacks must
 * be stable: they take the exercise id instead of closing over it.
 */
export const SetTable = memo(function SetTable({
  exerciseId, rows, history, weightUnit, effort, drafts, loggedValues, repMax, expectedRows, weightStep,
  busy, onDraft, onLog, onUnlog, onCycle, onDelete, onAdd, onReject,
}: {
  exerciseId: string;
  rows: readonly PlannedRow[];
  history: readonly PreviousSet[];
  weightUnit: WeightUnit;
  effort: 'off' | 'rpe' | 'rir';
  drafts: Readonly<Record<string, SetDraft>>;
  loggedValues: Readonly<Record<string, LoggedValues>>;
  repMax: number;
  expectedRows: number;
  weightStep: number;
  busy: boolean;
  onDraft: (key: string, draft: SetDraft) => void;
  onLog: (exerciseId: string, row: PlannedRow, values: { weight: number; reps: number; effort: string }) => void;
  onUnlog: (row: PlannedRow) => void;
  onCycle: (exerciseId: string, row: PlannedRow) => void;
  onDelete: (row: PlannedRow) => void;
  onAdd: (exerciseId: string) => void;
  onReject: (reason: 'weight' | 'reps') => void;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const repsInputs = useRef<Record<string, TextInput | null>>({});
  const columns = setTableColumns({ effort: effort !== 'off', check: true });
  const storedUnit = weightUnit;
  const unitWord = weightUnitLabel(language, storedUnit);
  const headers: Record<(typeof columns)[number], string> = {
    set: t('workout.columnSet'),
    previous: t('workout.columnPrevious'),
    weight: unitWord,
    reps: t('workout.columnReps'),
    effort: t('workout.columnEffort'),
    check: '✓',
  };
  const markColor = (mark: SetMark): string => mark === 'warm-up' ? theme.color.status.warning
    : mark === 'drop' ? theme.color.macro.protein
      : mark === 'failure' ? theme.color.status.danger
        : theme.color.text.primary;
  return <View style={{ gap: theme.space[1] }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[1] }}>
      {columns.map(column => <View key={column} style={columnBox(column)}>
        <Typography size="caption" tone="secondary" lines={1}>{headers[column]}</Typography>
      </View>)}
    </View>
    {rows.map(row => {
      const logged = row.loggedId ? loggedValues[row.loggedId] : undefined;
      const draft = drafts[row.key];
      const previous = row.mark === 'working' ? previousForWorkingSet(history, row.position, row.side) : null;
      const suggestion = logged || row.mark !== 'working' ? null : suggestionForSlot(
        [...history], row.position, row.side, repMax, expectedRows, weightStep,
      );
      const weightText = draft?.weight ?? (logged ? formatEditableNumber(fromKg(logged.weight, weightUnit), 'load') : '');
      const repsText = draft?.reps ?? (logged ? formatEditableNumber(logged.reps, 'count') : '');
      const effortText = draft?.effort ?? logged?.effort ?? '';
      const placeholderWeight = suggestion ? formatEditableNumber(fromKg(suggestion.weight, weightUnit), 'load') : '';
      const placeholderReps = suggestion ? formatEditableNumber(suggestion.reps, 'count') : '';
      const glyph = setMarkGlyph(row.mark, row.workingNumber ?? 0);
      const side = row.side ? sideLabel(row.side, language) : '';
      const setLabel = side ? glyph + ' ' + side : glyph;
      const effectiveWeight = weightText.trim() === '' ? (suggestion?.weight ?? null) : toKg(Number(weightText), weightUnit);
      const effectiveReps = repsText.trim() === '' ? (suggestion?.reps ?? null) : Number(repsText);
      const sentence = setRowAccessibilityLabel({
        language, setLabel, unit: storedUnit, logged: !!logged,
        previousKg: previous?.weight ?? null, previousReps: previous?.reps ?? null,
        weightKg: effectiveWeight !== null && Number.isFinite(effectiveWeight) ? effectiveWeight : null,
        reps: effectiveReps !== null && Number.isInteger(effectiveReps) ? effectiveReps : null,
      });
      const write = (patch: Partial<SetDraft>) => onDraft(row.key, {
        weight: weightText, reps: repsText, effort: effortText, ...patch,
      });
      const check = () => {
        if (logged) { onUnlog(row); return; }
        const committed = commitSetDraft({
          weightText, repsText,
          placeholderWeight: suggestion ? fromKg(suggestion.weight, weightUnit) : null,
          placeholderReps: suggestion?.reps ?? null,
        });
        if (!committed.ok) { onReject(committed.reason); return; }
        onLog(exerciseId, row, { weight: committed.weight, reps: committed.reps, effort: effortText });
      };
      return <View key={row.key} style={{
        flexDirection: 'row', alignItems: 'center', gap: theme.space[1],
        minHeight: theme.size.touch.min, borderRadius: theme.radius.sm,
        backgroundColor: logged ? theme.color.tint.success : 'transparent',
      }}>
        <Pressable accessibilityRole="button" accessibilityLabel={sentence}
          onPress={() => onCycle(exerciseId, row)} onLongPress={() => onDelete(row)} delayLongPress={SET_HOLD_DELETE_MS}
          style={[columnBox('set'), cellHit]}>
          <View style={{ minWidth: 34, minHeight: 30, paddingHorizontal: theme.space[1], borderRadius: theme.radius.sm,
            alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface.control }}>
            <Text maxFontSizeMultiplier={1.4} style={{ color: markColor(row.mark), fontWeight: '600',
              fontSize: theme.type.body.size }}>{glyph}</Text>
            {side ? <Text style={{ color: theme.color.text.tertiary, fontSize: theme.type.caption.size }}>{side}</Text> : null}
          </View>
        </Pressable>
        <Pressable accessibilityRole="button"
          accessibilityLabel={previous
            ? previousCellText(language, previous.weight, previous.reps, weightUnit)
            : t('workout.previousNone')}
          disabled={!previous || !!logged}
          onPress={() => {
            if (!previous) return;
            write({
              weight: formatEditableNumber(fromKg(previous.weight, weightUnit), 'load'),
              reps: formatEditableNumber(previous.reps, 'count'),
            });
          }}
          onLongPress={() => onDelete(row)} delayLongPress={SET_HOLD_DELETE_MS}
          style={[columnBox('previous'), cellHit]}>
          <Typography tone="secondary" size="secondary" lines={1} maxScale={1.4}>
            {previous ? previousCellText(language, previous.weight, previous.reps, weightUnit) : t('workout.noPrevious')}
          </Typography>
        </Pressable>
        {field('weight', weightText, placeholderWeight, 'decimal-pad', t('active.weightUnit', { unit: unitWord }),
          weight => write({ weight }), !!logged, () => repsInputs.current[row.key]?.focus())}
        {field('reps', repsText, placeholderReps, 'number-pad',
          t((`workout.repsSpoken.${pluralForm(language, Number(repsText || placeholderReps) || 0)}`) as TranslationKey, {
            count: repsText || placeholderReps || '0',
          }), reps => write({ reps }), !!logged, undefined, node => { repsInputs.current[row.key] = node; })}
        {effort !== 'off' ? field('effort', effortText, '', 'decimal-pad',
          t(effort === 'rpe' ? 'gymParity.rpeLabel' : 'gymParity.rirLabel'), next => write({ effort: next }), !!logged) : null}
        <Pressable accessibilityRole="button"
          accessibilityLabel={t(logged ? 'workout.unlogCheck' : 'workout.logCheck', { set: setLabel })}
          accessibilityState={{ disabled: busy, checked: !!logged }} disabled={busy} onPress={check}
          style={[columnBox('check'), cellHit]}>
          <View style={{ width: 44, height: 40, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center',
            backgroundColor: logged ? theme.color.status.success : theme.color.bg.raised }}>
            <Text style={{
              color: logged ? theme.color.bg.surface : theme.color.text.tertiary,
              fontWeight: '600', fontSize: theme.type.body.size,
            }}>✓</Text>
          </View>
        </Pressable>
      </View>;
    })}
    <Button label={t('workout.addSet')} accessibilityLabel={t('workout.addSet')} size="sm" variant="neutral"
      fullWidth onPress={() => onAdd(exerciseId)} />
  </View>;

  function field(
    column: 'weight' | 'reps' | 'effort', value: string, placeholder: string,
    keyboard: 'decimal-pad' | 'number-pad', label: string, onChange: (value: string) => void,
    done: boolean, onSubmit?: () => void, inputRef?: (node: TextInput | null) => void,
  ) {
    return <View style={columnBox(column)}>
      <TextInput ref={inputRef} value={value} placeholder={placeholder} onChangeText={onChange}
        onSubmitEditing={onSubmit} keyboardType={keyboard} returnKeyType={onSubmit ? 'next' : 'done'}
        accessibilityLabel={label} placeholderTextColor={theme.color.text.tertiary}
        maxFontSizeMultiplier={1.4}
        style={{
          width: '100%', minHeight: theme.size.touch.min, borderRadius: theme.radius.sm, textAlign: 'center',
          backgroundColor: done ? theme.color.tint.success : theme.color.bg.raised,
          color: theme.color.text.primary,
          fontWeight: '600', fontSize: theme.type.body.size,
          fontVariant: ['tabular-nums'],
        }} />
    </View>;
  }
}, setTablePropsEqual);

const cellHit = { minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const };

function columnBox(column: string): { width?: number; flex?: number; alignItems: 'center' } {
  if (column === 'set' || column === 'check') return { width: 48, alignItems: 'center' };
  if (column === 'previous') return { flex: 1.15, alignItems: 'center' };
  if (column === 'effort') return { flex: 0.75, alignItems: 'center' };
  return { flex: 1, alignItems: 'center' };
}
