import { router } from 'expo-router';
import { Screen, Header, Card, ListRow, Typography } from '../../../src/design/primitives';
import { primitiveStories } from '../../../src/design/primitives/stories';

/** Internal developer-only entry. No link from app tabs; Settings 7-tap entry comes in Step 3. */
export default function PrimitiveIndex() {
  return <Screen>
    <Header title="Primitive lab" subtitle="Hidden developer route · native Android previews" onBack={() => router.back()} />
    <Typography tone="secondary">Open each story to inspect touch size, TalkBack, dark/light, Aurora/Solid and large text.</Typography>
    <Card title="Component stories">
      {primitiveStories.map(story => <ListRow key={story.id} title={story.title}
        detail="Open interactive test screen" accessibilityLabel={`Open ${story.title} story`}
        onPress={() => router.push({ pathname: '/dev/primitives/[name]', params: { name: story.id } })} />)}
    </Card>
  </Screen>;
}
