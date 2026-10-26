import { bodyMapDescription } from '../BodyMap';
import { BODY_REGIONS, BUNDLED_REGIONS, DRAWN_REGIONS,
  mapBodyRegions, preferredBodySide } from '../bodyRegions';
import { MUSCLES } from '../../../services/database/gymTypes';
import { bundledExercises } from '../../../services/database/exerciseLibrary';

test('every bundled muscle has a library artwork region', () => {
  const all=bundledExercises();
  const used=new Set(all.flatMap(e=>[...e.primaryMuscles,...e.secondaryMuscles]));
  expect(MUSCLES).toHaveLength(17);
  expect([...used].sort()).toEqual([...MUSCLES].sort());
  expect(DRAWN_REGIONS).toEqual(BUNDLED_REGIONS);
  expect(MUSCLES.every(m=>BODY_REGIONS[m].length>0)).toBe(true);
});
test('shared library regions choose strongest shade', () => {
  expect(mapBodyRegions(['glutes'],['abductors']).get('gluteal')).toBe('primary');
  expect(mapBodyRegions([],['abductors','glutes'],{'glutes':'higher'}).get('gluteal')).toBe('higher');
  expect(mapBodyRegions([],['glutes'],{'glutes':'low'}).get('gluteal')).toBe('secondary');
  expect(mapBodyRegions([],[],{'lats':'some','middle back':'low'}).get('upper-back')).toBe('some');
  expect(mapBodyRegions(['abdominals'],[]).get('obliques')).toBe('primary');
});
test('thumbnail uses the side with most primary muscles',()=>{
  expect(preferredBodySide(['hamstrings','glutes'])).toBe('back');
  expect(preferredBodySide(['chest','biceps'])).toBe('front');
});
test('text alternative describes primary, secondary and empty states', () => {
  expect(bodyMapDescription(['chest'],['shoulders','triceps'])).toBe(
    'Muscles worked. Primary: Chest. Secondary: Shoulders, Triceps.');
  expect(bodyMapDescription([],[])).toContain('Primary: none. Secondary: none.');
});
