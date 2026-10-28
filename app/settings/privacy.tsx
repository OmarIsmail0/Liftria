import { router } from 'expo-router';
import { Card, Header, Screen, Typography } from '../../src/design/primitives';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { backOrReplace } from '../../src/navigation/back';

export default function PrivacyDetails() {
  const { t } = useLanguage();
  return <Screen>
    <Header title={t('p4.privacy.0')} subtitle={t('p4.privacy.1')}
      onBack={() => backOrReplace(router, '/settings')} />
    <Card title={t('p4.privacy.2')}>
      <Typography>{t('p4.privacy.3')}</Typography>
      <Typography tone="secondary">{t('p4.privacy.4')}</Typography>
    </Card>
    <Card title={t('p4.privacy.5')}>
      <Typography>{t('p4.privacy.6')}</Typography>
      <Typography>{t('p4.privacy.7')}</Typography>
      <Typography>{t('p4.privacy.8')}</Typography>
      <Typography tone="secondary" size="small">{t('p4.privacy.9')}</Typography>
      <Typography tone="secondary" size="small">{t('p4.privacy.10')}</Typography>
    </Card>
    <Card title={t('p4.privacy.11')}>
      <Typography>{t('p4.privacy.12')}</Typography>
      <Typography>{t('p4.privacy.13')}</Typography>
      <Typography tone="secondary">{t('p4.privacy.14')}</Typography>
    </Card>
  </Screen>;
}
