/**
 * Real in-app screenshot destinations, reached through explicit developer fixtures.
 * No artwork panel or synthetic marketing UI is presented as an app screenshot.
 */
export const storePanelIds = ['today', 'eat', 'train', 'progress', 'privacy', 'hiku'] as const;
export type StorePanelId = (typeof storePanelIds)[number];

/** Every destination renders a real application screen. Demo routes seed labeled local fixtures. */
export const storeCaptureTargets = {
  today: { pathname: '/dev/demo-diary', params: { auto: '1', view: 'today' } },
  eat: { pathname: '/dev/demo-diary', params: { auto: '1' } },
  train: { pathname: '/dev/demo-workout', params: { auto: '1' } },
  progress: { pathname: '/dev/demo-trends', params: { auto: '1', view: 'body' } },
  privacy: { pathname: '/settings/privacy' },
  hiku: { pathname: '/dev/demo-hiku', params: { auto: '1' } },
} as const;

export function isStorePanel(value: unknown): value is StorePanelId {
  return typeof value === 'string' && (storePanelIds as readonly string[]).includes(value);
}
export function storeCaptureTarget(requested: unknown) {
  return storeCaptureTargets[isStorePanel(requested) ? requested : 'today'];
}
