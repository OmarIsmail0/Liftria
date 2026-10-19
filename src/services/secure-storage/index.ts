import * as SecureStore from 'expo-secure-store';
const KEY_NAME = 'liftria.anthropic.api-key';

export type KeyState =
  | { status: 'missing' }
  | { status: 'ready'; hint: string }
  | { status: 'malformed' }
  | { status: 'storage-error' };

export function isKeyWellFormed(value: string): boolean {
  return /^sk-ant-[A-Za-z0-9_-]{12,}$/.test(value.trim());
}
export function maskKey(value: string): string {
  return `sk-ant-…${value.slice(-4)}`;
}
export async function getKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_NAME);
}
export async function keyState(): Promise<KeyState> {
  try {
    if (!(await SecureStore.isAvailableAsync())) return { status: 'storage-error' };
    const value = await getKey();
    if (!value) return { status: 'missing' };
    return isKeyWellFormed(value) ? { status: 'ready', hint: maskKey(value) } : { status: 'malformed' };
  } catch { return { status: 'storage-error' }; }
}
export async function saveKey(value: string): Promise<KeyState> {
  if (!isKeyWellFormed(value)) return { status: 'malformed' };
  try {
    await SecureStore.setItemAsync(KEY_NAME, value.trim(), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    return { status: 'ready', hint: maskKey(value.trim()) };
  } catch { return { status: 'storage-error' }; }
}
export async function deleteKey(): Promise<KeyState> {
  try { await SecureStore.deleteItemAsync(KEY_NAME); return { status: 'missing' }; }
  catch { return { status: 'storage-error' }; }
}
