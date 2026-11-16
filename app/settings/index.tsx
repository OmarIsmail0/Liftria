import { useEffect, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { I18nManager, Pressable, View } from 'react-native';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage, systemLanguage } from '../../src/i18n/LanguageProvider';
import { resolveLanguage, weightUnitLabel, type LanguagePreference } from '../../src/i18n';
import { Button, Field, Header, ListGroup, ListRow, Screen, SectionHeader, SegmentedControl, Sheet, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { devRoutesEnabled } from '../../src/navigation/devRoutes';
import { advanceVersionTap, initialVersionTapState } from '../../src/navigation/versionTap';
import releaseVersion from '../../src/config/releaseVersion.json';
import { localStorageCounts } from '../../src/services/database';
import { getProfile } from '../../src/services/database/profile';
import { getCurrentTarget } from '../../src/services/database/targets';
import { getTypedSetting } from '../../src/services/database/settings';
import { keyState } from '../../src/services/secure-storage';
import { formatLocalDatabaseSize, canDeleteEverything, deleteEverythingOnPhone } from '../../src/features/settings/storage';
import type { WeightUnit } from '../../src/features/settings/units';
import { healthCopy } from '../../src/features/health/deviceHealth';

/** Local-first grouped settings. Each row shows the current value, and theme and language open a choice. */
export default function SettingsHome() {
  const { theme, preferences, setMode, resetLocalPreferences } = useTheme();
  const { t, language, preference, setLanguage, resetLanguage } = useLanguage();
  const [reopen, setReopen] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const taps = useRef(initialVersionTapState);
  const [databaseSize, setDatabaseSize] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [weightUnit, setWeightUnit] = useState<WeightUnit | null>(null);
  const [keyHint, setKeyHint] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([
      localStorageCounts(), getProfile(), getCurrentTarget(), getTypedSetting('units.weight'), keyState(),
    ]).then(([storage, profile, target, weight, key]) => {
      if (!alive) return;
      if (storage.ok) setDatabaseSize(formatLocalDatabaseSize(storage.value.databaseBytes, language));
      const name = profile.ok ? profile.value?.name?.trim() : '';
      setProfileName(name ? name : null);
      setTargetKcal(target.ok && target.value ? target.value.kcal : null);
      setWeightUnit(weight.ok ? weight.value : null);
      setKeyHint(key.status === 'ready' ? key.hint : null);
    });
    return () => { alive = false; };
  }, [language]);
  async function changeLanguage(next: LanguagePreference) {
    const ok = await setLanguage(next);
    setLanguageError(!ok);
    if (ok && (resolveLanguage(next, systemLanguage()) === 'ar') !== I18nManager.isRTL) setReopen(true);
  }
  async function deleteAll() {
    if (busy || !canDeleteEverything(confirmation)) return;
    setBusy(true); setDeleteMessage(null);
    try {
      const result = await deleteEverythingOnPhone(confirmation, undefined, language);
      if (!result.ok) {
        setDeleteMessage(t(result.stage === 'database' ? 'dataStorage.deleteDatabaseFailed' :
          result.stage === 'key' ? 'dataStorage.deleteKeyFailed' : 'dataStorage.deleteFilesFailed'));
        setDeleteOpen(false);
        return;
      }
      setDeleteOpen(false); setConfirmation('');
      resetLocalPreferences();
      resetLanguage();
      router.dismissAll();
      router.replace({ pathname: '/onboarding/[step]', params: { step: 'welcome' } });
    } catch { setDeleteMessage(t('dataStorage.deleteFailed')); setDeleteOpen(false); }
    finally { setBusy(false); }
  }
  const themeValue = preferences.mode === 'light' ? t('appearance.light')
    : preferences.mode === 'dark' ? t('appearance.dark') : t('common.system');
  const languageValue = preference === 'ar' ? t('common.arabic')
    : preference === 'en' ? t('common.english') : t('common.system');
  const section = (title: string, rows: ReactNode) => (
    <View style={{ gap: theme.space[2] }}>
      <SectionHeader title={title} />
      <ListGroup>{rows}</ListGroup>
    </View>
  );
  return <Screen>
    <Header mode="inline" title={t('settings.home.title')} onBack={() => backOrReplace(router, '/(tabs)/today')} />
    {section(t('polish.appearance'), <>
      <ListRow title={t('appearance.theme')} value={themeValue} onPress={() => setThemeOpen(true)} />
      <ListRow title={t('language.title')} value={languageValue} onPress={() => setLanguageOpen(true)} />
    </>)}
    {languageError && <View accessibilityRole="alert">
      <Typography tone="secondary">{t('language.saveError')}</Typography>
    </View>}
    {section(t('settings.home.plan'), <>
      <ListRow title={t('settings.home.profile')} value={profileName ?? undefined}
        onPress={() => router.push('/settings/profile')} />
      <ListRow title={t('settings.home.targets')}
        value={targetKcal === null ? undefined : t('eatI.kcal', { count: targetKcal })}
        onPress={() => router.push('/settings/profile')} />
    </>)}
    {section(t('settings.home.preferences'), <>
      <ListRow title={t('settings.home.units')}
        value={weightUnit ? weightUnitLabel(language, weightUnit) : undefined}
        onPress={() => router.push('/settings/preferences')} />
      <ListRow title={t('settings.home.notifications')}
        onPress={() => router.push('/settings/notifications')} />
      <ListRow title={t('settings.home.hiku')} value={keyHint ?? undefined}
        onPress={() => router.push('/settings/hiku-key')} />
      <ListRow title={t(healthCopy('settings.title'))}
        onPress={() => router.push('/(tabs)/progress/health')} />
    </>)}
    {section(t('settings.home.dataGroup'), <>
      <ListRow title={t('settings.home.backup')} value={databaseSize ?? undefined}
        onPress={() => router.push('/settings/data')} />
      <ListRow title={t('settings.home.import')} onPress={() => router.push('/import')} />
      <ListRow title={t('p4.privacy.0')} onPress={() => router.push('/settings/privacy')} />
      <ListRow title={t('p4.about.0')} value={releaseVersion.name}
        onPress={() => router.push('/settings/about')} />
    </>)}
    <Button label={t('dataStorage.deleteTitle')} variant="destructive" fullWidth
      disabled={busy} onPress={() => setDeleteOpen(true)} />
    {deleteMessage && <View accessibilityRole="alert">
      <Typography tone="secondary">ⓘ {deleteMessage}</Typography>
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel={t('settings.home.appVersion')}
      onPress={() => {
        const next = advanceVersionTap(taps.current, Date.now());
        taps.current = next.state;
        if (next.unlocked && devRoutesEnabled()) router.push('/dev');
      }}
      style={{ minHeight: theme.size.touch.min, justifyContent: 'center' }}>
      <Typography tone="secondary" size="secondary">{t('settings.home.version', { version: releaseVersion.name })}</Typography>
    </Pressable>
    <View style={{ alignItems: 'center' }}>
      <Typography tone="secondary" size="secondary">{t('settings.home.storage', { size: databaseSize ?? t('settings.home.calculating') })}</Typography>
    </View>
    <Sheet visible={themeOpen} title={t('appearance.theme')} onClose={() => setThemeOpen(false)}>
      <SegmentedControl label={t('appearance.theme')} value={preferences.mode}
        options={[{ value: 'system', label: t('common.system') },
          { value: 'light', label: t('appearance.light') },
          { value: 'dark', label: t('appearance.dark') }] as const} onChange={setMode} />
    </Sheet>
    <Sheet visible={languageOpen} title={t('language.title')} onClose={() => setLanguageOpen(false)}>
      <SegmentedControl label={t('language.title')} value={preference}
        options={[{ value: 'system', label: t('common.system') },
          { value: 'ar', label: t('common.arabic') },
          { value: 'en', label: t('common.english') }] as const}
        onChange={v => void changeLanguage(v)} />
    </Sheet>
    <Sheet visible={reopen} title={t('language.restartTitle')}
      description={t('language.restartDescription')} onClose={() => setReopen(false)}>
      <Button label={t('common.ok')} fullWidth onPress={() => setReopen(false)} />
    </Sheet>
    <Sheet visible={deleteOpen} destructive title={t('dataStorage.deleteSheet')}
      description={t('dataStorage.deleteDescription')}
      onClose={() => { if (!busy) { setDeleteOpen(false); setConfirmation(''); } }}>
      <Field label={t('dataStorage.typeDelete')} value={confirmation} onChangeText={setConfirmation}
        placeholder="DELETE" />
      <Button label={t('dataStorage.keepData')} fullWidth disabled={busy}
        onPress={() => { setDeleteOpen(false); setConfirmation(''); }} />
      <Button label={busy ? t('dataStorage.deleting') : t('dataStorage.deleteEverything')} fullWidth variant="destructive"
        disabled={busy || !canDeleteEverything(confirmation)} onPress={() => void deleteAll()} />
    </Sheet>
  </Screen>;
}
