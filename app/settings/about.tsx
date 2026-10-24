import { router } from 'expo-router';
import { Card, Chip, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { backOrReplace } from '../../src/navigation/back';
import releaseVersion from '../../src/config/releaseVersion.json';

export default function AboutHelp() {
  return <Screen>
    <Header title="About and help" subtitle="Privacy and open-source notices"
      onBack={()=>backOrReplace(router,'/settings')} />
    <Card title="Liftria">
      <Typography>Version {releaseVersion.name} · Android build {releaseVersion.androidCode}</Typography>
      <Typography tone="secondary">A local-first fitness app. No account, external Liftria server or analytics.</Typography>
    </Card>
    <Card title="What the chips mean">
      <Chip kind="phone" label="Phone" />
      <Typography tone="secondary" size="small">Steps measured by the phone's own counter when that source is identified.</Typography>
      <Chip kind="pending" label="Unverified device" />
      <Typography tone="secondary" size="small">An app supplied the reading, but that does not establish which device recorded it.</Typography>
      <Chip kind="stale" label="Stale" />
      <Typography tone="secondary" size="small">The most recent record is older than the metric's freshness window.</Typography>
      <Chip kind="estimate" label="Estimate" />
      <Typography tone="secondary" size="small">Calculated or estimated; not a verified measurement.</Typography>
    </Card>
    <Card title="Help">
      <ListRow title="Health Connect permissions" detail="Review which data Liftria can read"
        onPress={()=>router.push('/(tabs)/progress/health-permissions')} />
      <ListRow title="Watch sync troubleshooting" detail="Five checks, without pretending a watch is verified"
        onPress={()=>router.push('/(tabs)/progress/health-troubleshoot')} />
      <ListRow title="Hiku and your API key" detail="Manage your private Anthropic key"
        onPress={()=>router.push('/settings/hiku-key')} />
    </Card>
    <Card title="Licenses and attribution">
      <Typography>Archivo and Figtree · SIL Open Font License</Typography>
      <Typography>free-exercise-db · Unlicense</Typography>
      <Typography>USDA FoodData Central · U.S. government public-domain data</Typography>
      <Typography tone="secondary" size="small">Exercise and nutrition integrations are planned; listing a source does not imply its data was downloaded onto this phone.</Typography>
    </Card>
    <Card title="Privacy summary">
      <Typography tone="secondary">Profile, preferences and available Health Connect records stay on your phone. Health Connect is read only; Liftria never writes or deletes records in the provider.</Typography>
      <Typography tone="secondary">Hiku is the only feature that makes an Anthropic API request, and only when you request it. Your personal API key is stored with Android SecureStore, not the Liftria database.</Typography>
      <Typography tone="secondary">If you lose this phone, there is no cloud Liftria backup yet.</Typography>
    </Card>
  </Screen>;
}
