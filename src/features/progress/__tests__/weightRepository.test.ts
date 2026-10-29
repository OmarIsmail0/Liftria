import {validateWeight,weightNeedsConfirmation} from '../weightRepository';
import {toKg,fromKg} from '../../train/workoutUnits';
test('only a real positive weight in an allowed date range may enter storage',()=>{
 const now=new Date().toISOString();
 expect(validateWeight(78.4,now)).toBe(true);
 for(const v of [-1,0,NaN,Infinity,501])expect(validateWeight(v,now)).toBe(false);
 expect(validateWeight(78.4,'not-a-date')).toBe(false);
 expect(validateWeight(78.4,'2099-01-01T00:00:00Z')).toBe(false);
});
test('unusual entries trigger review instead of silently changing values',()=>{
 expect(weightNeedsConfirmation(78.4)).toBe(false);
 expect(weightNeedsConfirmation(19.9)).toBe(true);
 expect(weightNeedsConfirmation(300)).toBe(false);
 expect(weightNeedsConfirmation(301)).toBe(true);
});

test('Body input uses unit settings: 176.4 lb stores about 80 kg and displays 176.4 lb',()=>{
 const storedKg=toKg(176.4,'lb');
 expect(storedKg).toBeCloseTo(80,1);
 expect(fromKg(storedKg,'lb').toFixed(1)).toBe('176.4');
 expect(validateWeight(storedKg,new Date().toISOString())).toBe(true);
 expect(weightNeedsConfirmation(storedKg)).toBe(false);
 expect(toKg(80,'kg')).toBe(80);
});
