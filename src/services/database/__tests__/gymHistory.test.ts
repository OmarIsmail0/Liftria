import { exerciseSessions, recentExerciseIds } from '../gymRepositories';

const mockSessions = [
  {id:'done',title:'Workout',template_id:null,source:'manual',importer:null,
    import_batch_id:null,started_at:'2026-10-24T10:00:00Z',ended_at:'2026-10-24T11:00:00Z',
    edited_at:null,notes:null,state:'finished',kind:'working',reps:8},
  {id:'empty',title:'Empty',state:'finished',kind:null,reps:0},
  {id:'warmup',title:'Warmup only',state:'finished',kind:'warm-up',reps:10},
  {id:'active',title:'In progress',state:'in-progress',kind:'working',reps:10},
];

const mockGetAllAsync = jest.fn(async (sql:string, args:unknown[]=[]) => {
  // The fixture rejects SQL that does not require a finished, logged working set.
  expect(sql).toContain("s.state='finished'");
  expect(sql).toContain("st.kind='working'");
  expect(sql).toContain('st.reps>0');
  const logged = mockSessions.filter(s => s.state==='finished' && s.kind==='working' && s.reps>0);
  if(sql.startsWith('SELECT DISTINCT s.*')) {
    expect(args).toEqual(['bench',15]);
    return logged.map(({kind,reps,...session})=>session);
  }
  expect(args).toEqual([8]);
  return logged.map(()=>({exercise_id:'bench'}));
});
jest.mock('../index',()=>({
  dbOperation: async (action:(db:{getAllAsync:typeof mockGetAllAsync})=>Promise<unknown>) =>
    ({ok:true,value:await action({getAllAsync:mockGetAllAsync})}),
}));

test('exercise detail counts only finished sessions with a logged working set', async () => {
  const recent = await exerciseSessions('bench');
  expect(recent).toMatchObject({ok:true,value:[{id:'done',state:'finished'}]});
  if(recent.ok)expect(recent.value).toHaveLength(1);
  const exerciseIds = await recentExerciseIds();
  expect(exerciseIds).toEqual({ok:true,value:['bench']});
  expect(mockGetAllAsync).toHaveBeenCalledTimes(2);
});
