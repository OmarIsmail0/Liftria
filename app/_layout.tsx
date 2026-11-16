import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, router, type Theme } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageProvider';
import { ThemeProvider, useTheme } from '../src/design/ThemeProvider';
import { OpaqueStack } from '../src/navigation/OpaqueStack';
import { handleNotificationOpen, subscribeRestNotificationResponse } from '../src/features/train/restAlerts';
import { useWorkoutNotificationSync } from '../src/features/train/workoutNotification';
import { readWorkout } from '../src/features/train/workoutData';
import * as Notifications from 'expo-notifications';

// Initial accessibility and saved theme resolve behind the native splash.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function ReadyNavigator() {
  const { ready, theme } = useTheme();
  const { language } = useLanguage();
  useWorkoutNotificationSync(language);
  useEffect(()=>{
    if(!ready)return;
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
      const kind=data&&typeof data==='object'?(data as Record<string,unknown>).kind:undefined;
      if(response&&(kind==='liftria-rest'||kind==='liftria-workout')){
        void handleNotificationOpen(response,openSession);
        void Notifications.clearLastNotificationResponseAsync();
      }
    }).catch(()=>{});
    return()=>sub.remove();
  },[ready]);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  // React Navigation paints native stack containers with its own theme's background, which
  // defaults to light grey (242,242,242). On iPhone that showed through every nested stack
  // screen, even in dark mode. Transparent lets the app's own backdrop show instead.
  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = { ...base, colors: { ...base.colors, background: 'transparent' } };
  return <NavigationThemeProvider value={navigationTheme}>
    <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      translucent backgroundColor="transparent" />
    <OpaqueStack>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="dev" />
    </OpaqueStack>
  </NavigationThemeProvider>;
}

export default function RootLayout() {
  return <LanguageProvider><ThemeProvider><ReadyNavigator /></ThemeProvider></LanguageProvider>;
}
