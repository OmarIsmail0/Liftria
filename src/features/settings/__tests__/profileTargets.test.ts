import { proposedTargetUpdate, parseOptionalNumber, estimateEditedProfile, checkSettingsTarget } from '../profileTargets';
import type { Target } from '../../../services/database/targets';
const current: Target = { id:1,kcal:2650,proteinG:155,fatG:75,carbsG:340,
  source:'estimate',inputs:{ weightKg:78.4 },createdAt:'2026-10-24T00:00:00Z' };
const input = { name:null,sexForFormula:'male' as const,birthYear:1994,heightCm:175,
  weightKg:80,activity:'active' as const,goal:'maintain' as const };
test('ST-2 offers an explicit target update when a stored estimate changes', () => {
  const proposal = proposedTargetUpdate(input,current,2026);
  expect(proposal?.estimate.kcal).toBe(2700);
  expect(proposal?.previous.kcal).toBe(2650);
  expect(proposal?.estimate.source).toBe('estimate');
});
test('ST-2 manual target is never re-estimated without the user choosing it', () => {
  expect(proposedTargetUpdate(input,{...current,source:'manual',inputs:null},2026)).toBeNull();
  expect(proposedTargetUpdate({...input,weightKg:null},current,2026)).toBeNull();
  expect(proposedTargetUpdate(input,null,2026)).toBeNull();
});
test('ST-2 optional numeric values stay absent, invalid entries do not default to zero', () => {
  expect(parseOptionalNumber('')).toBeNull();
  expect(parseOptionalNumber('invalid')).toBeNaN();
  expect(parseOptionalNumber('80.0')).toBe(80);
});

test('ST-2 target editor uses edited profile, not onboarding draft; explicit calorie floor', () => {
  const updated = {...input, weightKg: 80};
  expect(estimateEditedProfile(updated,2026)?.kcal).toBe(2700);
  expect(estimateEditedProfile({...updated,weightKg:null},2026)).toBeNull();
  expect(checkSettingsTarget(999, updated, 2026)).toMatchObject({blocked:true,warning:true});
  expect(checkSettingsTarget(1100, updated, 2026)).toMatchObject({blocked:false,warning:true});
  expect(checkSettingsTarget(2700, updated, 2026)).toMatchObject({blocked:false,warning:false});
  expect(checkSettingsTarget(1950, updated, 2026).warning).toBe(true); // >25% below maintenance
});
