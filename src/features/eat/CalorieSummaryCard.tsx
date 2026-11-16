import { Text, View } from 'react-native';
import { Button, Card, Chip, ProgressBar, Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';
import { formatNumber } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { orbSummary } from '../../design/primitives/contracts';
import { daySummaryKind, macroFill } from './daySummary';

type SummaryTarget = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: 'estimate' | 'manual';
};

/** Flat calorie summary. It lives with Eat because the shared primitives are not part of this change. */
export function CalorieSummaryCard({
  logged, eaten, target, hidden, protein, carbs, fat, fiber, sugar, sodium,
  completeMacroItems, itemCount, onSetTarget, onShowNumbers,
}: {
  logged: boolean;
  eaten: number;
  target: SummaryTarget | null;
  hidden: boolean;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  completeMacroItems: number;
  itemCount: number;
  onSetTarget: () => void;
  onShowNumbers: () => void;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const format = (value: number) => formatNumber(language, value);
  const kind = daySummaryKind(logged, eaten, target?.kcal ?? null, hidden);
  const spoken = orbSummary(eaten, target?.kcal ?? null, hidden, language);
  const showNumbers = kind.kind === 'open' || kind.kind === 'within' || kind.kind === 'over';
  const nutrient = (value: number | null, tenth: boolean) => value === null ? '—'
    : format(tenth ? Math.round(value * 10) / 10 : Math.round(value));
  const anyMacro = protein !== null || carbs !== null || fat !== null;
  return <Card>
    {target?.source === 'estimate' && <Chip kind="estimate" />}
    {kind.kind === 'hidden' && <Typography size="title">{t(kind.message)}</Typography>}
    {kind.kind === 'hidden' && kind.message !== 'orb.hidden' &&
      <Typography tone="secondary" size="secondary">{t('eatI.hidden')}</Typography>}
    {kind.kind === 'unlogged' && <>
      <Typography size="title">{t('eatI.notLogged')}</Typography>
      <Typography tone="secondary" size="secondary">{target
        ? t('eatI.target', { count: format(target.kcal) })
        : t('eatI.startLogging')}</Typography>
    </>}
    {showNumbers && spoken.metric && <View style={{
      flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: theme.space[2],
    }}>
      <Text allowFontScaling numberOfLines={1} style={{
        flexShrink: 1, color: theme.color.text.primary, fontSize: theme.type.metric.xl.size,
        lineHeight: theme.type.metric.xl.line, fontWeight: theme.type.metric.xl.weight,
        fontVariant: ['tabular-nums'],
      }}>{spoken.metric.value}</Text>
      <Text allowFontScaling style={{
        color: theme.color.text.secondary, fontSize: theme.type.secondary.size,
        lineHeight: theme.type.secondary.line,
      }}>{spoken.metric.caption}</Text>
    </View>}
    {showNumbers && spoken.progress !== null &&
      <ProgressBar progress={spoken.progress} label={spoken.accessibilityLabel} />}
    {(kind.kind === 'within' || kind.kind === 'over') && target &&
      <Typography tone="secondary" size="secondary">
        {t('eatI.eaten', { count: format(kind.eaten) }) + ' · ' + t('eatI.target', { count: format(target.kcal) })}
      </Typography>}
    {showNumbers && (anyMacro ? <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
      <MacroColumn name={t('eatI.macroProtein')} amount={protein} goal={target?.proteinG ?? null}
        color={theme.color.macro.protein} />
      <MacroColumn name={t('eatI.macroCarbs')} amount={carbs} goal={target?.carbsG ?? null}
        color={theme.color.macro.carbs} />
      <MacroColumn name={t('eatI.macroFat')} amount={fat} goal={target?.fatG ?? null}
        color={theme.color.macro.fat} />
    </View> : <Typography tone="secondary">{t('eatI.caloriesOnlyNoMacros')}</Typography>)}
    {showNumbers && <Typography tone="secondary" size="secondary">{t('nutrients.values', {
      fiber: nutrient(fiber, true), sugar: nutrient(sugar, true), sodium: nutrient(sodium, false),
    })}</Typography>}
    {showNumbers && completeMacroItems > 0 && completeMacroItems < itemCount &&
      <Typography tone="secondary" size="secondary">{t('eatI.partialMacros', {
        count: completeMacroItems, total: itemCount,
      })}</Typography>}
    {!target && <Button label={t('today.setTarget')} variant="tonal" fullWidth onPress={onSetTarget} />}
    {hidden && <Button label={t('eatI.showNumbers')} variant="plain" fullWidth onPress={onShowNumbers} />}
  </Card>;
}

function MacroColumn({ name, amount, goal, color }: {
  name: string; amount: number | null; goal: number | null; color: string;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const fill = macroFill(amount, goal);
  const text = amount === null ? '—'
    : goal === null ? t('eatI.grams', { count: Math.round(amount) })
    : t('eatI.macroPair', { amount: Math.round(amount), goal: Math.round(goal) });
  return <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
    <Typography size="caption" tone="secondary">{name}</Typography>
    <Typography bold lines={1}>{text}</Typography>
    {fill !== null && <View style={{
      height: 4, borderRadius: 4, backgroundColor: theme.color.bg.raised, overflow: 'hidden',
    }}>
      <View style={{
        width: `${fill * 100}%`, height: 4, borderRadius: 4, backgroundColor: color, alignSelf: 'flex-start',
      }} />
    </View>}
  </View>;
}
