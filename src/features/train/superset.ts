export type SupersetExercise={id:string;supersetGroup?:string|null;position:number};
/** Supersets must be 2–3 consecutive exercises; no duplicated or stray groups. */
export function supersetGroupsValid(rows:readonly SupersetExercise[]):boolean{
 const groups=new Map<string,number[]>();
 for(const [index,row] of rows.entries()){
  if(!row.supersetGroup)continue;
  const group=groups.get(row.supersetGroup)??[];group.push(index);groups.set(row.supersetGroup,group);
 }
 return [...groups.values()].every(g=>g.length>=2&&g.length<=3&&
  g.every((index,k)=>k===0||index===g[k-1]!+1));
}
export function supersetAfterSet(rows:readonly SupersetExercise[],index:number):
 {nextIndex:number|null;startRest:boolean}{
 const active=rows[index];if(!active?.supersetGroup)return {nextIndex:null,startRest:true};
 const members=rows.map((row,i)=>row.supersetGroup===active.supersetGroup?i:-1).filter(i=>i>=0);
 if(members.length<2)return {nextIndex:null,startRest:true};
 const at=members.indexOf(index),next=members[at+1];
 return next===undefined?{nextIndex:members[0]??null,startRest:true}:
   {nextIndex:next,startRest:false};
}
export function canLinkSuperset(rows:readonly SupersetExercise[],first:number,count:2|3):boolean{
 return first>=0&&first+count<=rows.length&&
  rows.slice(first,first+count).every(row=>!row.supersetGroup);
}
