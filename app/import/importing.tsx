import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { Card, Header, Screen, Typography } from '../../src/design/primitives';
import { commitImport } from '../../src/features/import/importRepository';
import { setImportOutcome, takePendingImport } from '../../src/features/import/importDraft';
export default function Importing(){
 const once=useRef(false);
 const [count,setCount]=useState(0);
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
  void commitImport(plan).then(result=>{
   if(result.ok){setCount(result.value.workouts);setImportOutcome({ok:true,result:result.value});}
   else setImportOutcome({ok:false,reason:'The import failed or the phone ran out of storage. Your existing workouts are untouched.'});
   router.replace('/import/result');
  }).catch(()=>{setImportOutcome({ok:false,reason:'Nothing was imported. Your existing workouts are untouched.'});
   router.replace('/import/result');});
 },[]);
 return <Screen>
  <Header title="Import history"/>
  <Card rim="train" title="Importing…">
   <Typography>{count} workouts committed</Typography>
   <View accessibilityRole="progressbar"
    accessibilityValue={{min:0,max:100,now:count?100:0}} style={{height:10}}/>
   <Typography tone="secondary">It can't be cancelled halfway. Either all the workouts are saved, or none are.</Typography>
  </Card>
 </Screen>;
}
