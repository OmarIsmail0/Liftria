import {validateSet} from '../workoutData';
import type {SetInput} from '../workoutData';
const example:SetInput={sessionId:'s',sessionExerciseId:'e',position:0,side:null,
 kind:'working',weight:80,reps:6,restSec:120};
test('RPE and RIR are optional and never silently zero',()=>{
 expect(validateSet(example)).toBeNull();
 expect(validateSet({...example,rpe:null,rir:null})).toBeNull();
 expect(validateSet({...example,rpe:7.5,rir:null})).toBeNull();
 expect(validateSet({...example,rir:2,rpe:null})).toBeNull();
 expect(validateSet({...example,rpe:0})).not.toBeNull();
 expect(validateSet({...example,rir:1.5})).not.toBeNull();
 expect(validateSet({...example,rpe:7,rir:1})).not.toBeNull();
});
