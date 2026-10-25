import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, View } from 'react-native';
import { Card, Header, Screen, Typography } from '../../src/design/primitives';
import { commitImport } from '../../src/features/import/importRepository';
import { peekPendingImport, setImportOutcome, takePendingImport } from '../../src/features/import/importDraft';
export default function Importing(){
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
  if(!plan){setImportOutcome({ok:false,reason:'No import preview was available. Nothing was imported.'});
   router.replace('/import/result');return;}
  void commitImport(plan,(completed,overall)=>{
   setCount(completed);
   AccessibilityInfo.announceForAccessibility('Importing '+completed+' of '+overall+' workouts');
  }).then(result=>{
   if(result.ok){setCount(result.value.workouts);setImportOutcome({ok:true,result:result.value});}
   else setImportOutcome({ok:false,reason:'The import failed or the phone ran out of storage. Your existing workouts are untouched.'});
   router.replace('/import/result');
  }).catch(()=>{setImportOutcome({ok:false,reason:'Nothing was imported. Your existing workouts are untouched.'});
   router.replace('/import/result');});
 },[]);
 return <Screen>
  <Header title="Import history"/>
  <Card rim="train" title="Importing…">
   <Typography>{count} of {total} workouts prepared</Typography>
   <View accessibilityRole="progressbar"
    accessibilityValue={{min:0,max:100,now:total?Math.round(count/total*100):0}} style={{height:10}}/>
   <Typography tone="secondary">It cannot be cancelled halfway. Either all the workouts are saved, or none are.</Typography>
  </Card>
 </Screen>;
}
