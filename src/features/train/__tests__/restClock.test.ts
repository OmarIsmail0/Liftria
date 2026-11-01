import { displayRest, elapsedLabel, nextClockDelay, restAnnouncement, restAt, restDeadline,
  restOrbTextSize, restVisual, selectCurrentRest, shiftRest } from '../restClock';

const start = '2026-10-25T10:00:00.000Z';
test('deadline, rest display and boundaries are stable across a process restart', () => {
  const stored = restDeadline(start, 120);
  expect(stored).toBe('2026-10-25T10:02:00.000Z');
  expect(restAt(stored, Date.parse(start) + 35000)).toEqual({ status: 'running', remainingMs: 85000 });
  // New process reads only the saved ISO deadline.
  expect(restAt(stored, Date.parse(start) + 90000)).toEqual({ status: 'running', remainingMs: 30000 });
  expect(displayRest(stored, Date.parse(start) + 90000)).toBe('0:30');
  expect(restAt(stored, Date.parse(start) + 120000).status).toBe('over');
  expect(displayRest(stored, Date.parse(start) + 120000)).toBe('Rest over');
});
test('adjustments, skip and invalid timestamps never invent running rest', () => {
  const old = restDeadline(start, 60);
  expect(shiftRest(old, 30, Date.parse(start))).toBe(restDeadline(start, 90));
  expect(shiftRest(old, -15, Date.parse(start))).toBe(restDeadline(start, 45));
  expect(restAt(shiftRest(old, -120, Date.parse(start)),Date.parse(start)).status).toBe('over');
  expect(restAt(null).status).toBe('idle');
  expect(restAt('broken').status).toBe('idle');
  expect(shiftRest(null,30)).toBeNull();
});
test('elapsed time and four-event accessibility announce throttling', () => {
  expect(elapsedLabel(start, Date.parse(start) + 61000)).toBe('1:01');
  expect(restAnnouncement(30100,29900)).toBe('30 seconds');
  expect(restAnnouncement(10500,9500)).toBe('10 seconds');
  expect(restAnnouncement(500,0)).toBe('Rest over');
  expect(restAnnouncement(23000,22000)).toBeNull();
});
test('a background gap follows the wall clock, and a jump announces the lowest threshold', () => {
  jest.useFakeTimers();
  try {
    jest.setSystemTime(Date.parse(start));
    const stored = restDeadline(new Date().toISOString(), 90);
    let ticks = 0;
    const timer = setInterval(() => { ticks += 1; }, 1000);
    jest.advanceTimersByTime(5000);
    expect(ticks).toBe(5);
    jest.setSystemTime(Date.parse(start) + 70000);
    expect(ticks).toBe(5);
    expect(restAt(stored).remainingMs).toBe(20000);
    expect(displayRest(stored)).toBe('0:20');
    expect(restAnnouncement(90000, 0)).toBe('Rest over');
    expect(restAnnouncement(40000, 5000)).toBe('10 seconds');
    clearInterval(timer);
  } finally {
    jest.useRealTimers();
  }
});
test('the ring uses the same ceiled seconds as the label, including an extended rest', () => {
  const logged = start;
  const deadline = restDeadline(logged, 120);
  const midway = restVisual(deadline, logged, 120, Date.parse(start) + 30200);
  expect(midway.label).toBe('1:30');
  expect(midway.fraction).toBeCloseTo(90 / 120);
  const extended = shiftRest(deadline, 30, Date.parse(start) + 30200);
  const after = restVisual(extended, logged, 120, Date.parse(start) + 30200);
  expect(after.label).toBe('2:00');
  expect(after.fraction).toBeCloseTo(120 / 150);
  expect(after.fraction).toBeLessThan(1);
  expect(restVisual(deadline, logged, 120, Date.parse(start) + 120000).fraction).toBe(0);
});
test('only the latest in-progress set owns rest', () => {
  const older = { id: 'a', loggedAt: start, restDeadline: restDeadline(start, 300), sessionExerciseId: 'e1' };
  const newer = { id: 'b', loggedAt: '2026-10-25T10:01:00.000Z', restDeadline: null, sessionExerciseId: 'e2' };
  const now = Date.parse('2026-10-25T10:01:30.000Z');
  expect(selectCurrentRest([older, newer], 'in-progress', now).status).toBe('idle');
  expect(selectCurrentRest([older], 'finished', Date.parse(start) + 1000).status).toBe('idle');
  expect(selectCurrentRest([older], 'in-progress', Date.parse(start) + 1000).status).toBe('running');
  expect(selectCurrentRest([older], 'in-progress', Date.parse(start) + 400000).status).toBe('over');
});
test('the orb uses the big metric for a clock and a smaller line for words', () => {
  expect(restOrbTextSize('1:30')).toBe('metric-xl');
  expect(restOrbTextSize('12:05')).toBe('metric-xl');
  expect(restOrbTextSize('Rest over')).toBe('head');
  expect(restOrbTextSize('انتهت الراحة')).toBe('head');
  expect(nextClockDelay(1500)).toBe(500);
  expect(nextClockDelay(2000)).toBe(1000);
});
