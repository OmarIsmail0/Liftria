import { z } from 'zod';
import { dbOperation, type DbResult } from './index';

/** Step 4 stores validated target snapshots only; Step 5 owns the formula. */
export const targetSchema = z.object({
  kcal: z.number().finite().min(1000),
  proteinG: z.number().finite().min(0),
  fatG: z.number().finite().min(0),
  carbsG: z.number().finite().min(0),
  source: z.enum(['estimate', 'manual']),
  inputs: z.record(z.string(), z.unknown()).nullable(),
}).superRefine((value, ctx) => {
  if (value.source === 'manual' && value.inputs !== null) {
    ctx.addIssue({ code: 'custom', path: ['inputs'], message: 'Manual targets have no formula inputs.' });
  }
  if (value.source === 'estimate' && (!value.inputs || Object.keys(value.inputs).length === 0)) {
    ctx.addIssue({ code: 'custom', path: ['inputs'], message: 'Estimated targets require calculation inputs.' });
  }
});

export type TargetInput = z.input<typeof targetSchema>;
export type Target = z.output<typeof targetSchema> & { id: number; createdAt: string };

type TargetRow = {
  id: number; kcal: number; protein_g: number; fat_g: number; carbs_g: number;
  source: Target['source']; inputs_json: string | null; created_at: string;
};

function mapTarget(row: TargetRow): Target {
  return {
    id: row.id, kcal: row.kcal, proteinG: row.protein_g,
    fatG: row.fat_g, carbsG: row.carbs_g, source: row.source,
    inputs: row.inputs_json === null ? null : JSON.parse(row.inputs_json) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

/** Append-only target history. A failed guard never reaches INSERT. */
export async function addTarget(input: TargetInput): Promise<DbResult<Target>> {
  return dbOperation(async db => {
    const data = targetSchema.parse(input);
    const createdAt = new Date().toISOString();
    const result = await db.runAsync(`
      INSERT INTO targets (kcal,protein_g,fat_g,carbs_g,source,inputs_json,created_at)
      VALUES (?,?,?,?,?,?,?)
    `, [data.kcal, data.proteinG, data.fatG, data.carbsG, data.source,
      data.inputs === null ? null : JSON.stringify(data.inputs), createdAt]);
    return { ...data, id: result.lastInsertRowId, createdAt };
  });
}

export async function getCurrentTarget(): Promise<DbResult<Target | null>> {
  return dbOperation(async db => {
    // id is the append order even when two snapshots share a timestamp.
    const row = await db.getFirstAsync<TargetRow>('SELECT * FROM targets ORDER BY id DESC LIMIT 1');
    return row ? mapTarget(row) : null;
  });
}

export async function listTargetHistory(limit = 100): Promise<DbResult<Target[]>> {
  return dbOperation(async db => {
    const safeLimit = Math.max(1, Math.min(Math.trunc(limit) || 1, 500));
    const rows = await db.getAllAsync<TargetRow>('SELECT * FROM targets ORDER BY id DESC LIMIT ?', [safeLimit]);
    return rows.map(mapTarget);
  });
}
