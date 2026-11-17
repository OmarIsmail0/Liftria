import { KEY_TEST_TIMEOUT_MS, keyTestMessage, testAnthropicKey } from '../keyTest';

test('ST-4 offline never sends the key; result is not a false failure', async () => {
  const request = jest.fn(async () => ({ status: 200, ok: true }));
  expect(await testAnthropicKey('synthetic-test-key', true, request)).toBe('offline');
  expect(request).not.toHaveBeenCalled();
  expect(keyTestMessage('offline')).toBe("Saved. Test it when you're online.");
});
test('ST-4 explicit request sends only the key header and version; no user data body', async () => {
  const request = jest.fn(async () => ({ status: 200, ok: true }));
  expect(await testAnthropicKey('synthetic-test-key', false, request)).toBe('works');
  expect(request).toHaveBeenCalledWith(
    'https://api.anthropic.com/v1/models?limit=1',
    { method:'GET', headers: { 'x-api-key':'synthetic-test-key', 'anthropic-version':'2023-06-01' },
      signal: expect.any(AbortSignal) },
  );
});
test('ST-4 rejected and unreachable API test remain distinguishable', async () => {
  expect(await testAnthropicKey('synthetic-test-key', false,
    async () => ({ status:401, ok:false }))).toBe('unauthorized');
  expect(await testAnthropicKey('synthetic-test-key', false,
    async () => { throw new Error('offline'); })).toBe('unreachable');
  for (const status of [403, 429, 500]) {
    expect(await testAnthropicKey('synthetic-test-key', false,
      async () => ({ status, ok:false }))).toBe('unavailable');
  }
  expect(keyTestMessage('unreachable')).toContain('Could not reach Anthropic');
  expect(keyTestMessage('unavailable')).toContain('Could not verify');
});

test('selected-model access check distinguishes 403/404 without switching models',async()=>{
 const request=jest.fn(async()=>({ok:false,status:404}));
 expect(await testAnthropicKey('synthetic',false,request,'claude-sonnet-5-5')).toBe('model-unavailable');
 expect(request).toHaveBeenCalledWith('https://api.anthropic.com/v1/models/claude-sonnet-5-5',
  {method:'GET',headers:{'x-api-key':'synthetic','anthropic-version':'2023-06-01'},signal:expect.any(AbortSignal)});
});

test('a hung key check is aborted after the timeout instead of waiting forever',async()=>{
 jest.useFakeTimers();
 try{
  const request=jest.fn((_url:string,init:RequestInit)=>new Promise<{ok:boolean;status:number}>((_,reject)=>{
   init.signal?.addEventListener('abort',()=>reject(new Error('aborted')));
  }));
  const pending=testAnthropicKey('synthetic',false,request);
  await jest.advanceTimersByTimeAsync(KEY_TEST_TIMEOUT_MS+1);
  expect(await pending).toBe('unreachable');
 }finally{jest.useRealTimers();}
});
