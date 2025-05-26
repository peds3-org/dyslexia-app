import React from 'react';
import { Stack } from 'expo-router';

export default function InitialTestLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="test" />
      <Stack.Screen name="results" />
    </Stack>
  );
}