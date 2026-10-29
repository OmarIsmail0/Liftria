interface Entry {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}
const { readdirSync, readFileSync } = jest.requireActual('fs') as {
  readdirSync: (dir: string, options: { withFileTypes: true }) => Entry[];
  readFileSync: (file: string, encoding: 'utf8') => string;
};
const { join, relative } = jest.requireActual('path') as {
  join: (...parts: string[]) => string;
  relative: (from: string, to: string) => string;
};

const SOURCE_FILE = /\.(?:ts|tsx|js|jsx)$/;
const TEST_FILE = /\.(?:test|spec)\.[jt]sx?$/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === '__tests__' || entry.name === 'node_modules') return [];
    const file = join(dir, entry.name);
    if (entry.isDirectory()) return walk(file);
    return entry.isFile() && SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) && !entry.name.endsWith('.d.ts') ? [file] : [];
  });
}

export interface SourceFile {
  /** Repo-relative path with forward slashes. */
  path: string;
  code: string;
}

/** Every app and src source file, with `__tests__` folders and test files left out. */
export function readAppSources(): SourceFile[] {
  const root = process.cwd();
  return ['app', 'src'].flatMap(dir => walk(join(root, dir))).sort().map(file => ({
    path: relative(root, file).replace(/\\/g, '/'),
    code: readFileSync(file, 'utf8'),
  }));
}

export function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}
