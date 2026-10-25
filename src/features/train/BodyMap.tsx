import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '../../design/ThemeProvider';
import { useLanguage } from '../../i18n/LanguageProvider';
import { muscleLabel } from '../../i18n/muscles';
import { translate, type AppLanguage } from '../../i18n';
import { fontFamilyFor } from '../../design/fonts';
import { MUSCLES, regionKey, type Muscle } from '../../services/database/gymTypes';

type Shape = { muscle: Muscle; shape: 'r' | 'e'; a:number; b:number; c:number; d:number; radius?:number };
const F: Shape[] = [
  {muscle:'neck',shape:'r',a:45,b:24,c:10,d:8,radius:3},
  {muscle:'shoulders',shape:'e',a:26,b:44,c:8,d:7},{muscle:'shoulders',shape:'e',a:74,b:44,c:8,d:7},
  {muscle:'chest',shape:'r',a:31,b:37,c:18,d:19,radius:7},{muscle:'chest',shape:'r',a:51,b:37,c:18,d:19,radius:7},
  {muscle:'biceps',shape:'r',a:17,b:53,c:9,d:22,radius:4.5},{muscle:'biceps',shape:'r',a:74,b:53,c:9,d:22,radius:4.5},
  {muscle:'forearms',shape:'r',a:13,b:78,c:9,d:26,radius:4.5},{muscle:'forearms',shape:'r',a:78,b:78,c:9,d:26,radius:4.5},
  {muscle:'abdominals',shape:'r',a:40,b:59,c:20,d:34,radius:6},
  {muscle:'abdominals',shape:'r',a:32,b:60,c:7,d:28,radius:3.5},
  {muscle:'abdominals',shape:'r',a:61,b:60,c:7,d:28,radius:3.5},
  {muscle:'quadriceps',shape:'r',a:30,b:100,c:15,d:46,radius:7.5},{muscle:'quadriceps',shape:'r',a:55,b:100,c:15,d:46,radius:7.5},
  {muscle:'adductors',shape:'r',a:45.5,b:102,c:4,d:28,radius:2},{muscle:'adductors',shape:'r',a:50.5,b:102,c:4,d:28,radius:2},
  {muscle:'calves',shape:'r',a:34,b:152,c:12,d:38,radius:6},{muscle:'calves',shape:'r',a:54,b:152,c:12,d:38,radius:6},
];
const B: Shape[] = [
  {muscle:'neck',shape:'r',a:45,b:22,c:10,d:7,radius:3},
  {muscle:'traps',shape:'r',a:37,b:29,c:26,d:14,radius:7},
  {muscle:'shoulders',shape:'e',a:26,b:44,c:8,d:7},{muscle:'shoulders',shape:'e',a:74,b:44,c:8,d:7},
  {muscle:'middle back',shape:'r',a:43,b:45,c:14,d:21,radius:5},
  {muscle:'lats',shape:'r',a:30,b:46,c:12,d:28,radius:6},{muscle:'lats',shape:'r',a:58,b:46,c:12,d:28,radius:6},
  {muscle:'triceps',shape:'r',a:17,b:53,c:9,d:22,radius:4.5},{muscle:'triceps',shape:'r',a:74,b:53,c:9,d:22,radius:4.5},
  {muscle:'forearms',shape:'r',a:13,b:78,c:9,d:26,radius:4.5},{muscle:'forearms',shape:'r',a:78,b:78,c:9,d:26,radius:4.5},
  {muscle:'lower back',shape:'r',a:40,b:76,c:20,d:15,radius:5},
  {muscle:'abductors',shape:'r',a:27,b:95,c:5,d:18,radius:2.5},{muscle:'abductors',shape:'r',a:68,b:95,c:5,d:18,radius:2.5},
  {muscle:'glutes',shape:'r',a:33,b:94,c:16,d:17,radius:7},{muscle:'glutes',shape:'r',a:51,b:94,c:16,d:17,radius:7},
  {muscle:'hamstrings',shape:'r',a:33,b:114,c:15,d:36,radius:7},{muscle:'hamstrings',shape:'r',a:52,b:114,c:15,d:36,radius:7},
  {muscle:'calves',shape:'r',a:34,b:154,c:12,d:34,radius:6},{muscle:'calves',shape:'r',a:54,b:154,c:12,d:34,radius:6},
];
export const DRAWN_REGIONS = [...new Set([...F,...B].map(s=>regionKey(s.muscle)))].sort();
export const BUNDLED_REGIONS = MUSCLES.map(regionKey).sort();

export function bodyMapDescription(primary: readonly Muscle[], secondary: readonly Muscle[], language: AppLanguage = 'en'): string {
  const names = (items:readonly Muscle[]) => [...new Set(items)].map(m=>muscleLabel(language,m)).join(', ');
  const first = names(primary) || (language === 'en' ? 'none' : translate(language, 'muscle.none'));
  const second = names(secondary.filter(m=>!primary.includes(m))) || (language === 'en' ? 'none' : translate(language, 'muscle.none'));
  return language === 'en' ? 'Muscles worked. Primary: ' + first + '. Secondary: ' + second + '.' :
    translate(language, 'muscle.accessibility', { primary:first, secondary:second });
}

/** Original Liftria prototype geometry, no external imagery. Region taps have 48dp chip equivalents. */
export type MuscleShade='higher'|'some'|'low'|'untrained';
export function BodyMap({ primary=[], secondary=[], mini=false, onSelect, selected, shading }: {
  primary?: readonly Muscle[]; secondary?: readonly Muscle[]; mini?: boolean;
  selected?: Muscle | null; onSelect?: (muscle: Muscle)=>void;
  shading?: Partial<Record<Muscle,MuscleShade>>;
}) {
  const { theme }=useTheme();
  const { t, language }=useLanguage();
  const backOnly=mini && !primary.some(m=>F.some(part=>part.muscle===m));
  const front=mini ? (backOnly?B:F) : F;
  const size=mini?{width:40,height:72}:{width:300,height:270};
  const textColor=theme.color.text.secondary;
  const mapText=shading?
    t('muscle.loadEstimate'):
    bodyMapDescription(primary,secondary,language);
  const renderFigure=(parts:Shape[],offset:number,side:string)=><G key={side} transform={'translate('+offset+',0)'}>
    <Circle cx={50} cy={12} r={10} fill={theme.color.track}
      stroke={theme.color.border.control} strokeWidth={0.9}/>
    {parts.map((shape,i)=>{
      const state=primary.includes(shape.muscle) || selected===shape.muscle ? 'primary'
        : secondary.includes(shape.muscle)?'secondary':'none';
      const shade=shading?.[shape.muscle];
      const fg=state==='none'?theme.color.track:theme.color.domain.train;
      const props={
        fill:shade==='some'?'url(#liftriaRecoveryDots)':shade?theme.color.domain.train:fg,
        fillOpacity:shade?(shade==='low'||shade==='untrained'?0.25:1):
          state==='secondary'?0.30:1,
        stroke:shade?theme.color.domain.train:
          state==='none'?theme.color.border.control:theme.color.domain.train,
        strokeWidth:shade?1.2:state==='none'?0.9:1.2,
        strokeDasharray:shade==='untrained'?'3 2':!shade&&state==='secondary'?'3 2':undefined,
        onPress: onSelect ? ()=>onSelect(shape.muscle) : undefined,
      };
      return shape.shape==='e'
        ?<Ellipse key={side+i} cx={shape.a} cy={shape.b} rx={shape.c} ry={shape.d} {...props}/>
        :<Rect key={side+i} x={shape.a} y={shape.b} width={shape.c} height={shape.d}
          rx={shape.radius??0} {...props}/>;
    })}
  </G>;
  return <View style={{gap:theme.space[2],alignItems:'center'}}>
    <View accessible accessibilityRole="image" accessibilityLabel={mapText}>
      <Svg width={size.width} height={size.height}
        viewBox={mini?'6 0 88 196':'0 0 210 196'}>
        <Defs>
          <Pattern id="liftriaRecoveryDots" patternUnits="userSpaceOnUse" width={7} height={7}>
            <Rect width={7} height={7} fill={theme.color.domain.train} fillOpacity={0.55}/>
            <Circle cx={2} cy={2} r={1} fill={theme.color.bg.base}/>
          </Pattern>
        </Defs>
        {renderFigure(front,0,'front')}
        {!mini&&renderFigure(B,110,'back')}
      </Svg>
    </View>
    {!mini && <View style={{width:'100%',flexDirection:'row',justifyContent:'space-around'}}>
      <Text style={{color:textColor,fontFamily:fontFamilyFor('Figtree','400',language==='ar')}}>{t('muscle.front')}</Text><Text style={{color:textColor,fontFamily:fontFamilyFor('Figtree','400',language==='ar')}}>{t('muscle.back')}</Text>
    </View>}
    {!mini && !shading && <View style={{gap:theme.space[2],alignSelf:'stretch'}}>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[3],alignItems:'center'}}>
        <View style={{width:14,height:14,borderRadius:4,backgroundColor:theme.color.domain.train}}/>
        <Text style={{color:textColor,flexShrink:1}}>{t('muscle.primary')}: {primary.map(m=>muscleLabel(language,m)).join(', ')||t('muscle.none')}</Text>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[3],alignItems:'center'}}>
        <View style={{width:14,height:14,borderRadius:4,borderWidth:1,
          borderStyle:'dashed',borderColor:theme.color.domain.train}}>
          <View style={{flex:1,opacity:0.30,backgroundColor:theme.color.domain.train,borderRadius:3}}/>
        </View>
        <Text style={{color:textColor,flexShrink:1}}>{t('muscle.secondary')} (30%): {secondary.filter(m=>!primary.includes(m)).map(m=>muscleLabel(language,m)).join(', ')||t('muscle.none')}</Text>
      </View>
    </View>}
    {onSelect && !mini && <View style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[2]}}>
      {MUSCLES.map(m=><Pressable key={m} accessibilityRole="button"
        accessibilityLabel={t('muscle.browse', { name: muscleLabel(language,m) })}
        accessibilityState={{selected:selected===m}}
        onPress={()=>onSelect(m)} style={{
          minHeight:theme.size.touch.min,paddingHorizontal:theme.space[3],
          justifyContent:'center',borderRadius:theme.radius.pill,
          borderColor:selected===m?theme.color.domain.train:theme.controlOutline,
          borderWidth:1,backgroundColor:selected===m?theme.color.tint.train:theme.cardFill,
        }}><Text style={{color:theme.color.text.primary,fontSize:theme.type.small.size}}>{muscleLabel(language,m)}</Text></Pressable>)}
    </View>}
  </View>;
}
