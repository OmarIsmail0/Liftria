import { router } from 'expo-router';
import { Card, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';

export default function ProgressTab() {
  return <Screen embedded>
    <Header title="Progress" />
    <Card title="Health" rim="health">
      <Typography tone="secondary">Health Connect measurements and sources live inside Progress.</Typography>
      <ListRow title="Health Connect" detail="View Health overview"
        onPress={() => router.push('/(tabs)/progress/health')} />
    </Card>
    <Typography size="small" tone="secondary">Strength, nutrition and body trends are coming in later phases.</Typography>
  </Screen>;
}
