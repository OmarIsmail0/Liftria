import { Card, EmptyState, Header, Screen } from '../../src/design/primitives';

/** The real workout experience belongs to Phase 3. */
export default function TrainTab() {
  return <Screen embedded>
    <Header title="Train" />
    <Card rim="train">
      <EmptyState title="Coming in Phase 3"
        description="Workout plans, exercises, active sessions and history are not available yet." />
    </Card>
  </Screen>;
}
