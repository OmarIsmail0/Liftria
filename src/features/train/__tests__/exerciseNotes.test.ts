import {saveWorkoutExerciseNote,readWorkoutExerciseNote,previousExerciseNote} from '../workoutData';
import {dbOperation} from '../../../services/database';
jest.mock('../../../services/database',()=>({dbOperation:jest.fn()}));
const dbOperationMock=dbOperation as jest.Mock;
const run=jest.fn(),first=jest.fn();
beforeEach(()=>{
 jest.clearAllMocks();
 dbOperationMock.mockImplementation(async(fn:(db:unknown)=>Promise<unknown>)=>({
  ok:true,value:await fn({runAsync:run,getFirstAsync:first}),
 }));
 run.mockResolvedValue({changes:1});
});
test('exercise note belongs to actual session-exercise and not ephemeral UI settings',async()=>{
 await saveWorkoutExerciseNote('session-ex-1','Keep knees aligned');
 expect(run).toHaveBeenCalledWith(expect.stringContaining('UPDATE session_exercises SET note'),
  ['Keep knees aligned','session-ex-1']);
 expect(run).not.toHaveBeenCalledWith(expect.stringContaining('app_settings'),expect.anything());
 first.mockResolvedValue({note:'Keep knees aligned'});
 expect(await readWorkoutExerciseNote('session-ex-1')).toEqual({ok:true,value:'Keep knees aligned'});
});
test('last note lookup uses the exercise ID across finished sessions',async()=>{
 first.mockResolvedValue({note:'Keep knees aligned'});
 expect(await previousExerciseNote('squat-pack-id')).toEqual({
  ok:true,value:'Keep knees aligned',
 });
 expect(first.mock.calls[0][0]).toContain("s.state='finished'");
 expect(first.mock.calls[0][1]).toEqual(['squat-pack-id']);
});
