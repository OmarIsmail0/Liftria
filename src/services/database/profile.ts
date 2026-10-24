import { z } from 'zod';
import { dbOperation, type DbResult } from './index';

// Onboarding is fully skippable; stored units are always metric. The year, not
// a stale integer age, is persisted so estimates can use the age at calculation.
export const profileSchema = z.object({
  name: z.string().trim().max(30).nullable().default(null),
  sexForFormula: z.enum(['male', 'female', 'unspecified']).nullable().default(null),
  birthYear: z.number().int().nullable().default(null),
  heightCm: z.number().finite().min(120).max(230).nullable().default(null),
  weightKg: z.number().finite().min(35).max(300).nullable().default(null),
  activity: z.enum(['sitting', 'some', 'active']).nullable().default(null),
  goal: z.enum(['lose', 'maintain', 'build']).nullable().default(null),
}).superRefine((value, ctx) => {
  if (value.birthYear === null) return;
  const age = new Date().getUTCFullYear() - value.birthYear;
  if (age < 16 || age > 100) {
    ctx.addIssue({ code: 'custom', path: ['birthYear'], message: 'Enter an age between 16 and 100.' });
  }
});

export type ProfileInput = z.input<typeof profileSchema>;
export type Profile = z.output<typeof profileSchema> & { id: 1; updatedAt: string | null };

type ProfileRow = {
  id: number; name: string | null; sex_for_formula: Profile['sexForFormula'];
  birth_year: number | null; height_cm: number | null; weight_kg: number | null;
  activity: Profile['activity']; goal: Profile['goal']; updated_at: string | null;
};

export async function getProfile(): Promise<DbResult<Profile | null>> {
  return dbOperation(async db => {
    const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile WHERE id=1');
    if (!row) return null;
    return {
      id: 1, name: row.name, sexForFormula: row.sex_for_formula, birthYear: row.birth_year,
      heightCm: row.height_cm, weightKg: row.weight_kg, activity: row.activity,
      goal: row.goal, updatedAt: row.updated_at,
    };
  });
}

/** Upsert the single profile row, including null values for skipped steps. */
export async function saveProfile(input: ProfileInput): Promise<DbResult<Profile>> {
  return dbOperation(async db => {
    const data = profileSchema.parse(input);
    const updatedAt = new Date().toISOString();
    await db.runAsync(`
      INSERT INTO profile
        (id,name,sex_for_formula,birth_year,height_cm,weight_kg,activity,goal,updated_at)
      VALUES (1,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,sex_for_formula=excluded.sex_for_formula,
        birth_year=excluded.birth_year,height_cm=excluded.height_cm,
        weight_kg=excluded.weight_kg,activity=excluded.activity,
        goal=excluded.goal,updated_at=excluded.updated_at
    `, [data.name, data.sexForFormula, data.birthYear, data.heightCm,
      data.weightKg, data.activity, data.goal, updatedAt]);
    return { ...data, id: 1, updatedAt };
  });
}
