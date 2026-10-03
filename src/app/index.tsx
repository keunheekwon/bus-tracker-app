import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserRound } from 'lucide-react-native';
import { publicApi } from '@/api/routes';
import type { Bus } from '@/api/types';
import { LiveMap } from '@/components/live-map';
import { subscribeLive } from '@/services/socket/live';
import { useAuth } from '@/stores/auth';
import { usePalette } from '@/theme/ui';

export default function Home() {
  const palette = usePalette();
  const user = useAuth(state => state.user);
  const queryClient = useQueryClient();
  const { data: initial, isLoading, error, refetch } = useQuery({ queryKey: ['public-buses'], queryFn: publicApi.buses, refetchInterval: 30000 });
  const [live, setLive] = useState<Record<string, Partial<Bus>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  useEffect(() => subscribeLive({
    location: event => setLive(current => {
      const existing = current[event.busId]?.location ?? queryClient.getQueryData<Bus[]>(['public-buses'])?.find(bus => bus.id === event.busId && bus.status === 'RUNNING')?.location;
      const speedAge = existing ? Date.parse(event.updatedAt) - Date.parse(existing.recordedAt) : Infinity;
      const recentSpeed = speedAge >= 0 && speedAge <= 10000 ? existing?.speed ?? null : null;
      return { ...current, [event.busId]: { status: 'RUNNING', locationStatus: 'ONLINE', updatedAt: event.updatedAt, location: { latitude: event.latitude, longitude: event.longitude, speed: event.speed ?? recentSpeed, heading: event.heading, accuracy: event.accuracy, altitude: null, recordedAt: event.updatedAt } } };
    }),
    status: event => { setLive(current => ({ ...current, [event.busId]: { status: event.status, locationStatus: 'OFFLINE', location: null, updatedAt: event.updatedAt } })); void queryClient.invalidateQueries({ queryKey: ['public-buses'] }); },
    connection: setConnected,
  }), [queryClient]);
  const buses = (initial ?? []).map(bus => {
    const event = live[bus.id];
    return event && Date.parse(event.updatedAt ?? '') > Date.parse(bus.updatedAt ?? '') ? { ...bus, ...event } : bus;
  });
  const running = buses.filter(bus => bus.status === 'RUNNING').length;
  const accountLabel = user ? user.role === 'ADMIN' ? '관리자' : '기사' : '로그인';

  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <LiveMap buses={buses} selectedId={selected} onSelect={setSelected} showCurrentLocation topInset={110} />
    <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
      <View style={styles.topRow} pointerEvents="box-none">
        <View style={[styles.brand, { backgroundColor: palette.ink }]}>
          <Image source={require('../../assets/images/bus-tracker-icon.png')} style={styles.brandMark} />
          <Text style={[styles.brandText, { color: palette.inkText }]}>Bus Tracker</Text>
        </View>
        <Pressable onPress={() => router.push(user ? user.role === 'ADMIN' ? '/admin' : '/driver' : '/auth/login')} style={[styles.account, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <UserRound size={16} color={palette.text} /><Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }}>{accountLabel}</Text>
        </Pressable>
      </View>
      <View style={[styles.status, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <View style={[styles.dot, { backgroundColor: connected ? palette.success : palette.warning }]} />
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }}>{connected ? `운행 중 ${running}대` : '재연결 중...'}</Text>
        <Text style={{ color: palette.muted, fontSize: 13 }}>· 전체 {buses.length}대</Text>
        {isLoading && <ActivityIndicator size="small" color={palette.text} />}
        {error && <Pressable onPress={() => void refetch()} style={[styles.retry, { backgroundColor: palette.danger }]}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>다시 시도</Text></Pressable>}
      </View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, gap: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, paddingVertical: 6, borderRadius: 999 },
  brandMark: { width: 30, height: 30, borderRadius: 9 },
  brandText: { fontWeight: '800', fontSize: 15, letterSpacing: -0.3 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  retry: { marginLeft: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
