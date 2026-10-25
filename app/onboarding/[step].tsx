import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as Network from 'expo-network';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import type { TranslationKey } from '../../src/i18n';
import { Button, Card, Field, Header, Orb, Screen, Sheet, Typography } from '../../src/design/primitives';
import { emptyDraft, readDraft, writeDraft, writeStep, markOnboardingComplete, markOnboardingDeferred,
  type OnboardingDraft } from '../../src/features/onboarding/draft';
import { isOnboardingStep, nextOnboardingStep, optionalStep, onboardingSteps, previousOnboardingStep, skipOnboardingStep,
  type OnboardingStep } from '../../src/features/onboarding/flow';
import { canEstimateTarget, estimateTarget, profileAge, targetSafety } from '../../src/features/onboarding/targetEstimate';
import { healthConnect, requestHistoryReadPermission } from '../../src/services/health';
import { metricTypes } from '../../src/services/health/types';
import { availabilityMessage, missingHealthPermissions, offerHealthConnectInstall } from '../../src/features/onboarding/healthPermissionCopy';
import { getKey, saveKey, isKeyWellFormed } from '../../src/services/secure-storage';
import { setSetting } from '../../src/services/database';
import { persistProfile, persistTarget } from '../../src/features/onboarding/persistence';
import { profileFieldErrors } from '../../src/features/onboarding/profileValidation';

const watchOptions = ['Samsung Health', 'Fitbit', 'Garmin Connect', 'Pixel Watch (Fitbit)', 'Other', 'No watch'] as const;
const titles: Record<OnboardingStep, TranslationKey> = {
  welcome: 'onboarding.copy.001', privacy: 'onboarding.copy.002',
  profile: 'onboarding.copy.003', goal: 'onboarding.copy.004',
  target: 'onboarding.copy.005', health: 'onboarding.copy.006',
  watch: 'onboarding.copy.007', hiku: 'onboarding.copy.008', done: 'onboarding.copy.009',
};
const descriptions: Record<OnboardingStep, TranslationKey> = {
  welcome: 'onboarding.copy.010',
  privacy: 'onboarding.copy.011',
  profile: 'onboarding.copy.012',
  goal: 'onboarding.copy.013',
  target: 'onboarding.copy.014',
  health: 'onboarding.copy.015',
  watch: 'onboarding.copy.016',
  hiku: 'onboarding.copy.017',
  done: 'onboarding.copy.018',
};

function ChoiceGroup<T extends string>({ label, choices, selected, onChange }: {
  label: string; choices: readonly { value: T; label: string }[]; selected: T | null; onChange: (v: T) => void;
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

function InlineError({ message }: { message: string | null }) {
  return message ? <View accessibilityRole="alert" accessible>
    <Typography tone="secondary" size="small">ⓘ {message}</Typography>
  </View> : null;
}

function Frame({ children, step, onBack, onSkip, primary, onPrimary, busy, primaryDisabled = false, footer }: {
  children: ReactNode; step: OnboardingStep; onBack?: () => void; onSkip?: () => void;
  primary: string; onPrimary: () => void; busy: boolean; primaryDisabled?: boolean; footer?: ReactNode;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const caption = step === 'done' ? null : t('onboarding.copy.021', { number: onboardingSteps.indexOf(step) + 1 });
  return <Screen scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Header title={t(titles[step])} onBack={onBack} right={onSkip
        ? <Button label={t('onboarding.copy.019')} size="sm" variant="ghost" onPress={onSkip} /> : undefined} />
      {caption && <Typography size="small" tone="secondary">{caption}</Typography>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        paddingVertical: theme.space[4], gap: theme.space[4], flexGrow: 1,
      }}>
        <Typography tone="secondary">{t(descriptions[step])}</Typography>
        {children}
      </ScrollView>
      {footer}
      <View style={{ paddingVertical: theme.space[3], gap: theme.space[2] }}>
        <Button label={busy ? t('onboarding.copy.020') : primary} fullWidth disabled={busy || primaryDisabled} onPress={onPrimary} />
      </View>
    </KeyboardAvoidingView>
  </Screen>;
}

export default function OnboardingStepScreen() {
  const { t, language } = useLanguage();
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
  const [healthStatus, setHealthStatus] = useState(t('onboarding.copy.092'));
  const [healthAvailability, setHealthAvailability] = useState<'available' | 'not-installed' | 'needs-update' | 'unsupported' | null>(null);
  const [healthMissing, setHealthMissing] = useState<string[]>([]);
  const [keyInput, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void readDraft().then(d => {
      if (!mounted) return;
      setDraft(d);
      setAge(d.birthYear ? String(profileAge(Number(d.birthYear))) : '');
      setLoaded(true);
    }).catch(() => { if (mounted) { setLoaded(true); setError(t('onboarding.copy.093')); } });
    void healthConnect.getAvailability().then(availability => {
      if (mounted) {
        setHealthAvailability(availability);
        if (availability !== 'available') setHealthStatus(availabilityMessage(availability));
      }
    }).catch(() => { if (mounted) setHealthAvailability('unsupported'); });
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
  const rawErrors = profileFieldErrors({ name: draft.name, age, heightCm: draft.heightCm, weightKg: draft.weightKg });
  const errors = language === 'en' ? rawErrors : {
    name: rawErrors.name ? 'يجب ألا يتجاوز الاسم 30 حرفًا.' : undefined,
    age: rawErrors.age ? 'أدخل عمرًا بين 16 و100 عامًا.' : undefined,
    heightCm: rawErrors.heightCm ? 'يجب أن يكون الطول بين 120 و230 cm.' : undefined,
    weightKg: rawErrors.weightKg ? 'يجب أن يكون الوزن بين 35 و300 kg.' : undefined,
  };

  async function go(next: OnboardingStep) {
    setBusy(true); setError(null);
    try {
      const okDraft = await writeDraft(draft);
      const okStep = okDraft && await writeStep(next);
      if (!okStep) { setError(t('onboarding.copy.094')); return; }
      router.replace({ pathname: '/onboarding/[step]', params: { step: next } });
    } catch { setError(t('onboarding.copy.094')); }
    finally { setBusy(false); }
  }

  // Only ON-3 Skip bypasses the estimate; ON-4 Skip opens the incomplete ON-5 state.
  const skip = optionalStep(step) ? () => void go(skipOnboardingStep(step)) : undefined;
  const back = step !== 'welcome' ? () => void go(previousOnboardingStep(step)) : undefined;

  async function continueProfile() {
    const ageNumber = Number(age);
    if (Object.values(errors).some(Boolean)) return;
    const nextDraft = { ...draft, birthYear: age.trim() ? String(new Date().getFullYear() - ageNumber) : '' };
    setDraft(nextDraft);
    setBusy(true);
    const saved = await writeDraft(nextDraft) && await persistProfile(nextDraft);
    if (!saved) { setBusy(false); setError(t('onboarding.copy.095')); return; }
    const moved = await writeStep('goal');
    setBusy(false);
    if (!moved) { setError(t('onboarding.copy.096')); return; }
    router.replace({ pathname: '/onboarding/[step]', params: { step: 'goal' } });
  }

  // ON-5 persists a validated snapshot into v2 target history; no synthetic target.
  async function chooseTarget(source: 'estimate' | 'manual') {
    setBusy(true); setError(null);
    const saved = await persistTarget(draft, source);
    setBusy(false);
    if (!saved) { setError(t('onboarding.copy.097')); return; }
    await go('health');
  }

  async function requestHealth() {
    setBusy(true); setError(null);
    try {
      const availability = await healthConnect.getAvailability();
      setHealthAvailability(availability);
      if (availability !== 'available') { setHealthStatus(availabilityMessage(availability)); return; }
      const permissions = await healthConnect.requestPermissions([...metricTypes]);
      const granted = Object.values(permissions).filter(p => p === 'granted').length;
      const history = await requestHistoryReadPermission();
      setHealthMissing(missingHealthPermissions(permissions));
      setHealthStatus(granted === metricTypes.length
        ? t('onboarding.copy.112', { count: granted, history })
        : t('onboarding.copy.113', { granted, total: metricTypes.length, history }));
    } catch { setHealthStatus(t('onboarding.copy.098')); }
    finally { setBusy(false); }
  }

  async function saveHikuKey(): Promise<boolean> {
    if (!isKeyWellFormed(keyInput)) { setError(t('onboarding.copy.099')); return false; }
    setBusy(true); setError(null);
    try {
      const result = await saveKey(keyInput);
      if (result.status !== 'ready') {
        setError(t('onboarding.copy.100'));
        return false;
      }
      setKeySaved(true);
      setKeyInput(''); // Never write the key to SQLite or an onboarding draft.
      setKeyTestResult(null);
      return true;
    } catch {
      setError(t('onboarding.copy.100'));
      return false;
    } finally { setBusy(false); }
  }

  async function testSavedKey() {
    setBusy(true); setError(null);
    try {
      const connection = await Network.getNetworkStateAsync();
      if (connection.isConnected === false || connection.isInternetReachable === false) {
        setKeyTestResult(t('onboarding.copy.101'));
        return;
      }
      const key = await getKey();
      if (!key || !isKeyWellFormed(key)) {
        setKeyTestResult(t('onboarding.copy.102'));
        return;
      }
      // Explicit user-initiated check only. No local profile, diary or health
      // information is sent; key is used only in the request's auth header.
      const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        method: 'GET',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      setKeyTestResult(response.ok ? 'Key verified with Anthropic.' :
        response.status === 401 ? 'Anthropic did not accept this key. Check it in Settings.' :
          'Anthropic could not verify the key right now. Try again when online.');
    } catch {
      setKeyTestResult(t('onboarding.copy.106'));
    } finally { setBusy(false); }
  }

  async function acknowledgePrivacy() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await setSetting('onboarding.privacyAcknowledged', JSON.stringify(true));
      if (!result.ok) { setError(t('onboarding.copy.107')); return; }
      await go('profile');
    } catch {
      setError(t('onboarding.copy.107'));
    } finally { setBusy(false); }
  }

  async function finish() {
    setBusy(true);
    const completed = await markOnboardingComplete();
    if (completed) router.replace('/(tabs)/today');
    else { setBusy(false); setError(t('onboarding.copy.108')); }
  }

  async function finishLater() {
    setBusy(true);
    const saved = await writeDraft(draft) && await markOnboardingDeferred();
    setBusy(false);
    if (saved) router.replace('/(tabs)/today');
    else setError(t('onboarding.copy.109'));
  }

  if (!loaded) return <Screen scroll={false}><Typography>{t('onboarding.copy.022')}</Typography></Screen>;

  const primary = step === 'welcome' ? t('onboarding.copy.086') : step === 'privacy' ? t('onboarding.copy.087')
    : step === 'done' ? t('onboarding.copy.088') : step === 'profile' ? t('onboarding.copy.089')
    : step === 'target' ? (estimate ? t('onboarding.copy.090') : t('onboarding.copy.091')) : t('onboarding.copy.089');

  const child = step === 'welcome'
    ? <Card rim="hiku">
      <Typography size="head">{t('onboarding.copy.023')}</Typography>
      <Typography tone="secondary">{t('onboarding.copy.024')}</Typography>
          <InlineError message={error} />
    </Card>
    : step === 'privacy'
      ? <Card title={t('onboarding.copy.025')}>
        <Typography>{t('onboarding.copy.026')}</Typography>
        <Typography>{t('onboarding.copy.027')}</Typography>
        <Typography>{t('onboarding.copy.028')}</Typography>
        <Typography tone="secondary" size="small">{t('onboarding.copy.029')}</Typography>
          <InlineError message={error} />
      </Card>
      : step === 'profile'
        ? <Card title={t('onboarding.copy.030')}>
          <Field label={t('onboarding.copy.031')} value={draft.name} onChangeText={text => patch('name', text)} placeholder={t('onboarding.copy.032')} error={errors.name} />
          <Field label={t('onboarding.copy.033')} value={age} onChangeText={setAge} keyboardType="numeric" placeholder={t('onboarding.copy.034')} error={errors.age} />
          <Field label={t('onboarding.copy.035')} value={draft.heightCm} onChangeText={text => patch('heightCm', text)} keyboardType="decimal-pad" placeholder="120–230" error={errors.heightCm} />
          <Field label={t('onboarding.copy.036')} value={draft.weightKg} onChangeText={text => patch('weightKg', text)} keyboardType="decimal-pad" placeholder="35–300" error={errors.weightKg} />
          <ChoiceGroup label={t('onboarding.copy.037')} selected={draft.sexForFormula}
            choices={[{ value: 'male', label: t('onboarding.copy.038') }, { value: 'female', label: t('onboarding.copy.039') },
              { value: 'unspecified', label: t('onboarding.copy.040') }]}
            onChange={v => patch('sexForFormula', v)} />
          <Typography tone="secondary" size="small">{t('onboarding.copy.041')}</Typography>
          <InlineError message={error} />
        </Card>
        : step === 'goal'
          ? <Card title={t('onboarding.copy.042')}>
            <ChoiceGroup label={t('onboarding.copy.043')} selected={draft.activity}
              choices={[{ value: 'sitting', label: t('onboarding.copy.044') },
                { value: 'some', label: t('onboarding.copy.045') },
                { value: 'active', label: t('onboarding.copy.046') }]}
              onChange={v => patch('activity', v)} />
            <ChoiceGroup label={t('onboarding.copy.047')} selected={draft.goal}
              choices={[{ value: 'lose', label: t('onboarding.copy.048') }, { value: 'maintain', label: t('onboarding.copy.049') },
                { value: 'build', label: t('onboarding.copy.050') }]} onChange={v => patch('goal', v)} />
          <InlineError message={error} />
          </Card>
          : step === 'target'
            ? <Card rim="eat" title={t('onboarding.copy.051')}>
              {estimate ? <>
                <Orb eaten={0} target={estimate.kcal} active={false} />
                <Typography size="head">{t('onboarding.copy.116', { count: estimate.kcal })}</Typography>
                <Typography tone="secondary">{t('onboarding.copy.117', { protein: estimate.proteinG, fat: estimate.fatG, carbs: estimate.carbsG })}</Typography>
                <Typography tone="secondary" size="small">{t('onboarding.copy.118', { age: estimate.inputs.age, height: estimate.inputs.heightCm, weight: estimate.inputs.weightKg, activity: estimate.inputs.activityFactor, goal: Math.round((estimate.inputs.goalFactor - 1) * 100) })}</Typography>
                <Typography tone="secondary" size="small">{t('onboarding.copy.052')}</Typography>
                {estimate.lessPrecise && <Typography tone="secondary">{t('onboarding.copy.053')}</Typography>}
                {targetSafety(estimate.kcal, null).warning && <Typography tone="secondary">{t('onboarding.copy.077')}</Typography>}
                <Button variant="secondary" label={t('onboarding.copy.054')} onPress={() => {
                  setDraft(current => ({ ...current, manualKcal: String(estimate.kcal), manualProtein: String(estimate.proteinG), manualFat: String(estimate.fatG), manualCarbs: String(estimate.carbsG) })); setEditManual(true);
                }} />
              </> : <Typography tone="secondary">{t('onboarding.copy.055')}</Typography>}
              {!estimate && <Button variant="secondary" label={t('onboarding.copy.054')} onPress={() => setEditManual(true)} />}
          <InlineError message={error} />
            </Card>
            : step === 'health'
              ? <Card rim="health" title={t('onboarding.copy.056')}>
                <Typography>{t('onboarding.copy.057')}</Typography>
                <Typography tone="secondary">{t('onboarding.copy.058')}</Typography>
                <Button label={t('onboarding.copy.059')} onPress={() => void requestHealth()} />
                <Typography tone="secondary">{healthStatus}</Typography>
                {healthMissing.map(note => <Typography key={note} tone="secondary" size="small">ⓘ {note}</Typography>)}
          <InlineError message={error} />
                {offerHealthConnectInstall(healthAvailability) &&
                  <Button variant="ghost" label={t('onboarding.copy.060')} onPress={() =>
                    void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />}
              </Card>
              : step === 'watch'
                ? <Card title={t('onboarding.copy.061')}>
                  <ChoiceGroup label={t('onboarding.copy.062')} selected={draft.selectedWatch}
                    choices={watchOptions.map(v => ({ value: v, label: v === 'Other' ? t('onboarding.copy.063') : v === 'No watch' ? t('onboarding.copy.064') : v }))}
                    onChange={v => patch('selectedWatch', v)} />
                  {draft.selectedWatch !== 'No watch' && <>
                    <Typography>{t('onboarding.copy.114', { app: draft.selectedWatch })}</Typography>
                    <Typography>{t('onboarding.copy.115')}</Typography>
                    <Typography tone="secondary">{t('onboarding.copy.065')}</Typography>
                  </>}
                  <InlineError message={error} />
                </Card>
                : step === 'hiku'
                  ? <Card rim="hiku" title={t('onboarding.copy.066')}>
                    <Field label={t('onboarding.copy.067')} value={keyInput} onChangeText={value => {
                      setKeyInput(value); setKeySaved(false); setKeyTestResult(null);
                    }}
                      secure placeholder="sk-ant-…" />
                    <Typography tone="secondary" size="small">{t('onboarding.copy.068')}</Typography>
                    <Button label={t('onboarding.copy.069')} onPress={() => void saveHikuKey()} disabled={keySaved || !keyInput.trim()} />
                    {keySaved && <>
                      <Typography tone="secondary">{t('onboarding.copy.070')}</Typography>
                      <Button label={t('onboarding.copy.071')} variant="secondary" onPress={() => void testSavedKey()} disabled={busy} />
                    </>}
                    {keyTestResult && <Typography tone="secondary" size="small">{keyTestResult}</Typography>}
          <InlineError message={error} />
                  </Card>
                  : <Card title={t('onboarding.copy.072')}>
                    <Typography>{t('onboarding.copy.073')}</Typography>
                    <Typography tone="secondary">{t('onboarding.copy.074')}</Typography>
          <InlineError message={error} />
                  </Card>;

  return <Frame step={step} busy={busy}
    primaryDisabled={step === 'profile' && Object.values(errors).some(Boolean)}
    onBack={back} onSkip={skip}
    primary={primary} onPrimary={() => {
      if (step === 'profile') { void continueProfile(); return; }
      if (step === 'privacy') { void acknowledgePrivacy(); return; }
      if (step === 'done') { void finish(); return; }
      if (step === 'hiku' && keyInput.trim() && !keySaved) {
        // Continue cannot silently discard an unsaved typed API key.
        void (async () => { if (await saveHikuKey()) await go('done'); })();
        return;
      }
      if (step === 'goal') { void (async () => {
        setBusy(true);
        const saved = await persistProfile(draft);
        setBusy(false);
        if (saved) await go('target'); else setError(t('onboarding.copy.110'));
      })(); return; }
      if (step === 'target' && estimate) {
        const safety = targetSafety(estimate.kcal, null);
        if (safety.blocked) { setError(t('onboarding.copy.078')); return; }
        setManualWarning(false);
        setFloorOpen(safety.warning);
        if (!safety.warning) void chooseTarget('estimate');
        return;
      }
      void go(nextOnboardingStep(step));
    }} footer={optionalStep(step) ? <Button label={t('onboarding.copy.075')} variant="ghost" size="sm"
      onPress={() => void finishLater()} /> : undefined}>
    {child}
    <Sheet visible={floorOpen} title={t('onboarding.copy.076')} description={t('onboarding.copy.077')}
      onClose={() => setFloorOpen(false)}>
      <Button label={manualWarning ? 'Use my target anyway' : 'Use this estimate anyway'} fullWidth
        onPress={() => { setFloorOpen(false); void chooseTarget(manualWarning ? 'manual' : 'estimate'); }} />
    </Sheet>
    <Sheet visible={editManual} title={t('onboarding.copy.054')} description={t('onboarding.copy.078')}
      onClose={() => setEditManual(false)}>
      <Field label={t('onboarding.copy.081')} value={draft.manualKcal} keyboardType="numeric" onChangeText={s => patch('manualKcal', s)} />
      <Field label={t('onboarding.copy.082')} value={draft.manualProtein} keyboardType="numeric" onChangeText={s => patch('manualProtein', s)} />
      <Field label={t('onboarding.copy.083')} value={draft.manualFat} keyboardType="numeric" onChangeText={s => patch('manualFat', s)} />
      <Field label={t('onboarding.copy.084')} value={draft.manualCarbs} keyboardType="numeric" onChangeText={s => patch('manualCarbs', s)} />
      <Button label={t('onboarding.copy.085')} fullWidth onPress={() => {
        const amount = Number(draft.manualKcal);
        const safety = targetSafety(amount, estimate?.kcal ?? null);
        const macros = [draft.manualProtein, draft.manualFat, draft.manualCarbs];
        if (safety.blocked) { setError(t('onboarding.copy.078')); setEditManual(false); return; }
        if (macros.some(value => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) {
          setError(t('onboarding.copy.111')); setEditManual(false); return;
        }
        setEditManual(false);
        setManualWarning(true);
        if (safety.warning) setFloorOpen(true);
        else void chooseTarget('manual');
      }} />
    </Sheet>
  </Frame>;
}
