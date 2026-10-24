import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { Button, Card, Field, Header, Orb, Screen, Sheet, Typography } from '../../src/design/primitives';
import { emptyDraft, readDraft, readSavedStep, writeDraft, writeStep, markOnboardingComplete,
  type OnboardingDraft } from '../../src/features/onboarding/draft';
import { isOnboardingStep, nextOnboardingStep, optionalStep, onboardingSteps, previousOnboardingStep,
  type OnboardingStep } from '../../src/features/onboarding/flow';
import { canEstimateTarget, estimateTarget, profileAge, targetSafety, FLOOR_WARNING } from '../../src/features/onboarding/targetEstimate';
import { healthConnect, requestHistoryReadPermission } from '../../src/services/health';
import { metricTypes } from '../../src/services/health/types';
import { saveKey, isKeyWellFormed } from '../../src/services/secure-storage';
import { setSetting } from '../../src/services/database';

const watchOptions = ['Samsung Health', 'Fitbit', 'Garmin Connect', 'Pixel Watch (Fitbit)', 'Other', 'No watch'] as const;
const titles: Record<OnboardingStep, string> = {
  welcome: 'Welcome to Liftria', privacy: 'Your data stays with you',
  profile: 'Tell us about yourself', goal: 'What is your goal?',
  target: 'Your daily estimate', health: 'Connect Health Connect',
  watch: 'Sync your watch', hiku: 'Set up Hiku', done: 'You’re ready',
};
const descriptions: Record<OnboardingStep, string> = {
  welcome: 'A quieter home for training, nutrition and the activity you actually measured.',
  privacy: 'Liftria keeps your profile and progress on this device. It reads Health Connect only after you approve it. Hiku sends data to Anthropic only when you explicitly ask.',
  profile: 'All fields are optional. You can fill them in later. Liftria stores metric values.',
  goal: 'Tell Liftria about your routine and what you want to work toward.',
  target: 'An estimate, not a prescription. Your daily target is yours to adjust.',
  health: 'Liftria requests read-only access. It never writes to Health Connect.',
  watch: 'Choose the app that syncs your watch. This does not change its settings.',
  hiku: 'Add an Anthropic API key for Hiku. It stays in encrypted Android storage, not the database.',
  done: 'Start with an empty diary. You can set up anything you skipped later.',
};

function ChoiceGroup<T extends string>({ label, choices, selected, onChange }: {
  label: string; choices: readonly { value: T; label: string }[]; selected: T; onChange: (v: T) => void;
}) {
  const { theme } = useTheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: theme.space[2] }}>
    <Typography bold>{label}</Typography>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
      {choices.map(choice => {
        const active = selected === choice.value;
        return <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label}
          accessibilityState={{ checked: active, selected: active }} onPress={() => onChange(choice.value)}
          style={{
            minHeight: theme.size.touch.min, minWidth: theme.size.touch.min,
            paddingHorizontal: theme.space[3], paddingVertical: theme.space[3], alignItems: 'center',
            justifyContent: 'center', borderRadius: theme.radius.pill,
            backgroundColor: active ? theme.color.action.primary.bg : theme.color.bg.raised,
            borderWidth: theme.size.border.thin, borderColor: theme.controlOutline,
          }}>
          <Text allowFontScaling style={{ color: active ? theme.color.action.primary.fg : theme.color.text.primary,
            fontSize: theme.type.body.size }}>{choice.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

function Frame({ children, step, onBack, onSkip, primary, onPrimary, busy, error, footer }: {
  children: ReactNode; step: OnboardingStep; onBack?: () => void; onSkip?: () => void;
  primary: string; onPrimary: () => void; busy: boolean; error: string | null; footer?: ReactNode;
}) {
  const { theme } = useTheme();
  const index = onboardingSteps.indexOf(step);
  return <Screen scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Header title={titles[step]} onBack={onBack} right={onSkip
        ? <Button label="Skip" size="sm" variant="ghost" onPress={onSkip} /> : undefined} />
      <Typography size="small" tone="secondary">Step {index + 1} of {onboardingSteps.length}</Typography>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        paddingVertical: theme.space[4], gap: theme.space[4], flexGrow: 1,
      }}>
        <Typography tone="secondary">{descriptions[step]}</Typography>
        {children}
      </ScrollView>
      {error && <Text accessibilityRole="alert" style={{ color: theme.color.status.danger,
        paddingVertical: theme.space[2], fontSize: theme.type.body.size }}>{error}</Text>}
      {footer}
      <View style={{ paddingVertical: theme.space[3], gap: theme.space[2] }}>
        <Button label={busy ? 'Saving…' : primary} fullWidth disabled={busy} onPress={onPrimary} />
      </View>
    </KeyboardAvoidingView>
  </Screen>;
}

function parseMetric(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function OnboardingStepScreen() {
  const query = useLocalSearchParams<{ step: string }>();
  const step: OnboardingStep = isOnboardingStep(query.step) ? query.step : 'welcome';
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);
  const [age, setAge] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorOpen, setFloorOpen] = useState(false);
  const [editManual, setEditManual] = useState(false);
  const [manualWarning, setManualWarning] = useState(false);
  const [healthStatus, setHealthStatus] = useState('Not connected');
  const [keyInput, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([readDraft(), readSavedStep()]).then(([d]) => {
      if (!mounted) return;
      setDraft(d);
      setAge(d.birthYear ? String(profileAge(Number(d.birthYear))) : '');
      setLoaded(true);
    }).catch(() => { if (mounted) { setLoaded(true); setError('Local settings could not be read.'); } });
    return () => { mounted = false; };
  }, []);

  const patch = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) =>
    setDraft(old => ({ ...old, [key]: value }));

  const profile = useMemo(() => ({
    sexForFormula: draft.sexForFormula,
    birthYear: Number(draft.birthYear),
    heightCm: Number(draft.heightCm),
    weightKg: Number(draft.weightKg),
    activity: draft.activity,
    goal: draft.goal,
  }), [draft]);
  const complete = draft.birthYear !== '' && draft.heightCm !== '' && draft.weightKg !== '' &&
    canEstimateTarget(profile);
  const estimate = complete ? estimateTarget(profile) : null;
  const entered = draft.name.trim() !== '' || age.trim() !== '' ||
    draft.heightCm.trim() !== '' || draft.weightKg.trim() !== '';

  async function go(next: OnboardingStep) {
    setBusy(true); setError(null);
    try {
      const okDraft = await writeDraft(draft);
      const okStep = okDraft && await writeStep(next);
      if (!okStep) { setError('Could not save locally. Try again.'); return; }
      router.replace({ pathname: '/onboarding/[step]', params: { step: next } });
    } catch { setError('Could not save locally. Try again.'); }
    finally { setBusy(false); }
  }

  const skip = optionalStep(step) ? () => void go(nextOnboardingStep(step)) : undefined;
  const back = step !== 'welcome' ? () => void go(previousOnboardingStep(step)) : undefined;

  async function continueProfile() {
    const ageNumber = Number(age);
    if (draft.name.trim().length > 30) { setError('Name must be 30 characters or fewer.'); return; }
    if (entered && (age.trim() !== '' && (!Number.isInteger(ageNumber) || ageNumber < 16 || ageNumber > 100))) {
      setError('Enter an age between 16 and 100.'); return;
    }
    if (draft.heightCm.trim() && (parseMetric(draft.heightCm) === null || Number(draft.heightCm) < 120 || Number(draft.heightCm) > 230)) {
      setError('That height looks off. Check the unit.'); return;
    }
    if (draft.weightKg.trim() && (parseMetric(draft.weightKg) === null || Number(draft.weightKg) < 35 || Number(draft.weightKg) > 300)) {
      setError('That weight looks off. Check the unit.'); return;
    }
    const nextDraft = { ...draft, birthYear: age.trim() ? String(new Date().getFullYear() - ageNumber) : '' };
    setDraft(nextDraft);
    setBusy(true);
    const saved = await writeDraft(nextDraft);
    if (!saved) { setBusy(false); setError('Could not save profile draft locally.'); return; }
    const moved = await writeStep('goal');
    setBusy(false);
    if (!moved) { setError('Could not save onboarding progress.'); return; }
    router.replace({ pathname: '/onboarding/[step]', params: { step: 'goal' } });
  }

  // Until PR #9 is merged, this preserves the choice as a LOCAL onboarding draft,
  // never as an invented current target. Final commit to v2 targets is a separate gate.
  async function chooseTarget(source: 'estimate' | 'manual') {
    setBusy(true); setError(null);
    const chosen = source === 'estimate' ? estimate : {
      kcal: Number(draft.manualKcal), proteinG: Number(draft.manualProtein),
      fatG: Number(draft.manualFat), carbsG: Number(draft.manualCarbs),
      source: 'manual' as const, inputs: null,
    };
    const saved = chosen && (await setSetting('onboarding.targetDraft', JSON.stringify(chosen))).ok;
    setBusy(false);
    if (!saved) { setError('Could not save your target draft locally.'); return; }
    await go('health');
  }

  async function requestHealth() {
    setBusy(true); setError(null);
    try {
      const availability = await healthConnect.getAvailability();
      if (availability !== 'available') { setHealthStatus('Health Connect is ' + availability + '. Update Health Connect or choose Not now.'); return; }
      const permissions = await healthConnect.requestPermissions([...metricTypes]);
      const granted = Object.values(permissions).filter(p => p === 'granted').length;
      const history = await requestHistoryReadPermission();
      setHealthStatus(granted === 0 ? 'No permissions granted. You can continue without them.'
        : granted === metricTypes.length
          ? 'All ' + granted + ' data types allowed. History: ' + history
          : granted + ' of ' + metricTypes.length + ' data types allowed. History: ' + history +
            '. Some health cards may say Not allowed.');
    } catch { setHealthStatus('Health Connect could not finish. You can continue without it.'); }
    finally { setBusy(false); }
  }

  async function saveHikuKey() {
    if (!isKeyWellFormed(keyInput)) { setError("That doesn't look like an Anthropic API key."); return; }
    setBusy(true); setError(null);
    const result = await saveKey(keyInput);
    setBusy(false);
    if (result.status === 'ready') {
      setKeySaved(true); setKeyInput('');
    } else setError('The key could not be stored securely. Try again or skip.');
  }

  async function finish() {
    setBusy(true);
    const completed = await markOnboardingComplete();
    if (completed) router.replace('/(tabs)/today');
    else { setBusy(false); setError('Could not save completion locally.'); }
  }

  async function finishLater() {
    setBusy(true);
    const saved = await writeDraft(draft) && (await setSetting('onboarding.deferred', JSON.stringify(true))).ok;
    setBusy(false);
    if (saved) router.replace('/(tabs)/today');
    else setError('Could not save your progress locally.');
  }

  if (!loaded) return <Screen scroll={false}><Typography>Loading local setup…</Typography></Screen>;

  const primary = step === 'welcome' ? 'Get started' : step === 'privacy' ? 'I understand'
    : step === 'done' ? 'Open Today' : step === 'profile' ? 'Continue'
    : step === 'target' ? (estimate ? 'Use this estimate' : 'Continue without a target') : 'Continue';

  const child = step === 'welcome'
    ? <Card rim="hiku">
      <Typography size="head">A local-first space for daily progress</Typography>
      <Typography tone="secondary">Today starts empty. You decide what to connect and when to log.</Typography>
    </Card>
    : step === 'privacy'
      ? <Card title="Privacy by design">
        <Typography>Health Connect: read-only, with your permission.</Typography>
        <Typography>Profile, goals and history: stored on this phone.</Typography>
        <Typography>Hiku: uses your own Anthropic API key; each request requires your action.</Typography>
        <Typography tone="secondary" size="small">No backend account. No automatic AI uploads.</Typography>
      </Card>
      : step === 'profile'
        ? <Card title="Your profile (optional)">
          <Field label="Name (optional)" value={draft.name} onChangeText={text => patch('name', text)} placeholder="What should we call you?" />
          <Field label="Age (16–100)" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="Years" />
          <Field label="Height (cm)" value={draft.heightCm} onChangeText={text => patch('heightCm', text)} keyboardType="decimal-pad" placeholder="120–230" />
          <Field label="Weight (kg)" value={draft.weightKg} onChangeText={text => patch('weightKg', text)} keyboardType="decimal-pad" placeholder="35–300" />
          <ChoiceGroup label="Sex for formula" selected={draft.sexForFormula}
            choices={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
              { value: 'unspecified', label: 'Prefer not to say' }]}
            onChange={v => patch('sexForFormula', v)} />
          <Typography tone="secondary" size="small">Prefer not to say uses an averaged constant; the estimate is less precise.</Typography>
        </Card>
        : step === 'goal'
          ? <Card title="Your plan">
            <ChoiceGroup label="Activity level" selected={draft.activity}
              choices={[{ value: 'sitting', label: 'Mostly sitting' },
                { value: 'some', label: 'On my feet some' },
                { value: 'active', label: 'Active job or daily training' }]}
              onChange={v => patch('activity', v)} />
            <ChoiceGroup label="Goal" selected={draft.goal}
              choices={[{ value: 'lose', label: 'Lose' }, { value: 'maintain', label: 'Maintain' },
                { value: 'build', label: 'Build' }]} onChange={v => patch('goal', v)} />
          </Card>
          : step === 'target'
            ? <Card rim="eat" title="Calorie and macro estimate">
              {estimate ? <>
                <Orb eaten={0} target={estimate.kcal} active={false} />
                <Typography size="head">{estimate.kcal.toLocaleString()} kcal · Estimate</Typography>
                <Typography tone="secondary">Protein {estimate.proteinG} g · Fat {estimate.fatG} g · Carbs {estimate.carbsG} g</Typography>
                <Typography tone="secondary" size="small">The target choice is saved as a local draft until the Step 4 target repository is integrated.</Typography>
                {estimate.lessPrecise && <Typography tone="secondary">Estimate, less precise (sex for formula not specified).</Typography>}
                {targetSafety(estimate.kcal, null).warning && <Typography tone="secondary">{FLOOR_WARNING}</Typography>}
                <Button variant="secondary" label="Set my own numbers" onPress={() => {
                  patch('manualKcal', String(estimate.kcal)); setEditManual(true);
                }} />
              </> : <Typography tone="secondary">No target yet. Add age, height and weight in Profile, or skip this for now.</Typography>}
            </Card>
            : step === 'health'
              ? <Card rim="health" title="Connect on-device health data">
                <Typography>Read steps, heart rate, movement, exercise, sleep and body measurements only when allowed.</Typography>
                <Typography tone="secondary">Data may start from the day you connect. Phone and watch records stay separate.</Typography>
                <Button label="Open Health Connect permissions" onPress={() => void requestHealth()} />
                <Typography tone="secondary">{healthStatus}</Typography>
                <Button variant="ghost" label="Update Health Connect" onPress={() =>
                  void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />
              </Card>
              : step === 'watch'
                ? <Card title="Watch data guidance">
                  <ChoiceGroup label="Which app does your watch use?" selected={draft.selectedWatch}
                    choices={watchOptions.map(v => ({ value: v, label: v }))}
                    onChange={v => patch('selectedWatch', v)} />
                  {draft.selectedWatch !== 'No watch' && <>
                    <Typography>1. Open {draft.selectedWatch} and let it sync to Health Connect.</Typography>
                    <Typography>2. In Health Connect, grant this app permission to share new readings.</Typography>
                    <Typography tone="secondary">Sync starts today. Some brands are not yet verified; Liftria never assumes readings are from your watch.</Typography>
                  </>}
                </Card>
                : step === 'hiku'
                  ? <Card rim="hiku" title="Your private API key">
                    <Field label="Anthropic API key" value={keyInput} onChangeText={setKeyInput}
                      secure placeholder="sk-ant-…" />
                    <Typography tone="secondary" size="small">Long-press the field to paste. You pay Anthropic directly; set a spending limit in Anthropic Console.</Typography>
                    <Button label="Save key on this phone" onPress={() => void saveHikuKey()} disabled={keySaved || !keyInput.trim()} />
                    {keySaved && <Typography tone="secondary">Key saved securely. Only the masked ending will appear in Settings.</Typography>}
                  </Card>
                  : <Card title="Your own pace">
                    <Typography>Everything you entered stays on this device. Return to Settings to change it later.</Typography>
                    <Typography tone="secondary">No meals or workouts were invented during setup.</Typography>
                  </Card>;

  return <Frame step={step} busy={busy} error={error} onBack={back} onSkip={skip}
    primary={primary} onPrimary={() => {
      if (step === 'profile') { void continueProfile(); return; }
      if (step === 'privacy') {
        void setSetting('onboarding.privacyAcknowledged', JSON.stringify(true))
          .then(result => { if (result.ok) void go('profile'); else setError('Could not save privacy acknowledgement.'); });
        return;
      }
      if (step === 'done') { void finish(); return; }
      if (step === 'target' && estimate) {
        const safety = targetSafety(estimate.kcal, null);
        if (safety.blocked) { setError('A target below 1,000 kcal cannot be saved.'); return; }
        setManualWarning(false);
        setFloorOpen(safety.warning);
        if (!safety.warning) void chooseTarget('estimate');
        return;
      }
      void go(nextOnboardingStep(step));
    }} footer={optionalStep(step) ? <Button label="Finish later" variant="ghost" size="sm"
      onPress={() => void finishLater()} /> : undefined}>
    {child}
    <Sheet visible={floorOpen} title="Check your calorie target" description={FLOOR_WARNING}
      onClose={() => setFloorOpen(false)}>
      <Button label={manualWarning ? 'Use my target anyway' : 'Use this estimate anyway'} fullWidth
        onPress={() => { setFloorOpen(false); void chooseTarget(manualWarning ? 'manual' : 'estimate'); }} />
    </Sheet>
    <Sheet visible={editManual} title="Set my own numbers" description="A target below 1,000 kcal cannot be saved."
      onClose={() => setEditManual(false)}>
      <Field label="Daily kcal" value={draft.manualKcal} keyboardType="numeric" onChangeText={s => patch('manualKcal', s)} />
      <Field label="Protein (g)" value={draft.manualProtein} keyboardType="numeric" onChangeText={s => patch('manualProtein', s)} />
      <Field label="Fat (g)" value={draft.manualFat} keyboardType="numeric" onChangeText={s => patch('manualFat', s)} />
      <Field label="Carbs (g)" value={draft.manualCarbs} keyboardType="numeric" onChangeText={s => patch('manualCarbs', s)} />
      <Button label="Save my target" fullWidth onPress={() => {
        const amount = Number(draft.manualKcal);
        const safety = targetSafety(amount, estimate?.kcal ?? null);
        const macros = [draft.manualProtein, draft.manualFat, draft.manualCarbs];
        if (safety.blocked) { setError('A target below 1,000 kcal cannot be saved.'); setEditManual(false); return; }
        if (macros.some(value => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) {
          setError('Enter non-negative protein, fat and carbohydrate amounts.'); setEditManual(false); return;
        }
        setEditManual(false);
        setManualWarning(true);
        if (safety.warning) setFloorOpen(true);
        else void chooseTarget('manual');
      }} />
    </Sheet>
  </Frame>;
}
