/** Default and TypeScript entrypoint is Android; Metro's index.ios.ts supersedes
 * this module on iPhone so the Android-only native package is never loaded. */
export * from './android';
