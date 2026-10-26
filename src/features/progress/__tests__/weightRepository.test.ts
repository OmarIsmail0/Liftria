import {validateWeight,weightNeedsConfirmation} from '../weightRepository';
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
