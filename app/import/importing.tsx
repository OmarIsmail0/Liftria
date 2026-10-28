import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, View } from 'react-native';
import { Card, Header, Screen, Typography } from '../../src/design/primitives';
import { commitImport } from '../../src/features/import/importRepository';
import { peekPendingImport, setImportOutcome, takePendingImport } from '../../src/features/import/importDraft';
import { useLanguage } from '../../src/i18n/LanguageProvider';
export default function Importing(){
 const {t}=useLanguage();
 const once=useRef(false);
 const [count,setCount]=useState(0);
 const [total]=useState(()=>peekPendingImport()?.workouts.length??0);
 useEffect(()=>{
  const guard=BackHandler.addEventListener('hardwareBackPress',()=>true);
  return()=>guard.remove();
 },[]);
 useEffect(()=>{
  if(once.current)return;
  once.current=true;
  const plan=takePendingImport();
  if(!plan){setImportOutcome({ok:false,reason:t('im3.noPlan')});
   router.replace('/import/result');return;}
  void commitImport(plan,(completed,overall)=>{
   setCount(completed);
   AccessibilityInfo.announceForAccessibility(t('im3.a11y',{count:completed,total:overall}));
  }).then(result=>{
   if(result.ok){setCount(result.value.workouts);setImportOutcome({ok:true,result:result.value});}
   else setImportOutcome({ok:false,reason:t('im3.failed')});
   router.replace('/import/result');
  }).catch(()=>{setImportOutcome({ok:false,reason:t('im3.nothing')});
   router.replace('/import/result');});
 },[t]);
 return <Screen>
  <Stack.Screen options={{gestureEnabled:false}} />
  <Header title={t('im3.title')}/>
  <Card rim="train" title={t('im3.importing')}>
   <Typography>{t('im3.prepared',{count,total})}</Typography>
   <View accessibilityRole="progressbar"
    accessibilityValue={{min:0,max:100,now:total?Math.round(count/total*100):0}} style={{height:10}}/>
   <Typography tone="secondary">{t('im3.cannotCancel')}</Typography>
  </Card>
 </Screen>;
}
