import { router } from 'expo-router';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';

/** TR-9 can request notification permission during the first rest. Timing remains pending device proof. */
export default function Notifications() {
  return <Screen>
    <Header title="Notifications" subtitle="Rest alerts are being tested"
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title="Rest timer alerts">
      <Chip kind="pending" label="Pending S22 device test" />
      <Typography tone="secondary">Liftria asks about rest alerts in context during your first rest. Lock-screen delivery can be delayed by Android; the in-app deadline timer remains the reliable source.</Typography>
      <ListRow title="Rest timer notifications" detail="Permission is optional · turn on from the active workout" />
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
