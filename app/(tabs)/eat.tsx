import { Card, EmptyState, Header, Screen } from '../../src/design/primitives';

/** No fake diary totals until Phase 4 adds the local meal repository. */
export default function EatTab() {
  return <Screen embedded>
    <Header title="Eat" />
    <Card rim="eat">
      <EmptyState title="Coming in Phase 4"
        description="Your food diary, targets and meal logging will appear here." />
    </Card>
  </Screen>;
}
