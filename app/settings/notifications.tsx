import { router } from 'expo-router';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';

/** Phase 2 cannot request POST_NOTIFICATIONS; the rest timer and reminders are Phase 3/4. */
export default function Notifications() {
  return <Screen>
    <Header title="Notifications" subtitle="Not scheduled in this release"
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title="Rest timer alerts">
      <Chip kind="pending" label="Future · Phase 3" />
      <Typography tone="secondary">Workout rest alerts and Android lock-screen notifications will be tested with the workout timer. Liftria does not request notification permission yet.</Typography>
      <ListRow title="Rest timer notifications" detail="Off · no alerts are scheduled" />
    </Card>
    <Card title="Meal reminders">
      <Chip kind="pending" label="Future · Phase 4" />
      <Typography tone="secondary">Meal reminders will be optional, created on the phone, and off by default. They will not read your food diary.</Typography>
      <ListRow title="Breakfast" detail="Planned default · 08:00" />
      <ListRow title="Lunch" detail="Planned default · 12:30" />
      <ListRow title="Dinner" detail="Planned default · 19:00" />
      <Typography tone="secondary" size="small">These are examples of future reminder times, not active notifications.</Typography>
    </Card>
  </Screen>;
}
