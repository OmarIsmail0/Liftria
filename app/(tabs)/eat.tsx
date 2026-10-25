import { Card, EmptyState, Header, Screen } from '../../src/design/primitives';
import { useLanguage } from '../../src/i18n/LanguageProvider';

/** No fake diary totals until Phase 4 adds the local meal repository. */
export default function EatTab() {
  const { t } = useLanguage();
  return <Screen embedded>
    <Header title={t('nav.eat')} />
    <Card rim="eat">
      <EmptyState title={t('placeholder.coming')}
        description={t('eat.comingDetail')} />
    </Card>
  </Screen>;
}
