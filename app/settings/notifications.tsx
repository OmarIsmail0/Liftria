import { useLanguage } from '../../src/i18n/LanguageProvider';
import { router } from 'expo-router';
import { Chip, Header, ListGroup, ListRow, Screen, SectionHeader, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';

/** TR-9 can request notification permission during the first rest. Timing remains pending device proof. */
export default function Notifications() {
 const {t}=useLanguage();
  return <Screen>
    <Header mode="inline" title={t('settings.home.notifications')}
      onBack={()=>backOrReplace(router,'/settings')} />
    <SectionHeader title={t('notifications.restTitle')} />
    <Chip kind="pending" label={t('notifications.pending')} />
    <Typography tone="secondary" size="secondary">{t('notifications.subtitle')}</Typography>
    <Typography tone="secondary" size="secondary">{t('notifications.restNote')}</Typography>
    <ListGroup>
      <ListRow title={t('notifications.row')} detail={t('notifications.rowDetail')} />
    </ListGroup>
    <SectionHeader title={t('notifications.mealsTitle')} />
    <Chip kind="pending" label={t('notifications.future')} />
    <Typography tone="secondary" size="secondary">{t('notifications.mealNote')}</Typography>
    <ListGroup>
      <ListRow title={t('notifications.breakfast')} value={t('notifications.defaultMorning')} />
      <ListRow title={t('notifications.lunch')} value={t('notifications.defaultNoon')} />
      <ListRow title={t('notifications.dinner')} value={t('notifications.defaultEvening')} />
    </ListGroup>
    <Typography tone="secondary" size="secondary">{t('notifications.examples')}</Typography>
  </Screen>;
}
