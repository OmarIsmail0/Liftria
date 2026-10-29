import { isStorePanel, storePanelIds, storePanels } from '../storeScreens';
import { devRoutesEnabled } from '../devRoutes';

describe('developer-only store screenshot gallery', () => {
  it('includes six accurate panels with bilingual copy and no invented measurements', () => {
    expect(storePanelIds).toEqual(['today','eat','train','progress','privacy','hiku']);
    for (const id of storePanelIds) {
      expect(isStorePanel(id)).toBe(true);
      const { en, ar } = storePanels[id];
      for (const copy of [en, ar]) {
        expect(copy.title.length).toBeGreaterThan(4);
        expect(copy.rows).toHaveLength(3);
        expect(copy.rows.every(([title, detail]) => !!title && !!detail)).toBe(true);
        expect(copy.footnote.length).toBeGreaterThan(4);
      }
    }
    expect(isStorePanel('health-data')).toBe(false);
  });

  it('is not available in production without the existing dev-route flag', () => {
    expect(devRoutesEnabled(undefined, false)).toBe(false);
    expect(devRoutesEnabled('0', false)).toBe(false);
    expect(devRoutesEnabled('1', false)).toBe(true);
  });
});
