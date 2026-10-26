/** Explicit user-initiated API key test; does not transmit profile/diary/health records. */
export type KeyTestOutcome = 'works' | 'unauthorized' | 'offline' | 'unavailable' | 'model-unavailable';
export async function testAnthropicKey(
  key: string, offline: boolean,
  request: (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }> = fetch,
  model?: string,
): Promise<KeyTestOutcome> {
  if (offline) return 'offline';
  try {
    const response = await request(model?
    'https://api.anthropic.com/v1/models/'+encodeURIComponent(model):
    'https://api.anthropic.com/v1/models?limit=1', {
      method: 'GET',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    });
    return response.ok ? 'works' : response.status === 401 ? 'unauthorized' :
      model&&(response.status===403||response.status===404)?'model-unavailable':'unavailable';
  } catch {
    return 'unavailable';
  }
}
export function keyTestMessage(outcome: KeyTestOutcome): string {
  if (outcome === 'works') return 'Key works.';
  if (outcome === 'model-unavailable') return 'Key works, but this model is unavailable on your account.';
  if (outcome === 'unauthorized') return 'Anthropic did not accept this key. Check the key and replace it.';
  if (outcome === 'offline') return "Saved. Test it when you're online.";
  return 'Could not verify the key right now. Try again later.';
}
