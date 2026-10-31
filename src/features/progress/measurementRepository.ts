import { dbOperation, type DbResult } from '../../services/database';
import { newGymId } from '../../services/database/exerciseLibrary';
import {
  cleanNote, isMeasurementSite, summarizeMeasurements, validateMeasurement,
  type BodyMeasurement, type MeasurementSite, type SiteSummary,
} from './measurements';

type Row = {
  id: string;
  measured_at: string;
  site: string;
  cm: number;
  note: string | null;
  source: string;
};

const SELECT = 'SELECT id,measured_at,site,cm,note,source FROM body_measurements';

function toMeasurement(row: Row): BodyMeasurement {
  if (!isMeasurementSite(row.site) || row.source !== 'liftria') throw new Error('Invalid measurement row');
  return {
    id: row.id,
    measuredAt: row.measured_at,
    site: row.site,
    cm: row.cm,
    note: row.note,
    source: 'liftria',
  };
}

function storedNote(cm: number, at: string, site: MeasurementSite, note: string | null): string | null {
  if (!validateMeasurement(cm, at, site)) throw new Error('Invalid measurement');
  if (note !== null && note.length > 400) throw new Error('Note too long');
  return cleanNote(note);
}

export async function listAllMeasurements(): Promise<DbResult<BodyMeasurement[]>> {
  return dbOperation(async db =>
    (await db.getAllAsync<Row>(SELECT + ' ORDER BY measured_at DESC,id DESC')).map(toMeasurement));
}

export async function listMeasurements(site: MeasurementSite): Promise<DbResult<BodyMeasurement[]>> {
  return dbOperation(async db =>
    (await db.getAllAsync<Row>(SELECT + ' WHERE site=? ORDER BY measured_at DESC,id DESC', [site])).map(toMeasurement));
}

export async function latestBySite(): Promise<DbResult<SiteSummary[]>> {
  const all = await listAllMeasurements();
  if (!all.ok) return all;
  return { ok: true, value: summarizeMeasurements(all.value) };
}

export async function addMeasurements(input: {
  measuredAt: string;
  note: string | null;
  entries: { site: MeasurementSite; cm: number }[];
}): Promise<DbResult<BodyMeasurement[]>> {
  return dbOperation(async db => {
    if (input.entries.length === 0) throw new Error('No measurements');
    // Reject the whole batch before inserting, so a blank-turned-zero or a bad date saves nothing.
    let clean: string | null = null;
    for (const entry of input.entries) clean = storedNote(entry.cm, input.measuredAt, entry.site, input.note);
    const saved: BodyMeasurement[] = [];
    await db.withExclusiveTransactionAsync(async tx => {
      for (const entry of input.entries) {
        const id = newGymId();
        await tx.runAsync(
          'INSERT INTO body_measurements (id,measured_at,site,cm,note,source) VALUES (?,?,?,?,?,?)',
          [id, input.measuredAt, entry.site, entry.cm, clean, 'liftria'],
        );
        saved.push({
          id, measuredAt: input.measuredAt, site: entry.site, cm: entry.cm, note: clean, source: 'liftria',
        });
      }
    });
    return saved;
  });
}

export async function saveMeasurement(
  id: string, cm: number, at: string, note: string | null,
): Promise<DbResult<BodyMeasurement>> {
  return dbOperation(async db => {
    const existing = await db.getFirstAsync<Row>(SELECT + ' WHERE id=? AND source=?', [id, 'liftria']);
    if (!existing) throw new Error('Measurement not found');
    const current = toMeasurement(existing);
    const clean = storedNote(cm, at, current.site, note);
    await db.runAsync(
      'UPDATE body_measurements SET measured_at=?,cm=?,note=? WHERE id=? AND source=?',
      [at, cm, clean, id, 'liftria'],
    );
    return { ...current, measuredAt: at, cm, note: clean };
  });
}

export async function removeMeasurement(id: string): Promise<DbResult<BodyMeasurement | null>> {
  return dbOperation(async db => {
    const existing = await db.getFirstAsync<Row>(SELECT + ' WHERE id=? AND source=?', [id, 'liftria']);
    if (!existing) return null;
    await db.runAsync('DELETE FROM body_measurements WHERE id=? AND source=?', [id, 'liftria']);
    return toMeasurement(existing);
  });
}
