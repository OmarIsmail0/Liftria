import {
  appendLog, buildDiagnosticReport, logEntry, parseStoredLog, redactSecrets, type ReportInput,
} from '../report';

const base: ReportInput = {
  generatedAt: '2026-10-20T12:00:00.000Z',
  app: { version: '0.0.1', build: '1', androidApi: '35', os: '15', device: 'samsung SM-S908B' },
  status: {
    network: 'Offline', database: 'Schema v1 initialized', apiKey: 'ready (masked)', claude: 'offline: You are offline',
    health: 'Availability: available', history: 'unverified', offline: 'Read 3 cached health records',
  },
  permissions: { steps: 'granted', 'heart-rate': 'denied' },
  healthRows: { steps: { state: 'records found', count: 12, source: 'com.sec.android.app.shealth', units: 'count' } },
  daily: [
    { metric: 'active-calories', date: '2026-10-19', status: 'ok', value: {
      kind: 'aggregate', metric: 'active-calories', adapter: 'health-connect', operation: 'ACTIVE_CALORIES_TOTAL',
      windowStart: 'a', windowEnd: 'b', value: 321.456, unit: 'kcal', dataOrigins: ['com.sec.android.app.shealth'],
    } },
    { metric: 'basal-metabolic-rate', date: '2026-10-19', status: 'permission-denied' },
  ],
  log: ['2026-10-20T11:00:00.000Z [SQLite] Saved setting locally'],
};

test('report includes every section, metric row, daily row and log entry', () => {
  const report = buildDiagnosticReport(base);
  expect(report).toContain('Android API 35');
  expect(report).toContain('| SQLite | Schema v1 initialized |');
  expect(report).toContain('| steps | granted | records found | 12 | com.sec.android.app.shealth | count |');
  expect(report).toContain('| heart-rate | denied | not read |');
  expect(report).toContain('| 2026-10-19 | active-calories | ok | 321.5 | ACTIVE_CALORIES_TOTAL |');
  expect(report).toContain('| 2026-10-19 | basal-metabolic-rate | permission-denied |');
  expect(report).toContain('[SQLite] Saved setting locally');
});

test('multi-line results and pipes cannot break the markdown tables', () => {
  const report = buildDiagnosticReport({ ...base, status: { ...base.status, database: '{\n  "workouts": 1\n} | x' } });
  expect(report).toContain('| SQLite | { "workouts": 1 } / x |');
});

test('a full API key never appears in the report', () => {
  const key = 'sk-ant-api03-abcdefghijklmnopQRST_uvwx-yz0123456789';
  const report = buildDiagnosticReport({ ...base, log: [logEntry('Claude', `oops ${key}`)] });
  expect(report).not.toContain(key);
  expect(report).toContain('sk-ant-[REDACTED]');
  expect(redactSecrets('sk-ant-…ab12')).toBe('sk-ant-…ab12'); // masked hint stays readable
});

test('log is bounded, flattened to one line and tolerant of corrupt storage', () => {
  let log: string[] = [];
  for (let i = 0; i < 5; i++) log = appendLog(log, `e${i}`, 3);
  expect(log).toEqual(['e2', 'e3', 'e4']);
  expect(logEntry('DB', 'a\n  b', new Date('2026-10-20T00:00:00Z'))).toBe('2026-10-20T00:00:00.000Z [DB] a | b');
  expect(parseStoredLog('not json')).toEqual([]);
  expect(parseStoredLog('[1,"ok"]')).toEqual(['ok']);
  expect(parseStoredLog(null)).toEqual([]);
});
