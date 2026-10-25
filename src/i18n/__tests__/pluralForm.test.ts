import { pluralForm } from '..';

type Entry = { name: string; isDirectory: () => boolean };
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join } = jest.requireActual('path') as { join: (...parts: string[]) => string };

describe('pluralForm', () => {
  it('matches CLDR (Node Intl.PluralRules) for whole counts', () => {
    for (let n = 0; n <= 1200; n++) {
      expect(pluralForm('ar', n)).toBe(new Intl.PluralRules('ar-EG').select(n));
      expect(pluralForm('en', n)).toBe(new Intl.PluralRules('en-US').select(n));
    }
  });

  it('is the only plural source: Hermes on Android has no Intl.PluralRules', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const name = entry.name;
        const path = join(dir, name);
        if (entry.isDirectory()) { if (name !== '__tests__') walk(path); }
        else if (/\.tsx?$/.test(name) && /Intl\.PluralRules/.test(readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ''))) offenders.push(path);
      }
    };
    walk(join(process.cwd(), 'src'));
    walk(join(process.cwd(), 'app'));
    expect(offenders).toEqual([]);
  });
});
