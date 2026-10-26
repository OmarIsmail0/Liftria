import { Pressable, Text, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import { useTheme } from '../../design/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { muscleLabel } from '../../i18n/muscles';
import { translate, type AppLanguage } from '../../i18n';
import { fontFamilyFor } from '../../design/fonts';
import { MUSCLES, type Muscle } from '../../services/database/gymTypes';
import { BODY_REGIONS, BUNDLED_REGIONS, DRAWN_REGIONS, mapBodyRegions, preferredBodySide,
  type BodyIntensity, type MuscleShade } from './bodyRegions';

export { BUNDLED_REGIONS, DRAWN_REGIONS };
export type { MuscleShade };

export function bodyMapDescription(primary: readonly Muscle[], secondary: readonly Muscle[], language: AppLanguage = 'en'): string {
  const names = (items:readonly Muscle[]) => [...new Set(items)].map(m=>muscleLabel(language,m)).join(', ');
  const first = names(primary) || (language === 'en' ? 'none' : translate(language, 'muscle.none'));
  const second = names(secondary.filter(m=>!primary.includes(m))) || (language === 'en' ? 'none' : translate(language, 'muscle.none'));
  return language === 'en' ? 'Muscles worked. Primary: ' + first + '. Secondary: ' + second + '.' :
    translate(language, 'muscle.accessibility', { primary:first, secondary:second });
}

/** Alpha tint is derived from the Train domain token; never the library's default blue. */
function trainTint(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) return hex;
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${opacity})`;
}
function bodyColor(state: BodyIntensity, train: string): string {
  if (state === 'primary' || state === 'higher') return train;
  if (state === 'secondary' || state === 'some') return trainTint(train, 0.55);
  return trainTint(train, state === 'low' ? 0.25 : 0.12);
}

/** Exact BodyMap API is retained for browse, recovery, preview and exercise miniatures. */
export function BodyMap({ primary=[], secondary=[], mini=false, icon=false, onSelect, selected, shading }: {
  primary?: readonly Muscle[]; secondary?: readonly Muscle[]; mini?: boolean; icon?: boolean;
  selected?: Muscle | null; onSelect?: (muscle: Muscle)=>void;
  shading?: Partial<Record<Muscle,MuscleShade>>;
}) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const states = mapBodyRegions(primary, secondary, shading, selected);
  const data = [...states].map(([slug, state]) => ({
    slug, color: bodyColor(state, theme.color.domain.train),
  }));
  const textColor = theme.color.text.secondary;
  const mapText = shading ? t('muscle.loadEstimate') : bodyMapDescription(primary, secondary, language);
  const visibleSides: ('front'|'back')[] = icon ? ['front','back'] :
    mini ? [preferredBodySide(primary)] : ['front','back'];
  const selectSlug = (slug?: Slug) => {
    if (!onSelect || !slug) return;
    const matches = MUSCLES.filter(m => BODY_REGIONS[m].includes(slug));
    const preferred = matches.find(m=>m===selected) ??
      matches.find(m=>primary.includes(m)) ?? matches[0];
    if (preferred) onSelect(preferred);
  };
  return <View style={{ gap: mini ? 0 : theme.space[2], alignItems: 'center' }}>
    <View accessible accessibilityRole="image" accessibilityLabel={mapText}
      style={{ flexDirection: 'row', alignItems:'center', justifyContent:'center',
        gap: mini ? 0 : theme.space[4], maxWidth: '100%' }}>
      {visibleSides.map(side => <View key={side}
        importantForAccessibility="no-hide-descendants"
        style={mini ? { width:icon ? 24 : 48, height:48, borderRadius:icon ? 12 : 24,
          alignItems:'center', justifyContent:'center', overflow:'hidden',
          backgroundColor:theme.color.tint.train } :
          { alignItems:'center', justifyContent:'center' }}>
        <Body data={data} side={side} gender="male" scale={mini ? (icon ? 0.11 : 0.16) : 0.7}
          border={theme.color.border.control} defaultFill={theme.color.track}
          defaultStroke={theme.color.border.subtle}
          hiddenParts={['hair','hands','feet']}
          onBodyPartPress={onSelect ? part=>selectSlug(part.slug) : undefined} />
      </View>)}
    </View>
    {!mini && <View style={{ width:'100%', flexDirection:'row', justifyContent:'space-around' }}>
      <Text style={{ color:textColor, fontFamily:fontFamilyFor('Figtree','400',language==='ar') }}>{t('muscle.front')}</Text>
      <Text style={{ color:textColor, fontFamily:fontFamilyFor('Figtree','400',language==='ar') }}>{t('muscle.back')}</Text>
    </View>}
    {!mini && !shading && <View style={{ gap:theme.space[2], alignSelf:'stretch' }}>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:theme.space[3], alignItems:'center' }}>
        <View style={{ width:14,height:14,borderRadius:4,backgroundColor:theme.color.domain.train }} />
        <Text style={{ color:textColor, flexShrink:1 }}>{t('muscle.primary')}: {primary.map(m=>muscleLabel(language,m)).join(', ')||t('muscle.none')}</Text>
      </View>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:theme.space[3], alignItems:'center' }}>
        <View style={{ width:14,height:14,borderRadius:4,backgroundColor:trainTint(theme.color.domain.train,0.55) }} />
        <Text style={{ color:textColor, flexShrink:1 }}>{t('muscle.secondary')}: {secondary.filter(m=>!primary.includes(m)).map(m=>muscleLabel(language,m)).join(', ')||t('muscle.none')}</Text>
      </View>
    </View>}
    {onSelect && !mini && <View style={{ flexDirection:'row', flexWrap:'wrap', gap:theme.space[2] }}>
      {MUSCLES.map(m=><Pressable key={m} accessibilityRole="button"
        accessibilityLabel={t('muscle.browse',{name:muscleLabel(language,m)})}
        accessibilityState={{selected:selected===m}}
        onPress={()=>onSelect(m)} style={{
          minHeight:theme.size.touch.min, paddingHorizontal:theme.space[3],
          justifyContent:'center', borderRadius:theme.radius.pill,
          borderColor:selected===m?theme.color.domain.train:theme.controlOutline,
          borderWidth:1, backgroundColor:selected===m?theme.color.tint.train:theme.cardFill,
        }}><Text style={{color:theme.color.text.primary,fontSize:theme.type.small.size}}>{muscleLabel(language,m)}</Text></Pressable>)}
    </View>}
  </View>;
}
