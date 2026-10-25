import { router } from 'expo-router';
import { Card, Header, ListRow, Screen, Typography } from '../../../src/design/primitives';
export default function ProgressTab(){
 return <Screen embedded>
  <Header title="Progress"/>
  <Card rim="train" title="Strength">
   <Typography tone="secondary">Weekly training volume, top lifts and records from your finished Liftria workouts.</Typography>
   <ListRow title="Strength trends" detail="4 weeks · 3 months · 1 year"
    onPress={()=>router.push('/(tabs)/progress/strength')}/>
  </Card>
  <Card rim="health" title="Health">
   <Typography tone="secondary">Health Connect measurements and sources live inside Progress.</Typography>
   <ListRow title="Health Connect" detail="View Health overview"
    onPress={()=>router.push('/(tabs)/progress/health')}/>
  </Card>
  <Typography size="small" tone="secondary">Nutrition and body trends will appear in later phases.</Typography>
 </Screen>;
}
