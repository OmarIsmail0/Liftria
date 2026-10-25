import { displayRest, elapsedLabel, restAnnouncement, restAt, restDeadline, shiftRest } from '../restClock';

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
