import { joinList } from '..';

test('Arabic lists use the Arabic comma, English the Latin comma', () => {
  expect(joinList('ar', ['الأكتاف', 'العضلة ثلاثية الرؤوس'])).toBe('الأكتاف، العضلة ثلاثية الرؤوس');
  expect(joinList('en', ['Shoulders', 'Triceps'])).toBe('Shoulders, Triceps');
  expect(joinList('ar', [])).toBe('');
});
