import { useLanguage } from '../../src/i18n/LanguageProvider';
import { router } from 'expo-router';
import { Chip, Header, ListGroup, ListRow, Screen, SectionHeader, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import { devRoutesEnabled } from '../../src/navigation/devRoutes';

/** Rest alerts work end to end (see restAlerts.ts). Meal reminders are not built, so that block
 * only appears in development builds, where the planned layout can still be reviewed. */
export default function Notifications() {
 const {t}=useLanguage();
  return <Screen>
    <Header mode="inline" title={t('settings.home.notifications')}
      onBack={()=>backOrReplace(router,'/settings')} />
    <SectionHeader title={t('notifications.restTitle')} />
    <Typography tone="secondary" size="secondary">{t('notifications.restNote')}</Typography>
    <ListGroup>
      <ListRow title={t('notifications.row')} detail={t('notifications.rowDetail')} />
    </ListGroup>
    {devRoutesEnabled() && <>
      <SectionHeader title={t('notifications.mealsTitle')} />
      <Chip kind="pending" label={t('notifications.future')} />
      <Typography tone="secondary" size="secondary">{t('notifications.mealNote')}</Typography>
      <ListGroup>
        <ListRow title={t('notifications.breakfast')} value={t('notifications.defaultMorning')} />
        <ListRow title={t('notifications.lunch')} value={t('notifications.defaultNoon')} />
        <ListRow title={t('notifications.dinner')} value={t('notifications.defaultEvening')} />
      </ListGroup>
      <Typography tone="secondary" size="secondary">{t('notifications.examples')}</Typography>
    </>}
  </Screen>;
}
