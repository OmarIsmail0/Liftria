import {nextGlasses} from '../waterRepository';
test('water not logged differs from logged zero and never becomes a negative count',()=>{
 expect(nextGlasses(null,-1)).toBeNull();
 expect(nextGlasses(null,1)).toBe(1);
 expect(nextGlasses(1,-1)).toBe(0);
 expect(nextGlasses(0,-1)).toBe(0);
 expect(nextGlasses(200,1)).toBe(200);
});
