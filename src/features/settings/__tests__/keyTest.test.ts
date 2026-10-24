import { keyTestMessage, testAnthropicKey } from '../keyTest';

test('ST-4 offline never sends the key; result is not a false failure', async () => {
  const request = jest.fn(async () => ({ status: 200, ok: true }));
  expect(await testAnthropicKey('synthetic-test-key', true, request)).toBe('offline');
  expect(request).not.toHaveBeenCalled();
  expect(keyTestMessage('offline')).toMatch(/Saved/);
});
test('ST-4 explicit request sends only the key header and version; no user data body', async () => {
  const request = jest.fn(async () => ({ status: 200, ok: true }));
  expect(await testAnthropicKey('synthetic-test-key', false, request)).toBe('works');
  expect(request).toHaveBeenCalledWith(
    'https://api.anthropic.com/v1/models?limit=1',
    { method:'GET', headers: { 'x-api-key':'synthetic-test-key', 'anthropic-version':'2023-06-01' } },
  );
});
test('ST-4 rejected and unreachable API test remain distinguishable', async () => {
  expect(await testAnthropicKey('synthetic-test-key', false,
    async () => ({ status:401, ok:false }))).toBe('unauthorized');
  expect(await testAnthropicKey('synthetic-test-key', false,
    async () => { throw new Error('offline'); })).toBe('unavailable');
});
