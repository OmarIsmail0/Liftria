import { displayWeight, fromKg, toKg, workoutWeightStep } from '../workoutUnits';
test('unit conversion preserves kg storage; lb edits round-trip',()=>{
  expect(fromKg(10,'kg')).toBe(10);
  expect(fromKg(10,'lb')).toBeCloseTo(22.05,2);
  expect(toKg(22.05,'lb')).toBeCloseTo(10,2);
  expect(workoutWeightStep('weighted','kg',true)).toBe(1.25);
  expect(workoutWeightStep('dumbbell','kg',false)).toBe(2);
  expect(fromKg(workoutWeightStep('weighted','lb',false),'lb')).toBeCloseTo(5,1);
  expect(fromKg(workoutWeightStep('weighted','lb',true),'lb')).toBeCloseTo(2.5,2);
});
test('assisted and bodyweight weight text matches actual semantics',()=>{
  expect(displayWeight(25,'assisted','kg')).toBe('−25 kg');
  expect(displayWeight(0,'bodyweight','kg')).toBe('BW');
  expect(displayWeight(10,'bodyweight','kg')).toBe('+10 kg');
  expect(displayWeight(20,'dumbbell','kg')).toBe('20 kg each');
  expect(displayWeight(10,'bodyweight','kg','ar')).toBe('+10 كغ');
  expect(displayWeight(20,'dumbbell','lb','ar')).toBe('44.09 رطل لكل يد');
});
