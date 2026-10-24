import { backOrReplace } from '../back';
import { advanceVersionTap, initialVersionTapState, VERSION_TAP_TIMEOUT_MS, type VersionTapState } from '../versionTap';

describe('back button with direct deep links', () => {
  test('uses the stack when history exists instead of replacing it', () => {
    const nav = { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() };
    backOrReplace(nav, '/(tabs)/today');
    expect(nav.canGoBack).toHaveBeenCalledTimes(1);
    expect(nav.back).toHaveBeenCalledTimes(1);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  test.each([
    ['/(tabs)/today', 'Settings'],
    ['/(tabs)/progress', 'Health'],
    ['/settings', 'Developer tools'],
    ['/dev', 'Primitive lab and diagnostics'],
    ['/dev/primitives', 'Direct primitive story'],
  ] as const)('without history, %s is the parent of %s', (parent, screen) => {
    expect(screen).toBeTruthy();
    const nav = { canGoBack: jest.fn(() => false), back: jest.fn(), replace: jest.fn() };
    backOrReplace(nav, parent);
    expect(nav.back).not.toHaveBeenCalled();
    expect(nav.replace).toHaveBeenCalledWith(parent);
  });
});

describe('seven taps on the Settings version', () => {
  function tapsAt(times: number[]) {
    let state: VersionTapState = initialVersionTapState;
    let unlocked = 0;
    for (const t of times) {
      const next = advanceVersionTap(state, t);
      state = next.state;
      if (next.unlocked) unlocked++;
    }
    return { state, unlocked };
  }

  test('opens on exactly seven taps, then resets rather than opening again on tap eight', () => {
    const seven = tapsAt([0, 100, 200, 300, 400, 500, 600]);
    expect(seven).toEqual({ state: initialVersionTapState, unlocked: 1 });
    const eight = tapsAt([0, 100, 200, 300, 400, 500, 600, 700]);
    expect(eight).toEqual({ state: { count: 1, lastTapAt: 700 }, unlocked: 1 });
  });

  test('a gap longer than two seconds resets the count', () => {
    const spaced = tapsAt([0, 100, 200, 300, VERSION_TAP_TIMEOUT_MS + 301, 2600, 2700]);
    expect(spaced.unlocked).toBe(0);
    expect(spaced.state.count).toBe(3);
  });

  test('tap exactly at the timeout boundary remains in the gesture', () => {
    expect(tapsAt([0, 2000, 4000, 6000, 8000, 10000, 12000]).unlocked).toBe(1);
  });

  test('a clock rollback expires the gesture', () => {
    expect(tapsAt([9000, 9100, 9101, 100, 200, 300, 400]).unlocked).toBe(0);
  });
});
