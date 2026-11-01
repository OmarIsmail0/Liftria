import { Pressable, Text, TextInput, View } from 'react-native';
import { Typography } from '../../design/primitives';
import { fontFamilyFor } from '../../design/fonts';
import { useTheme } from '../../design/ThemeProvider';
import { pluralForm, weightUnitLabel, type TranslationKey } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { formatEditableNumber } from '../../i18n/editableNumber';
import {
  SET_HOLD_DELETE_MS, commitSetDraft, previousCellText, previousForWorkingSet,
  setMarkGlyph, setRowAccessibilityLabel, setTableColumns, type PlannedRow, type SetMark,
} from './setTable';
import { suggestionForSlot, type PreviousSet } from './workoutData';
import { fromKg, sideLabel, toKg, type WeightUnit } from './workoutUnits';

export type SetDraft = { weight: string; reps: string; effort: string };
export type LoggedValues = { weight: number; reps: number; effort: string };

/** Compact SET · PREVIOUS · weight · REPS · ✓ table. Placeholders are not saved. */
export function SetTable({
  rows, history, weightUnit, effort, drafts, loggedValues, repMax, expectedRows, weightStep,
  busy, onDraft, onLog, onUnlog, onCycle, onDelete, onAdd, onReject,
}: {
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
  onLog: (row: PlannedRow, values: { weight: number; reps: number; effort: string }) => void;
  onUnlog: (row: PlannedRow) => void;
  onCycle: (row: PlannedRow) => void;
  onDelete: (row: PlannedRow) => void;
  onAdd: () => void;
  onReject: (reason: 'weight' | 'reps') => void;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const repsInputs: Record<string, TextInput | null> = {};
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
        <Typography size="label" tone="tertiary" lines={1}>{headers[column]}</Typography>
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
        onLog(row, { weight: committed.weight, reps: committed.reps, effort: effortText });
      };
      return <View key={row.key} style={{
        flexDirection: 'row', alignItems: 'center', gap: theme.space[1],
        minHeight: theme.size.touch.min, borderRadius: theme.radius.sm,
        backgroundColor: logged ? theme.color.tint.train : 'transparent',
      }}>
        <Pressable accessibilityRole="button" accessibilityLabel={sentence}
          onPress={() => onCycle(row)} onLongPress={() => onDelete(row)} delayLongPress={SET_HOLD_DELETE_MS}
          style={[columnBox('set'), cellHit]}>
          <View style={{ minWidth: 34, minHeight: 30, paddingHorizontal: theme.space[1], borderRadius: theme.radius.sm,
            alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface.control }}>
            <Text style={{ color: markColor(row.mark), fontFamily: fontFamilyFor('Figtree', '700', language === 'ar'),
              fontSize: theme.type.body.size }}>{glyph}</Text>
            {side ? <Text style={{ color: theme.color.text.tertiary, fontSize: theme.type.label.size }}>{side}</Text> : null}
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
          <Typography tone="tertiary" size="small" lines={1}>
            {previous ? previousCellText(language, previous.weight, previous.reps, weightUnit) : t('workout.noPrevious')}
          </Typography>
        </Pressable>
        {field('weight', weightText, placeholderWeight, 'decimal-pad', t('active.weightUnit', { unit: unitWord }),
          weight => write({ weight }), () => repsInputs[row.key]?.focus())}
        {field('reps', repsText, placeholderReps, 'number-pad',
          t((`workout.repsSpoken.${pluralForm(language, Number(repsText || placeholderReps) || 0)}`) as TranslationKey, {
            count: repsText || placeholderReps || '0',
          }), reps => write({ reps }), undefined, node => { repsInputs[row.key] = node; })}
        {effort !== 'off' ? field('effort', effortText, '', 'decimal-pad',
          t(effort === 'rpe' ? 'gymParity.rpeLabel' : 'gymParity.rirLabel'), next => write({ effort: next })) : null}
        <Pressable accessibilityRole="button"
          accessibilityLabel={t(logged ? 'workout.unlogCheck' : 'workout.logCheck', { set: setLabel })}
          accessibilityState={{ disabled: busy }} disabled={busy} onPress={check}
          style={[columnBox('check'), cellHit]}>
          <View style={{ width: 44, height: 34, borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center',
            backgroundColor: logged ? theme.color.domain.train : theme.surface.control,
            borderWidth: theme.size.border.thin, borderColor: logged ? theme.color.domain.train : theme.surface.hairline }}>
            <Text style={{
              color: logged ? theme.color.on.train : theme.color.text.tertiary,
              fontFamily: fontFamilyFor('Figtree', '700', language === 'ar'), fontSize: theme.type.body.size,
            }}>✓</Text>
          </View>
        </Pressable>
      </View>;
    })}
    <Pressable accessibilityRole="button" accessibilityLabel={t('workout.addSet')} onPress={onAdd}
      style={{ minHeight: theme.size.touch.min, borderRadius: theme.radius.md, alignItems: 'center',
        justifyContent: 'center', backgroundColor: theme.surface.control }}>
      <Typography bold>{t('workout.addSet')}</Typography>
    </Pressable>
  </View>;

  function field(
    column: 'weight' | 'reps' | 'effort', value: string, placeholder: string,
    keyboard: 'decimal-pad' | 'number-pad', label: string, onChange: (value: string) => void,
    onSubmit?: () => void, inputRef?: (node: TextInput | null) => void,
  ) {
    return <View style={columnBox(column)}>
      <TextInput ref={inputRef} value={value} placeholder={placeholder} onChangeText={onChange}
        onSubmitEditing={onSubmit} keyboardType={keyboard} returnKeyType={onSubmit ? 'next' : 'done'}
        accessibilityLabel={label} placeholderTextColor={theme.color.text.tertiary}
        style={{
          width: '100%', minHeight: theme.size.touch.min, borderRadius: theme.radius.sm, textAlign: 'center',
          borderWidth: theme.size.border.thin, borderColor: theme.surface.hairline,
          backgroundColor: theme.surface.control, color: theme.color.text.primary,
          fontFamily: fontFamilyFor('Figtree', '700', language === 'ar'), fontSize: theme.type.body.size,
          fontVariant: ['tabular-nums'],
        }} />
    </View>;
  }
}

const cellHit = { minHeight: 48, alignItems: 'center' as const, justifyContent: 'center' as const };

function columnBox(column: string): { width?: number; flex?: number; alignItems: 'center' } {
  if (column === 'set' || column === 'check') return { width: 48, alignItems: 'center' };
  if (column === 'previous') return { flex: 1.15, alignItems: 'center' };
  if (column === 'effort') return { flex: 0.75, alignItems: 'center' };
  return { flex: 1, alignItems: 'center' };
}
