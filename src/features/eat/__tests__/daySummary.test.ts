import { daySummaryKind, diaryDate, macroFill } from '../daySummary';

test('an unlogged day is not reported as zero eaten or as calories left', () => {
  expect(daySummaryKind(false, 0, null, false)).toEqual({ kind: 'unlogged' });
  expect(daySummaryKind(false, 0, 2200, false)).toEqual({ kind: 'unlogged' });
  expect(daySummaryKind(false, 400, 2200, false)).toEqual({ kind: 'unlogged' });
});

test('logged days keep remaining, eaten-only and over as words with a capped fill', () => {
  expect(daySummaryKind(true, 1536, 2200, false)).toEqual({
    kind: 'within', eaten: 1536, target: 2200, left: 664, progress: 1536 / 2200,
  });
  expect(daySummaryKind(true, 1536.6, 2200, false)).toMatchObject({ kind: 'within', eaten: 1537, left: 663 });
  expect(daySummaryKind(true, 1536, null, false)).toEqual({ kind: 'open', eaten: 1536 });
  expect(daySummaryKind(true, 400, 0, false)).toEqual({ kind: 'open', eaten: 400 });
  expect(daySummaryKind(true, 2300, 2200, false)).toEqual({
    kind: 'over', eaten: 2300, target: 2200, over: 100,
  });
  expect(daySummaryKind(true, 3000, 2000, false)).toMatchObject({ kind: 'over', over: 1000 });
});

test('hidden numbers stay words, and a missing target has no fill', () => {
  expect(daySummaryKind(true, 100, null, true)).toEqual({
    kind: 'hidden', progress: null, message: 'orb.hidden',
  });
  expect(daySummaryKind(true, 100, 2200, true)).toMatchObject({ kind: 'hidden', message: 'orb.onTrack' });
  expect(daySummaryKind(true, 3000, 2000, true)).toEqual({
    kind: 'hidden', progress: 1, message: 'orb.over',
  });
  expect(daySummaryKind(false, 0, 2200, true).kind).toBe('hidden');
});

test('a macro bar needs a known amount and a positive goal', () => {
  expect(macroFill(null, 150)).toBeNull();
  expect(macroFill(90, null)).toBeNull();
  expect(macroFill(90, 0)).toBeNull();
  expect(macroFill(0, 150)).toBe(0);
  expect(macroFill(75, 150)).toBe(0.5);
  expect(macroFill(180, 150)).toBe(1);
});

test('diary headings only parse real calendar days', () => {
  const parsed = diaryDate('2026-11-16');
  expect(parsed?.getFullYear()).toBe(2026);
  expect(parsed?.getMonth()).toBe(10);
  expect(parsed?.getDate()).toBe(16);
  expect(diaryDate('2026-02-31')).toBeNull();
  expect(diaryDate('today')).toBeNull();
});
