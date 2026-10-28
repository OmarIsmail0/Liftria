/* A stand-in for the expo-file-system File/Directory/Paths API, holding paths in memory.
 * Paths.cache is file:///cache/. Only the members Liftria's deletion code uses exist. */
const CACHE = 'file:///cache';
const files = new Set<string>();

type Location = string | { uri: string };
const joinUri = (parts: Location[]) =>
  parts.map(part => (typeof part === 'string' ? part : part.uri).replace(/\/+$/, '')).join('/');
const childrenOf = (uri: string) => [...files].filter(file => file.startsWith(uri + '/'));

class MemoryFile {
  readonly uri: string;
  constructor(...uris: Location[]) { this.uri = joinUri(uris); }
  get name(): string { return this.uri.slice(this.uri.lastIndexOf('/') + 1); }
  get exists(): boolean { return files.has(this.uri); }
  delete(): void {
    if (!files.delete(this.uri)) throw new Error('File does not exist: ' + this.uri);
  }
}
class MemoryDirectory {
  readonly uri: string;
  constructor(...uris: Location[]) { this.uri = joinUri(uris); }
  get name(): string { return this.uri.slice(this.uri.lastIndexOf('/') + 1); }
  get exists(): boolean { return this.uri === CACHE || childrenOf(this.uri).length > 0; }
  delete(): void {
    if (!this.exists) throw new Error('Directory does not exist: ' + this.uri);
    for (const file of childrenOf(this.uri)) files.delete(file);
  }
  list(): (MemoryFile | MemoryDirectory)[] {
    const names = new Set(childrenOf(this.uri).map(file => file.slice(this.uri.length + 1)));
    const entries = new Map<string, MemoryFile | MemoryDirectory>();
    for (const rest of names) {
      const [first] = rest.split('/');
      entries.set(first!, rest.includes('/') ? new MemoryDirectory(this.uri, first!) : new MemoryFile(this.uri, first!));
    }
    return [...entries.values()];
  }
}

export const memoryFileSystem = {
  File: MemoryFile,
  Directory: MemoryDirectory,
  Paths: { get cache() { return new MemoryDirectory(CACHE); } },
};

/** Creates a file at a path relative to the cache folder, e.g. "ImagePicker/1.jpg". */
export function writeCacheFile(path: string): void {
  files.add(CACHE + '/' + path);
}
/** Every file in the cache folder, as paths relative to it. */
export function cacheFiles(): string[] {
  return [...files].map(file => file.slice(CACHE.length + 1)).sort();
}
export function resetMemoryFileSystem(): void {
  files.clear();
}
