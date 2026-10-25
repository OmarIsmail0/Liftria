import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { bundledFonts } from '../src/design/fonts';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { ThemeProvider, useTheme } from '../src/design/ThemeProvider';
import { subscribeRestNotificationResponse } from '../src/features/train/restAlerts';
import { readWorkout } from '../src/features/train/workoutData';
import * as Notifications from 'expo-notifications';

// Font loading and initial accessibility resolution both occur behind the native splash.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function ReadyNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, theme } = useTheme();
  useEffect(()=>{
    if(!ready||!fontsLoaded)return;
    const openSession=(sessionId:string)=>{
      void readWorkout(sessionId).then(result=>{
        if(result.ok&&result.value?.state==='in-progress')
          router.push({pathname:'/(tabs)/train/active',params:{id:sessionId}});
      });
    };
    const sub=subscribeRestNotificationResponse(openSession);
    // Cold starts can deliver the response before the router or listener has mounted.
    void Notifications.getLastNotificationResponseAsync().then(response=>{
      const data=response?.notification.request.content.data;
      if(data?.kind==='liftria-rest'&&typeof data.sessionId==='string'){
        openSession(data.sessionId);
        void Notifications.clearLastNotificationResponseAsync();
      }
    }).catch(()=>{});
    return()=>sub.remove();
  },[ready,fontsLoaded]);
  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);
  if (!ready || !fontsLoaded) return null;
  return <>
    <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      translucent backgroundColor="transparent" />
    <Stack screenOptions={{ headerShown: false,
      contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="dev" />
    </Stack>
  </>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(bundledFonts);
  if (fontError) throw fontError;
  return <LanguageProvider><ThemeProvider><ReadyNavigator fontsLoaded={fontsLoaded} /></ThemeProvider></LanguageProvider>;
}
