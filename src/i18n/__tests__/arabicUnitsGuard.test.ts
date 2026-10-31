import { ar } from '../ar';
import type { TranslationKey } from '../en';
import { weightUnitLabel } from '../index';

type Dirent = { name: string; isDirectory: () => boolean; isFile: () => boolean };
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => Dirent[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join, relative } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
};

/** Latin kg/lb in an Arabic sentence. Placeholders such as {unit} are not units. */
export function latinWeightUnits(value: string): string[] {
  return value.match(/\b(?:kg|lb)\b/g) ?? [];
}

/**
 * A screen still pastes a stored weight code into text the user reads.
 * Comparisons and setters (`unit === 'kg'`, `setUnit('kg')`) are the stored code, not a label.
 * `WeightGraph`'s unit prop is that stored code; the axis label goes through weightUnitLabel.
 * csvExport's "Weight kg" header is the spreadsheet column, not Arabic UI.
 */
export function rawWeightUnitDisplays(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, block => block.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
  const rules = [
    /['"`][^'"`\n]*\s(?:kg|lb)['"`]/g,
    /['"][^'"\n]*['"]\s*\+\s*(?:unit|weightUnit|displayUnit|values\.weight)\b/g,
    /\$\{(?:unit|weightUnit|displayUnit|values\.weight)\}/g,
    // Rendered as a JSX child; `prop={weightUnit}` only passes the setting along.
    /(?<!=)\{(?:unit|weightUnit|displayUnit)\}/g,
    /\bunit:\s*(?:unit|weightUnit|displayUnit|values\.weight)\b/g,
    /\bunit=\{(?:unit|weightUnit|displayUnit|values\.weight)\}/g,
    /\blabel:\s*['"](?:kg|lb)['"]/g,
    /\?['"](?:✓\s+)?(?:kg|lb)['"]\s*:\s*['"](?:kg|lb)['"]/g,
  ];
  const shorthand = /\{(?:unit|weightUnit|displayUnit|values\.weight)\s*[,}]|,(?:unit|weightUnit|displayUnit|values\.weight)\s*\}/;
  const hits: string[] = [];
  code.split('\n').forEach((line, index) => {
    if (line.includes('WeightGraph')) return;
    rules.forEach(rule => { rule.lastIndex = 0; });
    const pasted = rules.some(rule => rule.test(line))
      || (/\bt\(|\btranslate\(/.test(line) && shorthand.test(line));
    if (pasted) hits.push(`${index + 1}:${line.trim()}`);
  });
  return hits;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [file] : [];
  });
}

describe('Arabic units guard', () => {
  test('no Latin kcal in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string' && /\bkcal\b/.test(value)) {
        // Allow kcal only in placeholder names like {kcal}
        if (!/\{kcal\}/.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin "kcal":\n${violations.join('\n')}`
      );
    }
  });

  test('no Latin g unit in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string') {
        // Match " g" but not in placeholder names or at start of string
        // Allow {grams}, {granted}, etc.
        const matches = value.match(/(?<!{[a-z]*)\s+g(?![a-z}])/g);
        if (matches) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin " g":\n${violations.join('\n')}`
      );
    }
  });

  test('no Latin mg unit in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string') {
        // Match " mg" not in placeholders
        if (/\s+mg\b/.test(value) && !/\{[^}]*mg[^}]*\}/.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin " mg":\n${violations.join('\n')}`
      );
    }
  });

  test('no Latin ml unit in Arabic translations', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value === 'string') {
        // Match " ml" not in placeholders
        if (/\s+ml\b/.test(value) && !/\{[^}]*ml[^}]*\}/.test(value)) {
          violations.push(`${key}: "${value}"`);
        }
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin " ml":\n${violations.join('\n')}`
      );
    }
  });

  test('Arabic *.many count keys use singular accusative form', () => {
    const violations: string[] = [];
    const manyKeys = Object.keys(ar).filter((k) => k.endsWith('.many'));

    for (const key of manyKeys) {
      const value = ar[key as TranslationKey];
      if (typeof value !== 'string' || !value) continue;

      // Extract the Arabic text after {count}
      const match = value.match(/\{count\}\s+(.+)/);
      if (!match || !match[1]) continue;

      const arabicText = match[1];
      
      // Check for singular accusative markers:
      // - يومًا (day accusative)
      // - تمرينًا (workout accusative)
      // - طلبًا (request accusative)
      // The pattern is: ends with ـًا or contains singular forms with tanwin fatḥ (ًا)
      
      // Common plural forms that should NOT appear in 'many':
      // - أيام (days plural)
      // - تمارين (workouts plural)  
      // - طلبات (requests plural)
      const hasPlural = /أيام|تمارين|طلبات|عناصر/.test(arabicText);
      // 11-99 take the singular accusative, so the counted noun right after {count} ends in tanwin
      // fath: يومًا, or on a feminine noun ةً (خطوةً، دقيقةً). A bare singular like "14 يوم" is wrong
      // too, not only a plural.
      const firstWord = arabicText.split(/\s/)[0] ?? '';
      if (!firstWord.endsWith('ًا') && !firstWord.endsWith('ةً')) {
        violations.push(`${key}: "${value}" counted noun "${firstWord}" is not singular accusative`);
        continue;
      }
      
      if (hasPlural) {
        violations.push(`${key}: "${value}" uses plural form instead of singular accusative`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic 'many' keys without singular accusative:\n${violations.join('\n')}`
      );
    }
  });

  test('the gram unit is غ everywhere, never جم', () => {
    expect(ar['eatI.gramUnit']).toBe('غ');
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value !== 'string') continue;
      // \b is ASCII-only in JS, so bound the word with Arabic-letter lookarounds:
      // جم inside a word (المجموعات, حجم) is ordinary Arabic, not a unit.
      if (/(?<![\u0600-\u06FF])جم(?![\u0600-\u06FF])/.test(value)) {
        violations.push(`${key}: "${value}"`);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations using "جم" for grams instead of "غ":\n${violations.join('\n')}`
      );
    }
  });

  test('placeholders followed by Arabic units use non-breaking space (U+00A0)', () => {
    const violations: string[] = [];
    const arabicUnits = ['سعرة', 'غ', 'ملغ', 'مل'];
    
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value !== 'string') continue;
      
      for (const unit of arabicUnits) {
        // Match {placeholder} followed by regular space and unit
        // \\b is ASCII-only in JS, so end the unit with an Arabic-letter lookahead.
        const regularSpacePattern = new RegExp(`\\{[A-Za-z_]+\\}\\x20${unit}(?![\\u0600-\\u06FF])`);
        if (regularSpacePattern.test(value)) {
          violations.push(`${key}: "${value}" has regular space before ${unit}, should use U+00A0`);
        }
      }
    }
    
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with regular space before units:\n${violations.join('\n')}`
      );
    }
  });
});

describe('weightUnitLabel', () => {
  test('Arabic uses كغ and رطل; English keeps kg and lb', () => {
    expect(weightUnitLabel('en', 'kg')).toBe('kg');
    expect(weightUnitLabel('en', 'lb')).toBe('lb');
    expect(weightUnitLabel('ar', 'kg')).toBe('كغ');
    expect(weightUnitLabel('ar', 'lb')).toBe('رطل');
  });
});

describe('Arabic weight-unit words', () => {
  test('the scanner fails on a planted Latin kg or lb', () => {
    expect(latinWeightUnits('الوزن {weight} kg')).toEqual(['kg']);
    expect(latinWeightUnits('أو lb')).toEqual(['lb']);
    expect(latinWeightUnits('{count}\u00A0kg')).toEqual(['kg']);
    expect(latinWeightUnits('الوزن {weight}\u00A0كغ')).toEqual([]);
    expect(latinWeightUnits('ستُقرأ الأوزان بوحدة {unit}.')).toEqual([]);
  });

  test('no Arabic translation contains Latin kg or lb', () => {
    const violations: string[] = [];
    for (const [key, value] of Object.entries(ar)) {
      if (typeof value !== 'string') continue;
      const hits = latinWeightUnits(value);
      if (hits.length > 0) violations.push(`${key}: "${value}"`);
    }
    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} Arabic translations with Latin kg/lb:\n${violations.join('\n')}`
      );
    }
  });

  test('the screen scanner fails when a raw unit is concatenated', () => {
    expect(rawWeightUnitDisplays("detail={n+' kg'}")).not.toEqual([]);
    expect(rawWeightUnitDisplays('detail={n+" lb"}')).not.toEqual([]);
    expect(rawWeightUnitDisplays("detail={n+' '+unit}")).not.toEqual([]);
    expect(rawWeightUnitDisplays('detail={`${n} ${weightUnit}`}')).not.toEqual([]);
    expect(rawWeightUnitDisplays("t('history.volumeValue',{unit})")).not.toEqual([]);
    expect(rawWeightUnitDisplays("t('active.loggedA11y',{unit:weightUnit})")).not.toEqual([]);
    expect(rawWeightUnitDisplays("<Typography>{unit}</Typography>")).not.toEqual([]);
    expect(rawWeightUnitDisplays("<BodyMeasurements weightUnit={weightUnit}/>")).toEqual([]);
    expect(rawWeightUnitDisplays("options={[{value:'kg', label:'kg'}]}")).not.toEqual([]);
    expect(rawWeightUnitDisplays("label={unit==='kg'?'✓ kg':'kg'}")).not.toEqual([]);
    expect(rawWeightUnitDisplays("<Stepper unit={weightUnit}/>")).not.toEqual([]);
    expect(rawWeightUnitDisplays("if(unit==='kg')setUnit('kg');")).toEqual([]);
    expect(rawWeightUnitDisplays("t('k',{unit:weightUnitLabel(language,unit)})")).toEqual([]);
    expect(rawWeightUnitDisplays("detail={n+' '+weightUnitLabel(language,'kg')}")).toEqual([]);
    expect(rawWeightUnitDisplays('<WeightGraph unit={weightUnit}/>')).toEqual([]);
  });

  test('no screen concatenates a raw weight unit', () => {
    const roots = ['app', join('src', 'features')].map(dir => join(process.cwd(), dir));
    const excluded = [
      /(^|\/)__tests__\//,
      /(^|\/)dev\//,
      /^src\/features\/settings\/csvExport\.ts$/,
    ];
    const hits = roots.flatMap(sourceFiles)
      .map(file => ({ file, name: relative(process.cwd(), file).replace(/\\/g, '/') }))
      .filter(({ name }) => !excluded.some(pattern => pattern.test(name)))
      .flatMap(({ file, name }) => rawWeightUnitDisplays(readFileSync(file, 'utf8'))
        .map(hit => `${name}:${hit}`));
    expect(hits).toEqual([]);
  });
});
