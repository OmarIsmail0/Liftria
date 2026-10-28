import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as Network from 'expo-network';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { fontFamilyFor } from '../../src/design/fonts';
import type { TranslationKey } from '../../src/i18n';
import { Button, Card, Field, Header, Orb, Screen, OptionRows, SegmentedControl, Sheet, Typography } from '../../src/design/primitives';
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
  welcome: 'onboarding.welcomeToLiftria', privacy: 'onboarding.yourDataStaysWithYou',
  profile: 'onboarding.tellUsAboutYourself', goal: 'onboarding.whatIsYourGoal',
  target: 'onboarding.yourDailyEstimate', health: 'onboarding.connectHealthConnect',
  watch: 'onboarding.syncYourWatch', hiku: 'onboarding.setUpHiku', done: 'onboarding.youReReady',
};
const descriptions: Record<OnboardingStep, TranslationKey> = {
  welcome: 'onboarding.aQuieterHomeForTraining',
  privacy: 'onboarding.liftriaKeepsYourProfileAnd',
  profile: 'onboarding.allFieldsAreOptionalYou',
  goal: 'onboarding.tellLiftriaAboutYourRoutine',
  target: 'onboarding.anEstimateNotAPrescription',
  health: 'onboarding.liftriaRequestsReadOnlyAccess',
  watch: 'onboarding.chooseTheAppThatSyncs',
  hiku: 'onboarding.addAnAnthropicApiKey',
  done: 'onboarding.startWithAnEmptyDiary',
};

function ChoiceGroup<T extends string>({ label, choices, selected, onChange }: {
  label: string; choices: readonly { value: T; label: string }[]; selected: T | null; onChange: (v: T) => void;
}) {
  const { theme } = useTheme();
  const { language } = useLanguage();
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
            fontSize: theme.type.body.size, fontFamily: fontFamilyFor('Figtree', '400', language === 'ar') }}>{choice.label}</Text>
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
  const caption = step === 'done' ? null : t('onboarding.stepOf8', { number: onboardingSteps.indexOf(step) + 1 });
  return <Screen scroll={false}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Header title={t(titles[step])} onBack={onBack} right={onSkip
        ? <Button label={t('onboarding.skip')} size="sm" variant="ghost" onPress={onSkip} /> : undefined} />
      {caption && <Typography size="small" tone="secondary">{caption}</Typography>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        paddingVertical: theme.space[4], gap: theme.space[4], flexGrow: 1,
      }}>
        <Typography tone="secondary">{t(descriptions[step])}</Typography>
        {children}
      </ScrollView>
      {footer}
      <View style={{ paddingVertical: theme.space[3], gap: theme.space[2] }}>
        <Button label={busy ? t('onboarding.saving') : primary} fullWidth disabled={busy || primaryDisabled} onPress={onPrimary} />
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
  const [healthStatus, setHealthStatus] = useState(t('onboarding.notConnected'));
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
    }).catch(() => { if (mounted) { setLoaded(true); setError(t('onboarding.localSettingsCouldNotBe')); } });
    if(Platform.OS==='android')void healthConnect.getAvailability().then(availability => {
      if (mounted) {
        setHealthAvailability(availability);
        if (availability !== 'available') setHealthStatus(availabilityMessage(availability, language));
      }
    }).catch(() => { if (mounted) setHealthAvailability('unsupported'); });
    else {
      setHealthAvailability('unsupported');
      setHealthStatus(t('iosHealth.coming'));
    }
    return () => { mounted = false; };
  }, [language,t]);

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
  const errors = {
    name: rawErrors.name ? t('onboarding.validation.nameTooLong') : undefined,
    age: rawErrors.age ? t('onboarding.validation.ageRange') : undefined,
    heightCm: rawErrors.heightCm ? t('onboarding.validation.heightRange') : undefined,
    weightKg: rawErrors.weightKg ? t('onboarding.validation.weightRange') : undefined,
  };

  async function go(next: OnboardingStep) {
    setBusy(true); setError(null);
    try {
      const okDraft = await writeDraft(draft);
      const okStep = okDraft && await writeStep(next);
      if (!okStep) { setError(t('onboarding.couldNotSaveLocallyTry')); return; }
      router.replace({ pathname: '/onboarding/[step]', params: { step: next } });
    } catch { setError(t('onboarding.couldNotSaveLocallyTry')); }
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
    if (!saved) { setBusy(false); setError(t('onboarding.couldNotSaveProfileDraft')); return; }
    const moved = await writeStep('goal');
    setBusy(false);
    if (!moved) { setError(t('onboarding.couldNotSaveOnboardingProgress')); return; }
    router.replace({ pathname: '/onboarding/[step]', params: { step: 'goal' } });
  }

  // ON-5 persists a validated snapshot into v2 target history; no synthetic target.
  async function chooseTarget(source: 'estimate' | 'manual') {
    setBusy(true); setError(null);
    const saved = await persistTarget(draft, source);
    setBusy(false);
    if (!saved) { setError(t('onboarding.couldNotSaveYourTarget')); return; }
    await go('health');
  }

  async function requestHealth() {
    if(Platform.OS!=='android')return; // Never access Health Connect on iPhone.
    setBusy(true); setError(null);
    try {
      const availability = await healthConnect.getAvailability();
      setHealthAvailability(availability);
      if (availability !== 'available') { setHealthStatus(availabilityMessage(availability, language)); return; }
      const permissions = await healthConnect.requestPermissions([...metricTypes]);
      const granted = Object.values(permissions).filter(p => p === 'granted').length;
      const historyStatus = await requestHistoryReadPermission();
      const history = historyStatus === 'granted' ? t('onboarding.health.historyGranted') :
        historyStatus === 'denied' ? t('onboarding.health.historyDenied') :
          historyStatus === 'unverified' ? t('onboarding.health.historyUnknown') : t('onboarding.health.historyUnavailable');
      setHealthMissing(missingHealthPermissions(permissions, language));
      setHealthStatus(granted === metricTypes.length
        ? t('onboarding.allDataTypesAllowedHistory', { count: granted, history })
        : t('onboarding.ofDataTypesAllowedHistory', { granted, total: metricTypes.length, history }));
    } catch { setHealthStatus(t('onboarding.healthConnectCouldNotFinish')); }
    finally { setBusy(false); }
  }

  async function saveHikuKey(): Promise<boolean> {
    if (!isKeyWellFormed(keyInput)) { setError(t('onboarding.thatDoesnTLookLike')); return false; }
    setBusy(true); setError(null);
    try {
      const result = await saveKey(keyInput);
      if (result.status !== 'ready') {
        setError(t('onboarding.theKeyCouldNotBe'));
        return false;
      }
      setKeySaved(true);
      setKeyInput(''); // Never write the key to SQLite or an onboarding draft.
      setKeyTestResult(null);
      return true;
    } catch {
      setError(t('onboarding.theKeyCouldNotBe'));
      return false;
    } finally { setBusy(false); }
  }

  async function testSavedKey() {
    setBusy(true); setError(null);
    try {
      const connection = await Network.getNetworkStateAsync();
      if (connection.isConnected === false || connection.isInternetReachable === false) {
        setKeyTestResult(t('onboarding.savedWeLlCheckIt'));
        return;
      }
      const key = await getKey();
      if (!key || !isKeyWellFormed(key)) {
        setKeyTestResult(t('onboarding.saveYourKeyOnThis'));
        return;
      }
      // Explicit user-initiated check only. No local profile, diary or health
      // information is sent; key is used only in the request's auth header.
      const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        method: 'GET',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      setKeyTestResult(response.ok ? t('onboarding.keyVerifiedWithAnthropic') :
        response.status === 401 ? t('onboarding.anthropicDidNotAcceptThis') :
          t('onboarding.anthropicCouldNotVerifyThe'));
    } catch {
      setKeyTestResult(t('onboarding.couldNotReachAnthropicYour'));
    } finally { setBusy(false); }
  }

  async function acknowledgePrivacy() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await setSetting('onboarding.privacyAcknowledged', JSON.stringify(true));
      if (!result.ok) { setError(t('onboarding.couldNotSavePrivacyAcknowledgement')); return; }
      await go('profile');
    } catch {
      setError(t('onboarding.couldNotSavePrivacyAcknowledgement'));
    } finally { setBusy(false); }
  }

  async function finish() {
    setBusy(true);
    const completed = await markOnboardingComplete();
    if (completed) router.replace('/(tabs)/today');
    else { setBusy(false); setError(t('onboarding.couldNotSaveCompletionLocally')); }
  }

  async function finishLater() {
    setBusy(true);
    const saved = await writeDraft(draft) && await markOnboardingDeferred();
    setBusy(false);
    if (saved) router.replace('/(tabs)/today');
    else setError(t('onboarding.couldNotSaveYourProgress'));
  }

  if (!loaded) return <Screen scroll={false}><Typography>{t('onboarding.loadingLocalSetup')}</Typography></Screen>;

  const primary = step === 'welcome' ? t('onboarding.getStarted') : step === 'privacy' ? t('onboarding.iUnderstand')
    : step === 'done' ? t('onboarding.openToday') : step === 'profile' ? t('onboarding.continue')
    : step === 'target' ? (estimate ? t('onboarding.useThisEstimate') : t('onboarding.continueWithoutATarget')) : t('onboarding.continue');

  const child = step === 'welcome'
    ? <Card rim="hiku">
      <Typography size="head">{t('onboarding.aLocalFirstSpaceFor')}</Typography>
      <Typography tone="secondary">{t('onboarding.todayStartsEmptyYouDecide')}</Typography>
          <InlineError message={error} />
    </Card>
    : step === 'privacy'
      ? <Card title={t('onboarding.privacyByDesign')}>
        <Typography>{Platform.OS==='ios'?t('iosHealth.description'):
          t('onboarding.healthConnectReadOnlyWith')}</Typography>
        <Typography>{t('onboarding.profileGoalsAndHistoryStored')}</Typography>
        <Typography>{t('onboarding.hikuUsesYourOwnAnthropic')}</Typography>
        <Typography tone="secondary" size="small">{t('onboarding.noBackendAccountNoAutomatic')}</Typography>
          <InlineError message={error} />
      </Card>
      : step === 'profile'
        ? <Card title={t('onboarding.yourProfileOptional')}>
          <Field label={t('onboarding.nameOptional')} value={draft.name} onChangeText={text => patch('name', text)} placeholder={t('onboarding.whatShouldWeCallYou')} error={errors.name} />
          <Field label={t('onboarding.age16100')} value={age} onChangeText={setAge} keyboardType="numeric" placeholder={t('onboarding.years')} error={errors.age} />
          <Field label={t('onboarding.heightCm')} value={draft.heightCm} onChangeText={text => patch('heightCm', text)} keyboardType="decimal-pad" placeholder="120–230" error={errors.heightCm} />
          <Field label={t('onboarding.weightKg')} value={draft.weightKg} onChangeText={text => patch('weightKg', text)} keyboardType="decimal-pad" placeholder="35–300" error={errors.weightKg} />
          <SegmentedControl label={t('onboarding.sexForFormula')}
            value={draft.sexForFormula === 'unspecified' ? null : draft.sexForFormula}
            options={[{ value: 'male', label: t('onboarding.male') },
              { value: 'female', label: t('onboarding.female') }] as const}
            onChange={v => patch('sexForFormula', v)} />
          <Typography tone="secondary" size="small">{t('polish.sexExplanation')}</Typography>
          {draft.sexForFormula!==null&&<Button label={t('polish.clearSelection')} variant="ghost"
            onPress={()=>patch('sexForFormula',null)}/>}
          <InlineError message={error} />
        </Card>
        : step === 'goal'
          ? <Card title={t('onboarding.yourPlan')}>
            <OptionRows label={t('onboarding.activityLevel')} value={draft.activity}
              options={[{ value: 'sitting', label: t('onboarding.mostlySitting'), description: t('polish.activitySitting') },
                { value: 'some', label: t('onboarding.onMyFeetSome'), description: t('polish.activitySome') },
                { value: 'active', label: t('onboarding.activeJobOrDailyTraining'), description: t('polish.activityActive') }] as const}
              onChange={v => patch('activity', v)} />
            <OptionRows label={t('onboarding.goal')} value={draft.goal}
              options={[{ value: 'lose', label: t('onboarding.lose'), description: t('polish.goalLose') },
                { value: 'maintain', label: t('onboarding.maintain'), description: t('polish.goalMaintain') },
                { value: 'build', label: t('onboarding.build'), description: t('polish.goalBuild') }] as const}
              onChange={v => patch('goal', v)} />
          <InlineError message={error} />
          </Card>
          : step === 'target'
            ? <Card rim="eat" title={t('onboarding.calorieAndMacroEstimate')}>
              {estimate ? <>
                <Orb eaten={0} target={estimate.kcal} active={false} />
                <Typography size="head">{t('onboarding.kcalEstimate', { count: estimate.kcal })}</Typography>
                <Typography tone="secondary">{t('onboarding.proteinGFatGCarbs', { protein: estimate.proteinG, fat: estimate.fatG, carbs: estimate.carbsG })}</Typography>
                <Typography tone="secondary" size="small">{t('onboarding.mifflinStJeorAgeHeight', { age: estimate.inputs.age, height: estimate.inputs.heightCm, weight: estimate.inputs.weightKg, activity: estimate.inputs.activityFactor, goal: Math.round((estimate.inputs.goalFactor - 1) * 100) })}</Typography>
                <Typography tone="secondary" size="small">{t('onboarding.thisEstimateWillBeSaved')}</Typography>
                {estimate.lessPrecise && <Typography tone="secondary">{t('onboarding.estimateLessPreciseSexFor')}</Typography>}
                {targetSafety(estimate.kcal, null).warning && <Typography tone="secondary">{t('onboarding.thisIsLowerThanLiftria')}</Typography>}
                <Button variant="secondary" label={t('onboarding.setMyOwnNumbers')} onPress={() => {
                  setDraft(current => ({ ...current, manualKcal: String(estimate.kcal), manualProtein: String(estimate.proteinG), manualFat: String(estimate.fatG), manualCarbs: String(estimate.carbsG) })); setEditManual(true);
                }} />
              </> : <Typography tone="secondary">{t('onboarding.noEstimateWithoutCompleteAge')}</Typography>}
              {!estimate && <Button variant="secondary" label={t('onboarding.setMyOwnNumbers')} onPress={() => setEditManual(true)} />}
          <InlineError message={error} />
            </Card>
            : step === 'health'
              ? Platform.OS==='ios'
                ? <Card rim="health" title={t('iosHealth.coming')}>
                  <Typography>{t('iosHealth.description')}</Typography>
                  <Typography tone="secondary">{t('iosHealth.noData')}</Typography>
                  <InlineError message={error} />
                </Card>
                : <Card rim="health" title={t('onboarding.connectOnDeviceHealthData')}>
                <Typography>{t('onboarding.readStepsHeartRateMovement')}</Typography>
                <Typography tone="secondary">{t('onboarding.dataMayStartFromThe')}</Typography>
                <Button label={t('onboarding.openHealthConnectPermissions')} onPress={() => void requestHealth()} />
                <Typography tone="secondary">{healthStatus}</Typography>
                {healthMissing.map(note => <Typography key={note} tone="secondary" size="small">ⓘ {note}</Typography>)}
          <InlineError message={error} />
                {Platform.OS==='android'&&offerHealthConnectInstall(healthAvailability) &&
                  <Button variant="ghost" label={t('onboarding.getHealthConnect')} onPress={() =>
                    void Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata')} />}
              </Card>
              : step === 'watch'
                ? <Card title={t('onboarding.watchDataGuidance')}>
                  <ChoiceGroup label={t('onboarding.whichAppDoesYourWatch')} selected={draft.selectedWatch}
                    choices={watchOptions.map(v => ({ value: v, label: v === 'Other' ? t('onboarding.other') : v === 'No watch' ? t('onboarding.noWatch') : v }))}
                    onChange={v => patch('selectedWatch', v)} />
                  {Platform.OS==='ios'?
                    <Typography tone="secondary">{t('iosHealth.watch')}</Typography>:
                    draft.selectedWatch !== 'No watch' && <>
                    <Typography>{t('onboarding.1OpenAndLetIt', { app: draft.selectedWatch })}</Typography>
                    <Typography>{t('onboarding.2InHealthConnectGrant')}</Typography>
                    <Typography tone="secondary">{t('onboarding.syncStartsTodaySomeBrands')}</Typography>
                  </>}
                  <InlineError message={error} />
                </Card>
                : step === 'hiku'
                  ? <Card rim="hiku" title={t('onboarding.yourPrivateApiKey')}>
                    <Field label={t('onboarding.anthropicApiKey')} value={keyInput} onChangeText={value => {
                      setKeyInput(value); setKeySaved(false); setKeyTestResult(null);
                    }}
                      secure placeholder="sk-ant-…" />
                    <Typography tone="secondary" size="small">{t('onboarding.longPressInTheKey')}</Typography>
                    <Button label={t('onboarding.saveKeyOnThisPhone')} onPress={() => void saveHikuKey()} disabled={keySaved || !keyInput.trim()} />
                    {keySaved && <>
                      <Typography tone="secondary">{t('onboarding.keySavedSecurelyOnlyThe')}</Typography>
                      <Button label={t('onboarding.testKeyOptional')} variant="secondary" onPress={() => void testSavedKey()} disabled={busy} />
                    </>}
                    {keyTestResult && <Typography tone="secondary" size="small">{keyTestResult}</Typography>}
          <InlineError message={error} />
                  </Card>
                  : <Card title={t('onboarding.yourOwnPace')}>
                    <Typography>{t('onboarding.everythingYouEnteredStaysOn')}</Typography>
                    <Typography tone="secondary">{t('onboarding.noMealsOrWorkoutsWere')}</Typography>
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
        if (saved) await go('target'); else setError(t('onboarding.couldNotSaveYourProfile'));
      })(); return; }
      if (step === 'target' && estimate) {
        const safety = targetSafety(estimate.kcal, null);
        if (safety.blocked) { setError(t('onboarding.aTargetBelow1000')); return; }
        setManualWarning(false);
        setFloorOpen(safety.warning);
        if (!safety.warning) void chooseTarget('estimate');
        return;
      }
      void go(nextOnboardingStep(step));
    }} footer={optionalStep(step) ? <Button label={t('onboarding.finishLater')} variant="ghost" size="sm"
      onPress={() => void finishLater()} /> : undefined}>
    {child}
    <Sheet visible={floorOpen} title={t('onboarding.checkYourCalorieTarget')} description={t('onboarding.thisIsLowerThanLiftria')}
      onClose={() => setFloorOpen(false)}>
      <Button label={manualWarning ? t('onboarding.useMyTargetAnyway') : t('onboarding.useThisEstimateAnyway')} fullWidth
        onPress={() => { setFloorOpen(false); void chooseTarget(manualWarning ? 'manual' : 'estimate'); }} />
    </Sheet>
    <Sheet visible={editManual} title={t('onboarding.setMyOwnNumbers')} description={t('onboarding.aTargetBelow1000')}
      onClose={() => setEditManual(false)}>
      <Field label={t('onboarding.dailyKcal')} value={draft.manualKcal} keyboardType="numeric" onChangeText={s => patch('manualKcal', s)} />
      <Field label={t('onboarding.proteinG')} value={draft.manualProtein} keyboardType="numeric" onChangeText={s => patch('manualProtein', s)} />
      <Field label={t('onboarding.fatG')} value={draft.manualFat} keyboardType="numeric" onChangeText={s => patch('manualFat', s)} />
      <Field label={t('onboarding.carbsG')} value={draft.manualCarbs} keyboardType="numeric" onChangeText={s => patch('manualCarbs', s)} />
      <Button label={t('onboarding.saveMyTarget')} fullWidth onPress={() => {
        const amount = Number(draft.manualKcal);
        const safety = targetSafety(amount, estimate?.kcal ?? null);
        const macros = [draft.manualProtein, draft.manualFat, draft.manualCarbs];
        if (safety.blocked) { setError(t('onboarding.aTargetBelow1000')); setEditManual(false); return; }
        if (macros.some(value => !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0)) {
          setError(t('onboarding.enterNonNegativeProteinFat')); setEditManual(false); return;
        }
        setEditManual(false);
        setManualWarning(true);
        if (safety.warning) setFloorOpen(true);
        else void chooseTarget('manual');
      }} />
    </Sheet>
  </Frame>;
}
