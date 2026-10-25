import type { ExerciseType } from './gymTypes';
export type SetKind = 'working' | 'warm-up';
export type SetSide = 'L' | 'R' | null;
export type LoggedSet = { weight: number; reps: number; kind: SetKind; side: SetSide };
export function setVolume(type: ExerciseType, set: LoggedSet): number {
  if (set.kind === 'warm-up' || set.reps <= 0) return 0;
  if (type === 'assisted') return 0;
  if (type === 'dumbbell') return 2 * set.weight * set.reps;
  return set.weight * set.reps;
}
export function estimatedOneRepMax(type: ExerciseType, set: LoggedSet): number | null {
  if (set.kind === 'warm-up' || set.reps < 1 || set.reps > 12 ||
    type === 'assisted' || type === 'bodyweight') return null;
  return set.weight * (1 + set.reps / 30);
}
/** Unilateral left/right observations each retain records; a paired set counts once. */
export function workingSetCount(sets: (LoggedSet & {position: number; unilateral: boolean})[]): number {
  return new Set(sets.filter(s=>s.kind==='working' && s.reps>0)
    .map(s => s.unilateral ? String(s.position) : String(s.position)+':'+String(s.side))).size;
}
export type RecordObservation = LoggedSet & {
  exerciseId: string; type: ExerciseType; sessionId: string; endedAt: string;
};
export type ExerciseRecord = {
  exerciseId: string; side: SetSide; heaviest: number | null;
  lowestAssistance: number | null; maxReps: number; maxRepsAtWeight: number;
  bestEstimatedOneRepMax: number | null; bestSessionVolume: number;
  latestAt: string;
};
/** Pure, rebuildable records: call after every log/edit/delete/import; no mutable record cache. */
export function calculateRecords(observations: RecordObservation[]): ExerciseRecord[] {
  const groups = new Map<string, RecordObservation[]>();
  for (const row of observations) {
    if (row.kind !== 'working' || row.reps <= 0) continue;
    const key = row.exerciseId + ':' + (row.side ?? '-');
    groups.set(key, [...(groups.get(key) ?? []),row]);
  }
  const result: ExerciseRecord[]=[];
  for (const rows of groups.values()) {
    const first=rows[0];
    if (!first) continue;
    const isAssisted=first.type==='assisted';
    const weights=rows.map(r=>r.weight);
    const targetWeight=isAssisted?Math.min(...weights):Math.max(...weights);
    const repsAt=rows.filter(r=>r.weight===targetWeight).map(r=>r.reps);
    const estimates=rows.map(r=>estimatedOneRepMax(r.type,r)).filter((n):n is number=>n!==null);
    const sessionVolume=new Map<string,number>();
    for (const row of rows) sessionVolume.set(row.sessionId,
      (sessionVolume.get(row.sessionId)??0)+setVolume(row.type,row));
    result.push({
      exerciseId:first.exerciseId,side:first.side,
      heaviest:isAssisted?null:Math.max(...weights),
      lowestAssistance:isAssisted?targetWeight:null,
      maxReps:Math.max(...rows.map(r=>r.reps)),
      maxRepsAtWeight:Math.max(...repsAt),
      bestEstimatedOneRepMax:estimates.length?Math.max(...estimates):null,
      bestSessionVolume:Math.max(...sessionVolume.values(),0),
      latestAt:rows.reduce((max,row)=>row.endedAt>max?row.endedAt:max,first.endedAt),
    });
  }
  return result;
}
