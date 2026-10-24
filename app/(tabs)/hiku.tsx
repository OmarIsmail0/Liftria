import { Card, EmptyState, Header, Screen } from '../../src/design/primitives';

/** AI meal-analysis screens ship in Phase 4, not as simulated functionality. */
export default function HikuTab() {
  return <Screen embedded>
    <Header title="Hiku" />
    <Card rim="hiku">
      <EmptyState title="Coming in Phase 4"
        description="Photo and text meal analysis will require your own API key and a network connection." />
    </Card>
  </Screen>;
}
