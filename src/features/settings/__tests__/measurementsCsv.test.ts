import { measurementsCsv } from '../csvExport';
import { dbOperation, deleteLocalDatabase } from '../../../services/database';
import { resetMemorySqlite } from './memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('measurements CSV is its own file, in centimeters, oldest first', async () => {
  const inserted = await dbOperation(async db => {
    await db.runAsync(
      'INSERT INTO body_measurements (id,measured_at,site,cm,note,source) VALUES (?,?,?,?,?,?)',
      ['m2', '2026-10-08T12:00:00.000Z', 'chest', 100, null, 'liftria'],
    );
    await db.runAsync(
      'INSERT INTO body_measurements (id,measured_at,site,cm,note,source) VALUES (?,?,?,?,?,?)',
      ['m1', '2026-10-01T12:00:00.000Z', 'waist', 82.5, 'بعد التمرين', 'liftria'],
    );
  });
  expect(inserted.ok).toBe(true);
  const csv = await measurementsCsv();
  if (!csv.ok) throw new Error(csv.error.message);
  const lines = csv.value.trim().split('\r\n');
  expect(lines[0]).toBe('"Measured at","Site","Centimeters","Note","Source"');
  expect(lines[1]).toContain('"waist"');
  expect(lines[1]).toContain('82.5');
  expect(lines[1]).toContain('بعد التمرين');
  expect(lines[2]).toContain('"chest"');
  expect(lines).toHaveLength(3);
});
