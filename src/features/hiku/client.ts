import * as Network from 'expo-network';
import {getKey,isKeyWellFormed} from '../../services/secure-storage';
import {getTypedSetting} from '../../services/database/settings';
import {retryAfterMs} from '../../services/anthropic';
import {DEFAULT_HIKU_MODEL,estimateHikuCostUsd,type HikuModelId} from './models';
import {hikuJsonSchema,parseHikuBody,type HikuMeal} from './mealSchema';
import {finishHikuRequest,startHikuRequest} from './requestRepository';
import type {HikuContext} from './context';

export type HikuFailure='offline'|'key-missing'|'key-invalid'|'model-unavailable'|
 'unauthorized'|'rate-limited'|'server-error'|'refusal'|'truncated'|'invalid'|
 'timeout'|'cancelled'|'network-error'|'database-error';
export type HikuResponse=
 |{ok:true;meal:HikuMeal;requestId:string;model:HikuModelId;
   inputTokens:number;outputTokens:number;costUsd:number|null}
 |{ok:false;code:HikuFailure;retryAfterMs?:number};
const endpoint='https://api.anthropic.com/v1/messages';
export function hikuFailureForStatus(status:number):HikuFailure{
 if(status===401)return 'unauthorized';
 if(status===403||status===404)return 'model-unavailable';
 if(status===429||status===529)return 'rate-limited';
 if(status>=500)return 'server-error';
 return 'invalid';
}
export function hikuTextPrompt(description:string,language:'en'|'ar',context:HikuContext={}):string{
 return [
  'Estimate foods eaten from this single meal description. It may contain Egyptian dialect Arabic.',
  'For Egyptian meals, use Egyptian serving sizes. Return the requested meal name and food items.',
  'All nutrition and portions are estimates, never clinical measurements.',
  'Use English and Arabic food names. Do not invent missing fields or claim precision.',
  language==='ar'?'Respond using appropriate Egyptian food names in Arabic and English.':
    'Respond using English and Arabic names where relevant.',
  ...(context.today?['Opted-in daily summary:',context.today]:[]),
  ...(context.training?['Opted-in training day:',context.training]:[]),
  'Meal description:',
  description,
 ].join('\n');
}
/** Only the text and explicitly opted-in summary from the preview are transmitted.
 * Never sends raw diary rows, profile fields, Health Connect or workout history. */
export async function requestHikuText(description:string,language:'en'|'ar',
 signal?:AbortSignal,context:HikuContext={}):Promise<HikuResponse>{
 const descriptionClean=description.trim();
 if(!descriptionClean||descriptionClean.length>2500)return {ok:false,code:'invalid'};
 if(signal?.aborted)return {ok:false,code:'cancelled'};
 const network=await Network.getNetworkStateAsync().catch(()=>null);
 if(network?.isConnected===false||network?.isInternetReachable===false)return {ok:false,code:'offline'};
 let key:string|null;
 try{key=await getKey();}catch{return {ok:false,code:'key-missing'};}
 if(!key)return {ok:false,code:'key-missing'};
 if(!isKeyWellFormed(key))return {ok:false,code:'key-invalid'};
 const choice=await getTypedSetting('hiku.model');
 if(!choice.ok)return {ok:false,code:'database-error'};
 const model=choice.value??DEFAULT_HIKU_MODEL;
 const started=await startHikuRequest(model,'text');
 if(!started.ok)return {ok:false,code:'database-error'};
 const requestId=started.value;
 const controller=new AbortController();
 let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},45000);
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
 const prompt=hikuTextPrompt(descriptionClean,language,context);
 const finish=async(status:string,inputTokens?:number,outputTokens?:number)=>{
  const cost=inputTokens!==undefined&&outputTokens!==undefined?
   estimateHikuCostUsd(model,inputTokens,outputTokens):null;
  await finishHikuRequest(requestId,status,inputTokens??null,outputTokens??null,cost);
  return cost;
 };
 try{
  if(signal?.aborted){await finish('cancelled-may-be-billed');return {ok:false,code:'cancelled'};}
  let response:Response;
  try{
   response=await fetch(endpoint,{method:'POST',signal:controller.signal,
    headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body:JSON.stringify({model,max_tokens:8000,
      output_config:{effort:'low',format:{type:'json_schema',schema:hikuJsonSchema}},
      messages:[{role:'user',content:[{type:'text',text:prompt}]}]}),
   });
  }catch{
   const code=controller.signal.aborted?(timedOut?'timeout':'cancelled'):'network-error';
   await finish(code==='cancelled'?'cancelled-may-be-billed':code);
   return {ok:false,code};
  }
  if(!response.ok){
   const code=hikuFailureForStatus(response.status);
   await finish(code);
   return code==='rate-limited'?{ok:false,code,retryAfterMs:retryAfterMs(response.headers.get('retry-after'))??undefined}:
    {ok:false,code};
  }
  let body:unknown;
  try{body=await response.json();}catch{await finish('invalid');return {ok:false,code:'invalid'};}
  const parsed=parseHikuBody(body);
  const data=body as {usage?:{input_tokens?:unknown;output_tokens?:unknown}};
  const inTokens=typeof data.usage?.input_tokens==='number'&&Number.isSafeInteger(data.usage.input_tokens)?
    data.usage.input_tokens:0;
  const outTokens=typeof data.usage?.output_tokens==='number'&&Number.isSafeInteger(data.usage.output_tokens)?
    data.usage.output_tokens:0;
  if(!parsed.ok){await finish(parsed.reason,inTokens,outTokens);return {ok:false,code:parsed.reason};}
  const cost=await finish('review-ready',inTokens,outTokens);
  return {ok:true,meal:parsed.meal,model,requestId,inputTokens:inTokens,outputTokens:outTokens,costUsd:cost};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
