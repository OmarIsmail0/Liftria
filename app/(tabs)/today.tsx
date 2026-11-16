import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import * as Network from 'expo-network';
import { useTheme } from '../../src/design/ThemeProvider';
import { SettingsIcon } from '../../src/design/primitives/TabIcon';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { formatDate, formatNumber, pluralForm, type TranslationKey } from '../../src/i18n';
import { Banner, Button, Card, Chip, Header, ListGroup, ListRow, Screen, SectionHeader, Skeleton, Typography } from '../../src/design/primitives';
import { getCurrentTarget, type Target } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { keyState, type KeyState } from '../../src/services/secure-storage';
import { appleHealthPhone, formatAppleAmount, healthCopy, readAccessIsReported } from '../../src/features/health/deviceHealth';
import { heartRateTodayStatus, NOTE_APPLE_READ_ERROR, NOTE_APPLE_TOTAL, phase2EnergyMessage, SOURCE_APPLE } from '../../src/features/health/presentation';
import { overviewMetrics, useHealthSnapshot } from '../../src/features/health/useHealthSnapshot';
import { listPlans, listSessions, listTemplates } from '../../src/services/database/gymRepositories';
import { scheduledTemplate, isLocalDate } from '../../src/features/train/weekPlan';
import { readInProgressWorkout, workoutNumbers } from '../../src/features/train/workoutData';
import { readDiaryDay, summarizeEntries, type DaySummary } from '../../src/features/eat/diaryRepository';
import { localDay } from '../../src/features/eat/foodCatalog';
import { adjustWater, readWater, type WaterLog } from '../../src/features/eat/waterRepository';
import { cachedHealthWeights, listLocalWeights } from '../../src/features/progress/weightRepository';
import { formatLoggedBodyWeight } from '../../src/features/progress/progressPhotos';
import type { WeightPoint } from '../../src/features/progress/trendMath';
import type { WeightUnit } from '../../src/features/train/workoutUnits';
import { calorieView, latestLoggedWeight, showHealthRow } from '../../src/features/today/calorieSummary';
import { CaloriesCard } from '../../src/features/today/CaloriesCard';
import { WaterRow } from '../../src/features/today/WaterRow';

type TrainingToday =
  | { kind: 'active'; id: string; title: string; sets: number }
  | { kind: 'next'; id: string; title: string; exercises: number }
  | { kind: 'done'; title: string }
  | { kind: 'empty' }
  | { kind: 'none' };

type LocalToday = {
  target: Target | null; hideNumbers: boolean;
  key: KeyState['status']; offline: boolean; onboardingFinished: boolean; savedStep: number;
};
const emptyToday: LocalToday = {
  target: null, hideNumbers: false, key: 'missing',
  offline: false, onboardingFinished: false, savedStep: 0,
};

export default function TodayTab() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [local, setLocal] = useState<LocalToday>(emptyToday);
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const [localLoading, setLocalLoading] = useState(true);
  const [connectDismissed, setConnectDismissed] = useState(false);
  const [training, setTraining] = useState<TrainingToday | null>(null);
  const [diary, setDiary] = useState<DaySummary>(summarizeEntries([]));
  const [weights, setWeights] = useState<WeightPoint[]>([]);
  const [weightError, setWeightError] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [water, setWater] = useState<WaterLog | null>(null);
  const [glassMl, setGlassMl] = useState(250);
  const [waterReady, setWaterReady] = useState(false);
  const [waterError, setWaterError] = useState(false);
  const [waterBusy, setWaterBusy] = useState(false);
  const loadTraining = useCallback(async () => {
    const [sessions, plans, templates, active] = await Promise.all([
      listSessions(100), listPlans(), listTemplates(), readInProgressWorkout(),
    ]);
    if (active.ok && active.value && active.value.state === 'in-progress') {
      setTraining({
        kind: 'active', id: active.value.id, title: active.value.title,
        sets: workoutNumbers(active.value).sets,
      });
      return;
    }
    const today = new Date();
    const finished = sessions.ok ? sessions.value.find(session => session.state === 'finished' &&
      isLocalDate(session.startedAt, today)) : undefined;
    const plan = plans.ok ? plans.value.find(item => item.active) ?? null : null;
    const next = scheduledTemplate(plan, templates.ok ? templates.value : [], today);
    if (finished) setTraining({ kind: 'done', title: finished.title });
    else if (next) setTraining({ kind: 'next', id: next.id, title: next.name, exercises: next.exercises.length });
    else if (templates.ok && templates.value.length === 0) setTraining({ kind: 'empty' });
    else setTraining({ kind: 'none' });
  }, []);
  const loadWater = useCallback(async () => {
    const day = localDay(new Date());
    const [saved, ml] = await Promise.all([readWater(day), getTypedSetting('water.glassMl')]);
    if (saved.ok) setWater(saved.value); else setWaterError(true);
    if (ml.ok) setGlassMl(ml.value); else setWaterError(true);
    if (saved.ok && ml.ok) setWaterError(false);
    setWaterReady(true);
  }, []);
  const changeWater = useCallback(async (delta: -1 | 1) => {
    if (waterBusy) return;
    setWaterBusy(true);
    setWaterError(false);
    const next = await adjustWater(localDay(new Date()), delta, glassMl);
    if (next.ok) setWater(next.value); else setWaterError(true);
    setWaterBusy(false);
  }, [glassMl, waterBusy]);
  const loadLocal = useCallback(async () => {
    const [target, hide, completed, saved, key, net, entries, localWeights, healthWeights, unit] = await Promise.all([
      getCurrentTarget(), getTypedSetting('hideNumbers'),
      getTypedSetting('onboarding.completedAt'), getTypedSetting('onboarding.step'), keyState(),
      Network.getNetworkStateAsync().catch(() => null), readDiaryDay(),
      listLocalWeights(), cachedHealthWeights(), getTypedSetting('units.weight'),
    ]);
    if (entries.ok) setDiary(summarizeEntries(entries.value));
    if (localWeights.ok && healthWeights.ok) {
      setWeights([...localWeights.value, ...healthWeights.value]);
      setWeightError(false);
    } else setWeightError(true);
    if (unit.ok) setWeightUnit(unit.value);
    setLocal({
      target: target.ok ? target.value : null,
      hideNumbers: hide.ok ? hide.value : false,
      onboardingFinished: completed.ok && completed.value !== null,
      savedStep: saved.ok ? saved.value : 0,
      key: key.status,
      offline: net?.isConnected === false || net?.isInternetReachable === false,
    });
    setLocalLoading(false);
  }, []);
  useEffect(() => {
    const subscription = Network.addNetworkStateListener(net => {
      setLocal(previous => ({ ...previous,
        offline: net.isConnected === false || net.isInternetReachable === false }));
    });
    return () => subscription.remove();
  }, []);
  useFocusEffect(useCallback(() => {
    void loadLocal().catch(() => setLocalLoading(false));
    void loadTraining();
    void loadWater();
  }, [loadLocal, loadTraining, loadWater]));
  const date = formatDate(language, new Date(), { weekday: 'short', day: 'numeric', month: 'short' });
  const steps = snapshot.readings.steps;
  const hr = snapshot.readings['heart-rate'];
  const weightReading = snapshot.readings.weight;
  const hasTarget = local.target !== null;
  const setupSteps = ['welcome', 'privacy', 'profile', 'goal', 'target', 'health', 'watch', 'hiku', 'done'] as const;
  const promptHealth = snapshot.loaded && snapshot.availability !== null && !connectDismissed && (
    appleHealthPhone()
      ? snapshot.availability === 'available' && steps?.state !== 'value' && hr?.state !== 'value'
      : snapshot.availability !== 'available' ||
        (snapshot.permissions.steps !== 'granted' && snapshot.permissions['heart-rate'] !== 'granted'));
  const justUpdated = snapshot.fresh;
  const now = new Date();
  const sourceLabel = (label: string) => label === 'Phone' ? t('chips.phone') :
    label === 'Unknown source' ? t('healthOverview.unknownSource') :
    label === SOURCE_APPLE ? t('appleHealth.name') : label;
  const age = (iso: string) => {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return t('healthOverview.timeUnknown');
    const minutes = Math.max(0, Math.floor((now.getTime() - time) / 60000));
    const ago = (base: string, count: number) => t((`${base}.${pluralForm(language, count)}`) as TranslationKey, { count });
    if (minutes < 60) return ago('healthOverview.minutesAgo', minutes);
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? ago('healthOverview.hoursAgo', hours) :
      ago('healthOverview.daysAgo', Math.floor(hours / 24));
  };
  const note = (message: string): string => message === 'No data' ? t('healthOverview.noData') :
    message === 'Not allowed' ? t('healthOverview.notAllowed') :
    message === 'Not available' ? t('healthOverview.notAvailable') :
    message === 'Permission not confirmed' ? t('healthOverview.unknownPermission') :
    message === 'No measured source' ? t('healthOverview.noMeasure') :
    message === 'Unverified device. The data origin does not prove this came from a watch.' ? t('healthOverview.noteUnverified') :
    message === 'Separate sources; no combined total.' ? t('healthOverview.noteSeparate') :
    message === NOTE_APPLE_TOTAL ? t('appleHealth.overview.total') :
    message === NOTE_APPLE_READ_ERROR ? t('appleHealth.readError') :
    language === 'en' ? message : t(appleHealthPhone() ? 'appleHealth.today.checking' : 'healthOverview.checking');
  const energyNote = note(phase2EnergyMessage(
    snapshot.permissions['active-calories'] ?? 'unknown', snapshot.availability === 'available'));
  const calories = calorieView({
    logged: diary.logged, kcal: diary.kcal, protein: diary.protein, carbs: diary.carbs, fat: diary.fat,
    completeMacroItems: diary.completeMacroItems, count: diary.count, hidden: local.hideNumbers,
    target: local.target,
  });
  const reportsPermission = readAccessIsReported();
  const stepsShow = showHealthRow({
    availability: snapshot.availability, permission: snapshot.permissions.steps, state: steps?.state,
    reportsPermission,
  });
  const weightPoints: WeightPoint[] = weightError ? [] : [...weights];
  if (!weightError && weightReading?.state === 'value') {
    for (const source of weightReading.sources) {
      if (source.unit === 'kg' && source.value > 0) {
        weightPoints.push({
          id: source.origin, at: source.latestAt, kg: source.value,
          source: appleHealthPhone() ? 'apple-health' : 'health-connect',
        });
      }
    }
  }
  const latestWeight = weightError ? null : latestLoggedWeight(weightPoints);
  const weightShow = weightError || latestWeight !== null || showHealthRow({
    availability: snapshot.availability, permission: snapshot.permissions.weight, state: weightReading?.state,
    reportsPermission,
  });
  const weightDetail = () => {
    if (weightError) return t('eatI.error');
    if (!latestWeight) return note(weightReading?.note ?? 'No data');
    const source = latestWeight.source === 'liftria' ? t('trend.myWeight') : t(healthCopy('trend.chip'));
    const time = Date.parse(latestWeight.at);
    if (!Number.isFinite(time)) return source;
    return source + ' · ' + formatDate(language, new Date(time), { day: 'numeric', month: 'short' });
  };
  const trainingDetail = training?.kind === 'active'
    ? t('train.inProgress') + ' · ' + t((`train.setsLogged.${pluralForm(language, training.sets)}`) as TranslationKey, { count: training.sets })
    : training?.kind === 'next'
      ? t('today.trainingPlanned') + ' · ' + t((`count.exercises.${pluralForm(language, training.exercises)}`) as TranslationKey, { count: training.exercises })
      : training?.kind === 'done' ? t('today.trainingDone') : null;
  const openTrain = () => router.push('/(tabs)/train');
  const stepCount = steps?.state === 'value' ? steps.sources.length : 0;

  if (localLoading || !snapshot.loaded) return <Screen embedded>
    <Header mode="large" title={t('nav.today')} subtitle={t('today.loading')} />
    <View style={{ gap: theme.layout.cardGap, paddingTop: theme.space[4] }}>
      <Skeleton height={theme.size.touch.workout} />
      <Skeleton height={theme.size.touch.workout * 3} />
      <Skeleton height={theme.size.touch.workout} />
      <Skeleton height={theme.size.touch.workout * 2} />
    </View>
  </Screen>;
  return <Screen embedded scroll={false}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing}
      onRefresh={() => { void Promise.allSettled([refresh(true), loadLocal(), loadTraining(), loadWater()]); }}
      colors={[theme.color.accent]} tintColor={theme.color.accent} />}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: theme.space[6], gap: theme.layout.cardGap }}>
      <Header mode="large" title={t('nav.today')} subtitle={date} right={<Pressable accessibilityRole="button"
        accessibilityLabel={t('today.openSettings')} onPress={() => router.push('/settings')}
        style={{ minHeight: theme.size.touch.min, minWidth: theme.size.touch.min,
          alignItems: 'center', justifyContent: 'center' }}>
        <SettingsIcon color={theme.color.text.primary} size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
      </Pressable>} />
      {local.offline && <Banner variant="offline" title={t('today.offline')}
        message={t('today.offlineDescription')} />}
      <CaloriesCard view={calories} onLogFood={() => router.push('/(tabs)/eat')}
        onSetTarget={() => router.push('/(tabs)/eat/targets')} />
      <View style={{ gap: theme.space[2] }}>
        <SectionHeader title={t('today.training')} />
        <Card>
          {training?.kind === 'active' || training?.kind === 'next' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[3] }}>
            <View style={{ flex: 1, minWidth: 0, gap: theme.space[1] }}>
              <Typography bold lines={2}>{training.title}</Typography>
              {trainingDetail ? <Typography tone="secondary" size="secondary">{trainingDetail}</Typography> : null}
            </View>
            <Button label={training.kind === 'active' ? t('miniBar.resume') : t('today.start')}
              accessibilityLabel={training.kind === 'active'
                ? t('miniBar.resumeA11y', { title: training.title, count: training.sets })
                : t('today.startNamed', { name: training.title })}
              onPress={() => training.kind === 'active'
                ? router.push({ pathname: '/(tabs)/train/active', params: { id: training.id } })
                : router.push({ pathname: '/(tabs)/train/preview', params: { templateId: training.id } })} />
          </View> : training?.kind === 'done' ? <ListRow title={training.title} detail={t('today.trainingDone')}
            onPress={openTrain} /> : training?.kind === 'empty' ? <>
            <Typography tone="secondary">{t('today.trainingEmpty')}</Typography>
            <Button label={t('train.startEmpty')} fullWidth onPress={() => router.push('/(tabs)/train/preview')} />
          </> : <Typography tone="secondary">{t('today.trainingEmpty')}</Typography>}
        </Card>
      </View>
      <View style={{ gap: theme.space[2] }}>
        <SectionHeader title={t('nav.today')} />
        <ListGroup>
          <WaterRow divider={stepsShow || weightShow} ready={waterReady}
            glasses={water?.glasses ?? null} millilitres={water ? water.glasses * water.glassMl : null}
            glassMl={glassMl} error={waterError} busy={waterBusy} onChange={delta => { void changeWater(delta); }} />
          {stepsShow && steps?.state === 'value' && steps.sources.length > 0 ? steps.sources.map(source =>
            <ListRow key={source.origin}
              title={steps.sources.length > 1
                ? t('today.sourceSteps', { source: sourceLabel(source.label) }) : t('healthOverview.steps')}
              detail={(source.label === 'Phone' ? t('chips.phone') : t('today.unverified')) + ' · ' +
                (source.stale ? t('today.staleAt', { time: age(source.latestAt) }) : t(healthCopy('today.readOnly')))}
              value={formatNumber(language, source.value)}
              onPress={() => router.push('/(tabs)/progress/health')} />) : null}
          {stepsShow && !(steps?.state === 'value' && steps.sources.length > 0) ? <ListRow
            title={t('healthOverview.steps')}
            detail={note(steps?.note ?? (appleHealthPhone() ? t('appleHealth.today.checking') : 'Checking Health Connect…'))}
            onPress={() => router.push('/(tabs)/progress/health')} /> : null}
          {weightShow ? <ListRow title={t('healthOverview.weight')} detail={weightDetail()}
            value={latestWeight
              ? (local.hideNumbers ? t('trend.hidden') : formatLoggedBodyWeight(language, latestWeight.kg, weightUnit))
              : undefined}
            onPress={() => router.push('/(tabs)/progress/body')} /> : null}
        </ListGroup>
        {stepCount > 1 ? <Typography tone="secondary" size="secondary">{t('today.sourceNote')}</Typography> : null}
      </View>
      {(!local.onboardingFinished || !hasTarget) && <Card title={t('today.gettingStarted')}>
        <Typography tone="secondary">{t('today.setupDetails')}</Typography>
        <ListRow title={t('today.continueSetup')} detail={t('today.setupOptions')}
          onPress={() => router.push({ pathname: '/onboarding/[step]',
            params: { step: setupSteps[local.savedStep] ?? 'welcome' } })} />
      </Card>}
      {promptHealth && <Card title={t(healthCopy('today.permissions'))}>
        <Typography tone="secondary">{t(healthCopy('today.hidden'))}</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
          <Button label={appleHealthPhone() ? t('appleHealth.today.connect') : t('today.turnOn')} variant="tonal" onPress={() =>
            router.push('/(tabs)/progress/health-permissions')} />
          <Button label={t('today.notNow')} variant="plain" onPress={() => setConnectDismissed(true)} />
        </View>
      </Card>}
      <Card title={t('today.activity')}>
        {snapshot.availability !== 'available' && snapshot.availability !== null && !appleHealthPhone() &&
          <Button label={t('today.connectHealth')} variant="tonal"
            onPress={() => router.push('/(tabs)/progress/health-permissions')} />}
        {justUpdated && <Typography tone="secondary" size="secondary">{t('today.justUpdated')}</Typography>}
        {hr?.state === 'value' ? hr.sources.map(source =>
          <ListRow key={source.origin} title={t('today.sourceHeart', { source: sourceLabel(source.label) })}
            detail={heartRateTodayStatus(source.latestAt, now).stale
              ? t('today.staleUnverified', { time: age(source.latestAt) })
              : t('today.deviceNotVerified')}
            suffix={<View style={{ gap: theme.space[1], alignItems: 'flex-end' }}>
              <Typography>{t('today.heartValue', { value: formatNumber(language, source.value) })}</Typography>
              <Chip kind="pending" label={t('today.unverified')} />
              {heartRateTodayStatus(source.latestAt, now).stale &&
                <Chip kind="stale" label={age(source.latestAt)} />}
            </View>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">{t('today.heartStatus', { status: note(hr?.note ?? (appleHealthPhone() ? t('appleHealth.today.checking') : 'Checking Health Connect…')) })}</Typography>}
        {appleHealthPhone() && snapshot.readings['active-calories']?.state === 'value' &&
          (snapshot.readings['active-calories']?.total ?? 0) > 0 ?
          <Typography tone="secondary">{t('appleHealth.today.energy', { amount: formatAppleAmount(language,
            snapshot.readings['active-calories']?.total ?? 0,
            snapshot.readings['active-calories']?.sources[0]?.unit ?? 'kcal') })}</Typography> :
          <Typography tone="secondary">{t('today.energyStatus', { status: energyNote })}</Typography>}
        {appleHealthPhone() && (steps?.state === 'no-data' || hr?.state === 'no-data') &&
          <Typography tone="secondary" size="secondary">{t('appleHealth.changeAccess')}</Typography>}
        <Button label={t('today.healthDetails')} variant="plain" fullWidth
          onPress={() => router.push('/(tabs)/progress/health')} />
      </Card>
      <Card title={t('nav.hiku')}>
        <Typography tone="secondary">{local.offline ? t('today.hikuNeedsInternet') :
          local.key === 'ready' ? t('today.keyReady') :
          local.key === 'missing' ? t('today.keyMissing') :
          t('today.keyAttention')}</Typography>
        {local.key !== 'ready' && <Button label={t('today.addKey')} variant="tonal"
          onPress={() => router.push({ pathname: '/onboarding/[step]', params: { step: 'hiku' } })} />}
        <Button label={t('today.openHiku')} variant="plain" onPress={() => router.push('/(tabs)/hiku')} />
      </Card>
    </ScrollView>
  </Screen>;
}
