import { dbOperation, type DbResult } from './index';

export type Workout = { id: number; title: string; startedAt: string };
export type NutritionEntry = { id: number; description: string; quantity: number; unit: string; consumedAt: string };

export async function createWorkout(title: string, exercise: string, reps: number, weightKg: number): Promise<DbResult<number>> {
  return dbOperation(async (db) => {
    let id: number | null = null;
    await db.withExclusiveTransactionAsync(async (tx) => {
      const startedAt = new Date().toISOString();
      const result = await tx.runAsync('INSERT INTO test_workout_sessions (title,started_at) VALUES (?,?)', [title, startedAt]);
      await tx.runAsync('INSERT INTO test_workout_sets (session_id,exercise,reps,weight_kg) VALUES (?,?,?,?)',
        [result.lastInsertRowId, exercise, reps, weightKg]);
      id = result.lastInsertRowId;
    });
    if (id === null) throw new Error('Transaction did not create a workout');
    return id;
  });
}
export async function getWorkout(id: number): Promise<DbResult<Workout | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<{ id: number; title: string; started_at: string }>(
      'SELECT id,title,started_at FROM test_workout_sessions WHERE id=?', [id]);
    return row ? { id: row.id, title: row.title, startedAt: row.started_at } : null;
  });
}
export async function updateWorkout(id: number, title: string): Promise<DbResult<number>> {
  return dbOperation(async db =>
    (await db.runAsync('UPDATE test_workout_sessions SET title=? WHERE id=?', [title, id])).changes);
}
export async function deleteWorkout(id: number): Promise<DbResult<number>> {
  return dbOperation(async db => {
    let changes = 0;
    await db.withExclusiveTransactionAsync(async tx => {
      // Do not depend on FK cascades: exclusive transaction uses a separate connection.
      await tx.runAsync('DELETE FROM test_workout_sets WHERE session_id=?', [id]);
      changes = (await tx.runAsync('DELETE FROM test_workout_sessions WHERE id=?', [id])).changes;
    });
    return changes;
  });
}
export async function createNutrition(description: string, quantity: number, unit: string): Promise<DbResult<number>> {
  return dbOperation(async db => {
    const res = await db.runAsync(
      'INSERT INTO test_nutrition_entries (description,quantity,unit,consumed_at) VALUES (?,?,?,?)',
      [description, quantity, unit, new Date().toISOString()]);
    return res.lastInsertRowId;
  });
}
export async function getNutrition(id: number): Promise<DbResult<NutritionEntry | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<{
      id: number; description: string; quantity: number; unit: string; consumed_at: string
    }>('SELECT * FROM test_nutrition_entries WHERE id=?', [id]);
    return row ? { id: row.id, description: row.description, quantity: row.quantity, unit: row.unit, consumedAt: row.consumed_at } : null;
  });
}
export async function updateNutrition(id: number, description: string, quantity: number): Promise<DbResult<number>> {
  return dbOperation(async db =>
    (await db.runAsync('UPDATE test_nutrition_entries SET description=?,quantity=? WHERE id=?',
      [description, quantity, id])).changes);
}
export async function deleteNutrition(id: number): Promise<DbResult<number>> {
  return dbOperation(async db =>
    (await db.runAsync('DELETE FROM test_nutrition_entries WHERE id=?', [id])).changes);
}

/** Diagnostics helpers: select a real persisted record, not an assumed AUTOINCREMENT ID. */
export async function getLastWorkout(): Promise<DbResult<Workout | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<{ id: number; title: string; started_at: string }>(
      'SELECT id,title,started_at FROM test_workout_sessions ORDER BY id DESC LIMIT 1');
    return row ? { id: row.id, title: row.title, startedAt: row.started_at } : null;
  });
}
export async function getLastNutrition(): Promise<DbResult<NutritionEntry | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<{
      id: number; description: string; quantity: number; unit: string; consumed_at: string
    }>('SELECT * FROM test_nutrition_entries ORDER BY id DESC LIMIT 1');
    return row ? { id: row.id, description: row.description, quantity: row.quantity, unit: row.unit, consumedAt: row.consumed_at } : null;
  });
}
