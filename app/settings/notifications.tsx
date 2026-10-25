import { useLanguage } from '../../src/i18n/LanguageProvider';
import { router } from 'expo-router';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';

/** TR-9 can request notification permission during the first rest. Timing remains pending device proof. */
export default function Notifications() {
 const {t}=useLanguage();
  return <Screen>
    <Header title={t('settings.home.notifications')} subtitle={t('notifications.subtitle')}
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title={t('notifications.restTitle')}>
      <Chip kind="pending" label={t('notifications.pending')} />
      <Typography tone="secondary">{t('notifications.restNote')}</Typography>
      <ListRow title={t('notifications.row')} detail={t('notifications.rowDetail')} />
    </Card>
    <Card title={t('notifications.mealsTitle')}>
      <Chip kind="pending" label={t('notifications.future')} />
      <Typography tone="secondary">{t('notifications.mealNote')}</Typography>
      <ListRow title={t('notifications.breakfast')} detail={t('notifications.defaultMorning')} />
      <ListRow title={t('notifications.lunch')} detail={t('notifications.defaultNoon')} />
      <ListRow title={t('notifications.dinner')} detail={t('notifications.defaultEvening')} />
      <Typography tone="secondary" size="small">{t('notifications.examples')}</Typography>
    </Card>
  </Screen>;
}
