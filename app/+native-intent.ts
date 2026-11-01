import { redirectIncomingPath } from '../src/features/import/importIncoming';

/** A shared CSV or an opened file goes to the import preview. Every other link is unchanged. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return redirectIncomingPath(path);
}
