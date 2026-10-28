import Svg,{Circle,Ellipse,Rect,Path} from 'react-native-svg';
/** Bundled local sample *illustration* for developer screenshots. No photography,
 * network request, or undocumented food measurements. */
export function DemoPhotoIllustration(){
 return <Svg viewBox="0 0 340 220" width="100%" height={220} accessibilityRole="image">
  <Rect x="0" y="0" width="340" height="220" fill="#b49b80"/>
  <Path d="M0 10 L340 185 M0 180 L340 10" stroke="#a1846b" strokeWidth={12} opacity={0.3}/>
  <Ellipse cx="170" cy="113" rx="130" ry="94" fill="#e5dfd0"/>
  <Ellipse cx="170" cy="112" rx="113" ry="79" fill="#f8f5e9"/>
  <Ellipse cx="140" cy="112" rx="61" ry="50" fill="#bc8f48"/>
  <Ellipse cx="140" cy="112" rx="49" ry="40" fill="#d6b977"/>
  <Path d="M97 113Q138 68 177 112Q145 150 97 113Z" fill="#c97934"/>
  <Path d="M111 95Q160 134 176 90" stroke="#e7a457" strokeWidth={9} fill="none"/>
  <Ellipse cx="225" cy="112" rx="39" ry="42" fill="#c7a36a"/>
  <Ellipse cx="226" cy="111" rx="30" ry="34" fill="#e3c994"/>
  <Circle cx="216" cy="104" r="6" fill="#769856"/>
  <Circle cx="231" cy="123" r="7" fill="#65854e"/>
  <Circle cx="239" cy="94" r="5" fill="#65854e"/>
  <Circle cx="117" cy="128" r="4" fill="#6c8d49"/>
  <Circle cx="151" cy="89" r="5" fill="#6c8d49"/>
 </Svg>;
}
