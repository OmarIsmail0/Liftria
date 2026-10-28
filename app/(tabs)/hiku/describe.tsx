import {router,useFocusEffect} from 'expo-router';
import {useCallback,useRef,useState} from 'react';
import {Button,Card,Chip,Field,Header,Screen,Toggle,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {getTypedSetting} from '../../../src/services/database/settings';
import {DEFAULT_HIKU_MODEL,estimateHikuCostUsd,hikuModel,type HikuModelId} from '../../../src/features/hiku/models';
import {requestHikuText,hikuTextPrompt,type HikuFailure} from '../../../src/features/hiku/client';
import {getHikuDescription,rememberHikuDescription,setHikuDraft} from '../../../src/features/hiku/draft';
import {readAvailableHikuContext,contextForSend} from '../../../src/features/hiku/context';
import {resolveHikuItem} from '../../../src/features/hiku/mealSchema';
export default function DescribeMeal(){
 const {t,language}=useLanguage();
 const [description,setDescription]=useState(getHikuDescription());
 const [shareToday,setShareToday]=useState(false),[shareTraining,setShareTraining]=useState(false);
 const [available,setAvailable]=useState<{today:string;training:string}|null>(null);
 const [contextLoaded,setContextLoaded]=useState(false);
 const [model,setModel]=useState<HikuModelId>(DEFAULT_HIKU_MODEL);
 const [busy,setBusy]=useState(false),[error,setError]=useState<HikuFailure|null>(null);
 const controller=useRef<AbortController|null>(null);
 useFocusEffect(useCallback(()=>{
  let live=true;
  void Promise.all([getTypedSetting('hiku.model'),getTypedSetting('hiku.shareToday'),
    getTypedSetting('hiku.shareTraining'),readAvailableHikuContext()]).then(([m,day,train,ctx])=>{
     if(!live)return;
     if(m.ok)setModel(m.value);
     if(day.ok)setShareToday(day.value);
     if(train.ok)setShareTraining(train.value);
     setAvailable(ctx);setContextLoaded(true);
   });
  return()=>{live=false;controller.current?.abort();};
 },[]));
 const context=available?contextForSend(available,shareToday,shareTraining):{};
 const prompt=hikuTextPrompt(description,language,context);
 const approximate=estimateHikuCostUsd(model,Math.ceil(prompt.length/3.5)+350,650);
 async function send(){
  if(busy||!contextLoaded||!description.trim()||description.length>2500||!available)return;
  setBusy(true);setError(null);
  const abort=new AbortController();controller.current=abort;
  const outcome=await requestHikuText(description,language,abort.signal,context);
  if(abort.signal.aborted){setBusy(false);setError('cancelled');return;}
  controller.current=null;setBusy(false);
  if(!outcome.ok){setError(outcome.code);return;}
  setHikuDraft({description,meal:outcome.meal,
   items:outcome.meal.items.map(item=>resolveHikuItem(item)),
   requestId:outcome.requestId,model:outcome.model,costUsd:outcome.costUsd,
   inputTokens:outcome.inputTokens,outputTokens:outcome.outputTokens});
  router.push('/(tabs)/hiku/review');
 }
 function cancel(){controller.current?.abort();setBusy(false);setError('cancelled');}
 return <Screen embedded safeBottom>
  <Header title={t('hikuK.beforeSend')} onBack={()=>router.back()}/>
  <Card rim="hiku">
   <Field label={t('hikuK.description')} value={description} multiline
    onChangeText={v=>{setDescription(v);rememberHikuDescription(v);}} placeholder={t('hikuK.example')}/>
   <Typography tone="secondary">{t('hikuK.privacyNote')}</Typography>
   <Typography tone="secondary" size="small">{t('hikuK.selectedModel',{model:
    language==='ar'?hikuModel(model).nameAr:hikuModel(model).nameEn})}</Typography>
  </Card>
  <Card title={t('hikuK.sentPanel')}>
   <Toggle label={t('hikuSettings.includeToday')} value={shareToday} onChange={setShareToday}/>
   <Toggle label={t('hikuSettings.includeTraining')} value={shareTraining} onChange={setShareTraining}/>
   {!contextLoaded&&<Typography tone="secondary">{t('common.loading')}</Typography>}
   {contextLoaded&&!available&&<Typography tone="secondary">{t('hikuK.contextUnavailable')}</Typography>}
   <Typography tone="secondary" size="small">{t('hikuK.exactText')}</Typography>
   <Typography>{prompt}</Typography>
   {!shareToday&&!shareTraining&&<Typography tone="secondary">{t('hikuK.noExtraContext')}</Typography>}
   <Typography tone="secondary" size="small">{t('hikuK.contextPrivacy')}</Typography>
  </Card>
  <Card title={t('hikuK.costTitle')}>
   <Chip kind="estimate"/>
   <Typography tone="secondary">{approximate===null?'—':
    t('hikuK.estimatedCost',{cost:approximate.toFixed(5)})}</Typography>
  </Card>
  {busy&&<Card rim="hiku" title={t('hikuK.analyzing')}>
   <Typography tone="secondary">{t('hikuK.timeoutHint')}</Typography>
   <Button label={t('hikuK.cancel')} onPress={cancel} variant="secondary" fullWidth/>
  </Card>}
  {error&&<Card title={t('hikuK.errorTitle')}>
   <Typography tone="secondary">{t('hikuK.error_'+error.replaceAll('-','_') as 'hikuK.error_offline')}</Typography>
   <Typography tone="secondary" size="small">{t('hikuK.inputKept')}</Typography>
   {error==='model-unavailable'&&<Button label={t('hikuK.selectModel')} variant="secondary"
    onPress={()=>router.push('/settings/hiku-key')}/>}
   {error==='key-missing'&&<Button label={t('hikuK.apiKey')}
    onPress={()=>router.push('/settings/hiku-key')}/>}
  </Card>}
  {!busy&&<Button label={t('hikuK.send')} disabled={!contextLoaded||!available||description.trim().length===0||description.length>2500}
   fullWidth onPress={()=>void send()}/>}
 </Screen>;
}
