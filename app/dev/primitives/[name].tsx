import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useTheme } from '../../../src/design/ThemeProvider';
import {
  Banner, Button, CapsuleNav, Card, Chip, EmptyState, Field, Header, ListRow,
  Orb, Screen, Sheet, Skeleton, Snackbar, Stepper, Toggle, Typography,
  type CapsuleTab,
} from '../../../src/design/primitives';
import { buttonVariants, provenanceKinds } from '../../../src/design/primitives';
import { isPrimitiveStoryId, primitiveStories } from '../../../src/design/primitives/stories';

export default function PrimitiveStory() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const id = Array.isArray(name) ? name[0] : name;
  const { theme, setMode, setStyle, preferences, reduceMotion } = useTheme();
  const [count, setCount] = useState(8);
  const [isOn, setIsOn] = useState(false);
  const [value, setValue] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState('Meal removed');
  const [selectedTab, setSelectedTab] = useState<CapsuleTab>('today');
  const [noTarget, setNoTarget] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [breathing, setBreathing] = useState(true);
  const [eaten, setEaten] = useState(1420);
  const label = primitiveStories.find(story => story.id === id)?.title ?? 'Unknown component';
  const alert = (text: string) => setMessage(text);

  return <Screen>
    <Header title={label} subtitle="Native component test · hidden route" onBack={() => router.back()} />
    {!id || !isPrimitiveStoryId(id) ? <EmptyState title="No matching story" description="Return to the primitive list." /> : <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
        <Button label={preferences.mode === 'dark' ? 'Light' : 'Dark'} size="sm"
          onPress={() => setMode(preferences.mode === 'dark' ? 'light' : 'dark')} />
        <Button label={preferences.style === 'solid' ? 'Aurora Rim' : 'Solid'} size="sm" variant="secondary"
          onPress={() => setStyle(preferences.style === 'solid' ? 'aurora' : 'solid')} />
      </View>
      {id === 'screen' && <Card title="Screen safe area">
        <Typography>Fixed ambient background, content scrolls, and native safe-area insets apply.</Typography>
      </Card>}
      {id === 'header' && <Header title="Today" subtitle="Card header example" onBack={() => alert('Back button works')} right={<Chip kind="phone" />} />}
      {id === 'card' && <>
        <Card title="Eating" rim="eat"><Typography tone="secondary">Honey rim</Typography></Card>
        <Card title="Training" rim="train"><Typography tone="secondary">Coral rim</Typography></Card>
        <Card title="Activity" rim="health"><Typography tone="secondary">Teal rim</Typography></Card>
        <Card title="Hiku" rim="hiku"><Typography tone="secondary">Lavender rim</Typography></Card>
        <Card title="Neutral" rim="none"><Typography tone="secondary">No domain rim</Typography></Card>
      </>}
      {id === 'button' && <Card title="All button variants">
        {buttonVariants.map(variant => <Button key={variant} label={variant} variant={variant}
          onPress={() => alert(`Pressed ${variant}`)} fullWidth />)}
        <Button label="Small button" size="sm" onPress={() => alert('Small')} />
        <Button label="Extra large log set" size="xl" variant="train" fullWidth onPress={() => alert('Logged')} />
        <Button label="Disabled" disabled onPress={() => alert('Should not happen')} />
      </Card>}
      {id === 'chip' && <Card title="Provenance (informative, not buttons)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
          {provenanceKinds.map(kind => <Chip key={kind} kind={kind} />)}
          <Chip kind="stale" label="2 d ago" />
          <Chip kind="measured" label="From Health Connect" />
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
      {id === 'sheet' && <Card title="Native modal sheet">
        <Button label="Open confirmation sheet" onPress={() => setSheetOpen(true)} />
        <Sheet visible={sheetOpen} title="Delete this workout?" onClose={() => setSheetOpen(false)}
          description="This can't be undone." destructive>
          <Button label="Delete workout" variant="danger" fullWidth
            onPress={() => { setSheetOpen(false); alert('Deleted'); }} />
        </Sheet>
      </Card>}
      {id === 'stepper' && <Card title="Stepper">
        <Stepper label="Repetitions" value={count} onChange={setCount} min={0} max={20} unit="reps" />
      </Card>}
      {id === 'toggle' && <Card title="Accessible switch">
        <Toggle label="Hide numbers" detail="Replaces calorie totals with words." value={isOn} onChange={setIsOn} />
      </Card>}
      {id === 'field' && <Card title="Labeled input">
        <Field label="Name" value={value} onChangeText={setValue} placeholder="Enter a name" />
        <Field label="Quantity" value={String(count)} keyboardType="numeric" onChangeText={next => setCount(Number(next) || 0)} />
      </Card>}
      {id === 'list-row' && <Card title="64dp row">
        <ListRow title="Health Connect" detail="Permissions and source details" onPress={() => alert('Health Connect row')} />
        <ListRow title="Export and backup" detail="Future · Not available yet" />
      </Card>}
      {id === 'empty-state' && <Card>
        <EmptyState title="No target yet" description="Set a target whenever you're ready."
          action={<Button label="Set target" onPress={() => alert('Action tapped')} />} />
      </Card>}
      {id === 'skeleton' && <Card title="Static loading placeholder">
        <Skeleton /><Skeleton height={theme.size.touch.workout} />
        <Typography tone="secondary" size="small">No spinner or shimmer for short waits.</Typography>
      </Card>}
      {id === 'orb' && <Card title="Pulse Orb: estimated target" rim="eat">
        <Orb eaten={eaten} target={noTarget ? null : 2650} hidden={hidden} active={breathing}
          onPress={() => alert('Open today\'s Eat diary')} />
        <Typography tone="secondary">Estimate · Eaten of target</Typography>
        <Typography tone="secondary" size="small">Reduce motion active: {reduceMotion ? 'Yes — orb stays still' : 'No'}</Typography>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] }}>
          <Button size="sm" label="Add 180" onPress={() => setEaten(v => v + 180)} />
          <Button size="sm" label="No target" onPress={() => setNoTarget(v => !v)} />
          <Button size="sm" label="Hide numbers" onPress={() => setHidden(v => !v)} />
          <Button size="sm" label="Pause" onPress={() => setBreathing(v => !v)} />
        </View>
      </Card>}
      {id === 'capsule-nav' && <Card title="Five-tab capsule">
        <CapsuleNav active={selectedTab} onSelect={setSelectedTab} />
        <Typography tone="secondary" size="small">Selected tab: {selectedTab}</Typography>
      </Card>}
      {message !== 'Meal removed' && <Snackbar message={message} onDismiss={() => setMessage('Meal removed')} />}
    </>}
  </Screen>;
}
