import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Vibration } from 'react-native';
import { StatBlock } from '../../design/primitives';
import { bidiIsolate } from '../../i18n';
import { useLanguage } from '../../i18n/LanguageProvider';
import { RestBar } from './RestBar';
import { restBarPhase } from './restBar';
import { elapsedLabel, nextClockDelay, restAnnouncement, selectCurrentRest } from './restClock';
import type { ActiveExercise, ActiveSet } from './workoutData';

/**
 * Wall-clock seconds for one small component. The active workout screen used to hold this
 * in its own state, so every tick re-rendered every set table. Now only the components that
 * show the time re-render.
 */
export function useNowTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    const tick = () => {
      if (!live) return;
      setNow(Date.now());
      timer = setTimeout(tick, nextClockDelay(Date.now()));
    };
    timer = setTimeout(tick, nextClockDelay(Date.now()));
    const sub = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { live = false; clearTimeout(timer); sub.remove(); };
  }, []);
  return now;
}

export const ElapsedStat = memo(function ElapsedStat({ startedAt, label }: { startedAt: string; label: string }) {
  const { language } = useLanguage();
  const now = useNowTick();
  return <StatBlock value={bidiIsolate(language, elapsedLabel(startedAt, now))} label={label} />;
});

/** The rest bar plus the announcements and haptic that follow the rest clock. Owns its own tick. */
export const RestSection = memo(function RestSection({
  sets, exercises, workoutState, focused, haptics, onAdjust, onVisibleChange,
}: {
  sets: readonly ActiveSet[];
  exercises: readonly ActiveExercise[];
  workoutState: string;
  focused: boolean;
  haptics: boolean;
  onAdjust: (target: ActiveSet, deltaSec: number) => void;
  onVisibleChange: (visible: boolean) => void;
}) {
  const { language } = useLanguage();
  const now = useNowTick();
  const previousRestMs = useRef<number | null>(null);
  const restPhase = useRef<string>('hidden');
  const rest = selectCurrentRest(sets, workoutState, now);
  const restExercise = exercises.find(exercise => exercise.id === rest.set?.sessionExerciseId);
  const phase = restBarPhase(rest.set?.restDeadline ?? null, rest.set?.loggedAt ?? null, restExercise?.restSec ?? 0, now, language);
  useEffect(() => {
    if (!focused || rest.status === 'idle') return;
    const prior = previousRestMs.current;
    if (prior !== null) {
      const message = restAnnouncement(prior, rest.remainingMs, language);
      if (message) void AccessibilityInfo.announceForAccessibility(message);
    }
    previousRestMs.current = rest.remainingMs;
  }, [rest.remainingMs, rest.status, focused, language]);
  useEffect(() => {
    if (restPhase.current === 'running' && phase.phase === 'over' && haptics) Vibration.vibrate(20);
    restPhase.current = phase.phase;
  }, [phase.phase, haptics]);
  const visible = phase.phase !== 'hidden';
  useEffect(() => { onVisibleChange(visible); }, [visible, onVisibleChange]);
  const adjust = (delta: number) => {
    if (rest.set) onAdjust(rest.set, delta);
  };
  return <RestBar phase={phase} onMinus={() => adjust(-15)} onPlus={() => adjust(15)} onSkip={() => adjust(-3600)} />;
});
