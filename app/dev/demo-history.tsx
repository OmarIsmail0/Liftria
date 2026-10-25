import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Header, Screen, Typography } from '../../src/design/primitives';
import { dbOperation } from '../../src/services/database';
import { newGymId, ensureExercisePack } from '../../src/services/database/exerciseLibrary';
/** Hidden developer-only fixture. Adds 3 clearly titled finished sessions, idempotently. */
export default function DemoHistory(){
 const {auto}=useLocalSearchParams<{auto?:string}>();
 const once=useRef(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const create=async()=>{
  if(busy)return;setBusy(true);setError(null);
  const seeded=await ensureExercisePack();
  if(!seeded.ok){setError('Offline exercise pack unavailable.');setBusy(false);return;}
  const result=await dbOperation(async db=>{
   await db.withExclusiveTransactionAsync(async tx=>{
    const seeds=[
     {title:'Demo · Upper A',days:6,exercises:['Barbell_Bench_Press_-_Medium_Grip','Barbell_Shoulder_Press']},
     {title:'Demo · Lower B',days:3,exercises:['Barbell_Squat','Barbell_Deadlift']},
     {title:'Demo · Upper A',days:1,exercises:['Barbell_Bench_Press_-_Medium_Grip','Barbell_Shoulder_Press']},
    ];
    for(let index=0;index<seeds.length;index++){
     const seed=seeds[index]!;
     const tagged='PR F Demo #'+(index+1);
     const found=await tx.getFirstAsync<{id:string}>(
      "SELECT id FROM sessions WHERE notes=? AND state='finished'",[tagged]);
     if(found)continue;
     const started=new Date(Date.now()-seed.days*86400000);
     const ended=new Date(started.valueOf()+55*60000);
     const sessionId=newGymId();
     await tx.runAsync("INSERT INTO sessions(id,title,source,started_at,ended_at,notes,state) "+
      "VALUES(?,?,'manual',?,?,?,'finished')",[
       sessionId,seed.title,started.toISOString(),ended.toISOString(),tagged,
      ]);
     for(let e=0;e<seed.exercises.length;e++){
      const exerciseId=seed.exercises[e]!,sessionExerciseId=newGymId();
      await tx.runAsync('INSERT INTO session_exercises(id,session_id,exercise_id,position) VALUES(?,?,?,?)',
       [sessionExerciseId,sessionId,exerciseId,e]);
      for(let position=0;position<3;position++){
       const at=new Date(started.valueOf()+(5+e*20+position*4)*60000);
       await tx.runAsync('INSERT INTO sets(id,session_exercise_id,position,kind,side,weight,reps,logged_at) '+
        "VALUES(?,?,?,'working',NULL,?,?,?)",[
         newGymId(),sessionExerciseId,position,40+e*15+index*2.5,8+index,at.toISOString(),
        ]);
      }
     }
    }
   });
   return true;
  });
  if(result.ok)router.replace('/(tabs)/train/history');
  else{setError('Could not create the demo sessions.');setBusy(false);}
 };
 useEffect(()=>{if(auto!=='1'||once.current)return;once.current=true;void create();
 // Only honor the explicit auto param once when this hidden screen mounts.
 },[auto]);
 return <Screen>
  <Header title="Demo history" onBack={()=>router.back()}/>
  <Card rim="train" title="Developer fixture">
   <Typography tone="secondary">Creates three clearly named Demo sessions (each with two exercises and six logged working sets). No user sessions are removed. Re-opening does not duplicate them.</Typography>
   <Button label={busy?'Opening…':'Create demo sessions and open History'}
    variant="train" disabled={busy} onPress={()=>void create()}/>
   {error&&<Typography>{error}</Typography>}
  </Card>
 </Screen>;
}
