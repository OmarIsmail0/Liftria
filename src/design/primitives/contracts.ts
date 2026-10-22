import type { LiftriaTheme } from '../tokens';

export const buttonVariants = ['primary', 'secondary', 'ghost', 'train', 'hiku', 'danger'] as const;
export type ButtonVariant = typeof buttonVariants[number];
export const buttonSizes = ['sm', 'md', 'xl'] as const;
export type ButtonSize = typeof buttonSizes[number];
export const provenanceKinds = ['measured', 'phone', 'estimate', 'pending', 'stale', 'off', 'hiku'] as const;
export type ProvenanceKind = typeof provenanceKinds[number];
export type CardRim = 'eat' | 'train' | 'health' | 'hiku' | 'none';

export const capsuleTabs = [
  { key: 'today', label: 'Today', glyph: '◉' },
  { key: 'train', label: 'Train', glyph: '⌁' },
  { key: 'eat', label: 'Eat', glyph: '+' },
  { key: 'progress', label: 'Progress', glyph: '▤' },
  { key: 'hiku', label: 'Hiku', glyph: '✧' },
] as const;
export type CapsuleTab = typeof capsuleTabs[number]['key'];

export function buttonHeight(theme: LiftriaTheme, size: ButtonSize) {
  return size === 'xl' ? theme.size.touch.workout : theme.size.touch.min;
}

export function buttonColors(theme: LiftriaTheme, variant: ButtonVariant) {
  switch (variant) {
    case 'primary': return { bg: theme.color.action.primary.bg, fg: theme.color.action.primary.fg, border: theme.color.action.primary.bg };
    case 'secondary': return { bg: theme.color.bg.raised, fg: theme.color.text.primary, border: theme.controlOutline };
    case 'ghost': return { bg: 'transparent', fg: theme.color.text.primary, border: 'transparent' };
    case 'train': return { bg: theme.color.domain.train, fg: theme.color.on.train, border: theme.color.domain.train };
    case 'hiku': return { bg: theme.color.domain.hiku, fg: theme.color.on.hiku, border: theme.color.domain.hiku };
    case 'danger': return { bg: theme.color.status.danger, fg: theme.color.text.inverse, border: theme.color.status.danger };
  }
}

export function provenancePresentation(theme: LiftriaTheme, kind: ProvenanceKind) {
  switch (kind) {
    case 'measured': return { label: 'Measured', glyph: '✓', fg: theme.color.domain.health, bg: theme.color.tint.health, dashed: false };
    case 'phone': return { label: 'Phone', glyph: '▣', fg: theme.color.text.primary, bg: theme.color.bg.raised, dashed: false };
    case 'estimate': return { label: 'Estimate', glyph: '≈', fg: theme.color.text.secondary, bg: theme.color.bg.raised, dashed: true };
    case 'pending': return { label: 'Pending', glyph: '…', fg: theme.color.status.warning, bg: theme.color.tint.warning, dashed: true };
    case 'stale': return { label: 'Stale', glyph: '◷', fg: theme.color.status.warning, bg: theme.color.tint.warning, dashed: false };
    case 'off': return { label: 'No data', glyph: '−', fg: theme.color.text.secondary, bg: theme.color.bg.raised, dashed: false };
    case 'hiku': return { label: 'Hiku estimate', glyph: '✧', fg: theme.color.chip.hiku.fg, bg: theme.color.chip.hiku.bg, dashed: false };
  }
}

export function orbSummary(eaten: number, target: number | null, hidden = false) {
  const safeEaten = Math.max(0, Math.round(eaten));
  if (hidden) return { label: target === null ? 'Numbers are hidden' : safeEaten > target ? 'A bit over' : 'On track', progress: target === null ? null : Math.min(1, target > 0 ? safeEaten / target : 0), accessibilityLabel: 'Numbers are hidden' };
  if (target === null || target <= 0) return {
    label: `${safeEaten.toLocaleString('en-US')} kcal eaten`,
    progress: null,
    accessibilityLabel: `${safeEaten.toLocaleString('en-US')} kilocalories eaten, no target set`,
  };
  const left = target - safeEaten;
  const label = left >= 0 ? `${left.toLocaleString('en-US')} kcal left` : `+${Math.abs(left).toLocaleString('en-US')} kcal over`;
  return {
    label,
    progress: Math.min(1, safeEaten / target),
    accessibilityLabel: left >= 0
      ? `${left.toLocaleString('en-US')} kilocalories left. ${safeEaten.toLocaleString('en-US')} of ${target.toLocaleString('en-US')} eaten, estimated target`
      : `${Math.abs(left).toLocaleString('en-US')} kilocalories over. ${safeEaten.toLocaleString('en-US')} of ${target.toLocaleString('en-US')} eaten, estimated target`,
  };
}
