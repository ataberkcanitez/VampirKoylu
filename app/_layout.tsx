import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInAnonymously } from 'firebase/auth';
import { useEffect } from 'react';
import { auth } from '../src/config/firebase';

export default function RootLayout() {
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error("Anonymous sign-in failed", error);
    });
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
