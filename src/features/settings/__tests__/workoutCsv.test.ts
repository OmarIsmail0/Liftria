import { csvSetType, workoutCsv } from '../csvExport';
import { dbOperation, deleteLocalDatabase } from '../../../services/database';
import { resetMemorySqlite } from './memorySqlite';

jest.mock('expo-sqlite', () => jest.requireActual('./memorySqlite').memoryExpoSqlite);

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('workout CSV has a Set type column and keeps drop and failure marks', async () => {
  const inserted = await dbOperation(async db => {
    await db.runAsync(
      "INSERT INTO exercises (id,name,type,source) VALUES ('ex','Bench Press','weighted','custom')");
    await db.runAsync(
      "INSERT INTO sessions (id,title,source,started_at,ended_at,state) VALUES ('s','Push','manual',?,?, 'finished')",
      ['2026-11-01T10:00:00.000Z', '2026-11-01T11:00:00.000Z']);
    await db.runAsync(
      "INSERT INTO session_exercises (id,session_id,exercise_id,position) VALUES ('se','s','ex',0)");
    await db.runAsync(
      'INSERT INTO sets (id,session_exercise_id,position,kind,mark,weight,reps,logged_at) VALUES (?,?,?,?,?,?,?,?)',
      ['warm', 'se', 0, 'warm-up', null, 20, 12, '2026-11-01T10:01:00.000Z']);
    await db.runAsync(
      'INSERT INTO sets (id,session_exercise_id,position,kind,mark,weight,reps,logged_at) VALUES (?,?,?,?,?,?,?,?)',
      ['work', 'se', 1, 'working', null, 60, 8, '2026-11-01T10:02:00.000Z']);
    await db.runAsync(
      'INSERT INTO sets (id,session_exercise_id,position,kind,mark,weight,reps,logged_at) VALUES (?,?,?,?,?,?,?,?)',
      ['fail', 'se', 2, 'working', 'failure', 55, 6, '2026-11-01T10:03:00.000Z']);
    await db.runAsync(
      'INSERT INTO sets (id,session_exercise_id,position,kind,mark,weight,reps,logged_at) VALUES (?,?,?,?,?,?,?,?)',
      ['drop', 'se', 3, 'working', 'drop', 40, 10, '2026-11-01T10:04:00.000Z']);
  });
  expect(inserted.ok).toBe(true);
  expect(csvSetType('working', 'drop')).toBe('drop');
  expect(csvSetType('working', 'failure')).toBe('failure');
  expect(csvSetType('warm-up', null)).toBe('warm-up');
  expect(csvSetType('working', null)).toBe('working');
  const csv = await workoutCsv();
  if (!csv.ok) throw new Error(csv.error.message);
  const lines = csv.value.trim().split('\r\n');
  expect(lines[0]).toBe('"Session ID","Workout","Started","Finished","State","Exercise","Set","Kind","Set type","Side","Weight kg","Reps","RPE","RIR","Note"');
  expect(lines[1]).toContain('"warm-up","warm-up"');
  expect(lines[2]).toContain('"working","working"');
  expect(lines[3]).toContain('"working","failure"');
  expect(lines[4]).toContain('"working","drop"');
  expect(lines).toHaveLength(5);
});
