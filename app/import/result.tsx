import { useLanguage } from '../../src/i18n/LanguageProvider';
import { router } from 'expo-router';
import { Button, Card, Header, ListRow, Screen, Typography } from '../../src/design/primitives';
import { getImportOutcome, clearImportDraft } from '../../src/features/import/importDraft';
export default function ImportResult(){
 const {t}=useLanguage();
 const result=getImportOutcome();
 const done=()=>{clearImportDraft();router.replace('/settings/data');};
 const history=()=>{clearImportDraft();router.replace('/(tabs)/train/history');};
 return <Screen>
  <Header title={t('import.result.title')}/>
  {result?.ok?<Card rim="train" title={t('import.result.success',{count:result.result.workouts})}>
   <ListRow title={t('import.result.sets')} detail={String(result.result.sets)}/>
   {result.result.custom>0&&<ListRow title={t('import.result.custom')}
     detail={String(result.result.custom)}/>}
   <ListRow title={t('import.result.skipped')} detail={String(result.result.skipped)}/>
   <Typography tone="secondary">{t('import.result.records')}</Typography>
   <Typography tone="secondary" size="small">{t('import.result.undo')}</Typography>
   <Button label={t('import.result.history')} variant="train" fullWidth onPress={history}/>
   <Button label={t('train.done')} variant="secondary" fullWidth onPress={done}/>
  </Card>:<Card title={t('import.result.none')}>
   <Typography tone="secondary">{result&&!result.ok?result.reason:
    t('import.result.noResult')}</Typography>
   <Button label={t('common.retry')} onPress={()=>router.replace('/import')}/>
   <Button label={t('common.back')} variant="secondary" onPress={done}/>
  </Card>}
 </Screen>;
}
