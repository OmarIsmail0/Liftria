import {Stack} from 'expo-router';
import {Platform} from 'react-native';
export default function EatStack(){
  return <Stack screenOptions={{headerShown:false,...(Platform.OS==='ios'?{gestureEnabled:true}:{}),,contentStyle:{backgroundColor:'transparent'}}}/>;
}
