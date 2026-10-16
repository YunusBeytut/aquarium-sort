import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0b3d5c' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="play/[level]" />
      </Stack>
    </>
  );
}