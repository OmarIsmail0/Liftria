import type { LiftriaTheme } from '../tokens';
import { formatNumber, translate, type AppLanguage } from '../../i18n';

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

/** The Orb's big number and its caption, the same layout in every language. */
export type OrbMetric = { value: string; caption: string };

function orbMetric(language: AppLanguage, value: string, caption: 'orb.caption.eaten' | 'orb.caption.left' | 'orb.caption.over'): OrbMetric {
  return { value, caption: translate(language, caption) };
}

export function orbSummary(eaten: number, target: number | null, hidden = false, language: AppLanguage = 'en') {
  const safeEaten = Math.max(0, Math.round(eaten));
  if (hidden) return { metric: null, label: target === null ? translate(language, 'orb.hidden') : safeEaten > target ? translate(language, 'orb.over') : translate(language, 'orb.onTrack'), progress: target === null ? null : Math.min(1, target > 0 ? safeEaten / target : 0), accessibilityLabel: translate(language, 'orb.hidden') };
  if (target === null || target <= 0) return {
    metric: orbMetric(language, formatNumber(language, safeEaten), 'orb.caption.eaten'),
    label: translate(language, 'orb.eaten', { count: safeEaten }),
    progress: null,
    accessibilityLabel: language === 'en' ? `${safeEaten.toLocaleString('en-US')} kilocalories eaten, no target set` : translate(language, 'orb.noTargetA11y', { count: safeEaten }),
  };
  const left = target - safeEaten;
  const label = left >= 0 ? translate(language, 'orb.left', { count: left }) : translate(language, 'orb.overTarget', { count: Math.abs(left) });
  return {
    metric: left >= 0
      ? orbMetric(language, formatNumber(language, left), 'orb.caption.left')
      // LRM keeps the sign before the number in an RTL line ("+225", not "225+").
      : orbMetric(language, (language === 'ar' ? '\u200E' : '') + '+' + formatNumber(language, Math.abs(left)), 'orb.caption.over'),
    label,
    progress: Math.min(1, safeEaten / target),
    accessibilityLabel: language === 'en' ? (left >= 0
      ? `${left.toLocaleString('en-US')} kilocalories left. ${safeEaten.toLocaleString('en-US')} of ${target.toLocaleString('en-US')} eaten, estimated target`
      : `${Math.abs(left).toLocaleString('en-US')} kilocalories over. ${safeEaten.toLocaleString('en-US')} of ${target.toLocaleString('en-US')} eaten, estimated target`) :
      translate(language, left >= 0 ? 'orb.leftA11y' : 'orb.overA11y', { remaining: Math.abs(left), eaten: safeEaten, target }),
  };
}
