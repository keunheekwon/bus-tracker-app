import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/stores/auth';
import { UpdatePrompt } from '@/components/update-prompt';
import { usePalette } from '@/theme/ui';
import '@/services/location/tracking';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10000 } } });
export default function Layout() {
  const restore = useAuth(state => state.restore);
  const palette = usePalette();
  useEffect(() => { void restore(); }, [restore]);
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><StatusBar style={palette.dark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background }, animation: 'slide_from_right' }} /><UpdatePrompt /></QueryClientProvider></SafeAreaProvider>;
}
