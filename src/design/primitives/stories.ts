/** Each entry has its own hidden /dev/primitives/[name] test screen. */
export const primitiveStories = [
  { id: 'screen', title: 'Screen' },
  { id: 'header', title: 'Header' },
  { id: 'card', title: 'Card' },
  { id: 'button', title: 'Button' },
  { id: 'chip', title: 'Chip' },
  { id: 'banner', title: 'Banner' },
  { id: 'snackbar', title: 'Snackbar with Undo' },
  { id: 'sheet', title: 'Sheet' },
  { id: 'stepper', title: 'Stepper' },
  { id: 'toggle', title: 'Toggle' },
  { id: 'field', title: 'Field' },
  { id: 'list-row', title: 'ListRow' },
  { id: 'empty-state', title: 'EmptyState' },
  { id: 'skeleton', title: 'Skeleton' },
  { id: 'orb', title: 'Pulse Orb' },
  { id: 'capsule-nav', title: 'CapsuleNav' },
] as const;
export type PrimitiveStoryId = typeof primitiveStories[number]['id'];
export function isPrimitiveStoryId(value: string): value is PrimitiveStoryId {
  return primitiveStories.some(item => item.id === value);
}
