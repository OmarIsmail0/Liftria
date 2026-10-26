import { z } from 'zod';
import { getSetting, setSetting, type DbResult } from './index';

/**
 * Typed settings use the EXISTING v1 app_settings (key TEXT, value TEXT).
 * Values written here are JSON; legacy raw keys in diagnostics are untouched.
 */
export const settingsSchemas = {
  theme: z.enum(['system', 'dark', 'light']),
  language: z.enum(['system', 'en', 'ar']),
  style: z.enum(['aurora', 'solid']),
  'units.weight': z.enum(['kg', 'lb']),
  'units.height': z.enum(['cm', 'ftin']),
  'units.energy': z.literal('kcal'),
  hideNumbers: z.boolean(),
  keepScreenOn: z.boolean(),
  'units.smallPlates': z.boolean(),
  'train.barKg': z.number().finite().positive().max(100),
  'train.barLb': z.number().finite().positive().max(220),
  'train.effortField': z.enum(['off','rpe','rir']),
  haptics: z.boolean(),
  'hiku.shareToday': z.boolean(),
  'hiku.shareTraining': z.boolean(),
  'hiku.keepPhotos': z.boolean(),
  'hiku.model': z.enum(['claude-haiku-5-5','claude-sonnet-5-5']),
  'eat.ramadan': z.boolean(),
  'eat.iftarTime': z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  'eat.mealNames': z.object({
    breakfast:z.string().max(40).optional(),lunch:z.string().max(40).optional(),
    dinner:z.string().max(40).optional(),snacks:z.string().max(40).optional(),
  }),
  'onboarding.step': z.number().int().min(0),
  'onboarding.completedAt': z.string().datetime({ offset: true }).nullable(),
} as const;

export type SettingKey = keyof typeof settingsSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingsSchemas)[K]>;
export const settingDefaults: { [K in SettingKey]: SettingValue<K> } = {
  theme: 'system',
  language: 'system',
  style: 'aurora',
  'units.weight': 'kg',
  'units.height': 'cm',
  'units.energy': 'kcal',
  hideNumbers: false,
  keepScreenOn: true,
  'units.smallPlates': false,
  'train.barKg': 20,
  'train.barLb': 45,
  'train.effortField': 'off',
  haptics: true,
  'hiku.shareToday': false,
  'hiku.shareTraining': false,
  'hiku.keepPhotos': false,
  'hiku.model': 'claude-haiku-5-5',
  'eat.ramadan': false,
  'eat.iftarTime': '18:00',
  'eat.mealNames': {},
  'onboarding.step': 0,
  'onboarding.completedAt': null,
};

export function decodeStoredSetting<K extends SettingKey>(key: K, stored: string | null): SettingValue<K> {
  if (stored === null) return settingDefaults[key];
  try {
    const data: unknown = JSON.parse(stored);
    const result = settingsSchemas[key].safeParse(data);
    return result.success ? result.data as SettingValue<K> : settingDefaults[key];
  } catch {
    return settingDefaults[key];
  }
}

export async function getTypedSetting<K extends SettingKey>(key: K): Promise<DbResult<SettingValue<K>>> {
  const result = await getSetting(key);
  return result.ok
    ? { ok: true, value: decodeStoredSetting(key, result.value) }
    : result;
}

export async function setTypedSetting<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<DbResult<void>> {
  const validation = settingsSchemas[key].safeParse(value);
  if (!validation.success) return { ok: false, error: { code: 'db-error', message: 'Invalid setting value.' } };
  return setSetting(key, JSON.stringify(validation.data));
}
