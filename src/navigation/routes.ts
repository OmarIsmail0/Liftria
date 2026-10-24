import { capsuleTabs, type CapsuleTab } from '../design/primitives/contracts';

/** Only root tab names are accepted; nested Progress screens keep its route selected. */
export function activeCapsuleTab(routeName: string | undefined): CapsuleTab {
  const match = capsuleTabs.find(tab => tab.key === routeName);
  return match?.key ?? 'today';
}

export const tabRootRoutes = {
  today: '/(tabs)/today',
  train: '/(tabs)/train',
  eat: '/(tabs)/eat',
  progress: '/(tabs)/progress',
  hiku: '/(tabs)/hiku',
} as const satisfies Record<CapsuleTab, string>;

/** Routes outside the (tabs) navigator never render a bottom capsule. */
export const pushedRoutes = {
  settings: '/settings',
  diagnostics: '/dev/diagnostics',
  primitiveLab: '/dev/primitives',
} as const;
