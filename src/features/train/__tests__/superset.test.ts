import {supersetAfterSet,supersetGroupsValid,canLinkSuperset} from '../superset';
const rows=[
 {id:'a',position:0,supersetGroup:'group1'},
 {id:'b',position:1,supersetGroup:'group1'},
 {id:'c',position:2,supersetGroup:'group1'},
 {id:'d',position:3,supersetGroup:null},
];
test('two or three adjacent exercises only; no cross-group overlap',()=>{
 expect(supersetGroupsValid(rows)).toBe(true);
 expect(supersetGroupsValid([rows[0]!,rows[1]!,rows[3]!])).toBe(true);
 expect(supersetGroupsValid([rows[0]!,rows[3]!,rows[1]!])).toBe(false);
 expect(supersetGroupsValid([rows[0]!,rows[3]!])).toBe(false);
 expect(canLinkSuperset(rows,2,2)).toBe(false);
 expect(canLinkSuperset(rows,3,2)).toBe(false);
 expect(canLinkSuperset(rows.map(r=>({...r,supersetGroup:null})),1,3)).toBe(true);
});
test('log jumps to next superset exercise and delays rest until final member',()=>{
 expect(supersetAfterSet(rows,0)).toEqual({nextIndex:1,startRest:false});
 expect(supersetAfterSet(rows,1)).toEqual({nextIndex:2,startRest:false});
 expect(supersetAfterSet(rows,2)).toEqual({nextIndex:0,startRest:true});
 expect(supersetAfterSet(rows,3)).toEqual({nextIndex:null,startRest:true});
});
