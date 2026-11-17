import { useCallback, useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import { screenshotRoute } from '../src/navigation/checkRoute';
import { resolveStartup, type StartupOutcome } from '../src/features/startup/startupRoute';
import { RecoveryScreen } from '../src/features/startup/RecoveryScreen';

/** First install enters onboarding; interruption resumes at the saved step.
 * A database that cannot be opened shows a recovery screen, never onboarding or a blank page. */
export default function Index() {
  const [outcome, setOutcome] = useState<StartupOutcome | null>(null);
  // CI-only: the iPhone screenshot check opens a screen at launch (store builds return null).
  const [checkRoute] = useState(() => screenshotRoute());
  const retry = useCallback(async () => { setOutcome(await resolveStartup()); }, []);
  useEffect(() => {
    let mounted = true;
    void resolveStartup().then(next => { if (mounted) setOutcome(next); });
    return () => { mounted = false; };
  }, []);
  if (checkRoute) return <Redirect href={checkRoute as Href} />;
  if (!outcome) return null;
  if (outcome.kind === 'problem') {
    return <RecoveryScreen kind={outcome.problem} onRetry={retry} />;
  }
  return <Redirect href={outcome.href} />;
}
