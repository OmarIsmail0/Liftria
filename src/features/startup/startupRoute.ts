import { checkDatabaseAtStartup, type StartupDatabaseCheck } from '../../services/database';
import { onboardingDestination } from '../onboarding/draft';
import { STARTUP_TIMEOUT_MS, withTimeout } from './withTimeout';

type Destination = Awaited<ReturnType<typeof onboardingDestination>>;
export type StartupProblem = 'failed' | 'newer';
export type StartupOutcome = { kind: 'route'; href: Destination } | { kind: 'problem'; problem: StartupProblem };

/**
 * Where the first screen goes. A database that cannot be opened, or that a newer app
 * build wrote, is a recovery screen with Try again, never onboarding and never blank.
 */
export async function resolveStartup(deps: {
  check: () => Promise<StartupDatabaseCheck>;
  destination: () => Promise<Destination>;
} = { check: checkDatabaseAtStartup, destination: onboardingDestination },
timeoutMs = STARTUP_TIMEOUT_MS): Promise<StartupOutcome> {
  const failed: StartupOutcome = { kind: 'problem', problem: 'failed' };
  const run = async (): Promise<StartupOutcome> => {
    const check = await deps.check();
    if (!check.ok) return { kind: 'problem', problem: check.reason };
    return { kind: 'route', href: await deps.destination() };
  };
  return withTimeout(run().catch(() => failed), timeoutMs, failed);
}
