import {formatAxisDayLabel,formatAxisValueLabel,pickTickIndexes} from '../chartAxis';

test('pickTickIndexes keeps first and last with evenly spaced middle ticks',()=>{
  expect(pickTickIndexes(0,4)).toEqual([]);
  expect(pickTickIndexes(3,4)).toEqual([0,1,2]);
  expect(pickTickIndexes(28,4)).toEqual([0,9,18,27]);
});

test('date labels are localized with western numerals in Arabic',()=>{
  const en=formatAxisDayLabel('2026-10-09','en');
  expect(en).toContain('9');
  const ar=formatAxisDayLabel('2026-10-09','ar');
  expect(ar).toContain('9');
  expect(ar).not.toMatch(/[٠-٩]/);
});

test('value labels use the requested unit and locale formatting',()=>{
  expect(formatAxisValueLabel(78.44,'en','kg')).toBe('78.4 kg');
  expect(formatAxisValueLabel(173.92,'en','lb')).toBe('173.9 lb');
  expect(formatAxisValueLabel(2123.2,'en','kcal')).toBe('2,123 kcal');
  const ar=formatAxisValueLabel(2123.2,'ar','kcal');
  expect(ar).toBe('2,123 سعرة');
  expect(ar).not.toMatch(/[٠-٩]/);
});
