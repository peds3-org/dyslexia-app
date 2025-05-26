import React from 'react';
import { useRouter } from 'expo-router';
import IntroScreen from '@src/components/test/IntroScreen';

export default function InitialTestIntro() {
  const router = useRouter();

  const handleComplete = () => {
    router.push('/(app)/initial-test/test');
  };

  return <IntroScreen onComplete={handleComplete} />;
}