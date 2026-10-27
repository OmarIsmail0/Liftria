import { router } from 'expo-router';
import { Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';

/** Reached only from seven version taps in Settings or by a developer deep link. */
export default function DeveloperHome() {
  return <Screen>
    <Header title="Developer tools" onBack={() => backOrReplace(router, '/settings')} />
    <Typography tone="secondary">Local diagnostics and component previews. Not part of the normal tabs.</Typography>
    <Card>
      <ListRow title="Primitive lab" detail="Visual and accessibility preview screens"
        onPress={() => router.push('/dev/primitives')} />
      <ListRow title="Phase 0 diagnostics" detail="Health, SQLite and API test tools"
        onPress={() => router.push('/dev/diagnostics')} />
      <ListRow title="Rest alert S22 matrix" detail="Developer-only notification timing spike"
        onPress={() => router.push('/dev/rest-spike')} />
      <ListRow title="Demo active workout" detail="Two exercises, no logged sets; for screenshots"
        onPress={() => router.push('/dev/demo-workout')} />
      <ListRow title="Demo adaptive expenditure" detail="Seed/clear labeled diary and weight fixtures"
        onPress={() => router.push('/dev/demo-adaptive')} />
      <ListRow title="Demo history" detail="Three finished Demo sessions, only when requested"
        onPress={() => router.push('/dev/demo-history')} />
      <ListRow title="Demo import" detail="Fixture opens IM-2 preview, no saved rows"
        onPress={() => router.push('/dev/demo-import')} />
    </Card>
  </Screen>;
}
