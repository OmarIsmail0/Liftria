import { capsuleTabs } from '../../design/primitives/contracts';
import { createTheme } from '../../design/tokens';
import { activeCapsuleTab, pushedRoutes, tabRootRoutes } from '../routes';

test('five tab roots match IA ordering; Settings is not a sixth tab', () => {
  expect(capsuleTabs.map(tab => tab.label)).toEqual(['Today', 'Train', 'Eat', 'Progress', 'Hiku']);
  expect(Object.keys(tabRootRoutes)).toEqual(capsuleTabs.map(tab => tab.key));
  expect(Object.keys(tabRootRoutes)).not.toContain('settings');
  for (const route of capsuleTabs) expect(activeCapsuleTab(route.key)).toBe(route.key);
});

test('subroutes inside Progress retain Progress while pushed stacks have no capsule', () => {
  expect(activeCapsuleTab('progress')).toBe('progress');
  expect(activeCapsuleTab(undefined)).toBe('today');
  expect(Object.values(pushedRoutes).every(path => !path.includes('(tabs)'))).toBe(true);
  expect(pushedRoutes.settings).toBe('/settings');
  expect(pushedRoutes.diagnostics).toBe('/dev/diagnostics');
});

test.each(['dark', 'light'] as const)('nav keeps 48/56dp targets and native icon stroke in %s', mode => {
  const theme = createTheme(mode, 'aurora');
  expect(theme.size.touch.min).toBeGreaterThanOrEqual(48);
  expect(theme.size.touch.nav).toBeGreaterThanOrEqual(56);
  expect(theme.size.iconStroke).toBe(1.8);
  expect(theme.space[4]).toBeGreaterThan(0);
});
