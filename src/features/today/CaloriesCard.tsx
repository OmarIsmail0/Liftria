import { View } from 'react-native';
import { useTheme } from '../../design/ThemeProvider';
import { Button, Card, Chip, ProgressBar, Typography } from '../../design/primitives';
import { useLanguage } from '../../i18n/LanguageProvider';
import { formatNumber } from '../../i18n';
import type { CalorieView, MacroColumn, MacroKey } from './calorieSummary';

const MACRO_KEY: Record<MacroKey, 'today.protein' | 'today.carbs' | 'today.fat'> = {
  protein: 'today.protein', carbs: 'today.carbs', fat: 'today.fat',
};

function macroLine(t: (key: 'eatI.notLogged' | 'today.macroGoal' | 'today.macroAmount', params?: Record<string, number>) => string, macro: MacroColumn): string {
  if (macro.amount === null) return t('eatI.notLogged');
  if (macro.goal !== null && macro.goal > 0) return t('today.macroGoal', { amount: macro.amount, goal: macro.goal });
  return t('today.macroAmount', { amount: macro.amount });
}

/** 4 dp macro track. The shared progress bar is the 8 dp accent bar used for calories. */
function MacroBar({ progress, color }: { progress: number; color: string }) {
  const { theme } = useTheme();
  const amount = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return <View style={{ height: 4, borderRadius: 4, backgroundColor: theme.color.bg.raised, overflow: 'hidden', alignItems: 'flex-start' }}>
    <View style={{ width: `${amount * 100}%`, height: 4, borderRadius: 4, backgroundColor: color }} />
  </View>;
}

export function CaloriesCard({ view, onLogFood, onSetTarget }: {
  view: CalorieView;
  onLogFood: () => void;
  onSetTarget: () => void;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const heroLabel = view.hero.kind === 'remaining' && view.eaten !== null && view.target !== null
    ? t('today.remainingA11y', { remaining: view.hero.kcal, eaten: view.eaten, target: view.target })
    : view.hero.kind === 'over' && view.eaten !== null && view.target !== null
      ? t('today.overA11y', { count: view.hero.kcal, eaten: view.eaten, target: view.target })
      : view.hero.kind === 'eaten'
        ? t('orb.noTargetA11y', { count: view.hero.kcal })
        : undefined;
  const number = view.hero.kind === 'remaining' || view.hero.kind === 'over' || view.hero.kind === 'eaten'
    ? view.hero.kcal : null;
  const caption = view.hero.kind === 'remaining' ? t('orb.caption.left')
    : view.hero.kind === 'over' ? t('orb.caption.over')
    : view.hero.kind === 'eaten' ? t('orb.caption.eaten') : null;
  return <Card>
    {view.hero.kind === 'empty' ? <Typography size="title">{view.target !== null
      ? t('today.targetNotLogged', { calories: view.target }) : t('today.firstMeal')}</Typography> : null}
    {view.hero.kind === 'hidden' ? <Typography size="title">{t(view.hero.tone === 'over' ? 'orb.over'
      : view.hero.tone === 'on-track' ? 'orb.onTrack' : 'orb.hidden')}</Typography> : null}
    {number !== null && caption !== null ? <View accessible accessibilityLabel={heroLabel}
      style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: theme.space[2] }}>
      <Typography size="metric">{formatNumber(language, number)}</Typography>
      <View style={{ paddingBottom: theme.space[2] }}>
        <Typography tone="secondary" size="secondary">{caption}</Typography>
      </View>
    </View> : null}
    {view.estimate ? <Chip kind="estimate" /> : null}
    {view.manual ? <Typography tone="secondary" size="secondary">{t('today.manualTarget')}</Typography> : null}
    {view.hero.kind === 'empty' && !view.hasTarget
      ? <Typography tone="secondary" size="secondary">{t('today.noTarget')}</Typography> : null}
    {view.hero.kind === 'empty' && view.hasTarget && view.target === null
      ? <Typography tone="secondary" size="secondary">{t('today.targetSaved')}</Typography> : null}
    {view.hero.kind === 'hidden' && view.hero.tone !== 'hidden'
      ? <Typography tone="secondary" size="secondary">{t('today.macrosHidden')}</Typography> : null}
    {view.progress !== null && heroLabel
      ? <ProgressBar progress={view.progress} label={heroLabel} /> : null}
    {view.eaten !== null && view.target !== null ? <Typography tone="secondary" size="secondary">{t('today.eatenLine', {
      eaten: view.eaten, target: view.target,
    })}</Typography> : null}
    {view.macros ? <View style={{ flexDirection: 'row', gap: theme.space[3] }}>
      {view.macros.map(macro => <View key={macro.key} style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
        <Typography size="caption" tone="secondary">{t(MACRO_KEY[macro.key])}</Typography>
        <Typography bold numeric lines={2}>{macroLine(t, macro)}</Typography>
        {macro.amount !== null && macro.goal !== null && macro.goal > 0
          ? <MacroBar progress={macro.amount / macro.goal} color={theme.color.macro[macro.key]} /> : null}
      </View>)}
    </View> : null}
    {view.caloriesOnly ? <Typography tone="secondary" size="secondary">{t('eatI.caloriesOnlyNoMacros')}</Typography> : null}
    {view.partial ? <Typography tone="secondary" size="secondary">{t('eatI.partialMacros', view.partial)}</Typography> : null}
    {view.showSetTarget ? <Button label={t('today.setTarget')} variant="tonal" fullWidth onPress={onSetTarget} /> : null}
    <Button label={t('today.logFood')} variant={view.showSetTarget ? 'plain' : 'tonal'} fullWidth onPress={onLogFood} />
  </Card>;
}
