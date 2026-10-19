import * as Network from 'expo-network';
import { getKey, isKeyWellFormed } from '../secure-storage';
import { mealJsonSchema, mealSchema, type MealEstimate } from './schema';

export type ClaudeErrorCode =
  | 'key-missing' | 'key-malformed' | 'unauthorized' | 'forbidden'
  | 'rate-limited' | 'overloaded' | 'server-error' | 'offline'
  | 'timeout' | 'cancelled' | 'invalid-response' | 'truncated'
  | 'refusal' | 'request-error' | 'network-error' | 'storage-error';

export type ClaudeResult =
  | { ok: true; data: MealEstimate; usage: { inputTokens: number; outputTokens: number }; estimated: true }
  | { ok: false; code: ClaudeErrorCode; message: string };

export type ImageData = { base64: string; mediaType: 'image/jpeg' };
export type ClaudeOptions = {
  model?: string; maxTokens?: number; timeoutMs?: number;
  signal?: AbortSignal; image?: ImageData;
};
export const DEFAULT_MODEL = 'claude-haiku-5-5';
export const TEXT_EXAMPLE = 'I ate 2 boiled eggs and 100g of cooked rice.';

const messagesUrl = 'https://api.anthropic.com/v1/messages';
const failureMessages: Record<ClaudeErrorCode, string> = {
  'key-missing': 'API key missing. Save a key first.',
  'key-malformed': 'API key format is invalid.',
  unauthorized: 'API key invalid or revoked (401).',
  forbidden: 'API access denied (403). Check account permissions.',
  'rate-limited': 'Rate limited (429). Try again later.',
  overloaded: 'Anthropic overloaded (529). Try again later.',
  'server-error': 'Anthropic server error (5xx).',
  offline: "You're offline. Claude requires internet.",
  timeout: 'Claude request timed out.',
  cancelled: 'Claude request cancelled.',
  'invalid-response': 'Claude returned an invalid structured response.',
  truncated: 'Response cut off; increase max_tokens.',
  refusal: 'Claude declined the request.',
  'request-error': 'Claude rejected this request. Check model ID or request configuration.',
  'network-error': 'Network request failed.',
  'storage-error': 'Could not access secure key storage.',
};
export function fail(code: ClaudeErrorCode): ClaudeResult {
  return { ok: false, code, message: failureMessages[code] };
}
export function httpError(status: number): ClaudeErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate-limited';
  if (status === 529) return 'overloaded';
  if (status >= 500) return 'server-error';
  return 'request-error';
}

export function parseClaudeBody(value: unknown): ClaudeResult {
  if (!value || typeof value !== 'object') return fail('invalid-response');
  const body = value as Record<string, unknown>;
  if (body.stop_reason === 'max_tokens') return fail('truncated');
  if (body.stop_reason === 'refusal') return fail('refusal');
  if (body.stop_reason !== 'end_turn' || !Array.isArray(body.content)) return fail('invalid-response');
  const block = body.content.find((item: unknown) =>
    item !== null && typeof item === 'object' && (item as Record<string, unknown>).type === 'text');
  if (!block || typeof (block as Record<string, unknown>).text !== 'string') return fail('invalid-response');
  try {
    const parsed = mealSchema.safeParse(JSON.parse((block as { text: string }).text));
    if (!parsed.success) return fail('invalid-response');
    const usage = body.usage as { input_tokens?: unknown; output_tokens?: unknown } | undefined;
    return {
      ok: true, data: parsed.data, estimated: true,
      usage: {
        inputTokens: typeof usage?.input_tokens === 'number' ? usage.input_tokens : 0,
        outputTokens: typeof usage?.output_tokens === 'number' ? usage.output_tokens : 0,
      },
    };
  } catch { return fail('invalid-response'); }
}

export function retryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  // A negative numeric value is invalid; never feed it into Date.parse (which accepts '-5' as a date).
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 120_000) : null;
  }
  const date = Date.parse(trimmed);
  return Number.isFinite(date) ? Math.max(0, Math.min(date - Date.now(), 120_000)) : null;
}
export async function delay(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(true); }, ms);
    const onAbort = () => { clearTimeout(timer); resolve(false); };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// No background calls. Only invoked by explicit diagnostics actions.
export async function runMealEstimate(opts: ClaudeOptions = {}): Promise<ClaudeResult> {
  if (opts.signal?.aborted) return fail('cancelled');
  const network = await Network.getNetworkStateAsync().catch(() => null);
  if (network && (network.isConnected === false || network.isInternetReachable === false)) return fail('offline');
  let key: string | null;
  try { key = await getKey(); } catch { return fail('storage-error'); }
  if (!key) return fail('key-missing');
  if (!isKeyWellFormed(key)) return fail('key-malformed');

  const controller = new AbortController();
  const timeoutMs = Math.max(1000, Math.min(opts.timeoutMs ?? 45000, 120000));
  let timedOut = false;
  const startedAt = Date.now();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  const cancel = () => controller.abort();
  opts.signal?.addEventListener('abort', cancel, { once: true });
  const content: unknown[] = [];
  if (opts.image) content.push({
    type: 'image', source: { type: 'base64', media_type: opts.image.mediaType, data: opts.image.base64 },
  });
  content.push({
    type: 'text',
    text: opts.image
      ? 'Identify probable foods and approximate portion sizes. This is only an estimate; express uncertainty via confidence.'
      : `Extract foods and approximate amounts from this meal description: "${TEXT_EXAMPLE}".`,
  });
  const request = {
    model: opts.model?.trim() || DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: mealJsonSchema } },
    messages: [{ role: 'user', content }],
  };
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (opts.signal?.aborted) return fail('cancelled');
      if (controller.signal.aborted) return fail(timedOut ? 'timeout' : 'cancelled');
      let response: Response;
      try {
        response = await fetch(messagesUrl, {
          method: 'POST',
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      } catch {
        return fail(controller.signal.aborted ? (timedOut ? 'timeout' : 'cancelled') : 'network-error');
      }
      if (!response.ok) {
        const code = httpError(response.status);
        if ((code === 'rate-limited' || code === 'overloaded') && attempt < 2) {
          const wait = retryAfterMs(response.headers.get('retry-after')) ?? (700 * 2 ** attempt);
          // Don't misreport a long server-requested backoff as a network timeout.
          // The request's total time budget also covers all retries.
          const remaining = timeoutMs - (Date.now() - startedAt);
          if (wait >= remaining) return fail(code);
          const resumed = await delay(wait, controller.signal);
          if (!resumed) return fail(timedOut ? 'timeout' : 'cancelled');
          continue;
        }
        return fail(code);
      }
      try { return parseClaudeBody(await response.json()); }
      catch { return fail('invalid-response'); }
    }
    return fail('rate-limited');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', cancel);
  }
}
