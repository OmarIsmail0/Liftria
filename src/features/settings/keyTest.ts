import { translate, type AppLanguage } from '../../i18n';
/** Explicit user-initiated API key test; does not transmit profile/diary/health records. */
export type KeyTestOutcome = 'works' | 'unauthorized' | 'offline' | 'unreachable' | 'unavailable' | 'model-unavailable';
export const KEY_TEST_TIMEOUT_MS = 20_000;
export async function testAnthropicKey(
  key: string, offline: boolean,
  request: (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }> = fetch,
  model?: string,
): Promise<KeyTestOutcome> {
  if (offline) return 'offline';
  // A hung connection must not leave the button spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KEY_TEST_TIMEOUT_MS);
  try {
    const response = await request(model?
    'https://api.anthropic.com/v1/models/'+encodeURIComponent(model):
    'https://api.anthropic.com/v1/models?limit=1', {
      method: 'GET',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: controller.signal,
    });
    return response.ok ? 'works' : response.status === 401 ? 'unauthorized' :
      model&&(response.status===403||response.status===404)?'model-unavailable':'unavailable';
  } catch {
    // A thrown error or the timeout: the request never got an answer.
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}
export function keyTestMessage(outcome: KeyTestOutcome, language: AppLanguage = 'en'): string {
  if (outcome === 'works') return translate(language, 'hikuSettings.testWorks');
  if (outcome === 'model-unavailable') return translate(language, 'hikuK.modelUnavailable');
  if (outcome === 'unauthorized') return translate(language, 'hikuSettings.testUnauthorized');
  if (outcome === 'offline') return translate(language, 'hikuSettings.testOffline');
  if (outcome === 'unreachable') return translate(language, 'hikuSettings.testUnreachable');
  return translate(language, 'hikuSettings.testUnavailable');
}
