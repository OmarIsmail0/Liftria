import { router } from 'expo-router';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { getImportOutcome, clearImportDraft } from '../../src/features/import/importDraft';
export default function ImportResult(){
 const result=getImportOutcome();
 const done=()=>{clearImportDraft();router.replace('/settings/data');};
 const history=()=>{clearImportDraft();router.replace('/(tabs)/train/history');};
 return <Screen>
  <Header title="Import history"/>
  {result?.ok?<Card rim="train" title={result.result.workouts+' workouts imported'}>
   <ListRow title="Sets saved" detail={String(result.result.sets)}/>
   {result.result.custom>0&&<ListRow title="Your own exercises created"
     detail={String(result.result.custom)}/>}
   <ListRow title="Workouts skipped" detail={String(result.result.skipped)}/>
   <Typography tone="secondary">Records and your muscle map now use the saved working sets.</Typography>
   <Typography tone="secondary" size="small">Changed your mind? Undo import is in Settings → Data and storage until the next import.</Typography>
   <Button label="View history" variant="train" fullWidth onPress={history}/>
   <Button label="Done" variant="secondary" fullWidth onPress={done}/>
  </Card>:<Card title="Nothing was imported">
   <Typography tone="secondary">{result&&!result.ok?result.reason:
    'No import result is available. Your existing workouts are untouched.'}</Typography>
   <Button label="Try again" onPress={()=>router.replace('/import')}/>
   <Button label="Back" variant="secondary" onPress={done}/>
  </Card>}
 </Screen>;
}
