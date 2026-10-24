/** Router-independent fallbacks for screens opened directly by deep link. */
export type BackFallback = '/(tabs)/today' | '/(tabs)/progress' | '/settings' | '/dev' | '/dev/primitives';

type Navigator = {
  canGoBack(): boolean;
  back(): void;
  replace(href: BackFallback): void;
};

/** Use actual history when present, otherwise land on the parent without creating a back loop. */
export function backOrReplace(navigator: Navigator, parent: BackFallback): void {
  if (navigator.canGoBack()) {
    navigator.back();
  } else {
    navigator.replace(parent);
  }
}
