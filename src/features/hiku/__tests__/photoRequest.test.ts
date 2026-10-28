import {requestHikuPhoto} from '../client';
import {getTypedSetting} from '../../../services/database/settings';
import {setSetting} from '../../../services/database';
import {startHikuRequest,finishHikuRequest,saveHikuReviewed} from '../requestRepository';
import {BACKUP_TABLES} from '../../settings/backup';

jest.mock('expo-network',()=>({
 getNetworkStateAsync:jest.fn(async()=>({isConnected:true,isInternetReachable:true})),
}));
jest.mock('../../../services/secure-storage',()=>({
 getKey:jest.fn(async()=> 'sk-ant-test-not-a-real-secret'),
 isKeyWellFormed:jest.fn(()=>true),
}));
jest.mock('../../../services/database/settings',()=>({
 getTypedSetting:jest.fn(async(key:string)=>({ok:true,value:
  key==='hiku.keepPhotos'?false:'claude-haiku-5-5'})),
}));
jest.mock('../../../services/database',()=>({
 setSetting:jest.fn(async()=>({ok:true,value:undefined})),
}));
jest.mock('../requestRepository',()=>({
 startHikuRequest:jest.fn(async()=>({ok:true,value:'photo-request-id'})),
 finishHikuRequest:jest.fn(async()=>({ok:true,value:undefined})),
 saveHikuReviewed:jest.fn(),
}));

const meal={meal_name:'Fixture meal',items:[{
 name_en:'Rice',name_ar:'أرز',grams:100,kcal:140,protein:3,carbs:28,
 fat:1,confidence:'check',
}]};
function fakeFetch(){
 return jest.fn(async()=>({
  ok:true,status:200,headers:{get:()=>null},json:async()=>({
   stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(meal)}],
   usage:{input_tokens:2000,output_tokens:100},
  }),
 }));
}
beforeEach(()=>{
 jest.clearAllMocks();
 (getTypedSetting as jest.Mock).mockImplementation(async(key:string)=>({ok:true,
  value:key==='hiku.keepPhotos'?false:'claude-haiku-5-5'}));
});
test('photo estimate is a review-only draft: no diary save or stored photo by default',async()=>{
 const fetchMock=fakeFetch(),previous=globalThis.fetch;
 globalThis.fetch=fetchMock as unknown as typeof fetch;
 try{
  const r=await requestHikuPhoto('AQIDBA==','half of the rice','en');
  expect(r.ok).toBe(true);
  if(r.ok)expect(r.meal).toEqual(meal);
  expect(startHikuRequest).toHaveBeenCalledWith('claude-haiku-5-5','photo');
  expect(finishHikuRequest).toHaveBeenCalledWith('photo-request-id','review-ready',2000,100,expect.any(Number));
  expect(saveHikuReviewed).not.toHaveBeenCalled();
  expect(setSetting).not.toHaveBeenCalled();
 }finally{globalThis.fetch=previous;}
});
test('opt-in stores only the sanitized JPEG in the backed-up app_settings table',async()=>{
 (getTypedSetting as jest.Mock).mockImplementation(async(key:string)=>({ok:true,
  value:key==='hiku.keepPhotos'?true:'claude-haiku-5-5'}));
 const fetchMock=fakeFetch(),previous=globalThis.fetch;
 globalThis.fetch=fetchMock as unknown as typeof fetch;
 try{
  const r=await requestHikuPhoto('AQIDBA==','','en');
  expect(r.ok).toBe(true);
  expect(BACKUP_TABLES).toContain('app_settings');
  expect(setSetting).toHaveBeenCalledWith('hiku.photo.photo-request-id',expect.any(String));
  const [,raw]=(setSetting as jest.Mock).mock.calls[0] as [string,string];
  expect(JSON.parse(raw)).toMatchObject({mimeType:'image/jpeg',base64:'AQIDBA=='});
  expect(saveHikuReviewed).not.toHaveBeenCalled();
 }finally{globalThis.fetch=previous;}
});
