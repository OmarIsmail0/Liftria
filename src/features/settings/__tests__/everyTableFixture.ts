import { DEFAULT_HIKU_MODEL, HIKU_PRICE_VERSION } from '../../hiku/models';
import type { MemoryDatabase } from './memorySqlite';

type Cell = string | number | null;
type Row = Record<string, Cell>;
const AT = '2026-10-28T08:00:00.000Z';

/** One valid row per table, every column filled (Arabic text and nulls included), with
 * foreign keys pointing at each other. A table the migrations add must get a row here:
 * the data coverage tests fail while any schema table is missing from this fixture. */
export const EVERY_TABLE_ROWS: Record<string, Row[]> = {
  app_settings: [
    { key: 'language', value: '"ar"' },
    { key: 'hiku.keepPhotos', value: 'true' },
    { key: 'hiku.photo.req-1', value: JSON.stringify({ mimeType: 'image/jpeg', base64: 'AQID', storedAt: AT }) },
  ],
  test_workout_sessions: [{ id: 1, title: 'Phase 0 test', started_at: AT, finished_at: null }],
  test_workout_sets: [{ id: 1, session_id: 1, exercise: 'Test squat', reps: 8, weight_kg: 40 }],
  test_nutrition_entries: [{ id: 1, description: 'Test eggs', quantity: 2, unit: 'piece', consumed_at: AT }],
  health_samples: [{
    adapter: 'health-connect', record_id: 'hc-1', metric: 'steps', kind: 'sample',
    source_origin: 'com.sec.android.app.shealth', payload_json: '{}', imported_at: AT,
  }],
  health_aggregates: [{
    adapter: 'health-connect', operation: 'STEPS_COUNT_TOTAL',
    window_start: '2026-10-27T00:00:00.000Z', window_end: '2026-10-28T00:00:00.000Z', payload_json: '{}',
  }],
  profile: [{
    id: 1, name: 'عمر', sex_for_formula: 'male', birth_year: 1995, height_cm: 178,
    weight_kg: 80.5, activity: 'some', goal: 'maintain', updated_at: AT,
  }],
  targets: [{
    id: 1, kcal: 2400, protein_g: 160, fat_g: 70, carbs_g: 280,
    source: 'manual', inputs_json: null, created_at: AT,
  }],
  import_batches: [{
    id: 'batch-1', file_hash: 'hash-1', importer: 'hevy', file_name: 'workouts.csv',
    session_count: 1, set_count: 1, skipped_count: 0, created_exercises: '["ex-1"]', created_at: AT,
  }],
  exercises: [{
    id: 'ex-1', name: 'Back squat', aliases: '[]', equipment: 'barbell', type: 'weighted',
    unilateral: 0, primary_muscles: '["quads"]', secondary_muscles: '[]', instructions: '[]',
    source: 'import', retired: 0, pack_category: null, import_batch_id: 'batch-1',
  }],
  templates: [{ id: 'tpl-1', name: 'Legs', rest_sec: 120, notes: null, created_at: AT, updated_at: AT }],
  template_exercises: [{
    id: 'te-1', template_id: 'tpl-1', exercise_id: 'ex-1', position: 0, target_sets: 3,
    rep_min: 5, rep_max: 8, rest_sec: null, notes: null, superset_group: null,
  }],
  plans: [{ id: 'plan-1', name: 'Weekly', type: 'weekly', schedule_json: '[]', next_index: 0, active: 1 }],
  sessions: [{
    id: 'session-1', title: 'Legs', template_id: 'tpl-1', source: 'imported-file', importer: 'hevy',
    import_batch_id: 'batch-1', started_at: AT, ended_at: AT, edited_at: null, notes: null, state: 'finished',
  }],
  session_exercises: [{
    id: 'se-1', session_id: 'session-1', exercise_id: 'ex-1', position: 0, note: 'ركبة مريحة', superset_group: null,
  }],
  sets: [{
    id: 'set-1', session_exercise_id: 'se-1', position: 0, kind: 'working', side: null,
    weight: 100, reps: 5, logged_at: AT, rest_deadline: null, rpe: 8, rir: null,
  }],
  foods: [{
    id: 'food-1', name_en: 'Ful medames', name_ar: 'فول مدمس', aliases: '[]', source: 'custom',
    estimate: 0, kcal: 110, protein: 7.6, carbs: null, fat: 0.5, fiber: null, retired: 0, sugar: null, sodium: 300,
  }],
  food_portions: [{ food_id: 'food-1', label_en: 'Bowl', label_ar: 'طبق', grams: 250 }],
  hiku_requests: [{
    id: 'req-1', kind: 'photo', created_at: AT, model: DEFAULT_HIKU_MODEL, input_tokens: 1200,
    output_tokens: 300, est_cost_usd: 0.00027, status: 'review-ready', price_table_version: HIKU_PRICE_VERSION,
  }],
  diary_entries: [{
    id: 'diary-1', day: '2026-10-28', meal: 'breakfast', food_id: 'food-1', name_snapshot: 'فول مدمس',
    grams: 250, kcal: 275, protein: 19, carbs: null, fat: 1.25, source: 'hiku-estimate',
    hiku_request_id: 'req-1', original_json: '{}', created_at: AT, edited_at: AT,
    fiber: null, sugar: null, sodium: 750,
  }],
  favorite_foods: [{ food_id: 'food-1', created_at: AT }],
  saved_meals: [{ id: 'meal-1', name: 'فطار', created_at: AT }],
  saved_meal_items: [{ id: 'item-1', meal_id: 'meal-1', food_id: 'food-1', grams: 250, position: 0 }],
  weights: [{ id: 'weight-1', measured_at: AT, kg: 80.5, note: null, source: 'liftria' }],
  body_measurements: [{
    id: 'measure-1', measured_at: AT, site: 'waist', cm: 82.5, note: 'بعد التمرين', source: 'liftria',
  }],
  water_logs: [{ day: '2026-10-28', glasses: 6, glass_ml: 250, logged_at: AT }],
};

export async function listTables(db: MemoryDatabase): Promise<string[]> {
  return (await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"))
    .map(row => row.name);
}

/** Inserts the given rows; foreign keys are checked when the transaction commits. */
export async function seedRows(db: MemoryDatabase, rows: Record<string, Row[]>): Promise<void> {
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.execAsync('PRAGMA defer_foreign_keys = ON;');
    for (const [table, list] of Object.entries(rows)) for (const row of list) {
      const columns = Object.keys(row);
      await tx.runAsync(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
        columns.map(column => row[column] ?? null));
    }
  });
}

/** Every row of every table in the database, in a stable order, for exact comparison. */
export async function dumpEveryTable(db: MemoryDatabase): Promise<Record<string, Row[]>> {
  const dump: Record<string, Row[]> = {};
  for (const table of await listTables(db)) {
    const rows = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
    dump[table] = rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return dump;
}
