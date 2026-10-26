import {calculatePlates,suggestedWarmups} from '../plateCalculator';
test('greedy kg plates produce the same load on both sides',()=>{
 const r=calculatePlates(100,20,'kg');
 expect(r.exact).toBe(true);
 expect(r.perSide).toEqual([{weight:25,count:1},{weight:15,count:1}]);
 expect(r.actual).toBe(100);
});
test('unloadable weights show closest lower achievable load, not fake precision',()=>{
 const r=calculatePlates(92,20,'kg');
 expect(r.exact).toBe(false);
 expect(r.actual).toBe(90);
 expect(r.perSide.every(p=>p.count>0)).toBe(true);
 expect(calculatePlates(15,20,'kg').belowBar).toBe(true);
 expect(calculatePlates(15,20,'kg').actual).toBe(20);
});
test('small plates and 45lb bar use correct unit inventory',()=>{
 expect(calculatePlates(47.5,45,'lb',false).actual).toBe(45);
 expect(calculatePlates(47.5,45,'lb',true).actual).toBe(47.5);
 expect(calculatePlates(61,20,'kg',true).actual).toBe(61);
});
test('warmups are rounded DOWN to actual bar and plates, and never saved',()=>{
 const rows=suggestedWarmups(100,20,'kg',false);
 expect(rows.map(r=>[r.actual,r.reps])).toEqual([[20,10],[40,5],[60,3],[80,1]]);
 expect(rows[3]?.weightKg).toBe(80);
 expect(suggestedWarmups(0,20,'kg')).toEqual([]);
 expect(suggestedWarmups(25,20,'kg').every(r=>r.actual>=20)).toBe(true);
});
