import rawPack from '../../../assets/data/exercises/free-exercise-db.json';
import { z } from 'zod';
import { dbOperation, type DbResult } from './index';
import { MUSCLES, type Exercise, type ExerciseType, type Muscle, type PackExercise } from './gymTypes';

export const PACK_ID = 'free-exercise-db:f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const pack = rawPack as PackExercise[];
const muscleSchema = z.enum(MUSCLES);
export const customExerciseSchema = z.object({
  name: z.string().trim().min(1).max(90),
  equipment: z.string().trim().max(60).nullable(),
  type: z.enum(['weighted','dumbbell','assisted','bodyweight']),
  unilateral: z.boolean(),
  primaryMuscles: z.array(muscleSchema).max(17),
  secondaryMuscles: z.array(muscleSchema).max(17),
  instructions: z.array(z.string().trim().max(700)).max(25).default([]),
});
export type CustomExerciseInput = z.input<typeof customExerciseSchema>;
export type ExerciseRow = {
  id: string; name: string; aliases: string; equipment: string | null;
  type: ExerciseType; unilateral: number; primary_muscles: string;
  secondary_muscles: string; instructions: string[];
  source: Exercise['source']; retired: number; pack_category: string | null;
};
// JSON columns, including instructions, are always decoded when leaving the repository.
type StoredExercise = Omit<ExerciseRow, 'instructions'> & { instructions: string };
export function fromExerciseRow(row: StoredExercise): Exercise {
  return {
    id: row.id, name: row.name, aliases: JSON.parse(row.aliases) as string[],
    equipment: row.equipment, type: row.type, unilateral: row.unilateral === 1,
    primaryMuscles: JSON.parse(row.primary_muscles) as Muscle[],
    secondaryMuscles: JSON.parse(row.secondary_muscles) as Muscle[],
    instructions: JSON.parse(row.instructions) as string[],
    source: row.source, retired: row.retired === 1, packCategory: row.pack_category,
  };
}
export function packExercise(item: PackExercise): Exercise {
  const equipment = item.equipment;
  const type: ExerciseType = equipment === 'body only' || equipment == null
    ? 'bodyweight' : equipment === 'dumbbell' ? 'dumbbell'
      : /assisted/i.test(item.name) ? 'assisted' : 'weighted';
  const aliases = /\b(overhead|military) press\b/i.test(item.name) ? ['OHP'] : [];
  return {
    id: item.id, name: item.name, aliases, equipment,
    type, unilateral: false,
    primaryMuscles: item.primaryMuscles as Muscle[],
    secondaryMuscles: item.secondaryMuscles as Muscle[],
    instructions: item.instructions, source: 'pack', retired: false,
    packCategory: item.category,
  };
}
export const bundledExercises = (): Exercise[] => pack.map(packExercise);

function params(item: Exercise): (string | number | null)[] {
  return [item.id,item.name,JSON.stringify(item.aliases),item.equipment,item.type,
    item.unilateral ? 1 : 0,JSON.stringify(item.primaryMuscles),
    JSON.stringify(item.secondaryMuscles),JSON.stringify(item.instructions),
    item.source,item.retired ? 1 : 0,item.packCategory];
}
const INSERT_EXERCISE = 'INSERT INTO exercises (id,name,aliases,equipment,type,unilateral,' +
  'primary_muscles,secondary_muscles,instructions,source,retired,pack_category) ' +
  'VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ' +
  'ON CONFLICT(id) DO UPDATE SET name=excluded.name,aliases=excluded.aliases,' +
  'equipment=excluded.equipment,type=excluded.type,primary_muscles=excluded.primary_muscles,' +
  'secondary_muscles=excluded.secondary_muscles,instructions=excluded.instructions,' +
  'retired=0,pack_category=excluded.pack_category WHERE exercises.source=\'pack\'';

/** Idempotent pack reconcile in one transaction. Old IDs are retained as retired. */
export async function ensureExercisePack(): Promise<DbResult<number>> {
  return dbOperation(async db => {
    const installed = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key=?', ['exercise_pack_version']);
    if (installed?.value === PACK_ID) return 0;
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync("UPDATE exercises SET retired=1 WHERE source='pack'");
      for (const entry of pack) await tx.runAsync(INSERT_EXERCISE, params(packExercise(entry)));
      await tx.runAsync('INSERT INTO app_settings (key,value) VALUES (?,?) ' +
        'ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['exercise_pack_version', PACK_ID]);
    });
    return pack.length;
  });
}
export async function listExercises(includeRetired = false): Promise<DbResult<Exercise[]>> {
  return dbOperation(async db => {
    const rows = await db.getAllAsync<StoredExercise>('SELECT * FROM exercises ' +
      (includeRetired ? '' : 'WHERE retired=0 ') + 'ORDER BY name COLLATE NOCASE, id');
    return rows.map(fromExerciseRow);
  });
}
export async function getExercise(id: string): Promise<DbResult<Exercise | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<StoredExercise>('SELECT * FROM exercises WHERE id=?', [id]);
    return row ? fromExerciseRow(row) : null;
  });
}
export function normalizedName(value: string): string {
  return value.toLocaleLowerCase('en').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length-b.length) > 2) return 3;
  const previous = Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const next=[i];
    for(let j=1;j<=b.length;j++) next[j]=Math.min(
      (next[j-1] ?? 99)+1,(previous[j] ?? 99)+1,
      (previous[j-1] ?? 99)+(a[i-1]===b[j-1]?0:1));
    previous.splice(0,previous.length,...next);
  }
  return previous[b.length] ?? 3;
}
export function searchExercises(all: Exercise[], query: string, muscle?: Muscle | null): Exercise[] {
  const text = normalizedName(query);
  const filtered = all.filter(e => !e.retired && (!muscle ||
    e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)));
  if (!text) return filtered.sort((a,b)=>a.name.localeCompare(b.name));
  const score = (exercise: Exercise): number => {
    const name = normalizedName(exercise.name);
    const aliases = exercise.aliases.map(normalizedName);
    if (name===text || aliases.includes(text)) return 0;
    if (name.startsWith(text)) return 1;
    if (aliases.some(a=>a.startsWith(text))) return 2;
    if (name.includes(text)) return 3;
    if (name.split(' ').some(word => word.startsWith(text))) return 4;
    if (text.length >= 3 && (editDistance(name,text)<=2 ||
        name.split(' ').some(word => editDistance(word,text)<=1))) return 5;
    return Infinity;
  };
  return filtered.map(e=>({e,rank:score(e)})).filter(x=>Number.isFinite(x.rank))
    .sort((a,b)=>a.rank-b.rank || a.e.name.localeCompare(b.e.name)).map(x=>x.e);
}
function uuid(): string {
  // Stable RFC4122 v4-shaped local ID; not a security token.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, marker => {
    const random = Math.floor(Math.random()*16);
    return (marker==='x' ? random : (random & 3)|8).toString(16);
  });
}
export async function createCustomExercise(input: CustomExerciseInput): Promise<DbResult<Exercise>> {
  const validated = customExerciseSchema.parse(input);
  const primary = [...new Set(validated.primaryMuscles)];
  const secondary = [...new Set(validated.secondaryMuscles)]
    .filter(m=>!primary.includes(m));
  const exercise: Exercise = {
    ...validated, id: uuid(), aliases: [], primaryMuscles: primary,
    secondaryMuscles: secondary, source: 'custom', retired: false, packCategory: null,
  };
  return dbOperation(async db => {
    await db.runAsync(INSERT_EXERCISE, params(exercise));
    return exercise;
  });
}
export async function updateCustomExercise(id: string, input: CustomExerciseInput): Promise<DbResult<boolean>> {
  const validated = customExerciseSchema.parse(input);
  return dbOperation(async db => {
    const result = await db.runAsync('UPDATE exercises SET name=?,equipment=?,type=?,unilateral=?,' +
      'primary_muscles=?,secondary_muscles=?,instructions=? WHERE id=? AND source=\'custom\'',
      [validated.name,validated.equipment,validated.type,validated.unilateral?1:0,
        JSON.stringify([...new Set(validated.primaryMuscles)]),
        JSON.stringify([...new Set(validated.secondaryMuscles)]
          .filter(m=>!validated.primaryMuscles.includes(m))),JSON.stringify(validated.instructions),id]);
    return result.changes > 0;
  });
}
/** Retire rather than destroy history; never allow a pack exercise to be removed. */
export async function retireCustomExercise(id: string): Promise<DbResult<boolean>> {
  return dbOperation(async db =>
    (await db.runAsync("UPDATE exercises SET retired=1 WHERE id=? AND source='custom'",[id])).changes > 0);
}
