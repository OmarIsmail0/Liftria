import {useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {View} from 'react-native';
import {Button,Card,Typography} from '../../design/primitives';
import {useLanguage} from '../../i18n/LanguageProvider';
import {getTypedSetting} from '../../services/database/settings';
import {localDay} from './foodCatalog';
import {adjustWater,readWater,type WaterLog} from './waterRepository';

export function WaterCounterCard(){
 const {t}=useLanguage();
 const [log,setLog]=useState<WaterLog|null>(null),[glassMl,setGlassMl]=useState(250);
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 const day=localDay(new Date());
 useFocusEffect(useCallback(()=>{
  let live=true;
  void Promise.all([readWater(day),getTypedSetting('water.glassMl')]).then(([water,ml])=>{
   if(!live)return;
   if(water.ok)setLog(water.value);else setError(true);
   if(ml.ok)setGlassMl(ml.value);else setError(true);
  });
  return()=>{live=false;};
 },[day]));
 async function change(delta:-1|1){
  if(busy)return;
  setBusy(true);setError(false);
  const next=await adjustWater(day,delta,glassMl);
  if(next.ok)setLog(next.value);else setError(true);
  setBusy(false);
 }
 return <Card rim="eat" title={t('water.title')}>
  <Typography>{log===null?t('water.unlogged'):t('water.total',{
   glasses:log.glasses,ml:log.glasses*log.glassMl})}</Typography>
  <Typography tone="secondary" size="small">{t('water.size',{ml:glassMl})}</Typography>
  <View style={{flexDirection:'row',gap:12}}>
   <Button label={t('water.remove')} variant="secondary" disabled={busy||log===null||log.glasses===0}
    onPress={()=>void change(-1)}/>
   <Button label={t('water.add')} variant="secondary" disabled={busy||log?.glasses===200}
    onPress={()=>void change(1)}/>
  </View>
  {error&&<Typography tone="secondary">{t('water.error')}</Typography>}
 </Card>;
}
