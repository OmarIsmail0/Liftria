import {router,useLocalSearchParams} from 'expo-router';
import {useEffect,useRef} from 'react';
import {Button,Card,Header,Screen,Typography} from '../../src/design/primitives';

/** Screenshot only. Settings creates an in-memory sample and disables Restore.
 * No document picker, database write, sharing, or real backup is involved. */
export default function DemoBackup(){
 const {auto}=useLocalSearchParams<{auto?:string}>();
 const started=useRef(false);
 const show=()=>router.replace({pathname:'/settings/data',params:{demoBackup:'1'}});
 useEffect(()=>{
  if(auto!=='1'||started.current)return;
  started.current=true;
  void Promise.resolve().then(show);
 },[auto]);
 return <Screen>
  <Header title="Demo backup preview" onBack={()=>router.back()}/>
  <Card title="Developer screenshot fixture">
   <Typography tone="secondary">A read-only backup preview with invented
    sample record counts. Nothing is imported, restored, or shared.
    The restore button is disabled in this developer screenshot.</Typography>
   <Button label="Show safe restore preview" onPress={show}/>
  </Card>
 </Screen>;
}
