import { router } from 'expo-router';
import { Card, EmptyState, Header, Screen, Typography } from '../../../src/design/primitives';
import { backOrReplace } from '../../../src/navigation/back';

/** HE-1 data and permission states are Phase 2 step 7. */
export default function HealthShell() {
  return <Screen embedded>
    <Header title="Health" subtitle="Health Connect · read-only" onBack={() => backOrReplace(router, '/(tabs)/progress')} />
    <Card rim="health">
      <EmptyState title="Health details are on the way"
        description="The connection, permissions, sources and measurements will be added in Phase 2 step 7. No data is assumed." />
    </Card>
    <Typography size="small" tone="secondary">Liftria will read Health Connect. It will never write or delete your health records.</Typography>
  </Screen>;
}
