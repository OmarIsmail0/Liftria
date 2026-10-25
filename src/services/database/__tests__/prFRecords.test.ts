import { historyNumbers, type HistoryDetail } from '../historyRepository';
import { setVolume, calculateRecords, type RecordObservation } from '../gymMath';

const workout:HistoryDetail={
 session:{id:'s',title:'Demo',startedAt:'2026-10-21T10:00:00Z',
  endedAt:'2026-10-21T11:00:00Z',notes:null,source:'manual',importer:null},
 exercises:[
  {id:'1',exerciseId:'bench',name:'Bench',type:'weighted',unilateral:false,position:0,
   primary:['chest'],secondary:[],sets:[
    {id:'1a',sessionExerciseId:'1',position:0,kind:'working',side:null,weight:60,reps:8,loggedAt:'2026-10-21T10:20:00Z',restDeadline:null},
    {id:'1b',sessionExerciseId:'1',position:99,kind:'warm-up',side:null,weight:30,reps:12,loggedAt:'2026-10-21T10:05:00Z',restDeadline:null},
   ]},
  {id:'2',exerciseId:'db',name:'Dumbbells',type:'dumbbell',unilateral:true,position:1,
   primary:['shoulders'],secondary:[],sets:[
    {id:'2L',sessionExerciseId:'2',position:0,kind:'working',side:'L',weight:20,reps:8,loggedAt:'2026-10-21T10:30:00Z',restDeadline:null},
    {id:'2R',sessionExerciseId:'2',position:0,kind:'working',side:'R',weight:20,reps:8,loggedAt:'2026-10-21T10:30:10Z',restDeadline:null},
    {id:'2incomplete',sessionExerciseId:'2',position:1,kind:'working',side:'L',weight:20,reps:8,loggedAt:'2026-10-21T10:32:00Z',restDeadline:null},
   ]},
  {id:'3',exerciseId:'assist',name:'Assisted',type:'assisted',unilateral:false,position:2,
   primary:['lats'],secondary:[],sets:[
    {id:'3a',sessionExerciseId:'3',position:0,kind:'working',side:null,weight:25,reps:8,loggedAt:'2026-10-21T10:40:00Z',restDeadline:null},
   ]},
 ],
};
test('history numbers count complete bilateral pairs once and ignore warm-ups and lone sides',()=>{
 expect(historyNumbers(workout)).toEqual({sets:3,volume:60*8+2*20*8});
});
test('assistance and warmups are not volume or records',()=>{
 expect(setVolume('assisted',{kind:'working',side:null,weight:25,reps:8})).toBe(0);
 expect(setVolume('weighted',{kind:'warm-up',side:null,weight:100,reps:8})).toBe(0);
});
test('records recalculate from edited/deleted history rather than retaining removed personal bests',()=>{
 const observations:RecordObservation[]=[{exerciseId:'bench',sessionId:'old',type:'weighted',
  endedAt:'2026-10-20T11:00:00Z',weight:60,reps:8,kind:'working',side:null},
 {exerciseId:'bench',sessionId:'new',type:'weighted',endedAt:'2026-10-21T11:00:00Z',
  weight:85,reps:8,kind:'working',side:null},
 {exerciseId:'bench',sessionId:'warm',type:'weighted',endedAt:'2026-10-21T11:00:00Z',
  weight:120,reps:8,kind:'warm-up',side:null}];
 expect(calculateRecords(observations)[0]?.heaviest).toBe(85);
 expect(calculateRecords(observations.filter(x=>x.sessionId!=='new'))[0]?.heaviest).toBe(60);
 expect(calculateRecords(observations.map(x=>x.sessionId==='new'?{...x,weight:55}:x))[0]?.heaviest).toBe(60);
});
