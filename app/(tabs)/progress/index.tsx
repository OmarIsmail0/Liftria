import { router } from 'expo-router';
import { useLanguage } from '../../../src/i18n/LanguageProvider';
import { Card, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
export default function ProgressTab(){
 const { t } = useLanguage();
 return <Screen embedded>
  <Header title={t('nav.progress')}/>
  <Card rim="train" title={t('progress.strength')}>
   <Typography tone="secondary">{t('progress.strengthDescription')}</Typography>
   <ListRow title={t('progress.strengthTrends')} detail={t('progress.strengthPeriods')}
    onPress={()=>router.push('/(tabs)/progress/strength')}/>
  </Card>
  <Card rim="health" title={t('progress.health')}>
   <Typography tone="secondary">{t('progress.healthDescription')}</Typography>
   <ListRow title={t('settings.home.health')} detail={t('progress.healthOverview')}
    onPress={()=>router.push('/(tabs)/progress/health')}/>
  </Card>
  <Typography size="small" tone="secondary">{t('progress.nutritionFuture')}</Typography>
 </Screen>;
}
