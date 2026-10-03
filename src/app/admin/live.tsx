import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { adminApi } from '@/api/routes';
import type { Bus } from '@/api/types';
import { LiveMap } from '@/components/live-map';
import { subscribeLive } from '@/services/socket/live';
import { useAuth } from '@/stores/auth';
import { Button, usePalette } from '@/theme/ui';

export default function AdminLive() {
  const palette = usePalette();
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const client = useQueryClient();
  const live = useQuery({ queryKey: ['admin-live'], queryFn: adminApi.live, enabled: user?.role === 'ADMIN', refetchInterval: 30000 });
  const [events, setEvents] = useState<Record<string, Partial<Bus>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  useEffect(() => subscribeLive({
    location: event => setEvents(current => {
      const existing = current[event.busId]?.location ?? client.getQueryData<Bus[]>(['admin-live'])?.find(bus => bus.id === event.busId && bus.status === 'RUNNING')?.location;
      const speedAge = existing ? Date.parse(event.updatedAt) - Date.parse(existing.recordedAt) : Infinity;
      const recentSpeed = speedAge >= 0 && speedAge <= 10000 ? existing?.speed ?? null : null;
      return { ...current, [event.busId]: { status: 'RUNNING', locationStatus: 'ONLINE', updatedAt: event.updatedAt, location: { latitude: event.latitude, longitude: event.longitude, speed: event.speed ?? recentSpeed, heading: event.heading, accuracy: event.accuracy, altitude: null, recordedAt: event.updatedAt } } };
    }),
    status: event => { setEvents(current => ({ ...current, [event.busId]: { status: event.status, locationStatus: 'OFFLINE', location: null, updatedAt: event.updatedAt } })); void client.invalidateQueries({ queryKey: ['admin-live'] }); },
    connection: () => {},
  }), [client]);
  const buses = (live.data ?? []).map(bus => {
    const event = events[bus.id];
    return event && Date.parse(event.updatedAt ?? '') > Date.parse(bus.updatedAt ?? '') ? { ...bus, ...event } : bus;
  });
  const selectedBus = buses.find(bus => bus.id === selected);
  async function forceStop(id: string) {
    setBusy(true);
    try { await adminApi.forceStop(id); await client.invalidateQueries({ queryKey: ['admin-live'] }); await client.invalidateQueries({ queryKey: ['public-buses'] }); setEvents(current => { const next = { ...current }; delete next[id]; return next; }); }
    catch (error) { Alert.alert('종료 실패', error instanceof Error ? error.message : '서버와 통신할 수 없습니다.'); }
    finally { setBusy(false); }
  }
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <LiveMap buses={buses} selectedId={selected} onSelect={setSelected} admin />
    <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
      <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.card, borderColor: palette.line }]}><ChevronLeft size={20} color={palette.text} /></Pressable>
      <View style={[styles.title, { backgroundColor: palette.ink }]}><Text style={{ color: palette.inkText, fontWeight: '800' }}>실시간 운행 · {buses.filter(bus => bus.status === 'RUNNING').length}대</Text></View>
      <View style={{ flex: 1 }} />
      {selectedBus?.status === 'RUNNING' && <Button compact title="강제 종료" danger busy={busy} onPress={() => Alert.alert('강제 운행 종료', `${selectedBus.name} 운행을 종료하시겠습니까?`, [{ text: '취소', style: 'cancel' }, { text: '종료', style: 'destructive', onPress: () => void forceStop(selectedBus.id) }])} />}
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999 },
});
