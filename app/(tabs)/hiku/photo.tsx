import {router,useFocusEffect} from 'expo-router';
import {useCallback,useRef,useState} from 'react';
import {Image,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {File,Paths} from 'expo-file-system';
import {Button,Card,Chip,Field,Header,Screen,Toggle,Typography} from '../../../src/design/primitives';
import {useLanguage} from '../../../src/i18n/LanguageProvider';
import {getTypedSetting} from '../../../src/services/database/settings';
import {DEFAULT_HIKU_MODEL,hikuModel,type HikuModelId} from '../../../src/features/hiku/models';
import {requestHikuPhoto,hikuPhotoPrompt,type HikuFailure} from '../../../src/features/hiku/client';
import {readAvailableHikuContext,contextForSend} from '../../../src/features/hiku/context';
import {setHikuDraft} from '../../../src/features/hiku/draft';
import {resolveHikuItem} from '../../../src/features/hiku/mealSchema';
import {sanitizeHikuPhoto,type CleanHikuPhoto} from '../../../src/features/hiku/photo';

export default function HikuPhoto(){
 const {t,language}=useLanguage();
 const [photo,setPhoto]=useState<CleanHikuPhoto|null>(null);
 const photoRef=useRef<CleanHikuPhoto|null>(null);
 const [note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false),[denied,setDenied]=useState(false);
 const [error,setError]=useState<HikuFailure|'image-error'|null>(null);
 const [shareToday,setShareToday]=useState(false),[shareTraining,setShareTraining]=useState(false);
 const [available,setAvailable]=useState<{today:string;training:string}|null>(null);
 const [contextLoaded,setContextLoaded]=useState(false);
 const [model,setModel]=useState<HikuModelId>(DEFAULT_HIKU_MODEL);
 const controller=useRef<AbortController|null>(null);
 function cleanup(p:CleanHikuPhoto|null){
  if(!p)return;
  try{new File(p.uri).delete();}catch{/* Temp may have been cleaned by the OS. */}
 }
 function replacePhoto(next:CleanHikuPhoto|null){
  cleanup(photoRef.current);
  photoRef.current=next;setPhoto(next);
 }
 useFocusEffect(useCallback(()=>{
  let alive=true;
  void Promise.all([getTypedSetting('hiku.model'),getTypedSetting('hiku.shareToday'),
   getTypedSetting('hiku.shareTraining'),readAvailableHikuContext()]).then(([m,day,training,context])=>{
    if(!alive)return;
    if(m.ok)setModel(m.value);
    if(day.ok)setShareToday(day.value);
    if(training.ok)setShareTraining(training.value);
    setAvailable(context);setContextLoaded(true);
   });
  return()=>{alive=false;controller.current?.abort();
   // The only image file created by Liftria is the sanitized temporary JPEG.
   cleanup(photoRef.current);photoRef.current=null;
  };
 },[]));
 async function pick(camera:boolean){
  if(busy||loading)return;setLoading(true);setError(null);
  try{
   if(camera){
    const permission=await ImagePicker.requestCameraPermissionsAsync();
    if(!permission.granted){setDenied(true);return;}
   }
   const options:ImagePicker.ImagePickerOptions={
    mediaTypes:['images'],allowsEditing:false,exif:false,base64:false,quality:1,
   };
   const selection=camera?await ImagePicker.launchCameraAsync(options):
    await ImagePicker.launchImageLibraryAsync(options);
   if(selection.canceled||!selection.assets[0])return;
   const picked=selection.assets[0],sourceUri=picked.uri;
   try{
    const clean=await sanitizeHikuPhoto(picked);
    replacePhoto(clean);
   }finally{
    // Camera captures and picker copies inside *our* cache are temporary;
    // never delete a photograph from the user's gallery.
    if(camera||sourceUri.startsWith(Paths.cache.uri)){
     try{new File(sourceUri).delete();}catch{/* The picker may have removed it. */}
    }
   }
  }catch{setError('image-error');}
  finally{setLoading(false);}
 }
 const context=available?contextForSend(available,shareToday,shareTraining):{};
 const prompt=hikuPhotoPrompt(note,language,context);
 async function send(){
  if(!photo||busy||loading||!contextLoaded||!available||note.length>2500)return;
  setBusy(true);setError(null);
  const abort=new AbortController();controller.current=abort;
  const outcome=await requestHikuPhoto(photo.base64,note,language,abort.signal,context);
  if(abort.signal.aborted){setBusy(false);setError('cancelled');return;}
  controller.current=null;setBusy(false);
  if(!outcome.ok){setError(outcome.code);return;}
  // After the request only the structured estimate passes to HK-4 review.
  replacePhoto(null);
  setHikuDraft({kind:'photo',description:note,meal:outcome.meal,
   items:outcome.meal.items.map(item=>resolveHikuItem(item)),requestId:outcome.requestId,
   model:outcome.model,costUsd:outcome.costUsd,
   inputTokens:outcome.inputTokens,outputTokens:outcome.outputTokens});
  router.push('/(tabs)/hiku/review');
 }
 function cancel(){controller.current?.abort();setBusy(false);setError('cancelled');}
 return <Screen embedded safeBottom>
  <Header title={t('hikuPhoto.title')} onBack={()=>router.back()}/>
  <Card rim="hiku" title={t('hikuPhoto.addMealPhoto')}>
   <Chip kind="pending" label={t('hikuPhoto.beta')}/>
   <Typography tone="secondary">{t('hikuPhoto.warning')}</Typography>
   <View style={{gap:12}}>
    <Button label={t('hikuPhoto.take')} variant="secondary" disabled={busy||loading}
     onPress={()=>void pick(true)}/>
    <Button label={t('hikuPhoto.gallery')} variant="secondary" disabled={busy||loading}
     onPress={()=>void pick(false)}/>
   </View>
   {denied&&<Typography tone="secondary">{t('hikuPhoto.denied')}</Typography>}
   {loading&&<Typography tone="secondary">{t('hikuPhoto.processing')}</Typography>}
   {photo&&<>
    <Typography bold>{t('hikuPhoto.exactImage')}</Typography>
    <Image source={{uri:photo.uri}} accessibilityLabel={t('hikuPhoto.exactImage')}
     resizeMode="contain" style={{width:'100%',height:240}}/>
    <Typography tone="secondary" size="small">{t('hikuPhoto.dimensions',{
      width:photo.width,height:photo.height})}</Typography>
   </>}
   <Field label={t('hikuPhoto.note')} value={note} multiline onChangeText={setNote}
    placeholder={t('hikuPhoto.noteHint')}/>
   <Typography tone="secondary" size="small">{t('hikuPhoto.privacy')}</Typography>
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
   <Typography tone="secondary" size="small">{t('hikuK.contextPrivacy')}</Typography>
  </Card>
  {error&&<Card title={t('hikuK.errorTitle')}>
   <Typography tone="secondary">{error==='image-error'?t('hikuPhoto.imageError'):
    t(('hikuK.error_'+error.replaceAll('-','_')) as 'hikuK.error_offline')}</Typography>
  </Card>}
  {busy?<Card title={t('hikuK.analyzing')}>
   <Typography tone="secondary">{t('hikuK.timeoutHint')}</Typography>
   <Button label={t('hikuK.cancel')} onPress={cancel} variant="secondary"/>
  </Card>:<Button label={t('hikuK.send')} fullWidth onPress={()=>void send()}
   disabled={!photo||loading||!contextLoaded||!available||note.length>2500}/>}
 </Screen>;
}
