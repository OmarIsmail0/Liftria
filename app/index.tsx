import { useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import { onboardingDestination } from '../src/features/onboarding/draft';
import { screenshotRoute } from '../src/navigation/checkRoute';

/** First install enters onboarding; interruption resumes at the saved step. */
export default function Index() {
  const [destination, setDestination] = useState<Href | null>(null);
  // CI-only: the iPhone screenshot check opens a screen at launch (store builds return null).
  const [checkRoute] = useState(() => screenshotRoute());
  useEffect(() => {
    let mounted = true;
    void onboardingDestination().then(href => {
      if (mounted) setDestination(href);
    }).catch(() => {
      // A failed settings read must never silently mark setup as completed.
      if (mounted) setDestination({ pathname: '/onboarding/[step]', params: { step: 'welcome' } });
    });
    return () => { mounted = false; };
  }, []);
  if (checkRoute) return <Redirect href={checkRoute as Href} />;
  if (!destination) return null;
  return <Redirect href={destination} />;
}
