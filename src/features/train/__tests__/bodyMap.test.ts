import { BUNDLED_REGIONS, DRAWN_REGIONS, bodyMapDescription } from '../BodyMap';
import { MUSCLES } from '../../../services/database/gymTypes';
import { bundledExercises } from '../../../services/database/exerciseLibrary';

test('the real bundled pack matches all and only 17 drawn regions', () => {
  const all=bundledExercises();
  const used=new Set(all.flatMap(e=>[...e.primaryMuscles,...e.secondaryMuscles]));
  expect(MUSCLES).toHaveLength(17);
  expect([...used].sort()).toEqual([...MUSCLES].sort());
  expect(DRAWN_REGIONS).toHaveLength(17);
  expect(DRAWN_REGIONS).toEqual(BUNDLED_REGIONS);
});
test('text alternative describes primary, secondary and empty states', () => {
  expect(bodyMapDescription(['chest'],['shoulders','triceps'])).toBe(
    'Muscles worked. Primary: Chest. Secondary: Shoulders, Triceps.');
  expect(bodyMapDescription([],[])).toContain('Primary: none. Secondary: none.');
});
