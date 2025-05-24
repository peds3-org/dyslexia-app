import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="initial-test" />
      <Stack.Screen name="beginner" />
      <Stack.Screen name="intermediate" />
      <Stack.Screen name="advanced" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="home" />
      <Stack.Screen name="tutorial" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="dictionary" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="logout" />
      <Stack.Screen name="voice-practice" />
      <Stack.Screen name="improved-auth" />
      <Stack.Screen name="improved-progress" />
      <Stack.Screen name="AIDockerGuide" />
      <Stack.Screen name="AISetupScreen" />
      <Stack.Screen name="VoicePractice" />
      <Stack.Screen name="test-tflite" />
    </Stack>
  );
}