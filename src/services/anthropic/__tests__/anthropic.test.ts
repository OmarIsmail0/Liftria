jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn(async () => ({ isConnected: false, isInternetReachable: false })) }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => 'sk-ant-example-only-not-a-real-key') }));
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { httpError, retryAfterMs, parseClaudeBody, runMealEstimate } from '../index';
import { mealSchema } from '../schema';

const valid = {
  stop_reason: 'end_turn',
  content: [{ type: 'thinking', thinking: '' }, { type: 'text',
    text: JSON.stringify({ items: [{ name: 'rice', quantity: 100, unit: 'g', confidence: 0.9 }] }) }],
  usage: { input_tokens: 45, output_tokens: 70 },
};
test('HTTP errors stay distinct (401 / 403 / 429 / 529 / 5xx)', () => {
  expect([401, 403, 429, 529, 500].map(httpError))
    .toEqual(['unauthorized', 'forbidden', 'rate-limited', 'overloaded', 'server-error']);
});
test('strict schema validates an estimate', () => {
  expect(mealSchema.safeParse({ items: [{ name: 'egg', quantity: 2, unit: 'piece', confidence: 0.8 }] }).success).toBe(true);
  expect(mealSchema.safeParse({ items: [{ name: 'rice', quantity: -2, unit: 'g', confidence: 100 }] }).success).toBe(false);
});
test('finds text block rather than assuming index 0; checks stop reason', () => {
  const parsed = parseClaudeBody(valid);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.usage.inputTokens).toBe(45);
  expect(parseClaudeBody({ ...valid, stop_reason: 'max_tokens' })).toMatchObject({ ok: false, code: 'truncated' });
  expect(parseClaudeBody({ ...valid, stop_reason: 'refusal' })).toMatchObject({ ok: false, code: 'refusal' });
  expect(parseClaudeBody({ ...valid, content: [{ type: 'text', text: '{"items":[' }] }))
    .toMatchObject({ ok: false, code: 'invalid-response' });
  expect(parseClaudeBody({ ...valid, content: [{ type: 'text', text: '{"items":[{"name":"x","quantity":2,"unit":"g","confidence":5}]}' }] }))
    .toMatchObject({ ok: false, code: 'invalid-response' });
});
test('retry-after numeric seconds is parsed and bounded', () => {
  expect(retryAfterMs('2')).toBe(2000);
  expect(retryAfterMs('-5')).toBeNull();
});
test('offline fails before reading a key and without fetch', async () => {
  const fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const result = await runMealEstimate();
  expect(result).toMatchObject({ ok: false, code: 'offline' });
  expect(fetchMock).not.toHaveBeenCalled();
});
test('missing and malformed key states', async () => {
  (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: true });
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce('bad');
  expect(await runMealEstimate()).toMatchObject({ code: 'key-missing' });
  expect(await runMealEstimate()).toMatchObject({ code: 'key-malformed' });
});
test('abort timeout maps to timeout', async () => {
  jest.useFakeTimers();
  (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('sk-ant-example-only-not-a-real-key');
  globalThis.fetch = jest.fn((_url, opts: RequestInit) =>
    new Promise((_resolve, reject) =>
      opts.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))) as unknown as typeof fetch;
  try {
    const pending = runMealEstimate({ timeoutMs: 1000 });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1500);
    const value = await pending;
    expect(value).toMatchObject({ ok: false, code: 'timeout' });
  } finally { jest.useRealTimers(); }
});
