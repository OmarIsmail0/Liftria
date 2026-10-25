import { router } from 'expo-router';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import releaseVersion from '../../src/config/releaseVersion.json';

export default function AboutHelp() {
  const { t: tr } = useLanguage();
  return <Screen>
    <Header title={tr('p4.about.0')} subtitle={tr('p4.about.1')}
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title={tr('p4.about.2')}>
      <Typography>{tr('p4.about.versionBuild',{version:releaseVersion.name,build:releaseVersion.androidCode})}</Typography>
      <Typography tone="secondary">{tr('p4.about.17')}</Typography>
    </Card>
    <Card title={tr('p4.about.3')}>
      <Chip kind="phone" label={tr('p4.about.4')} />
      <Typography tone="secondary" size="small">{tr('p4.about.18')}</Typography>
      <Chip kind="pending" label={tr('p4.about.5')} />
      <Typography tone="secondary" size="small">{tr('p4.about.19')}</Typography>
      <Chip kind="stale" label={tr('p4.about.6')} />
      <Typography tone="secondary" size="small">{tr('p4.about.20')}</Typography>
      <Chip kind="estimate" label={tr('p4.about.7')} />
      <Typography tone="secondary" size="small">{tr('p4.about.21')}</Typography>
    </Card>
    <Card title={tr('p4.about.8')}>
      <ListRow title={tr('p4.about.9')} detail={tr('p4.about.10')}
        onPress={()=>router.push('/(tabs)/progress/health-permissions')} />
      <ListRow title={tr('p4.about.11')} detail={tr('p4.about.12')}
        onPress={()=>router.push('/(tabs)/progress/health-troubleshoot')} />
      <ListRow title={tr('p4.about.13')} detail={tr('p4.about.14')}
        onPress={()=>router.push('/settings/hiku-key')} />
    </Card>
    <Card title={tr('p4.about.15')}>
      <Typography>{tr('p4.about.22')}</Typography>
      <Typography>{tr('p4.about.23')}</Typography>
      <Typography>{tr('p4.about.24')}</Typography>
      <Typography tone="secondary" size="small">{tr('p4.about.25')}</Typography>
    </Card>
    <Card title={tr('p4.about.16')}>
      <Typography tone="secondary">{tr('p4.about.26')}</Typography>
      <Typography tone="secondary">{tr('p4.about.27')}</Typography>
      <Typography tone="secondary">{tr('p4.about.28')}</Typography>
    </Card>
  </Screen>;
}
