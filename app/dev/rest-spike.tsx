import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Button, Card, Header, ListRow, Screen, SegmentedControl, Typography } from '../../src/design/primitives';
import { askRestPermission, scheduleRestOver } from '../../src/features/train/restAlerts';
import { useTheme } from '../../src/design/ThemeProvider';

type MatrixRun={id:string;scenario:string;minutes:number;scheduledAt:string;dueAt:string;
  receivedAt:string|null;delayMs:number|null;error:string|null};
export default function RestSpikeScreen() {
  const {theme}=useTheme();
  const [scenario,setScenario]=useState<'unlocked'|'locked'|'doze'|'killed'>('unlocked');
  const [permission,setPermission]=useState<'unknown'|'allowed'|'denied'>('unknown');
  const [runs,setRuns]=useState<MatrixRun[]>([]);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const subscription=Notifications.addNotificationReceivedListener(notification=>{
      const data=notification.request.content.data;
      const kind=data?.kind;
      if(kind!=='liftria-rest')return;
      const receivedAt=new Date().toISOString();
      setRuns(prior=>prior.map(run=>{
        if(run.id!==data?.sessionId)return run;
        const delayMs=Date.parse(receivedAt)-Date.parse(run.dueAt);
        return {...run,receivedAt,delayMs};
      }));
    });
    return()=>subscription.remove();
  },[]);
  const request=async()=>{
    const allowed=await askRestPermission().catch(()=>false);
    setPermission(allowed?'allowed':'denied');
  };
  const test=async(minutes:number)=>{
    if(busy)return;
    setBusy(true);
    const scheduledAt=new Date().toISOString();
    const id='spike-'+Date.parse(scheduledAt).toString()+'-'+minutes;
    const dueAt=new Date(Date.parse(scheduledAt)+minutes*60000).toISOString();
    let error:string|null=null;
    try{
      const scheduled=await scheduleRestOver(dueAt,id,'your test set');
      if(!scheduled)error='Not scheduled. Check notification permission.';
    }catch(e){error=e instanceof Error?e.message:'Android could not schedule alert';}
    setRuns(prior=>[{id,scenario,minutes,scheduledAt,dueAt,receivedAt:null,delayMs:null,error},...prior]);
    setBusy(false);
  };
  return <Screen embedded scroll={false}>
    <ScrollView contentContainerStyle={{padding:theme.layout.gutter,gap:theme.layout.cardGap}}>
      <Header title="Rest alert device spike" subtitle="S22 test matrix · not a timing guarantee"
        onBack={()=>router.back()}/>
      <Card title="Permission">
        <Typography tone="secondary">Test allowed and denied notifications. Do not enable exact alarms. The in-app deadline timer works either way.</Typography>
        <Button label="Request rest notification permission" variant="secondary"
          onPress={()=>void request()}/>
        <Typography>Status: {permission}</Typography>
      </Card>
      <Card title="Choose phone condition">
        <SegmentedControl label="Screen state" value={scenario} onChange={setScenario}
          options={[{value:'unlocked',label:'Unlocked'},{value:'locked',label:'Locked'},
            {value:'doze',label:'Doze'},{value:'killed',label:'App killed'}]}/>
        <Typography tone="secondary" size="small">For locked, Doze and killed scenarios, use the phone. A JS callback cannot prove when Android displayed a lock-screen notification while Liftria was stopped.</Typography>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
          {[1,3,5].map(minutes=><Button key={minutes} label={'Test '+minutes+' min'}
            variant="train" disabled={busy} onPress={()=>void test(minutes)}/>)}
        </View>
      </Card>
      <Card title="Observed callbacks (this app process only)">
        {runs.length===0?<Typography tone="secondary">No tests started. No results have been recorded.</Typography>:
          runs.map(run=><ListRow key={run.id}
            title={run.minutes+' min · '+run.scenario}
            detail={run.error??(run.receivedAt?'Callback delay '+run.delayMs+' ms':'No callback observed')}
            suffix={<Typography size="small" tone="secondary">
              {new Date(run.scheduledAt).toLocaleTimeString()}</Typography>}/>)}
        <Typography tone="secondary" size="small">Delays are measured when the JS listener receives the notification, not a guaranteed Android display timestamp. Missing callbacks are not proof of delivery failure. Record lock-screen visual/sound/vibration observations separately on the S22.</Typography>
      </Card>
      <Typography tone="tertiary" size="small">Matrix: allowed/denied × locked/unlocked × Doze × app killed × 1/3/5 minutes. TR-9 stays pending until device evidence is reviewed.</Typography>
    </ScrollView>
  </Screen>;
}
