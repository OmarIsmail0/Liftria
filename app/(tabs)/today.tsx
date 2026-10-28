import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import * as Network from 'expo-network';
import { useTheme } from '../../src/design/ThemeProvider';
import { SettingsIcon } from '../../src/design/primitives/TabIcon';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { formatNumber } from '../../src/i18n';
import { Banner, Button, Card, Chip, Header, ListRow, Screen, Skeleton, Typography } from '../../src/design/primitives';
import { getProfile, type Profile } from '../../src/services/database/profile';
import { getCurrentTarget, type Target } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { keyState, type KeyState } from '../../src/services/secure-storage';
import { overviewMetrics, useHealthSnapshot } from '../../src/features/health/useHealthSnapshot';
import { heartRateTodayStatus, phase2EnergyMessage } from '../../src/features/health/presentation';
import { listPlans, listSessions, listTemplates } from '../../src/services/database/gymRepositories';
import { scheduledTemplate, isLocalDate } from '../../src/features/train/weekPlan';
import { readDiaryDay, summarizeEntries, type DaySummary } from '../../src/features/eat/diaryRepository';
import {EatRing} from '../../src/features/eat/EatRing';
import {WaterCounterCard} from '../../src/features/eat/WaterCounterCard';

type TrainingToday = { title: string; detail: string } | null;
type LocalToday = {
  profile: Profile | null; target: Target | null; hideNumbers: boolean;
  key: KeyState['status']; offline: boolean; onboardingFinished: boolean; savedStep: number;
};
const emptyToday: LocalToday = {
  profile: null, target: null, hideNumbers: false, key: 'missing',
  offline: false, onboardingFinished: false, savedStep: 0,
};

export default function TodayTab() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [local, setLocal] = useState<LocalToday>(emptyToday);
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const [localLoading, setLocalLoading] = useState(true);
  const [connectDismissed,setConnectDismissed] = useState(false);
  const [training,setTraining] = useState<TrainingToday>(null);
  const [diary,setDiary]=useState<DaySummary>(summarizeEntries([]));
  const loadTraining=useCallback(async()=>{
    const [sessions,plans,templates]=await Promise.all([
      listSessions(100),listPlans(),listTemplates(),
    ]);
    const today=new Date();
    const finished=sessions.ok?sessions.value.find(s=>s.state==='finished'&&
      isLocalDate(s.startedAt,today)):undefined;
    const plan=plans.ok?plans.value.find(p=>p.active)??null:null;
    const next=scheduledTemplate(plan,templates.ok?templates.value:[],today);
    setTraining(finished?{title:finished.title,detail:t('today.trainingDone')}:
      next?{title:next.name,detail:t('today.trainingPlanned')}:null);
  },[t]);
  const loadLocal = useCallback(async () => {
    const [profile, target, hide, completed, saved, key, net,entries] = await Promise.all([
      getProfile(), getCurrentTarget(), getTypedSetting('hideNumbers'),
      getTypedSetting('onboarding.completedAt'), getTypedSetting('onboarding.step'), keyState(),
      Network.getNetworkStateAsync().catch(() => null), readDiaryDay(),
    ]);
    if(entries.ok)setDiary(summarizeEntries(entries.value));
    setLocal({
      profile: profile.ok ? profile.value : null,
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
  }, [loadLocal,loadTraining]));
  const date = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('today.morning') : hour < 17 ? t('today.afternoon') : t('today.evening');
  const steps = snapshot.readings.steps;
  const hr = snapshot.readings['heart-rate'];
  const hasTarget = local.target !== null;
  const setupSteps = ['welcome','privacy','profile','goal','target','health','watch','hiku','done'] as const;
  const promptHealth = snapshot.loaded && snapshot.availability !== null && !connectDismissed &&
    (snapshot.availability !== 'available' ||
      (snapshot.permissions.steps !== 'granted' && snapshot.permissions['heart-rate'] !== 'granted'));
  const justUpdated = snapshot.fresh;
  const now = new Date();
  const sourceLabel=(label:string)=>label==='Phone'?t('chips.phone'):
    label==='Unknown source'?t('healthOverview.unknownSource'):label;
  const age=(iso:string)=>{
    const time=Date.parse(iso);
    if(!Number.isFinite(time))return t('healthOverview.timeUnknown');
    const minutes=Math.max(0,Math.floor((now.getTime()-time)/60000));
    if(minutes<60)return t('healthOverview.minutesAgo',{count:minutes});
    const hours=Math.floor(minutes/60);
    return hours<24?t('healthOverview.hoursAgo',{count:hours}):
      t('healthOverview.daysAgo',{count:Math.floor(hours/24)});
  };
  const note=(message:string):string=>message==='No data'?t('healthOverview.noData'):
    message==='Not allowed'?t('healthOverview.notAllowed'):
    message==='Not available'?t('healthOverview.notAvailable'):
    message==='Permission not confirmed'?t('healthOverview.unknownPermission'):
    message==='No measured source'?t('healthOverview.noMeasure'):
    message==='Unverified device. The data origin does not prove this came from a watch.'?t('healthOverview.noteUnverified'):
    message==='Separate sources; no combined total.'?t('healthOverview.noteSeparate'):
    language==='en'?message:t('healthOverview.checking');
  const energyNote=note(phase2EnergyMessage(
    snapshot.permissions['active-calories']??'unknown',snapshot.availability==='available'));

  if (localLoading || !snapshot.loaded) return <Screen embedded>
    <Header title={t('nav.today')} subtitle={t('today.loading')} />
    <View style={{ gap: theme.layout.cardGap, paddingTop: theme.space[4] }}>
      <Skeleton height={theme.size.touch.workout} />
      <Skeleton height={theme.size.touch.workout * 3} />
      <Skeleton height={theme.size.touch.workout} />
      <Skeleton height={theme.size.touch.workout * 2} />
    </View>
  </Screen>;
  return <Screen embedded scroll={false}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing}
      onRefresh={() => { void Promise.allSettled([refresh(true), loadLocal(), loadTraining()]); }}
      colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: theme.space[4], gap: theme.layout.cardGap }}>
      <Header title={local.profile?.name ? `${greeting}, ${local.profile.name}` : t('today.welcome')}
        subtitle={date} right={<Pressable accessibilityRole="button" accessibilityLabel={t('today.openSettings')}
          onPress={() => router.push('/settings')}
          style={{ minHeight: theme.size.touch.min, minWidth: theme.size.touch.min,
            alignItems: 'center', justifyContent: 'center' }}>
          <SettingsIcon color={theme.color.text.primary} size={theme.space[6]} strokeWidth={theme.size.iconStroke} />
        </Pressable>} />
      {local.offline && <Banner variant="offline" title={t('today.offline')}
        message={t('today.offlineDescription')} />}
      <EatRing eaten={diary.kcal} target={local.target?.kcal ?? null} hidden={local.hideNumbers}
        onPress={() => router.push('/(tabs)/eat')} />
      <View style={{ gap: theme.space[2], alignItems: 'center' }}>
        {hasTarget ? <>
          {local.target?.source === 'estimate'
            ? <Chip kind="estimate" />
            : <Typography tone="secondary" size="small">{t('today.manualTarget')}</Typography>}
          <Typography tone="secondary">{local.hideNumbers ? t('today.targetSaved') :
            diary.logged ? t('eatI.eaten',{count:formatNumber(language,diary.kcal)}) : t('eatI.notLogged')}</Typography>
          <Typography tone="secondary" size="small">{local.hideNumbers ? t('today.macrosHidden') :
            diary.logged?(diary.protein===null&&diary.carbs===null&&diary.fat===null?
              t('eatI.caloriesOnlyNoMacros'):t('eatI.macroAmounts',{
                p:diary.protein===null?'—':formatNumber(language,Math.round(diary.protein)),
                c:diary.carbs===null?'—':formatNumber(language,Math.round(diary.carbs)),
                f:diary.fat===null?'—':formatNumber(language,Math.round(diary.fat))})+
                (diary.completeMacroItems<diary.count?' · '+
                t('eatI.partialMacros',{count:diary.completeMacroItems,total:diary.count}):''))
              :t('today.macrosNotLogged')}</Typography>
        </> : <>
          <Typography tone="secondary">{diary.logged?t('eatI.eaten',{count:formatNumber(language,diary.kcal)}):t('today.firstMeal')}</Typography>
          <Typography tone="secondary" size="small">{t('today.noTarget')}</Typography>
          <Typography tone="secondary" size="small">{local.hideNumbers
            ? t('today.macrosHidden') : t('today.macrosNotLogged')}</Typography>
          <View style={{ alignItems: 'center' }}>
            <Button label={t('today.setTarget')} variant="secondary" onPress={() =>
              router.push('/(tabs)/eat/targets')} />
          </View>
        </>}
      </View>
      <WaterCounterCard/>
      <Card title={t('today.actions')} rim="eat">
        <Button label={t('today.logMeal')} variant="secondary" fullWidth
          onPress={() => router.push('/(tabs)/eat')} />
        {diary.logged&&<Typography tone="secondary" size="small">{local.hideNumbers ?
          t('eatI.items',{count:diary.count}) : t('eatI.eaten',{count:formatNumber(language,diary.kcal)})}</Typography>}
      </Card>
      {(!local.onboardingFinished || !hasTarget) && <Card title={t('today.gettingStarted')}>
        <Typography tone="secondary">{t('today.setupDetails')}</Typography>
        <ListRow title={t('today.continueSetup')} detail={t('today.setupOptions')}
          onPress={() => router.push({ pathname: '/onboarding/[step]',
            params: { step: setupSteps[local.savedStep] ?? 'welcome' } })} />
      </Card>}
      <Card rim="train" title={t('today.training')}>
        {training?<ListRow title={training.title} detail={training.detail}
          onPress={()=>router.push('/(tabs)/train')}/>:
          <Typography tone="secondary">{t('today.trainingEmpty')}</Typography>}
        <Typography tone="tertiary" size="small">{t('today.trainingNote')}</Typography>
      </Card>
      {promptHealth && <Card title={t('today.healthPermissions')} rim="health">
        <Typography tone="secondary">{t('today.hiddenUntilPermission')}</Typography>
        <View style={{ flexDirection: 'row', flexWrap:'wrap',gap:theme.space[2] }}>
          <Button label={t('today.turnOn')} variant="secondary" onPress={() =>
            router.push('/(tabs)/progress/health-permissions')} />
          <Button label={t('today.notNow')} variant="ghost" onPress={() => setConnectDismissed(true)} />
        </View>
      </Card>}
      <Card rim="health" title={t('today.activity')}>
        {snapshot.availability !== 'available' && snapshot.availability !== null && <Button label={t('today.connectHealth')} variant="secondary"
          onPress={() => router.push('/(tabs)/progress/health-permissions')} />}
        {justUpdated && <Typography tone="secondary" size="small">{t('today.justUpdated')}</Typography>}
        {steps?.state === 'value' ? steps.sources.map(source =>
          <ListRow key={source.origin} title={t('today.sourceSteps',{source:sourceLabel(source.label)})}
            detail={source.stale?t('today.staleAt',{time:age(source.latestAt)}):t('today.readOnly')}
            suffix={<View style={{ gap: theme.space[1], alignItems: 'flex-end' }}>
              <Typography>{formatNumber(language, source.value)}</Typography>
              <Chip kind={source.label === 'Phone' ? 'phone' : 'pending'}
                label={source.label === 'Phone' ? t('chips.phone') : t('today.unverified')} />
              {source.stale && <Chip kind="stale" label={age(source.latestAt)} />}
            </View>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">{t('today.stepsStatus',{status:note(steps?.note??'Checking Health Connect…')})}</Typography>}
        {hr?.state === 'value' ? hr.sources.map(source =>
          <ListRow key={source.origin} title={t('today.sourceHeart',{source:sourceLabel(source.label)})}
            detail={heartRateTodayStatus(source.latestAt, now).stale
              ? t('today.staleUnverified',{time:age(source.latestAt)})
              : t('today.deviceNotVerified')}
            suffix={<View style={{ gap: theme.space[1], alignItems: 'flex-end' }}>
              <Typography>{t('today.bpmValue',{count:source.value})}</Typography>
              <Chip kind="pending" label={t('today.unverified')} />
              {heartRateTodayStatus(source.latestAt, now).stale &&
                <Chip kind="stale" label={age(source.latestAt)} />}
            </View>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">{t('today.heartStatus',{status:note(hr?.note??'Checking Health Connect…')})}</Typography>}
        <Typography tone="secondary">{t('today.energyStatus',{status:energyNote})}</Typography>
        {steps?.sources.length !== 1 && (steps?.sources.length ?? 0) > 1 &&
          <Typography tone="secondary" size="small">{t('today.sourceNote')}</Typography>}
        <Button label={t('today.healthDetails')} variant="ghost" fullWidth
          onPress={() => router.push('/(tabs)/progress/health')} />
      </Card>
      <Card rim="hiku" title="Hiku">
        <Typography tone="secondary">{local.offline ? t('today.hikuNeedsInternet') :
          local.key === 'ready' ? t('today.keyReady') :
          local.key === 'missing' ? t('today.keyMissing') :
          t('today.keyAttention')}</Typography>
        {local.key !== 'ready' && <Button label={t('today.addKey')} variant="secondary"
          onPress={() => router.push({ pathname:'/onboarding/[step]',params:{step:'hiku'} })} />}
        <Button label={t('today.openHiku')} variant="ghost" onPress={() => router.push('/(tabs)/hiku')} />
      </Card>
      <Card rim="eat" title={t('today.meals')}>
        <Typography tone="secondary">{t('today.mealsEmpty')}</Typography>
      </Card>
    </ScrollView>
  </Screen>;
}
