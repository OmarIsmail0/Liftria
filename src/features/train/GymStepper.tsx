import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Typography } from '../../design/primitives';
import { useTheme } from '../../design/ThemeProvider';

/** 64dp gym stepper: tap, long-press repeat (400/150ms), direct numeric keypad. */
export function GymStepper({label,value,onChange,step=1,min=0,max=10000,unit=''}:{
  label:string; value:number; onChange:(value:number)=>void; step?:number; min?:number; max?:number; unit?:string;
}) {
  const {theme}=useTheme();
  const current=useRef(value);
  const repeat=useRef<ReturnType<typeof setInterval>|null>(null);
  const [editing,setEditing]=useState(false);
  const [typed,setTyped]=useState(String(value));
  useEffect(()=>{current.current=value;},[value]);
  useEffect(()=>()=>{if(repeat.current)clearInterval(repeat.current);},[]);
  const change=(direction:number)=>{
    const next=Math.max(min,Math.min(max,Math.round((current.current+direction*step)*100)/100));
    current.current=next;onChange(next);
  };
  const stop=()=>{if(repeat.current){clearInterval(repeat.current);repeat.current=null;}};
  const control=(direction:number,word:string)=><Pressable accessibilityRole="button"
    accessibilityLabel={word+' '+label} onPress={()=>change(direction)}
    onLongPress={()=>{stop();repeat.current=setInterval(()=>change(direction),150);}}
    delayLongPress={400} onPressOut={stop}
    style={{width:64,minHeight:64,justifyContent:'center',alignItems:'center',
      borderRadius:theme.radius.pill,borderColor:theme.controlOutline,borderWidth:1,
      backgroundColor:theme.cardFill}}>
    <Typography size="head">{direction<0?'−':'+'}</Typography>
  </Pressable>;
  return <View style={{gap:theme.space[2],flex:1,minWidth:150}}>
    <Typography tone="secondary" size="small">{label}{unit&&label.toLowerCase().includes(unit)?'':' · '+unit}</Typography>
    <View style={{flexDirection:'row',alignItems:'center',gap:theme.space[1]}}>
      {control(-1,'Decrease')}
      {editing?<TextInput autoFocus accessibilityLabel={'Enter '+label}
        keyboardType="decimal-pad" value={typed} onChangeText={setTyped}
        onBlur={()=>{const parsed=Number(typed);if(Number.isFinite(parsed))
          onChange(Math.max(min,Math.min(max,parsed)));setEditing(false);}}
        style={{flex:1,minHeight:64,textAlign:'center',color:theme.color.text.primary,
          fontSize:theme.type.body.size,borderBottomWidth:1,borderColor:theme.controlOutline}}/>:
        <Pressable accessibilityRole="button" accessibilityLabel={label+', '+value+' '+unit+', edit with keypad'}
          onPress={()=>{setTyped(String(value));setEditing(true);}}
          style={{flex:1,minHeight:64,justifyContent:'center',alignItems:'center'}}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
            style={{color:theme.color.text.primary,fontSize:theme.type.body.size,
              fontWeight:'700',textAlign:'center'}}>{value}</Text>
        </Pressable>}
      {control(1,'Increase')}
    </View>
  </View>;
}
