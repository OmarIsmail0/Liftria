import { translate, type AppLanguage } from '../../i18n';
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
export function keyTestMessage(outcome: KeyTestOutcome, language: AppLanguage = 'en'): string {
  if (outcome === 'works') return translate(language, 'hikuSettings.testWorks');
  if (outcome === 'model-unavailable') return translate(language, 'hikuK.modelUnavailable');
  if (outcome === 'unauthorized') return translate(language, 'hikuSettings.testUnauthorized');
  if (outcome === 'offline') return translate(language, 'hikuSettings.testOffline');
  return translate(language, 'hikuSettings.testUnavailable');
}
