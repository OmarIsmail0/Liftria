import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import * as Network from 'expo-network';
import { useTheme } from '../../src/design/ThemeProvider';
import { Banner, Button, Card, Chip, Header, ListRow, Orb, Screen, Typography } from '../../src/design/primitives';
import { getProfile, type Profile } from '../../src/services/database/profile';
import { getCurrentTarget, type Target } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { keyState, type KeyState } from '../../src/services/secure-storage';
import { overviewMetrics, useHealthSnapshot } from '../../src/features/health/useHealthSnapshot';
import { sourceName } from '../../src/features/health/presentation';

type LocalToday = {
  profile: Profile | null; target: Target | null; hideNumbers: boolean;
  key: KeyState['status']; offline: boolean; onboardingFinished: boolean;
};
const emptyToday: LocalToday = {
  profile: null, target: null, hideNumbers: false, key: 'missing',
  offline: false, onboardingFinished: false,
};

export default function TodayTab() {
  const { theme } = useTheme();
  const [local, setLocal] = useState<LocalToday>(emptyToday);
  const { snapshot, refreshing, refresh } = useHealthSnapshot(overviewMetrics);
  const [localLoading, setLocalLoading] = useState(true);
  async function loadLocal() {
    const [profile, target, hide, completed, key, net] = await Promise.all([
      getProfile(), getCurrentTarget(), getTypedSetting('hideNumbers'),
      getTypedSetting('onboarding.completedAt'), keyState(),
      Network.getNetworkStateAsync().catch(() => null),
    ]);
    setLocal({
      profile: profile.ok ? profile.value : null,
      target: target.ok ? target.value : null,
      hideNumbers: hide.ok ? hide.value : false,
      onboardingFinished: completed.ok && completed.value !== null,
      key: key.status,
      offline: net?.isConnected === false || net?.isInternetReachable === false,
    });
    setLocalLoading(false);
  }
  useEffect(() => { void loadLocal(); }, []);
  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const steps = snapshot.readings.steps;
  const hr = snapshot.readings['heart-rate'];
  const hasTarget = local.target !== null;
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
        active={!localLoading} onPress={() => router.push('/(tabs)/eat')} />
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
          <Typography tone="secondary" size="small">No target yet · Set a target whenever you're ready.</Typography>
          <Button label="Set a target" variant="secondary" onPress={() => router.push('/settings')} />
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
          onPress={() => router.push('/settings')} />
      </Card>}
      <Card rim="train" title="Training">
        <Typography tone="secondary">Coming in Phase 3: workouts and your training plan.</Typography>
      </Card>
      <Card rim="health" title="Activity today">
        {steps?.state === 'value' ? steps.sources.map(source =>
          <ListRow key={source.origin} title={`${source.label} steps`}
            detail={source.stale ? 'Stale reading' : 'Health Connect · read only'}
            suffix={<Typography>{source.value.toLocaleString()}</Typography>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">Steps: {steps?.note ?? 'Checking Health Connect…'}</Typography>}
        {hr?.state === 'value' ? hr.sources.map(source =>
          <ListRow key={source.origin} title={`Heart rate · ${source.label}`}
            detail="Unverified device · not confirmed from a watch"
            suffix={<Typography>{source.value} bpm</Typography>}
            onPress={() => router.push('/(tabs)/progress/health')} />)
          : <Typography tone="secondary">Heart rate: {hr?.note ?? 'Checking Health Connect…'}</Typography>}
        <Typography tone="secondary">Energy: {snapshot.energy
          ? `${Math.round(snapshot.energy.kcal)} kcal · ${sourceName(snapshot.energy.origin)} (source-backed window)`
          : 'No measured source'}</Typography>
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
        <Button label="Open Hiku" variant="secondary" onPress={() => router.push('/(tabs)/hiku')} />
      </Card>
      <Card rim="eat" title="Meals today">
        <Typography tone="secondary">Nothing logged yet. Nutrition diary arrives in Phase 4.</Typography>
      </Card>
    </ScrollView>
  </Screen>;
}
