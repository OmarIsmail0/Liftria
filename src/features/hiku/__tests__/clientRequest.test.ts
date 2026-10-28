import {requestHikuText,requestHikuPhoto,hikuContent} from '../client';
import {startHikuRequest,finishHikuRequest} from '../requestRepository';

jest.mock('expo-network',()=>({
 getNetworkStateAsync:jest.fn(async()=>({isConnected:true,isInternetReachable:true})),
}));
jest.mock('../../../services/secure-storage',()=>({
 getKey:jest.fn(async()=> 'sk-ant-synthetic-test-key-not-real'),
 isKeyWellFormed:jest.fn(()=>true),
}));
jest.mock('../../../services/database/settings',()=>({
 getTypedSetting:jest.fn(async(key:string)=>({ok:true,value:key==='hiku.keepPhotos'?false:'claude-haiku-5-5'})),
}));
jest.mock('../../../services/database',()=>({setSetting:jest.fn(async()=>({ok:true,value:undefined}))}));
jest.mock('../requestRepository',()=>({
 startHikuRequest:jest.fn(async()=>({ok:true,value:'synthetic-request'})),
 finishHikuRequest:jest.fn(async()=>({ok:true,value:undefined})),
}));

test('Hiku sends low-effort structured output with an adequate budget and no incompatible fields',async()=>{
 const fetchMock=jest.fn(async()=>({
  ok:false,status:400,headers:{get:()=>null},
 }));
 const originalFetch=globalThis.fetch;
 globalThis.fetch=fetchMock as unknown as typeof fetch;
 try{
  const result=await requestHikuText('أكلت كشري وبيضة مسلوقة','ar');
  expect(result).toMatchObject({ok:false,code:'invalid'});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url,init]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe('https://api.anthropic.com/v1/messages');
  const payload=JSON.parse(String(init.body));
  expect(payload.model).toBe('claude-haiku-5-5');
  expect(payload.max_tokens).toBeGreaterThanOrEqual(8000);
  expect(payload.output_config).toMatchObject({
   effort:'low',format:{type:'json_schema'},
  });
  expect(payload).not.toHaveProperty('thinking');
  expect(payload).not.toHaveProperty('temperature');
  expect(payload.messages[0].content[0].text).toContain('أكلت كشري');
  expect(startHikuRequest).toHaveBeenCalledWith('claude-haiku-5-5','text');
  expect(finishHikuRequest).toHaveBeenCalledWith('synthetic-request','invalid',null,null,null);
 }finally{globalThis.fetch=originalFetch;}
});

test('photo block is before text with same strict JSON schema and no thinking/temperature',async()=>{
 const fetchMock=jest.fn(async()=>({ok:false,status:400,headers:{get:()=>null}}));
 const originalFetch=globalThis.fetch;
 globalThis.fetch=fetchMock as unknown as typeof fetch;
 try{
  const result=await requestHikuPhoto('AQIDBA==','رز وخضار','ar');
  expect(result).toMatchObject({ok:false,code:'invalid'});
  const [,init]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
  const payload=JSON.parse(String(init.body));
  expect(payload.max_tokens).toBe(8000);
  expect(payload.output_config).toMatchObject({effort:'low',format:{type:'json_schema'}});
  expect(payload).not.toHaveProperty('thinking');
  expect(payload).not.toHaveProperty('temperature');
  expect(payload.messages[0].content[0]).toEqual({type:'image',
   source:{type:'base64',media_type:'image/jpeg',data:'AQIDBA=='}});
  expect(payload.messages[0].content[1].text).toContain('رز وخضار');
  expect(startHikuRequest).toHaveBeenCalledWith('claude-haiku-5-5','photo');
 }finally{globalThis.fetch=originalFetch;}
});
test('photo cannot send without image and text requests never accidentally contain one',()=>{
 expect(()=>hikuContent('photo','photo notes')).toThrow();
 expect(hikuContent('text','description')).toEqual([{type:'text',text:'description'}]);
});
