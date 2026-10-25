import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Button, Card, Header, Screen, Typography } from '../../src/design/primitives';
import { parseImportCsv } from '../../src/features/import/importCsv';
import { setImportDraft } from '../../src/features/import/importDraft';
// Screenshot fixture is in RAM only and never writes SQLite data.
const CSV='title,start_time,end_time,exercise_title,set_index,set_type,weight_kg,reps,exercise_notes\n'+
 'Demo Upper,2026-10-19T10:00:00Z,2026-10-19T11:00:00Z,Barbell_Bench_Press_-_Medium_Grip,0,warmup,20,10,\n'+
 'Demo Upper,2026-10-19T10:00:00Z,2026-10-19T11:00:00Z,Barbell_Bench_Press_-_Medium_Grip,1,normal,65,8,\n'+
 'Demo Upper,2026-10-19T10:00:00Z,2026-10-19T11:00:00Z,Demo Mystery Lift,0,normal,30,9,\n'+
 'Demo Lower,2026-10-20T10:00:00Z,2026-10-20T11:00:00Z,Barbell_Squat,0,normal,80,8,\n'+
 'Demo Lower,2026-10-20T10:00:00Z,2026-10-20T11:00:00Z,Barbell_Deadlift,0,normal,100,6,\n'+
 'Demo Full,2026-10-21T10:00:00Z,2026-10-21T11:00:00Z,Demo Mystery Lift,0,normal,35,8,';
export default function DemoImport(){
 const {auto}=useLocalSearchParams<{auto?:string}>();const once=useRef(false);
 const open=()=>{
  const parsed=parseImportCsv('hevy','Demo Hevy export.csv',CSV);
  setImportDraft({parsed,error:null,source:'hevy',fileName:'Demo Hevy export.csv'});
  router.replace('/import/preview');
 };
 useEffect(()=>{if(auto==='1'&&!once.current){once.current=true;open();}},[auto]);
 return <Screen><Header title="Demo import" onBack={()=>router.back()}/>
  <Card title="Developer-only preview"><Typography tone="secondary">
   Loads a bundled three-workout demo CSV into the preview. No import occurs unless you explicitly tap Import.</Typography>
   <Button label="Open import preview" variant="train" onPress={open}/></Card></Screen>;
}
