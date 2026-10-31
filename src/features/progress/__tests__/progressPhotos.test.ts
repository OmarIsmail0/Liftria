import { deleteLocalDatabase } from '../../../services/database';
import { resetMemorySqlite } from '../../settings/__tests__/memorySqlite';
import {
  addProgressPhoto, listProgressPhotos, progressPhotoUsage, removeProgressPhoto, saveProgressPhotoNote,
  validateProgressPhoto,
} from '../progressPhotoRepository';
import {
  chooseComparePhoto, comparePhotosForPose, defaultCompareIds, formatLoggedBodyWeight, groupPhotosByDay,
  latestByPose, loggedWeightKgOnDay, progressPhotosBlurred, resizeForProgressPhoto,
  type ProgressPhoto,
} from '../progressPhotos';

jest.mock('expo-sqlite', () => jest.requireActual('../../settings/__tests__/memorySqlite').memoryExpoSqlite);

const { readFileSync } = jest.requireActual('fs') as { readFileSync: (file: string, encoding: 'utf8') => string };
const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };

const DAY = (iso: string) => iso.slice(0, 10);
const AT = '2026-06-01T12:00:00.000Z';

function photo(partial: Partial<ProgressPhoto> & Pick<ProgressPhoto, 'id' | 'pose' | 'takenAt'>): ProgressPhoto {
  return {
    jpegBase64: 'AQID', width: 10, height: 20, note: null, source: 'liftria', ...partial,
  };
}

beforeEach(async () => {
  await deleteLocalDatabase();
  resetMemorySqlite();
});

test('the long edge scales to 1080 and a smaller photo is left for re-encoding', () => {
  expect(resizeForProgressPhoto(4032, 3024)).toEqual({ width: 1080 });
  expect(resizeForProgressPhoto(3000, 4000)).toEqual({ height: 1080 });
  expect(resizeForProgressPhoto(640, 480)).toEqual({});
  expect(resizeForProgressPhoto(1080, 1080)).toEqual({});
  expect(() => resizeForProgressPhoto(0, 100)).toThrow();
});

test('photos stay blurred until this visit reveals them, unless the setting is on', () => {
  expect(progressPhotosBlurred(false, false)).toBe(true);
  expect(progressPhotosBlurred(false, true)).toBe(false);
  expect(progressPhotosBlurred(true, false)).toBe(false);
});

test('gallery groups by day newest first and each pose keeps its latest photo', () => {
  const rows = [
    photo({ id: 'f1', pose: 'front', takenAt: '2026-06-01T08:00:00.000Z' }),
    photo({ id: 'f2', pose: 'front', takenAt: '2026-06-01T18:00:00.000Z' }),
    photo({ id: 's1', pose: 'side', takenAt: '2026-05-01T12:00:00.000Z' }),
    photo({ id: 'b1', pose: 'back', takenAt: '2026-06-02T12:00:00.000Z' }),
  ];
  expect(groupPhotosByDay(rows, DAY).map(group => [group.day, group.photos.map(item => item.id)])).toEqual([
    ['2026-06-02', ['b1']],
    ['2026-06-01', ['f2', 'f1']],
    ['2026-05-01', ['s1']],
  ]);
  expect(latestByPose(rows).map(item => [item.pose, item.photo?.id ?? null])).toEqual([
    ['front', 'f2'],
    ['side', 's1'],
    ['back', 'b1'],
  ]);
});

test('logged weight is the latest entry that day and is never invented', () => {
  const weights = [
    { at: '2026-06-01T08:00:00.000Z', kg: 80 },
    { at: '2026-06-01T19:00:00.000Z', kg: 80.4 },
    { at: '2026-06-02T12:00:00.000Z', kg: 81 },
  ];
  expect(loggedWeightKgOnDay(weights, '2026-06-01T12:00:00.000Z', DAY)).toBe(80.4);
  expect(loggedWeightKgOnDay(weights, '2026-06-03T12:00:00.000Z', DAY)).toBeNull();
  expect(loggedWeightKgOnDay([{ at: '2026-06-01T12:00:00.000Z', kg: 0 }], '2026-06-01T12:00:00.000Z', DAY)).toBeNull();
});

test('a logged weight and its unit are one isolated value', () => {
  expect(formatLoggedBodyWeight('en', 80.4, 'kg')).toBe('80.4\u00A0kg');
  const arabic = formatLoggedBodyWeight('ar', 80, 'kg');
  expect(arabic.startsWith('\u2068')).toBe(true);
  expect(arabic).toContain('80.0\u00A0كغ');
  expect(arabic).not.toMatch(/\bkg\b|\blb\b/);
  expect(formatLoggedBodyWeight('ar', 80, 'lb')).toContain('رطل');
  expect(formatLoggedBodyWeight('ar', 80, 'lb')).not.toMatch(/\blb\b/);
});

test('compare offers two different days and keeps both ends when a date is picked', () => {
  const rows = [
    photo({ id: 'a', pose: 'front', takenAt: '2026-01-01T12:00:00.000Z' }),
    photo({ id: 'a2', pose: 'front', takenAt: '2026-01-01T18:00:00.000Z' }),
    photo({ id: 'b', pose: 'front', takenAt: '2026-02-01T12:00:00.000Z' }),
    photo({ id: 'c', pose: 'front', takenAt: '2026-03-01T12:00:00.000Z' }),
    photo({ id: 'd', pose: 'front', takenAt: '2026-04-01T12:00:00.000Z' }),
    photo({ id: 'side', pose: 'side', takenAt: '2026-04-01T12:00:00.000Z' }),
  ];
  const options = comparePhotosForPose(rows, 'front', DAY);
  expect(options.map(item => item.id)).toEqual(['a2', 'b', 'c', 'd']);
  expect(defaultCompareIds(options)).toEqual({ earlierId: 'a2', laterId: 'd' });
  expect(defaultCompareIds(comparePhotosForPose(rows, 'side', DAY))).toBeNull();
  expect(chooseComparePhoto(options, 'a2', 'd', 'b')).toEqual({ earlierId: 'b', laterId: 'd' });
  expect(chooseComparePhoto(options, 'a2', 'd', 'c')).toEqual({ earlierId: 'a2', laterId: 'c' });
  expect(chooseComparePhoto(options, 'a2', 'd', 'd')).toEqual({ earlierId: 'a2', laterId: 'd' });
});

test('add, edit note and delete keep the JPEG and the latest pose', async () => {
  const first = await addProgressPhoto({
    takenAt: '2026-01-01T12:00:00.000Z', pose: 'front', jpegBase64: 'QQ==', width: 8, height: 8, note: '  ',
  });
  const second = await addProgressPhoto({
    takenAt: '2026-02-01T12:00:00.000Z', pose: 'front', jpegBase64: 'QWE=', width: 1080, height: 720, note: 'صباح',
  });
  const side = await addProgressPhoto({
    takenAt: AT, pose: 'side', jpegBase64: 'QQ==', width: 4, height: 4, note: null,
  });
  expect(first.ok && second.ok && side.ok).toBe(true);
  if (!first.ok || !second.ok || !side.ok) return;
  expect(first.value.note).toBeNull();
  expect(first.value.source).toBe('liftria');
  expect(first.value.id.length).toBeGreaterThan(0);

  const edited = await saveProgressPhotoNote(second.value.id, '  مساء  ');
  expect(edited.ok && edited.value.note).toBe('مساء');
  const listed = await listProgressPhotos();
  expect(listed.ok && listed.value.map(item => item.id)).toEqual([side.value.id, second.value.id, first.value.id]);
  expect(latestByPose(listed.ok ? listed.value : []).map(item => item.photo?.id ?? null)).toEqual([
    second.value.id, side.value.id, null,
  ]);

  const usage = await progressPhotoUsage();
  expect(usage.ok && usage.value).toEqual({ count: 3, bytes: 'QQ=='.length * 2 + 'QWE='.length });

  expect((await removeProgressPhoto(first.value.id)).ok).toBe(true);
  const after = await listProgressPhotos();
  expect(after.ok && after.value.map(item => item.id)).toEqual([side.value.id, second.value.id]);
  const missing = await removeProgressPhoto('missing');
  expect(missing.ok && missing.value).toBeNull();
});

test('a blank JPEG, a huge edge and a long note are not saved', async () => {
  expect(validateProgressPhoto({
    takenAt: AT, pose: 'back', jpegBase64: '', width: 10, height: 10, note: null,
  })).toBe(false);
  expect(validateProgressPhoto({
    takenAt: AT, pose: 'back', jpegBase64: 'QQ==', width: 1081, height: 10, note: null,
  })).toBe(false);
  expect(validateProgressPhoto({
    takenAt: 'not-a-date', pose: 'back', jpegBase64: 'QQ==', width: 10, height: 10, note: null,
  })).toBe(false);
  const tooLong = await addProgressPhoto({
    takenAt: AT, pose: 'back', jpegBase64: 'QQ==', width: 10, height: 10, note: 'x'.repeat(401),
  });
  expect(tooLong.ok).toBe(false);
  const empty = await addProgressPhoto({
    takenAt: AT, pose: 'back', jpegBase64: '', width: 10, height: 10, note: null,
  });
  expect(empty.ok).toBe(false);
  const usage = await progressPhotoUsage();
  expect(usage.ok && usage.value).toEqual({ count: 0, bytes: 0 });
});

test('progress photos are not part of the CSV export', () => {
  const csv = readFileSync(join(process.cwd(), 'src/features/settings/csvExport.ts'), 'utf8');
  expect(csv).not.toContain('progress_photos');
});
