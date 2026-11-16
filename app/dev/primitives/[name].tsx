import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import {
  Banner, Button, Card, Chip, EmptyState, Field, Header, ListGroup, ListRow,
  ProgressBar, Screen, SectionHeader, Sheet, Skeleton, Snackbar, StatBlock, Stepper, TabBar, Toggle, Typography,
  type CapsuleTab,
} from '../../../src/design/primitives';
import { buttonVariants, provenanceKinds } from '../../../src/design/primitives';
import { isPrimitiveStoryId, primitiveStories } from '../../../src/design/primitives/stories';
import { backOrReplace } from '../../../src/navigation/back';

export default function PrimitiveStory() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const id = Array.isArray(name) ? name[0] : name;
  const { theme, setMode, preferences } = useTheme();
  const [count, setCount] = useState(8);
  const [isOn, setIsOn] = useState(false);
  const [value, setValue] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState('Meal removed');
  const [selectedTab, setSelectedTab] = useState<CapsuleTab>('today');
  const label = primitiveStories.find(story => story.id === id)?.title ?? 'Unknown component';
  const alert = (text: string) => setMessage(text);

  return <Screen>
    <Header title={label} subtitle="Native component test · hidden route" onBack={() => backOrReplace(router, '/dev/primitives')} />
    {!id || !isPrimitiveStoryId(id) ? <EmptyState title="No matching story" description="Return to the primitive list." /> : <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <Button label={preferences.mode === 'dark' ? 'Light' : 'Dark'} size="sm" variant="neutral"
          onPress={() => setMode(preferences.mode === 'dark' ? 'light' : 'dark')} />
      </View>
      {id === 'screen' && <Card title="Screen">
        <Typography>Page background, content scrolls, and native safe-area insets apply.</Typography>
      </Card>}
      {id === 'header' && <>
        <Header mode="large" title="Today" subtitle="Monday, Nov 16" right={<Button label="Gear" size="sm" variant="plain" onPress={() => alert('Gear')} />} />
        <Header mode="inline" title="Workout" onBack={() => alert('Back')} right={<Button label="Done" size="sm" variant="plain" onPress={() => alert('Done')} />} />
      </>}
      {id === 'card' && <>
        <Card title="Calories"><Typography tone="secondary">Flat surface, no shadow.</Typography></Card>
        <Card title="Training"><Typography tone="secondary">Title uses the title size.</Typography></Card>
      </>}
      {id === 'button' && <Card title="Buttons">
        {buttonVariants.map(variant => <Button key={variant} label={variant} variant={variant}
          onPress={() => alert(`Pressed ${variant}`)} fullWidth />)}
        <Button label="Small button" size="sm" variant="neutral" onPress={() => alert('Small')} />
        <Button label="Disabled" disabled onPress={() => alert('Should not happen')} />
      </Card>}
      {id === 'chip' && <Card title="Chips">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
          <Chip kind="phone" label="All" selected />
          <Chip kind="phone" label="Chest" />
          {provenanceKinds.map(kind => <Chip key={kind} kind={kind} />)}
        </View>
      </Card>}
      {id === 'banner' && <Card title="Inline feedback">
        <Banner title="Offline" message="Everything saved locally still works. Hiku needs internet." variant="offline" />
        <Banner title="Check the amount" message="Review the estimate before saving." variant="warning" />
        <Banner title="Ready" message="This device can read Health Connect." variant="info" />
      </Card>}
      {id === 'snackbar' && <Card title="Snackbar with Undo">
        <Snackbar message={message} onUndo={() => alert('Restored')}
          onDismiss={() => alert('Dismissed')} />
        <Button label="Show removed state" onPress={() => alert('Meal removed')} />
      </Card>}
      {id === 'sheet' && <Card title="Sheet">
        <Button label="Open confirmation sheet" onPress={() => setSheetOpen(true)} />
        <Sheet visible={sheetOpen} title="Delete this workout?" onClose={() => setSheetOpen(false)}
          description="This can't be undone." destructive>
          <Button label="Delete workout" variant="destructive" fullWidth
            onPress={() => { setSheetOpen(false); alert('Deleted'); }} />
        </Sheet>
      </Card>}
      {id === 'stepper' && <Card title="Stepper">
        <Stepper label="Repetitions" value={count} onChange={setCount} min={0} max={20} unit="reps" />
      </Card>}
      {id === 'toggle' && <Card title="Switch">
        <Toggle label="Hide numbers" detail="Replaces calorie totals with words." value={isOn} onChange={setIsOn} />
      </Card>}
      {id === 'field' && <Card title="Field">
        <Field label="Name" value={value} onChangeText={setValue} placeholder="Enter a name" />
        <Field label="Quantity" value={String(count)} keyboardType="numeric" onChangeText={next => setCount(Number(next) || 0)} />
      </Card>}
      {id === 'list-row' && <Card title="Rows">
        <ListRow title="Health Connect" detail="Permissions and source details" value="On" onPress={() => alert('Health Connect row')} />
        <ListRow title="Export and backup" detail="Not available yet" />
      </Card>}
      {id === 'list-group' && <>
        <SectionHeader title="Library" actionLabel="New" onAction={() => alert('New')} />
        <ListGroup>
          <ListRow title="Exercises" onPress={() => alert('Exercises')} />
          <ListRow title="History" value="12" onPress={() => alert('History')} />
          <ListRow title="Upper A" detail="6 exercises · last done 3 days ago" onPress={() => alert('Routine')} />
        </ListGroup>
      </>}
      {id === 'stat-block' && <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <StatBlock value="12:04" label="Duration" />
          <StatBlock value="3,150 kg" label="Volume" />
          <StatBlock value="9" label="Sets" />
        </View>
      </Card>}
      {id === 'progress-bar' && <Card title="Progress">
        <ProgressBar progress={0.62} label="Calories" />
        <ProgressBar progress={1} label="Full" />
        <ProgressBar progress={0} label="Empty" />
      </Card>}
      {id === 'empty-state' && <Card>
        <EmptyState title="No workouts yet" description="Finished workouts appear here."
          action={<Button label="Start empty workout" variant="tonal" onPress={() => alert('Action tapped')} />} />
      </Card>}
      {id === 'skeleton' && <Card title="Loading">
        <Skeleton /><Skeleton height={52} />
        <Typography tone="secondary" size="secondary">No spinner or shimmer for short waits.</Typography>
      </Card>}
      {id === 'tab-bar' && <>
        <TabBar active={selectedTab} onSelect={setSelectedTab} />
        <Typography tone="secondary" size="secondary">Selected tab: {selectedTab}</Typography>
      </>}
      {message !== 'Meal removed' && <Snackbar message={message} onDismiss={() => setMessage('Meal removed')} />}
    </>}
  </Screen>;
}
