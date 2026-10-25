import { Card, EmptyState, Header, Screen } from '../../src/design/primitives';
import { useLanguage } from '../../src/i18n/LanguageProvider';

/** AI meal-analysis screens ship in Phase 4, not as simulated functionality. */
export default function HikuTab() {
  const { t } = useLanguage();
  return <Screen embedded>
    <Header title={t('nav.hiku')} />
    <Card rim="hiku">
      <EmptyState title={t('placeholder.coming')}
        description={t('hiku.comingDetail')} />
    </Card>
  </Screen>;
}
