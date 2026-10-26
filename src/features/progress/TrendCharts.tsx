import {useState} from 'react';
import {View} from 'react-native';
import Svg,{Circle,Line,Path,Rect} from 'react-native-svg';
import {useTheme} from '../../design/ThemeProvider';
import {useLanguage} from '../../i18n/LanguageProvider';
import type {NutritionTrend,WeightTrend} from './trendMath';

/** Chart axes are permanently chronological left-to-right even in an RTL interface. */
export function NutritionGraph({trend,target,hidden=false}:{
 trend:NutritionTrend;target:number|null;hidden?:boolean;
}){
 const {theme}=useTheme();
 const {t}=useLanguage();
 const [width,setWidth]=useState(320);const height=150,pad=10;
 const values=trend.days.filter(d=>d.logged).map(d=>d.kcal??0);
 const ceiling=Math.max(1,target??0,...values)*1.1;
 const x=(i:number)=>pad+i*(width-2*pad)/Math.max(1,trend.days.length-1);
 const y=(n:number)=>height-pad-(height-2*pad)*n/ceiling;
 return <View accessible accessibilityRole="image"
  accessibilityLabel={hidden?t('trend.hidden'):t('trend.chartNutritionA11y',{count:trend.loggedDays})}
  onLayout={event=>{const next=event.nativeEvent.layout.width;if(next>0)setWidth(next);}}
  style={{height}}>
  <Svg width={width} height={height}>
   {target!==null&&<Line x1={pad} x2={width-pad} y1={y(target)} y2={y(target)}
     stroke={theme.color.border.strong} strokeDasharray="5 4" strokeWidth={1.5}/>}
   {trend.days.map((d,i)=>{
     if(!d.logged)return <Rect key={d.day} x={x(i)-2} y={height-pad-7} width={4} height={7}
       stroke={theme.color.domain.eat} fill="transparent" strokeWidth={1} strokeDasharray="2 2"/>;
     const prev=trend.days[i-1];
     return <ViewPlaceholder key={d.day} i={i} x={x(i)} y={y(d.kcal??0)} prev={
       prev?.logged?{x:x(i-1),y:y(prev.kcal??0)}:null} stroke={theme.color.domain.eat}/>;
   })}
  </Svg>
 </View>;
}
/** Group native SVG primitives without creating React Native views within SVG. */
function ViewPlaceholder({x,y,prev,stroke}:{
 i:number;x:number;y:number;prev:{x:number;y:number}|null;stroke:string;
}){
 return <>{prev&&<Line x1={prev.x} y1={prev.y} x2={x} y2={y} stroke={stroke}
   strokeWidth={2}/>}<Circle cx={x} cy={y} r={3} fill={stroke}/></>;
}
export function ProteinPips({days,hidden}:{
 days:NutritionTrend['days'];hidden:boolean;
}){
 const {theme}=useTheme();
 const {t}=useLanguage();
 return <View accessibilityRole="image" accessible
  accessibilityLabel={hidden?t('trend.hidden'):
    t('trend.chartProteinA11y',{count:days.filter(d=>d.proteinGoal==='met').length})}
  style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[1]}}>
  {days.map(day=>{
   const goal=day.proteinGoal;
   const name=goal==='met'?t('trend.proteinMet'):goal==='below'?t('trend.proteinBelow'):
     goal==='unknown'?t('trend.proteinUnknown'):t('trend.proteinUnlogged');
   return <View key={day.day} accessibilityLabel={day.day+': '+name}
    style={{width:17,height:17,borderRadius:theme.radius.sm,
      borderWidth:1,borderColor:theme.color.domain.eat,
      borderStyle:goal==='unlogged'||goal==='unknown'?'dashed':'solid',
      backgroundColor:goal==='met'?theme.color.domain.eat:'transparent'}}/>;
  })}
 </View>;
}
export function WeightGraph({trend,hidden}:{
 trend:WeightTrend;hidden:boolean;
}){
 const {theme}=useTheme();
 const {t}=useLanguage();const [width,setWidth]=useState(320);
 const height=170,pad=14;
 const days=trend.points;
 const all=days.flatMap(d=>[d.trend,...d.entries.map(e=>e.kg)]);
 // On real data the lower bound is the observed minimum, not zero.
 const min=all.length?Math.min(...all):0,max=all.length?Math.max(...all):1;
 const span=Math.max(1,max-min),minY=min-span*0.1,maxY=max+span*0.1;
 const start=Date.parse(trend.startDay+'T12:00:00Z'),end=Date.parse(trend.endDay+'T12:00:00Z');
 const x=(day:string)=>pad+(Date.parse(day+'T12:00:00Z')-start)/Math.max(1,end-start)*(width-2*pad);
 const y=(kg:number)=>height-pad-(kg-minY)/(maxY-minY)*(height-2*pad);
 return <View onLayout={e=>{const w=e.nativeEvent.layout.width;if(w>0)setWidth(w);}}
  accessible accessibilityRole="image"
  accessibilityLabel={hidden?t('trend.hidden'):t('trend.chartWeightA11y',{count:days.length})}
  style={{height}}>
   <Svg width={width} height={height}>
    {days.map((day,i)=><ViewPlaceholder key={'t'+day.day} i={i}
      x={x(day.day)} y={y(day.trend)}
      prev={i>0&&days[i-1]?{x:x(days[i-1]!.day),y:y(days[i-1]!.trend)}:null}
      stroke={theme.color.domain.health}/>)}
    {days.flatMap(day=>day.entries.map(entry=>entry.source==='health-connect'?
      <Path key={entry.id} d={'M '+x(day.day)+' '+(y(entry.kg)-5)+' l 5 5 l -5 5 l -5 -5 Z'}
       fill={theme.color.bg.raised} stroke={theme.color.domain.health} strokeWidth={1.5}/>:
      <Circle key={entry.id} cx={x(day.day)} cy={y(entry.kg)} r={4}
       fill={theme.color.bg.raised} stroke={theme.color.domain.health} strokeWidth={1.5}/>))}
   </Svg>
 </View>;
}
