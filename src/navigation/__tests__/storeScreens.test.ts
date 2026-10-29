import { isStorePanel, storePanelIds, storePanels } from '../storeScreens';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { devRoutesEnabled } from '../devRoutes';

describe('developer-only store screenshot gallery', () => {
  it('includes six accurate panels with bilingual copy and no invented health metrics', () => {
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
  it('routes are under the existing release-disabled developer layout', () => {
    const layout = readFileSync(resolve(__dirname, '../../../app/dev/_layout.tsx'), 'utf8');
    expect(layout).toContain('devRoutesEnabled()');
    expect(devRoutesEnabled(undefined, false)).toBe(false);
    expect(devRoutesEnabled('1', false)).toBe(true);
    const screen = readFileSync(resolve(__dirname, '../StoreGalleryPreview.tsx'), 'utf8');
    expect(screen).not.toMatch(/saveWeight|logFood|requestHiku|readDailyEnergy|getHealthSnapshot/);
    expect(screen).toContain("appearance === 'dark'");
    expect(screen).toContain("language === 'ar'");
  });
});
