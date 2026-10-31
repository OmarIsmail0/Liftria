import {useState} from 'react';
import {View} from 'react-native';
import Svg,{Circle,Line,Path,Rect} from 'react-native-svg';
import {useTheme} from '../../design/ThemeProvider';
import {Typography} from '../../design/primitives';
import {pluralForm,type TranslationKey} from '../../i18n';
import {useLanguage} from '../../i18n/LanguageProvider';
import type {NutritionTrend,WeightTrend} from './trendMath';
import {formatAxisDayLabel,formatAxisValueLabel,pickTickIndexes} from './chartAxis';
import {fromKg,type WeightUnit} from '../train/workoutUnits';

type AxisTick={key:string;x:number;baseline:number;anchor:'end'|'middle';text:string};
/**
 * react-native-svg Text does not shape Arabic on Android. Tick labels are the app text
 * primitive on the same anchors: `baseline` is the old SVG baseline, `end` keeps the right
 * edge on x, `middle` keeps the center on x. The layer stays left-to-right with the axis.
 * Screen readers skip the ticks; the chart view keeps its summary label.
 */
function ChartAxisLabels({labels}:{labels:AxisTick[]}){
 const {theme}=useTheme();
 const fontSize=theme.type.small.size;
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden
  importantForAccessibility="no-hide-descendants"
  style={{position:'absolute',left:0,right:0,top:0,bottom:0,direction:'ltr'}}>
  {labels.map(label=>
   <View key={label.key} pointerEvents="none" accessible={false} accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{position:'absolute',top:label.baseline-fontSize,left:label.x,
     transform:[{translateX:label.anchor==='end'?'-100%':'-50%'}]}}>
    <View style={{flexDirection:'row'}}>
     <Typography tone="secondary" size="small">{label.text}</Typography>
    </View>
   </View>)}
 </View>;
}
/** Chart axes are permanently chronological left-to-right even in an RTL interface. */
export function NutritionGraph({trend,target,hidden=false}:{
 trend:NutritionTrend;target:number|null;hidden?:boolean;
}){
 const {theme}=useTheme();
 const {t,language}=useLanguage();
 const [width,setWidth]=useState(320);
 const height=178,pad={top:12,right:12,bottom:30,left:language==='ar'?76:58};
 const values=trend.days.filter(d=>d.logged).map(d=>d.kcal??0);
 const ceiling=Math.max(1,target??0,...values)*1.1;
 const x=(i:number)=>pad.left+i*(width-pad.left-pad.right)/Math.max(1,trend.days.length-1);
 const y=(n:number)=>height-pad.bottom-(height-pad.top-pad.bottom)*n/ceiling;
 const yTicks=[0,ceiling/2,ceiling];
 const xTicks=pickTickIndexes(trend.days.length,4);
 return <View accessible accessibilityRole="image"
  accessibilityLabel={hidden?t('trend.hidden'):t((`trend.chartNutritionA11y.${pluralForm(language,trend.loggedDays)}`) as TranslationKey,{count:trend.loggedDays})}
  onLayout={event=>{const next=event.nativeEvent.layout.width;if(next>0)setWidth(next);}}
  style={{height}}>
  <Svg width={width} height={height}>
   <Line x1={pad.left} x2={pad.left} y1={pad.top} y2={height-pad.bottom}
    stroke={theme.color.border.subtle} strokeWidth={1}/>
   <Line x1={pad.left} x2={width-pad.right} y1={height-pad.bottom} y2={height-pad.bottom}
    stroke={theme.color.border.subtle} strokeWidth={1}/>
   {yTicks.map(value=><Line key={'ny'+value} x1={pad.left} x2={width-pad.right} y1={y(value)} y2={y(value)}
    stroke={theme.color.border.subtle} strokeDasharray="2 3" strokeWidth={0.8}/>)}
   {target!==null&&<Line x1={pad.left} x2={width-pad.right} y1={y(target)} y2={y(target)}
    stroke={theme.color.border.strong} strokeDasharray="5 4" strokeWidth={1.5}/>}
   {trend.days.map((d,i)=>{
     if(!d.logged)return <Rect key={d.day} x={x(i)-3} y={height-pad.bottom-10} width={6} height={10}
       stroke={theme.color.domain.eat} fill="transparent" strokeWidth={1} strokeDasharray="2 2"/>;
     const prev=trend.days[i-1];
     return <ViewPlaceholder key={d.day} i={i} x={x(i)} y={y(d.kcal??0)} prev={
       prev?.logged?{x:x(i-1),y:y(prev.kcal??0)}:null} stroke={theme.color.domain.eat}/>;
   })}
  </Svg>
  <ChartAxisLabels labels={[
   ...(!hidden?yTicks.map(value=>({
    key:'nl'+value,x:pad.left-6,baseline:y(value)+4,anchor:'end' as const,
    text:formatAxisValueLabel(value,language,'kcal'),
   })):[]),
   ...xTicks.flatMap(index=>{
    const day=trend.days[index];
    return day?[{
     key:'nd'+day.day,x:x(index),baseline:height-8,anchor:'middle' as const,
     text:formatAxisDayLabel(day.day,language),
    }]:[];
   }),
  ]}/>
 </View>;
}
/** Group native SVG primitives without creating React Native views within SVG. */
function ViewPlaceholder({x,y,prev,stroke}:{
 i:number;x:number;y:number;prev:{x:number;y:number}|null;stroke:string;
}){
 return <>{prev&&<Line x1={prev.x} y1={prev.y} x2={x} y2={y} stroke={stroke}
   strokeWidth={2.4}/>}<Circle cx={x} cy={y} r={4.5} fill={stroke}/></>;
}
export function ProteinPips({days,hidden}:{
 days:NutritionTrend['days'];hidden:boolean;
}){
 const {theme}=useTheme();
 const {t,language}=useLanguage();
 const met=days.filter(d=>d.proteinGoal==='met').length;
 return <View accessibilityRole="image" accessible
  accessibilityLabel={hidden?t('trend.hidden'):
    t((`trend.chartProteinA11y.${pluralForm(language,met)}`) as TranslationKey,{count:met})}
  style={{flexDirection:'row',flexWrap:'wrap',gap:theme.space[1]}}>
  {days.map(day=>{
   const goal=day.proteinGoal;
   const name=goal==='met'?t('trend.proteinMet'):goal==='below'?t('trend.proteinBelow'):
     goal==='unknown'?t('trend.proteinUnknown'):t('trend.proteinUnlogged');
   return <View key={day.day} accessibilityLabel={day.day+': '+name}
    style={{width:22,height:22,borderRadius:theme.radius.sm,
      borderWidth:1,borderColor:theme.color.domain.eat,
      borderStyle:goal==='unlogged'||goal==='unknown'?'dashed':'solid',
      backgroundColor:goal==='met'?theme.color.domain.eat:'transparent'}}/>;
  })}
 </View>;
}
export function WeightGraph({trend,hidden,unit}:{
 trend:WeightTrend;hidden:boolean;unit:WeightUnit;
}){
 const {theme}=useTheme();
 const {t,language}=useLanguage();const [width,setWidth]=useState(320);
 const height=192,pad={top:12,right:12,bottom:30,left:56};
 const days=trend.points;
 const all=days.flatMap(d=>[d.trend,...d.entries.map(e=>e.kg)]);
 // On real data the lower bound is the observed minimum, not zero.
 const min=all.length?Math.min(...all):0,max=all.length?Math.max(...all):1;
 const span=Math.max(1,max-min),minY=min-span*0.1,maxY=max+span*0.1;
 const start=Date.parse(trend.startDay+'T12:00:00Z'),end=Date.parse(trend.endDay+'T12:00:00Z');
 const x=(day:string)=>pad.left+(Date.parse(day+'T12:00:00Z')-start)/Math.max(1,end-start)*(width-pad.left-pad.right);
 const y=(kg:number)=>height-pad.bottom-(kg-minY)/(maxY-minY)*(height-pad.top-pad.bottom);
 const yTicks=[minY,(minY+maxY)/2,maxY];
 const xTicks=pickTickIndexes(trend.points.length,4);
 return <View onLayout={e=>{const w=e.nativeEvent.layout.width;if(w>0)setWidth(w);}}
  accessible accessibilityRole="image"
  accessibilityLabel={hidden?t('trend.hidden'):t((`trend.chartWeightA11y.${pluralForm(language,days.length)}`) as TranslationKey,{count:days.length})}
  style={{height}}>
   <Svg width={width} height={height}>
    <Line x1={pad.left} x2={pad.left} y1={pad.top} y2={height-pad.bottom}
     stroke={theme.color.border.subtle} strokeWidth={1}/>
    <Line x1={pad.left} x2={width-pad.right} y1={height-pad.bottom} y2={height-pad.bottom}
     stroke={theme.color.border.subtle} strokeWidth={1}/>
    {yTicks.map(value=><Line key={'wy'+value} x1={pad.left} x2={width-pad.right} y1={y(value)} y2={y(value)}
     stroke={theme.color.border.subtle} strokeDasharray="2 3" strokeWidth={0.8}/>)}
    {days.map((day,i)=><ViewPlaceholder key={'t'+day.day} i={i}
      x={x(day.day)} y={y(day.trend)}
      prev={i>0&&days[i-1]?{x:x(days[i-1]!.day),y:y(days[i-1]!.trend)}:null}
      stroke={theme.color.domain.health}/>)}
    {days.flatMap(day=>day.entries.map(entry=>entry.source!=='liftria'?
      <Path key={entry.id} d={'M '+x(day.day)+' '+(y(entry.kg)-5)+' l 5 5 l -5 5 l -5 -5 Z'}
       fill={theme.color.bg.raised} stroke={theme.color.domain.health} strokeWidth={1.5}/>:
      <Circle key={entry.id} cx={x(day.day)} cy={y(entry.kg)} r={4}
       fill={theme.color.bg.raised} stroke={theme.color.domain.health} strokeWidth={1.5}/>))}
   </Svg>
   <ChartAxisLabels labels={[
    ...(!hidden?yTicks.map(value=>({
     key:'wl'+value,x:pad.left-6,baseline:y(value)+4,anchor:'end' as const,
     text:formatAxisValueLabel(fromKg(value,unit),language,unit),
    })):[]),
    ...xTicks.flatMap(index=>{
     const day=days[index];
     return day?[{
      key:'wd'+day.day,x:x(day.day),baseline:height-8,anchor:'middle' as const,
      text:formatAxisDayLabel(day.day,language),
     }]:[];
    }),
   ]}/>
 </View>;
}

function calendarDay(at:string):string{
 const date=new Date(at);
 const month=String(date.getMonth()+1).padStart(2,'0');
 const day=String(date.getDate()).padStart(2,'0');
 return date.getFullYear()+'-'+month+'-'+day;
}

/** One tape site over time. The caller passes values already converted to the shown unit. */
export function MeasurementGraph({points,hidden,valueLabel,accessibilityLabel}:{
 points:{at:string;value:number}[];
 hidden:boolean;
 valueLabel:(value:number)=>string;
 accessibilityLabel:string;
}){
 const {theme}=useTheme();
 const {language}=useLanguage();
 const [width,setWidth]=useState(320);
 const ordered=[...points].filter(point=>Number.isFinite(Date.parse(point.at))&&Number.isFinite(point.value))
  .sort((a,b)=>a.at.localeCompare(b.at));
 if(ordered.length===0)return null;
 const height=192,pad={top:12,right:12,bottom:30,left:language==='ar'?76:58};
 const values=ordered.map(point=>point.value);
 const min=Math.min(...values),max=Math.max(...values);
 const span=Math.max(1,max-min),minY=min-span*0.1,maxY=max+span*0.1;
 const times=ordered.map(point=>Date.parse(point.at));
 const start=Math.min(...times),end=Math.max(...times);
 const x=(at:string)=>{
  const spanX=width-pad.left-pad.right;
  if(end===start)return pad.left+spanX/2;
  return pad.left+(Date.parse(at)-start)/(end-start)*spanX;
 };
 const y=(value:number)=>height-pad.bottom-(value-minY)/(maxY-minY)*(height-pad.top-pad.bottom);
 const yTicks=[minY,(minY+maxY)/2,maxY];
 const xTicks=pickTickIndexes(ordered.length,4);
 return <View onLayout={event=>{const next=event.nativeEvent.layout.width;if(next>0)setWidth(next);}}
  accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{height}}>
  <Svg width={width} height={height}>
   <Line x1={pad.left} x2={pad.left} y1={pad.top} y2={height-pad.bottom}
    stroke={theme.color.border.subtle} strokeWidth={1}/>
   <Line x1={pad.left} x2={width-pad.right} y1={height-pad.bottom} y2={height-pad.bottom}
    stroke={theme.color.border.subtle} strokeWidth={1}/>
   {yTicks.map(value=><Line key={'my'+value} x1={pad.left} x2={width-pad.right} y1={y(value)} y2={y(value)}
    stroke={theme.color.border.subtle} strokeDasharray="2 3" strokeWidth={0.8}/>)}
   {ordered.map((point,index)=>{
    const prev=ordered[index-1];
    return <ViewPlaceholder key={point.at+':'+index} i={index} x={x(point.at)} y={y(point.value)}
     prev={prev?{x:x(prev.at),y:y(prev.value)}:null} stroke={theme.color.domain.health}/>;
   })}
   {!hidden&&yTicks.map(value=><SvgText key={'ml'+value} x={pad.left-6} y={y(value)+4}
    fill={theme.color.text.secondary} textAnchor="end" fontSize={theme.type.small.size}>
    {valueLabel(value)}
   </SvgText>)}
   {xTicks.map(index=>{
    const point=ordered[index];
    if(!point)return null;
    return <SvgText key={'md'+point.at} x={x(point.at)} y={height-8}
     fill={theme.color.text.secondary} textAnchor="middle" fontSize={theme.type.small.size}>
     {formatAxisDayLabel(calendarDay(point.at),language)}
    </SvgText>;
   })}
  </Svg>
 </View>;
}
