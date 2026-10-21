import type { DailyEnergyRow } from '../../services/health';

/** One persisted line of the on-device test log, e.g. "2026-10-20T12:00:00.000Z [SQLite] Saved setting locally". */
export const MAX_LOG_ENTRIES = 300;

export type HealthRowSummary = {
  state: string; count?: number; source?: string; range?: string; device?: string; units?: string;
};

export type ReportInput = {
  generatedAt: string;
  app: { version: string; build: string; androidApi: string; os: string; device: string };
  status: {
    network: string; database: string; apiKey: string; claude: string;
    health: string; history: string; offline: string;
  };
  permissions: Record<string, string> | null;
  healthRows: Record<string, HealthRowSummary | undefined>;
  daily: DailyEnergyRow[];
  log: string[];
};

export function logEntry(section: string, message: string, at = new Date()): string {
  return `${at.toISOString()} [${section}] ${message.replace(/\s*\n\s*/g, ' | ')}`;
}

export function appendLog(log: string[], entry: string, max = MAX_LOG_ENTRIES): string[] {
  return [...log, entry].slice(-max);
}

export function parseStoredLog(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').slice(-MAX_LOG_ENTRIES) : [];
  } catch { return []; }
}

/** Defense in depth: no full Anthropic key may ever leave the phone in a report. */
export function redactSecrets(text: string): string {
  return text.replace(/sk-ant-[A-Za-z0-9_-]{4,}/g, 'sk-ant-[REDACTED]');
}

const cell = (value: string | number | undefined) =>
  value === undefined || value === '' ? '—' : String(value).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ');

export function buildDiagnosticReport(input: ReportInput): string {
  const { app, status } = input;
  const lines = [
    '# Liftria Phase 0 device report',
    '',
    `Generated: ${input.generatedAt}`,
    `App: ${app.version} (build ${app.build}) · Android API ${app.androidApi} · OS ${app.os} · ${app.device}`,
    '',
    '## Latest result per section',
    '',
    '| Section | Latest result |',
    '|---|---|',
    `| Network | ${cell(status.network)} |`,
    `| SQLite | ${cell(status.database)} |`,
    `| API key | ${cell(status.apiKey)} |`,
    `| Claude | ${cell(status.claude)} |`,
    `| Health Connect | ${cell(status.health)} |`,
    `| History permission | ${cell(status.history)} |`,
    `| Offline / cache | ${cell(status.offline)} |`,
    '',
    '## Health Connect metrics (last 7 days)',
    '',
    '| Metric | Permission | Result | Count | Origin(s) | Unit | Time | Device |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const metrics = new Set([...Object.keys(input.permissions ?? {}), ...Object.keys(input.healthRows)]);
  for (const metric of metrics) {
    const row = input.healthRows[metric];
    lines.push(`| ${metric} | ${cell(input.permissions?.[metric] ?? 'not checked')} | ${cell(row?.state ?? 'not read')} | ${cell(row?.count)} | ${cell(row?.source)} | ${cell(row?.units)} | ${cell(row?.range)} | ${cell(row?.device)} |`);
  }
  if (metrics.size === 0) lines.push('| (not run) | | | | | | | |');

  lines.push('', '## Daily energy windows (not verified daily expenditure)', '');
  if (input.daily.length === 0) lines.push('Not run.');
  else {
    lines.push('| Date | Metric | Result | kcal | Operation | Origin(s) |', '|---|---|---|---|---|---|');
    for (const row of input.daily) {
      lines.push(row.status === 'ok' || row.status === 'no-source'
        ? `| ${row.date} | ${row.metric} | ${row.status} | ${row.value.value.toFixed(1)} | ${row.value.operation} | ${cell(row.value.dataOrigins?.join(', ') || 'none (Health Connect estimate)')} |`
        : `| ${row.date} | ${row.metric} | ${row.status} | — | — | — |`);
    }
  }

  lines.push('', `## Test log (${input.log.length} entries, oldest first, survives app restarts)`, '');
  lines.push(input.log.length ? '```' : 'Empty.');
  if (input.log.length) lines.push(...input.log, '```');
  lines.push('', 'No API key, photo or raw health samples are included. Review before sharing.');
  return redactSecrets(lines.join('\n'));
}
