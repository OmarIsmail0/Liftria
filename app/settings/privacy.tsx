import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Header, ListGroup, Screen, SectionHeader, Toggle, Typography } from '../../src/design/primitives';
import { useTheme } from '../../src/design/ThemeProvider';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { backOrReplace } from '../../src/navigation/back';
import { getTypedSetting, setTypedSetting } from '../../src/services/database/settings';

export default function PrivacyDetails() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [showPhotos, setShowPhotos] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    void getTypedSetting('progress.showPhotos').then(result => {
      if (!alive) return;
      if (result.ok) setShowPhotos(result.value);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);
  async function changeShowPhotos(next: boolean) {
    setError(false);
    const saved = await setTypedSetting('progress.showPhotos', next);
    if (saved.ok) setShowPhotos(next);
    else setError(true);
  }
  return <Screen>
    <Header mode="inline" title={t('p4.privacy.0')}
      onBack={() => backOrReplace(router, '/settings')} />
    <Typography tone="secondary" size="secondary">{t('p4.privacy.1')}</Typography>
    <SectionHeader title={t('p4.privacy.2')} />
    <Typography>{t('p4.privacy.3')}</Typography>
    <Typography tone="secondary" size="secondary">{t('p4.privacy.4')}</Typography>
    <Typography tone="secondary" size="secondary">{t('progressPhotos.privacy')}</Typography>
    {ready && <ListGroup>
      <View style={{ paddingHorizontal: theme.space[4], paddingVertical: theme.space[2] }}>
        <Toggle label={t('progressPhotos.showSetting')} detail={t('progressPhotos.showSettingDetail')}
          value={showPhotos} onChange={next => void changeShowPhotos(next)} />
      </View>
    </ListGroup>}
    {error && <Typography tone="secondary">{t('progressPhotos.settingError')}</Typography>}
    <SectionHeader title={t('p4.privacy.5')} />
    <Typography>{t('p4.privacy.6')}</Typography>
    <Typography>{t('p4.privacy.7')}</Typography>
    <Typography>{t('p4.privacy.8')}</Typography>
    <Typography tone="secondary" size="secondary">{t('p4.privacy.9')}</Typography>
    <Typography tone="secondary" size="secondary">{t('p4.privacy.10')}</Typography>
    <Typography tone="secondary" size="secondary">{t('p4.privacy.17')}</Typography>
    <SectionHeader title={t('p4.privacy.15')} />
    <Typography>{t('p4.privacy.16')}</Typography>
    <SectionHeader title={t('p4.privacy.11')} />
    <Typography>{t('p4.privacy.12')}</Typography>
    <Typography>{t('p4.privacy.13')}</Typography>
    <Typography tone="secondary" size="secondary">{t('p4.privacy.14')}</Typography>
  </Screen>;
}
