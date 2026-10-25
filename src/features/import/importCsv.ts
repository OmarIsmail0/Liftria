/** Offline CSV import. Column assumptions must be checked against actual app exports. */
export type Importer='hevy'|'strong'|'fitnotes'|'csv';
export type WeightUnit='kg'|'lb';
export type ParsedSet={exercise:string;position:number;kind:'working'|'warm-up';
 weight:number;reps:number;unit:WeightUnit|null;notes:string|null;loggedAt:string};
export type ParsedWorkout={key:string;title:string;startedAt:string;endedAt:string;
 localDay:string;dateOnly:boolean;sets:ParsedSet[]};
export type ParsedImport={source:Importer;fileName:string;fileHash:string;columns:string[];
 workouts:ParsedWorkout[];ignored:number;warmupMarked:boolean;needsUnit:boolean};
export class ImportParseError extends Error{
 constructor(public readonly code:'invalid'|'empty'|'too-large',message:string,
  public readonly expected:string[]=[],public readonly found:string[]=[]){
  super(message);this.name='ImportParseError';
 }
}
export const MAX_CSV_BYTES=25*1024*1024;
const normalized=(s:string)=>s.toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,'');
/** UTF-8 code points; no Web Crypto / network APIs (Hermes-compatible). */
export function utf8Bytes(s:string):number[]{
 const result:number[]=[];
 for(const character of s){
  const cp=character.codePointAt(0)!;
  if(cp<128)result.push(cp);
  else if(cp<2048)result.push(0xc0|(cp>>6),0x80|(cp&63));
  else if(cp<65536)result.push(0xe0|(cp>>12),0x80|((cp>>6)&63),0x80|(cp&63));
  else result.push(0xf0|(cp>>18),0x80|((cp>>12)&63),0x80|((cp>>6)&63),0x80|(cp&63));
 }
 return result;
}
/** SHA-256 used only for file idempotency, not key storage or authentication. */
export function sha256(raw:string):string{
 const bytes=utf8Bytes(raw),bitLength=bytes.length*8;
 bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
 const hi=Math.floor(bitLength/4294967296),lo=bitLength>>>0;
 for(const v of [hi,lo])bytes.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255);
 const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const rotr=(x:number,n:number)=>(x>>>n)|(x<<(32-n));
 for(let offset=0;offset<bytes.length;offset+=64){
  const w=new Array<number>(64);
  for(let i=0;i<16;i++){const b=offset+4*i;w[i]=((bytes[b]!<<24)|(bytes[b+1]!<<16)|(bytes[b+2]!<<8)|bytes[b+3]!)>>>0;}
  for(let i=16;i<64;i++){
   const a=w[i-15]!,b=w[i-2]!;
   w[i]=(w[i-16]!+(rotr(a,7)^rotr(a,18)^(a>>>3))+w[i-7]!+
     (rotr(b,17)^rotr(b,19)^(b>>>10)))>>>0;
  }
  let [a,b,c,d,e,f,g,hh]=h;
  for(let i=0;i<64;i++){
   const s1=rotr(e!,6)^rotr(e!,11)^rotr(e!,25),choose=(e!&f!)^(~e!&g!);
   const t1=(hh!+s1+choose+k[i]!+w[i]!)>>>0;
   const s0=rotr(a!,2)^rotr(a!,13)^rotr(a!,22),major=(a!&b!)^(a!&c!)^(b!&c!);
   const t2=(s0+major)>>>0;
   hh=g;g=f;f=e;e=(d!+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  const q=[a,b,c,d,e,f,g,hh];for(let i=0;i<8;i++)h[i]=(h[i]!+q[i]!)>>>0;
 }
 return h.map(v=>v.toString(16).padStart(8,'0')).join('');
}
/** RFC4180 quotes, embedded delimiters/newlines, BOM, comma and semicolon. */
export function readCsv(input:string):{columns:string[];rows:string[][]}{
 const text=input.replace(/^\uFEFF/,'');
 const firstLine=text.slice(0,text.indexOf('\n')<0?text.length:text.indexOf('\n'));
 const comma=(firstLine.match(/,/g)??[]).length,semi=(firstLine.match(/;/g)??[]).length;
 const delim=semi>comma?';':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i]!;
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
  }else if(!quoted&&ch===delim){row.push(cell);cell='';}
  else if(!quoted&&(ch==='\n'||ch==='\r')){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);if(row.some(v=>v.trim()!==''))rows.push(row);
   row=[];cell='';
  }else cell+=ch;
 }
 if(quoted)throw new ImportParseError('invalid','CSV has an unclosed quoted field.');
 row.push(cell);if(row.some(v=>v.trim()!==''))rows.push(row);
 const columns=(rows.shift()??[]).map(x=>x.trim());
 return {columns,rows};
}
const fields:Record<Importer,{date:string[];exercise:string[];weight:string[];reps:string[];title:string[]}>={
 hevy:{date:['start_time'],exercise:['exercise_title'],weight:['weight_kg','weight_lbs','weight'],reps:['reps'],title:['title']},
 strong:{date:['Date'],exercise:['Exercise Name'],weight:['Weight'],reps:['Reps'],title:['Workout Name']},
 fitnotes:{date:['Date'],exercise:['Exercise'],weight:['Weight (kgs)','Weight (lbs)','Weight'],reps:['Reps'],title:[]},
 csv:{date:['date','start_time','timestamp'],exercise:['exercise','exercise_name'],weight:['weight','weight_kg','weight_lbs','weight (kgs)','weight (lbs)'],reps:['reps','repetitions'],title:[]},
};
export function expectedColumns(importer:Importer):string[]{const f=fields[importer];
 return [...f.date.slice(0,1),...f.exercise.slice(0,1),...f.weight.slice(0,1),...f.reps.slice(0,1)];}
function whenFrom(value:string):{iso:string;day:string;dateOnly:boolean}{
 const v=value.trim();if(!v)throw new Error('Missing workout date');
 let date:Date;const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(v);
 if(dateOnly){const [y,m,d]=v.split('-').map(Number);date=new Date(y!,m!-1,d!,12);}
 else if(/^\d{1,2}[\/.]\d{1,2}[\/.]\d{4}/.test(v)){
  const match=/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(v)!;
  // Only explicit ISO or locale-style US MDY; no invisible month/day guessing.
  date=new Date(Number(match[3]),Number(match[1])-1,Number(match[2]),
   match[4]?Number(match[4]):12,match[5]?Number(match[5]):0);
 }else{
  date=new Date(v.replace(' ', 'T'));
 }
 if(!Number.isFinite(date.valueOf()))throw new Error('Invalid workout date: '+v);
 // Date(y,m,d) normalizes nonexistent days (e.g. Feb 31) into another month.
 // Reject them: otherwise a malformed export changes the day and duplicate check.
 const isoDay=/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/.exec(v);
 const usDay=/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})(?:\s|$)/.exec(v);
 if(isoDay&&v.length===10 || usDay){
  const year=isoDay?Number(isoDay[1]):Number(usDay![3]);
  const month=isoDay?Number(isoDay[2]):Number(usDay![1]);
  const day=isoDay?Number(isoDay[3]):Number(usDay![2]);
  const check=new Date(year,month-1,day);
  if(check.getFullYear()!==year||check.getMonth()+1!==month||check.getDate()!==day)
   throw new Error('Invalid workout date: '+v);
 }
 return {iso:date.toISOString(),day:[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),
   String(date.getDate()).padStart(2,'0')].join('-'),dateOnly};
}
export function localDayFromIso(iso:string):string{
 const d=new Date(iso);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
  String(d.getDate()).padStart(2,'0')].join('-');
}
export function parseImportCsv(source:Importer,fileName:string,raw:string):ParsedImport{
 if(utf8Bytes(raw).length>MAX_CSV_BYTES)throw new ImportParseError('too-large','This file is too large to import.');
 const {columns,rows}=readCsv(raw);
 const indexes=new Map(columns.map((name,i)=>[normalized(name),i]));
 const f=fields[source],col=(names:string[])=>names.map(x=>indexes.get(normalized(x))).find(x=>x!==undefined);
 const dt=col(f.date),ex=col(f.exercise),wt=col(f.weight),re=col(f.reps),title=col(f.title);
 const weightColumns=f.weight.map(name=>indexes.get(normalized(name))).filter((x):x is number=>x!==undefined);
 if([dt,ex,wt,re].some(x=>x===undefined)||(f.title.length>0&&title===undefined)){
  throw new ImportParseError('invalid','This does not look like a '+source+' export.',
   expectedColumns(source),columns);
 }
 const extra=(names:string[])=>col(names);
 const end=extra(['end_time','end time']),unitCol=extra(['weight_unit','unit','units']);
 const setType=extra(['set_type','set type','set order type','type']);
 const setIndex=extra(['set_index','set order','set number']);
 const notes=extra(['exercise_notes','notes']);
 const sessions=new Map<string,ParsedWorkout>();
 let ignored=0,marked=false,needsUnit=false;
 for(let index=0;index<rows.length;index++){
  const row=rows[index]!;const v=(i:number|undefined)=>(i===undefined?'':row[i]??'').trim();
  const selectedWeight=weightColumns.find(column=>v(column)!=='')??wt;
  if(!v(dt)&&!v(ex)&&!v(re)&&!v(selectedWeight)){ignored++;continue;}
  if(!v(dt)||!v(ex))throw new ImportParseError('invalid','Row '+(index+2)+' has no date or exercise.',expectedColumns(source),columns);
  const reps=v(re);
  if(!reps){if(!v(selectedWeight)&&!v(setType)){ignored++;continue;}
    if(!v(setType)){ignored++;continue;}
  }
  const repCount=reps?Number(reps):0,weightString=v(selectedWeight).replace(/\s/g,'');
  const weight=weightString===''?0:Number(weightString.replace(',','.'));
  if(!Number.isInteger(repCount)||repCount<0||repCount>500||
    !Number.isFinite(weight)||weight<0)throw new ImportParseError('invalid','Invalid set on row '+(index+2)+'.',expectedColumns(source),columns);
  let date:ReturnType<typeof whenFrom>;
  try{date=whenFrom(v(dt));}catch{
   throw new ImportParseError('invalid','Invalid workout date on row '+(index+2)+'.',
    expectedColumns(source),columns);
  }
  const sessionTitle=v(title)||'Imported workout';
  const key=date.iso+'|'+sessionTitle;
  let workout=sessions.get(key);
  if(!workout){workout={key,title:sessionTitle,startedAt:date.iso,endedAt:date.iso,
    localDay:date.day,dateOnly:date.dateOnly,sets:[]};sessions.set(key,workout);}
  if(v(end)){
   try{workout.endedAt=whenFrom(v(end)).iso;}catch{throw new ImportParseError('invalid','Invalid end time on row '+(index+2));}
  }
  const header=columns[selectedWeight!]!.toLowerCase();
  const normalizedHeader=normalized(header);
  const explicit:WeightUnit|null=/(?:lbs?|pounds?)$/.test(normalizedHeader)?'lb':
    /(?:kgs?|kilograms?)$/.test(normalizedHeader)?'kg':null;
  const unitValue=v(unitCol).toLowerCase();
  const declared:WeightUnit|null=/^(kg|kgs|kilograms)$/.test(unitValue)?'kg':
    /^(lb|lbs|pounds)$/.test(unitValue)?'lb':null;
  if(unitValue&&!declared)throw new ImportParseError('invalid','Unknown weight unit on row '+(index+2));
  if(explicit&&declared&&explicit!==declared)
    throw new ImportParseError('invalid','Conflicting weight units on row '+(index+2));
  const unit:WeightUnit|null=explicit??declared;
  if(!unit)needsUnit=true;
  const kind= /warm.?up|^w$|warmup/i.test(v(setType))?'warm-up':'working';
  if(setType!==undefined)marked=true;
  const positionValue=v(setIndex);
  const position=positionValue&&Number.isInteger(Number(positionValue))&&Number(positionValue)>=0?
    Number(positionValue):workout.sets.filter(s=>s.exercise===v(ex)).length;
  workout.sets.push({exercise:v(ex),position,kind,weight,reps:repCount,
    unit,notes:v(notes)||null,loggedAt:date.iso});
 }
 const workouts=[...sessions.values()].sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
 if(!workouts.length)throw new ImportParseError('empty','No workouts found in this file.',expectedColumns(source),columns);
 return {source,fileName,fileHash:sha256(raw.replace(/^\uFEFF/,'')),columns,workouts,ignored,
  warmupMarked:marked,needsUnit};
}
export function fromImportWeight(value:number,unit:WeightUnit):number{
 return unit==='kg'?value:value/2.2046226218;
}
