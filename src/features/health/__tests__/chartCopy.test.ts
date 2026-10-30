import {
  heartChartLabel, heartChartNote, noHeartText, noStepsText, sourceDisplayName, stepsAxisText, stepsChartLabel,
  stepsSourceTitle,
} from '../chartCopy';

const latinWords = (text: string): string[] =>
  text.replace(/\{\w+\}/g, ' ').match(/[A-Za-z]+/g)?.filter(word => word !== 'kg' && word !== 'lb') ?? [];

describe('English keeps the wording the charts had before', () => {
  test('steps chart', () => {
    expect(noStepsText('en')).toBe('No source-backed steps to plot.');
    expect(sourceDisplayName('en', 'Apple Health')).toBe('Apple Health');
    expect(sourceDisplayName('ar', 'Apple Health')).toBe('صحة Apple');
    expect(stepsSourceTitle('en', 'Phone')).toBe('Phone · separate source');
    expect(stepsChartLabel('en', 'Phone', 'day', 600)).toBe('Phone, hourly steps: 600 in charted intervals');
    expect(stepsChartLabel('en', 'Samsung Health', 'week', 1200))
      .toBe('Samsung Health, daily steps: 1,200 in charted intervals');
    expect(stepsAxisText('en', 'day', 24)).toBe('Midnight · 6 AM · Noon · 6 PM · Midnight');
    expect(stepsAxisText('en', 'week', 7)).toBe('7 days ago · Today');
  });
  test('heart-rate chart', () => {
    expect(noHeartText('en')).toBe('No heart-rate samples to plot.');
    expect(heartChartLabel('en', 12, 58, 131)).toBe(
      '12 heart-rate samples. Range 58 to 131 beats per minute. App origins do not verify devices.');
    expect(heartChartLabel('en', 1, 70, 70)).toMatch(/^1 heart-rate sample\. Range/);
    expect(heartChartNote('en')).toBe('Samples, not an averaged resting heart rate. Device is unverified.');
  });
});

describe('Arabic charts have no English and use Western digits', () => {
  test('every chart text', () => {
    const texts = [
      noStepsText('ar'), noHeartText('ar'), heartChartNote('ar'),
      stepsSourceTitle('ar', 'Phone'), stepsSourceTitle('ar', 'Unknown source'),
      stepsChartLabel('ar', 'Phone', 'day', 600), stepsChartLabel('ar', 'Unknown source', 'week', 12345),
      stepsAxisText('ar', 'day', 24), stepsAxisText('ar', 'week', 7),
      ...[0, 1, 2, 3, 10, 11, 25, 100, 101, 102].map(n => heartChartLabel('ar', n, 58, 131)),
    ];
    for (const text of texts) {
      expect(latinWords(text)).toEqual([]);
      expect(text).not.toMatch(/[٠-٩]/);
    }
  });
  test('an app name stays as it is, isolated inside the Arabic sentence', () => {
    expect(sourceDisplayName('ar', 'Samsung Health')).toBe('Samsung Health');
    expect(stepsSourceTitle('ar', 'Samsung Health')).toBe('\u2068Samsung Health\u2069 · مصدر منفصل');
    expect(latinWords(stepsSourceTitle('ar', 'Samsung Health')).join(' ')).toBe('Samsung Health');
    expect(stepsChartLabel('ar', 'Samsung Health', 'day', 5)).toMatch(/^Samsung Health، /);
  });
  test('the source names the app invents are translated in both languages', () => {
    expect(sourceDisplayName('ar', 'Phone')).toBe('الهاتف');
    expect(sourceDisplayName('ar', 'Unknown source')).toBe('مصدر غير معروف');
    expect(sourceDisplayName('en', 'Phone')).toBe('Phone');
    expect(sourceDisplayName('en', 'Unknown source')).toBe('Unknown source');
  });
  test('counts take the right Arabic form (11 to 99 take the singular accusative)', () => {
    const heart = (n: number) => heartChartLabel('ar', n, 60, 90).split('. ')[0];
    expect(heart(1)).toBe('قياس واحد للنبض');
    expect(heart(2)).toBe('قياسان للنبض');
    expect(heart(3)).toBe('3 قياسات للنبض');
    expect(heart(10)).toBe('10 قياسات للنبض');
    expect(heart(11)).toBe('11 قياسًا للنبض');
    expect(heart(99)).toBe('99 قياسًا للنبض');
    expect(heart(100)).toBe('100 قياس للنبض');
    expect(heart(102)).toBe('102 قياس للنبض');
    expect(stepsAxisText('ar', 'week', 7)).toBe('قبل 7 أيام · اليوم');
    expect(stepsAxisText('ar', 'week', 14)).toBe('قبل 14 يومًا · اليوم');
    expect(stepsAxisText('ar', 'week', 2)).toBe('قبل يومين · اليوم');
  });
  test('a number with its unit is one string with a no-break space', () => {
    expect(heartChartLabel('ar', 5, 58, 131)).toContain('131\u00A0نبضة/د');
  });
});
