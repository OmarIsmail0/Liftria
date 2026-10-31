import { isStorePanel, storePanelIds, storeCaptureTarget, storeCaptureTargets } from '../storeScreens';
import { devRoutesEnabled } from '../devRoutes';

describe('developer-only store screenshots show real Liftria UI', () => {
  it('routes all six panels into real tabs, review or settings (never a marketing card)', () => {
    expect(storePanelIds).toEqual(['today', 'eat', 'train', 'progress', 'privacy', 'hiku']);
    expect(Object.keys(storeCaptureTargets).sort()).toEqual([...storePanelIds].sort());
    expect(storeCaptureTarget('today')).toEqual({
      pathname: '/dev/demo-diary', params: { auto: '1', view: 'today' },
    });
    expect(storeCaptureTarget('eat')).toEqual({
      pathname: '/dev/demo-diary', params: { auto: '1' },
    });
    expect(storeCaptureTarget('train')).toEqual({
      pathname: '/dev/demo-workout', params: { auto: '1' },
    });
    expect(storeCaptureTarget('progress')).toEqual({
      pathname: '/dev/demo-trends', params: { auto: '1', view: 'body' },
    });
    expect(storeCaptureTarget('privacy')).toEqual({ pathname: '/settings/privacy' });
    expect(storeCaptureTarget('hiku')).toEqual({
      pathname: '/dev/demo-hiku', params: { auto: '1' },
    });
    for (const id of storePanelIds) {
      expect(isStorePanel(id)).toBe(true);
      expect(storeCaptureTarget(id).pathname).not.toContain('StoreGallery');
    }
    expect(isStorePanel('health-data')).toBe(false);
    expect(storeCaptureTarget('unknown')).toEqual(storeCaptureTargets.today);
  });

  it('is blocked by the existing production dev-route gate', () => {
    expect(devRoutesEnabled(undefined, false)).toBe(false);
    expect(devRoutesEnabled('0', false)).toBe(false);
    expect(devRoutesEnabled('1', false)).toBe(true);
  });
});
