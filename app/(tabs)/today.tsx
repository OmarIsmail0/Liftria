import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import * as Network from 'expo-network';
import { useTheme } from '../../src/design/ThemeProvider';
import { Banner, Button, Card, Chip, Header, ListRow, Orb, Screen, Skeleton, Typography } from '../../src/design/primitives';
import { getProfile, type Profile } from '../../src/services/database/profile';
import { getCurrentTarget, type Target } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { keyState, type KeyState } from '../../src/services/secure-storage';
import { overviewMetrics, useHealthSnapshot } from '../../src/features/health/useHealthSnapshot';
import { ageLabel } from '../../src/features/health/presentation';

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
  const [local, setLocal] = useState<LocalToday>(emptyToday);
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const [localLoading, setLocalLoading] = useState(true);
  const [connectDismissed,setConnectDismissed] = useState(false);
  const loadLocal = useCallback(async () => {
    const [profile, target, hide, completed, saved, key, net] = await Promise.all([
      getProfile(), getCurrentTarget(), getTypedSetting('hideNumbers'),
      getTypedSetting('onboarding.completedAt'), getTypedSetting('onboarding.step'), keyState(),
      Network.getNetworkStateAsync().catch(() => null),
    ]);
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
  }, [loadLocal]));
  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const steps = snapshot.readings.steps;
  const hr = snapshot.readings['heart-rate'];
  const hasTarget = local.target !== null;
  const setupSteps = ['welcome','privacy','profile','goal','target','health','watch','hiku','done'] as const;
  const promptHealth = !connectDismissed &&
    (snapshot.availability !== 'available' ||
      (snapshot.permissions.steps !== 'granted' && snapshot.permissions['heart-rate'] !== 'granted'));
  const justUpdated = snapshot.readAt !== null &&
    Date.now() - Date.parse(snapshot.readAt) >= 0 &&
    Date.now() - Date.parse(snapshot.readAt) < 60_000;
  if (localLoading) return <Screen embedded>
    <Header title="Today" subtitle="Loading your local data…" />
    <View style={{ gap: theme.layout.cardGap, paddingTop: theme.space[4] }}>
      <Skeleton height={theme.size.touch.workout} />
      <Skeleton height={theme.size.touch.workout * 3} />
      <Skeleton height={theme.size.touch.workout} />
      <Skeleton height={theme.size.touch.workout * 2} />
    </View>
  </Screen>;
  return <Screen embedded scroll={false}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing}
      onRefresh={() => { void Promise.all([refresh(true), loadLocal()]); }}
      colors={[theme.color.domain.health]} tintColor={theme.color.domain.health} />}
      contentContainerStyle={{ paddingVertical: theme.space[4], gap: theme.layout.cardGap }}>
      <Header title={local.profile?.name ? `${greeting}, ${local.profile.name}` : 'Welcome to Liftria'}
        subtitle={date} right={<Pressable accessibilityRole="button" accessibilityLabel="Open Settings"
          onPress={() => router.push('/settings')}
          style={{ minHeight: theme.size.touch.min, minWidth: theme.size.touch.min,
            borderRadius: theme.radius.pill, borderWidth: theme.size.border.thin,
            borderColor: theme.controlOutline, alignItems: 'center', justifyContent: 'center' }}>
          <Typography size="head">L</Typography>
        </Pressable>} />
      {local.offline && <Banner variant="offline" title="Offline"
        message="Your local data still works. Hiku needs internet." />}
      <Orb eaten={0} target={local.target?.kcal ?? null} hidden={local.hideNumbers}
        active onPress={() => router.push('/(tabs)/eat')} />
      <View style={{ gap: theme.space[2], alignItems: 'center' }}>
        {hasTarget ? <>
          {local.target?.source === 'estimate'
            ? <Chip kind="estimate" label="Estimate" />
            : <Typography tone="secondary" size="small">Your target · manually set</Typography>}
          <Typography tone="secondary">{local.hideNumbers ? 'Your calorie target is saved' :
            `${local.target?.kcal.toLocaleString()} kcal target · Meals not yet logged`}</Typography>
          <Typography tone="secondary" size="small">{local.hideNumbers ? 'Macros are hidden' :
            `Protein ${local.target?.proteinG} g · Fat ${local.target?.fatG} g · Carbs ${local.target?.carbsG} g`}</Typography>
        </> : <>
          <Typography tone="secondary">Your first meal lights it up.</Typography>
          <Typography tone="secondary" size="small">No target yet · Set a target whenever you’re ready.</Typography>
          <Typography tone="secondary" size="small">{local.hideNumbers
            ? 'Macros hidden' : 'Protein 0 g · Fat 0 g · Carbs 0 g · nothing logged'}</Typography>
          <Button label="Set a target" variant="secondary" onPress={() =>
            router.push({ pathname: '/onboarding/[step]', params: { step: 'target' } })} />
        </>}
      </View>
      <Card title="Quick actions" rim="eat">
        <Button label="Log a meal" variant="secondary" fullWidth
          onPress={() => router.push('/(tabs)/eat')} />
        <Typography tone="secondary" size="small">Food logging and meal photos arrive in Phase 4. No meal entries are invented.</Typography>
      </Card>
      {(!local.onboardingFinished || !hasTarget) && <Card title="Getting started">
        <Typography tone="secondary">Add what matters to you. Every integration is optional.</Typography>
        <ListRow title="Continue setup" detail="Profile, target, health and Hiku"
          onPress={() => router.push({ pathname: '/onboarding/[step]',
            params: { step: setupSteps[local.savedStep] ?? 'welcome' } })} />
      </Card>}
      <Card rim="train" title="Training">
        <Typography tone="secondary">Coming in Phase 3: workouts and your training plan.</Typography>
      </Card>
      {promptHealth && <Card title="Health Connect permissions" rim="health">
        <Typography tone="secondary">Steps and heart rate are hidden, not zero, until you allow a source.</Typography>
        <View style={{ flexDirection: 'row', flexWrap:'wrap',gap:theme.space[2] }}>
          <Button label="Turn on" variant="secondary" onPress={() =>
            router.push('/(tabs)/progress/health-permissions')} />
          <Button label="Not now" variant="ghost" onPress={() => setConnectDismissed(true)} />
        </View>
      </Card>}
      <Card rim="health" title="Activity today">
        {snapshot.availability !== 'available' && <Button label="Connect Health Connect" variant="secondary"
          onPress={() => router.push('/(tabs)/progress/health-permissions')} />}
        {justUpdated && <Typography tone="secondary" size="small">Updated just now</Typography>}
        {steps?.state === 'value' ? steps.sources.map(source =>
          <ListRow key={source.origin} title={`${source.label} steps`}
            detail={source.stale ? `Stale · ${ageLabel(source.latestAt)}` : 'Health Connect · read only'}
            suffix={<View style={{ gap: theme.space[1], alignItems: 'flex-end' }}>
              <Typography>{source.value.toLocaleString()}</Typography>
              <Chip kind={source.label === 'Phone' ? 'phone' : 'pending'}
                label={source.label === 'Phone' ? 'Phone' : 'Unverified device'} />
              {source.stale && <Chip kind="stale" label={ageLabel(source.latestAt)} />}
            </View>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">Steps: {steps?.note ?? 'Checking Health Connect…'}</Typography>}
        {hr?.state === 'value' ? hr.sources.map(source =>
          <ListRow key={source.origin} title={`Heart rate · ${source.label}`}
            detail={source.stale
              ? `Stale · ${ageLabel(source.latestAt)} · unverified device`
              : 'Unverified device · not confirmed from a watch'}
            suffix={<View style={{ gap: theme.space[1], alignItems: 'flex-end' }}>
              <Typography>{source.value} bpm</Typography>
              <Chip kind="pending" label="Unverified device" />
              {source.stale && <Chip kind="stale" label={ageLabel(source.latestAt)} />}
            </View>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">Heart rate: {hr?.note ?? 'Checking Health Connect…'}</Typography>}
        <Typography tone="secondary">Energy: No measured source</Typography>
        {steps?.sources.length !== 1 && (steps?.sources.length ?? 0) > 1 &&
          <Typography tone="secondary" size="small">Each source is shown separately. Steps are never added across devices.</Typography>}
        <Button label="Health details and permissions" variant="ghost" fullWidth
          onPress={() => router.push('/(tabs)/progress/health')} />
      </Card>
      <Card rim="hiku" title="Hiku">
        <Typography tone="secondary">{local.offline ? 'Hiku needs internet.' :
          local.key === 'ready' ? 'API key ready. AI only runs when you request it.' :
          local.key === 'missing' ? 'Add your Anthropic key when you want to use Hiku.' :
          'Your saved key needs attention in Settings.'}</Typography>
        {local.key !== 'ready' && <Button label="Add API key" variant="secondary"
          onPress={() => router.push({ pathname:'/onboarding/[step]',params:{step:'hiku'} })} />}
        <Button label="Open Hiku" variant="ghost" onPress={() => router.push('/(tabs)/hiku')} />
      </Card>
      <Card rim="eat" title="Meals today">
        <Typography tone="secondary">Nothing logged yet. Nutrition diary arrives in Phase 4.</Typography>
      </Card>
    </ScrollView>
  </Screen>;
}
