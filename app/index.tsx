import { useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import { onboardingDestination } from '../src/features/onboarding/draft';

/** First install enters onboarding; interruption resumes at the saved step. */
export default function Index() {
  const [destination, setDestination] = useState<Href | null>(null);
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
  if (!destination) return null;
  return <Redirect href={destination} />;
}
