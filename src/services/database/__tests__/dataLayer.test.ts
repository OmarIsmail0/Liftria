import * as SQLite from 'expo-sqlite';
import { DB_NAME, DB_MIGRATIONS, DB_SCHEMA_VERSION, initializeDatabase, migrateDatabase } from '../index';
import { getProfile, profileSchema, saveProfile } from '../profile';
import { decodeStoredSetting, getTypedSetting, setTypedSetting, settingDefaults } from '../settings';
import { addTarget, decodeTargetInputs, getCurrentTarget, listTargetHistory, targetSchema } from '../targets';
import { getDataLayerCounts } from '../summary';

/* In-memory mock-backed contract tests, not Android SQLite device evidence. */
type Row = Record<string, unknown>;
const state: {
  schema: number; settings: Map<string, string>; health: Map<string, Row>;
  aggregates: Map<string, Row>; profile: Row | null; targets: Row[];
  nextTargetId: number; migrations: number[];
} = {
  schema: 0, settings: new Map(), health: new Map(), aggregates: new Map(),
  profile: null, targets: [], nextTargetId: 1, migrations: [],
};

const mockDb = {
  execAsync: jest.fn(async (sql: string) => {
    const marker = /PRAGMA user_version = (\d+)/.exec(sql);
    if (marker) {
      state.schema = Number(marker[1]);
      state.migrations.push(state.schema);
    }
  }),
  getFirstAsync: jest.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.startsWith('PRAGMA user_version')) return { user_version: state.schema };
    if (sql.includes('COUNT(*)')) {
      const table = /FROM (\w+)/.exec(sql)?.[1];
      const total = table === 'profile' ? (state.profile ? 1 : 0)
        : table === 'targets' ? state.targets.length
        : table === 'app_settings' ? state.settings.size
        : table === 'health_samples' ? state.health.size
        : table === 'health_aggregates' ? state.aggregates.size : 0;
      return { total };
    }
    if (sql.includes('FROM app_settings')) {
      const v = state.settings.get(args[0] as string);
      return v === undefined ? null : { value: v };
    }
    if (sql.includes('FROM profile')) return state.profile;
    if (sql.includes('FROM targets')) return state.targets.at(-1) ?? null;
    return null;
  }),
  getAllAsync: jest.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.includes('FROM targets')) return [...state.targets].reverse().slice(0, args[0] as number);
    return [];
  }),
  runAsync: jest.fn(async (sql: string, args: unknown[] = []) => {
    if (sql.includes('INSERT INTO profile')) {
      state.profile = {
        id: 1, name: args[0], sex_for_formula: args[1], birth_year: args[2],
        height_cm: args[3], weight_kg: args[4], activity: args[5], goal: args[6],
        updated_at: args[7],
      };
      return { changes: 1, lastInsertRowId: 1 };
    }
    if (sql.includes('INSERT INTO app_settings')) {
      state.settings.set(args[0] as string, args[1] as string);
      return { changes: 1, lastInsertRowId: 1 };
    }
    if (sql.includes('INSERT INTO targets')) {
      const id = state.nextTargetId++;
      state.targets.push({
        id, kcal: args[0], protein_g: args[1], fat_g: args[2],
        carbs_g: args[3], source: args[4], inputs_json: args[5], created_at: args[6],
      });
      return { changes: 1, lastInsertRowId: id };
    }
    throw new Error('Unexpected SQL: ' + sql);
  }),
  withExclusiveTransactionAsync: jest.fn(async (action: (tx: typeof mockDb) => Promise<void>) => {
    await action(mockDb);
  }),
};

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockDb) }));

const asDb = mockDb as unknown as SQLite.SQLiteDatabase;
const currentYear = new Date().getUTCFullYear();

describe('monotonic, separate and additive migrations', () => {
  test('fresh install runs v1 and v2 in distinct transactions, then caches the connection', async () => {
    expect(DB_NAME).toBe('liftria.db');
    expect(DB_SCHEMA_VERSION).toBe(2);
    expect(DB_MIGRATIONS.map(m => m.version)).toEqual([1, 2]);
    expect(DB_MIGRATIONS[0].sql).toContain('CREATE TABLE IF NOT EXISTS health_samples');
    expect(DB_MIGRATIONS[0].sql).toContain('CREATE TABLE IF NOT EXISTS health_aggregates');
    expect(DB_MIGRATIONS[1].sql).toContain('CREATE TABLE IF NOT EXISTS targets');
    expect(DB_MIGRATIONS[1].sql).not.toContain('CREATE TABLE app_settings');
    const before = mockDb.withExclusiveTransactionAsync.mock.calls.length;
    await initializeDatabase();
    expect(state.schema).toBe(2);
    expect(state.migrations).toEqual([1, 2]);
    expect(mockDb.withExclusiveTransactionAsync.mock.calls.length - before).toBe(2);
    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith('liftria.db');
    await initializeDatabase();
    expect(mockDb.withExclusiveTransactionAsync.mock.calls.length - before).toBe(2);
  });

  test('v1 existing settings and both health caches remain after v2; re-run is no-op', async () => {
    state.schema = 1;
    state.migrations = [];
    state.settings.set('persisted', 'value');
    state.health.set('health-connect:1', { payload_json: '{}' });
    state.aggregates.set('health-connect:energy', { payload_json: '{}' });
    const before = mockDb.withExclusiveTransactionAsync.mock.calls.length;
    await migrateDatabase(asDb);
    expect(state.schema).toBe(2);
    expect(state.migrations).toEqual([2]);
    expect(state.settings.get('persisted')).toBe('value');
    expect(state.health.size).toBe(1);
    expect(state.aggregates.size).toBe(1);
    await migrateDatabase(asDb);
    expect(mockDb.withExclusiveTransactionAsync.mock.calls.length - before).toBe(1);
  });

  test('newer-than-app schema is rejected without running SQL', async () => {
    state.schema = 3;
    const before = mockDb.withExclusiveTransactionAsync.mock.calls.length;
    await expect(migrateDatabase(asDb)).rejects.toThrow('Database schema is newer than app');
    expect(mockDb.withExclusiveTransactionAsync.mock.calls.length).toBe(before);
    state.schema = 2;
  });
});

describe('nullable metric profile with ON-3 guardrails', () => {
  test('skipped profile is representable; save and read use singleton id 1', async () => {
    state.profile = null;
    const empty = await saveProfile({});
    expect(empty).toMatchObject({ ok: true, value: { id: 1, heightCm: null, weightKg: null } });
    const found = await getProfile();
    expect(found).toMatchObject({ ok: true, value: { id: 1, sexForFormula: null } });
    const complete = await saveProfile({
      name: 'A'.repeat(30), birthYear: currentYear - 16,
      heightCm: 120, weightKg: 35, activity: 'some', goal: 'maintain', sexForFormula: 'unspecified',
    });
    expect(complete).toMatchObject({ ok: true, value: { id: 1, weightKg: 35 } });
    expect(await getProfile()).toMatchObject({ ok: true, value: { name: 'A'.repeat(30), birthYear: currentYear - 16 } });
    expect(state.profile).toMatchObject({ id: 1 });
  });
  test('age 16–100, height 120–230, weight 35–300 inclusive; outside rejected', async () => {
    expect(profileSchema.safeParse({ birthYear: currentYear - 100, heightCm: 230, weightKg: 300 }).success).toBe(true);
    expect(profileSchema.safeParse({ birthYear: currentYear - 101 }).success).toBe(false);
    expect(profileSchema.safeParse({ birthYear: currentYear - 15 }).success).toBe(false);
    expect(profileSchema.safeParse({ heightCm: 119.9 }).success).toBe(false);
    expect(profileSchema.safeParse({ heightCm: 230.1 }).success).toBe(false);
    expect(profileSchema.safeParse({ weightKg: 34.9 }).success).toBe(false);
    expect(profileSchema.safeParse({ weightKg: 300.1 }).success).toBe(false);
    expect(profileSchema.safeParse({ name: 'X'.repeat(31) }).success).toBe(false);
    const count = mockDb.runAsync.mock.calls.length;
    expect((await saveProfile({ heightCm: 100 })).ok).toBe(false);
    expect(mockDb.runAsync.mock.calls.length).toBe(count);
  });
});

describe('typed existing app_settings with default, corruption recovery and persistence', () => {
  test('defaults for every setting are valid; malformed JSON and wrong types return defaults', async () => {
    state.settings.clear();
    for (const [key, expected] of Object.entries(settingDefaults)) {
      expect(decodeStoredSetting(key as keyof typeof settingDefaults, null)).toEqual(expected);
      state.settings.set(key, '{invalid');
      expect(decodeStoredSetting(key as keyof typeof settingDefaults, '{invalid')).toEqual(expected);
    }
    state.settings.set('theme', '"sepia"');
    state.settings.set('hideNumbers', '"yes"');
    state.settings.set('onboarding.completedAt', '"yesterday"');
    expect(await getTypedSetting('theme')).toEqual({ ok: true, value: 'system' });
    expect(await getTypedSetting('hideNumbers')).toEqual({ ok: true, value: false });
    expect(await getTypedSetting('onboarding.completedAt')).toEqual({ ok: true, value: null });
  });
  test('theme, style, flags and onboarding round-trip as JSON; wrong value is refused', async () => {
    expect(await setTypedSetting('theme', 'light')).toEqual({ ok: true, value: undefined });
    expect(await getTypedSetting('theme')).toEqual({ ok: true, value: 'light' });
    expect(await setTypedSetting('style', 'solid')).toEqual({ ok: true, value: undefined });
    expect(await getTypedSetting('style')).toEqual({ ok: true, value: 'solid' });
    expect((await setTypedSetting('haptics', false)).ok).toBe(true);
    expect((await setTypedSetting('onboarding.step', 4)).ok).toBe(true);
    expect((await setTypedSetting('onboarding.completedAt', '2026-10-24T00:00:00Z')).ok).toBe(true);
    expect(await getTypedSetting('onboarding.step')).toEqual({ ok: true, value: 4 });
    expect((await setTypedSetting('units.energy', 'cal' as 'kcal')).ok).toBe(false);
    // Prior malformed raw value remains intact; the invalid write does not overwrite it.
    expect(state.settings.get('units.energy')).toBe('{invalid');
  });
});

describe('target snapshots are append-only, nonzero and linked to sources', () => {
  test('no row is null, never 0; below 1000 rejected without insert', async () => {
    state.targets = [];
    state.nextTargetId = 1;
    expect(await getCurrentTarget()).toEqual({ ok: true, value: null });
    expect(targetSchema.safeParse({
      kcal: 999, proteinG: 100, fatG: 40, carbsG: 200, source: 'manual', inputs: null,
    }).success).toBe(false);
    const count = mockDb.runAsync.mock.calls.length;
    const rejected = await addTarget({ kcal: 999, proteinG: 100, fatG: 40, carbsG: 200, source: 'manual', inputs: null });
    expect(rejected.ok).toBe(false);
    expect(mockDb.runAsync.mock.calls.length).toBe(count);
    expect(await getCurrentTarget()).toEqual({ ok: true, value: null });
  });
  test('manual followed by estimate retains history, newest first', async () => {
    const first = await addTarget({ kcal: 2100, proteinG: 135, fatG: 65, carbsG: 225, source: 'manual', inputs: null });
    const second = await addTarget({ kcal: 2400, proteinG: 150, fatG: 75, carbsG: 250, source: 'estimate',
      inputs: { heightCm: 180, weightKg: 80, factor: 1.375 } });
    expect(first.ok && second.ok).toBe(true);
    const current = await getCurrentTarget();
    expect(current).toMatchObject({ ok: true, value: { kcal: 2400, source: 'estimate' } });
    const all = await listTargetHistory();
    expect(all).toMatchObject({ ok: true, value: [{ source: 'estimate' }, { source: 'manual' }] });
    if (first.ok && second.ok && all.ok) {
      expect(all.value.map(t => t.id)).toEqual([second.value.id, first.value.id]);
      expect(all.value[1]?.inputs).toBeNull();
    }
    expect((await getDataLayerCounts())).toMatchObject({ ok: true,
      value: { schema: 2, profile: 1, targets: 2 } });
  });
  test('a corrupted inputs_json keeps the target row readable (current and history)', async () => {
    state.targets = [];
    state.nextTargetId = 1;
    const created = await addTarget({ kcal: 2200, proteinG: 145, fatG: 70, carbsG: 230,
      source: 'estimate', inputs: { activityFactor: 1.375 } });
    expect(created.ok).toBe(true);
    const row = state.targets[0];
    if (!row) throw new Error('Target mock failed to save test row');
    row.inputs_json = '{"partial":';
    expect(await getCurrentTarget()).toMatchObject({ ok: true, value: {
      id: 1, kcal: 2200, source: 'estimate', inputs: null,
    } });
    expect(await listTargetHistory()).toMatchObject({ ok: true, value: [{
      id: 1, kcal: 2200, inputs: null,
    }] });
    // Valid JSON of the wrong shape is not a valid input snapshot.
    row.inputs_json = '[]';
    expect(await getCurrentTarget()).toMatchObject({ ok: true, value: { inputs: null } });
    row.inputs_json = '{"activityFactor":1.375}';
    expect(await getCurrentTarget()).toMatchObject({ ok: true, value: {
      inputs: { activityFactor: 1.375 },
    } });
    expect(decodeTargetInputs('42')).toBeNull();
    expect(decodeTargetInputs('null')).toBeNull();
  });

});
