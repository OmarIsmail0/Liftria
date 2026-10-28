const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    isPlainObject(child) ? flattenKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`]);
}

/**
 * Problems in the Expo locale files (`locales/<language>.json`, keyed by language code).
 * Every key must sit under "ios": Android lint fails with ExtraTranslation when it sees
 * these names in a values-<language> resource. Both files must carry the same keys, and each
 * key needs a non-empty string, because an empty value ships a blank iOS system string.
 */
export function findLocaleProblems(files: Record<string, string>): string[] {
  const problems: string[] = [];
  const keysByFile: Record<string, string[]> = {};

  for (const [name, text] of Object.entries(files)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      problems.push(`${name}: not valid JSON (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (!isPlainObject(parsed)) {
      problems.push(`${name}: must be a JSON object`);
      continue;
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (key !== 'ios') problems.push(`${name}: top-level key "${key}" must sit under "ios"`);
      else if (!isPlainObject(value)) problems.push(`${name}: "ios" must be an object of strings`);
    }
    if (!('ios' in parsed)) problems.push(`${name}: missing the "ios" object`);
    const ios = parsed.ios;
    if (isPlainObject(ios)) {
      for (const [key, value] of Object.entries(ios)) {
        if (typeof value !== 'string') problems.push(`${name}: ios.${key} must be a string`);
        else if (value.trim() === '') problems.push(`${name}: ios.${key} is empty`);
      }
    }
    keysByFile[name] = flattenKeys(parsed).sort();
  }

  const names = Object.keys(keysByFile);
  const [first, ...others] = names;
  if (first !== undefined) {
    const base = new Set(keysByFile[first]);
    for (const other of others) {
      const keys = new Set(keysByFile[other]);
      for (const key of base) if (!keys.has(key)) problems.push(`${other}: missing key "${key}" that ${first} has`);
      for (const key of keys) if (!base.has(key)) problems.push(`${other}: has key "${key}" that ${first} does not have`);
    }
  }
  return problems;
}
