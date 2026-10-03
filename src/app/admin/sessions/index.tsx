import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { adminApi } from '@/api/routes';
import { useAuth } from '@/stores/auth';
import { Button, Card, Chip, Empty, Input, Label, Pager, Row, Screen, usePalette } from '@/theme/ui';
import { dateText } from '@/utils/format';

export default function Sessions() {
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const palette = usePalette();
  const [page, setPage] = useState(1);
  const [busId, setBusId] = useState<string | undefined>();
  const [driverId, setDriverId] = useState<string | undefined>();
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({});
  const sessions = useQuery({ queryKey: ['sessions', page, busId, driverId, dates], queryFn: () => adminApi.sessions({ page, busId, driverId, ...dates }), enabled: user?.role === 'ADMIN' });
  const buses = useQuery({ queryKey: ['admin-buses'], queryFn: adminApi.buses, enabled: user?.role === 'ADMIN' });
  const drivers = useQuery({ queryKey: ['admin-drivers'], queryFn: adminApi.drivers, enabled: user?.role === 'ADMIN' });
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  function applyDates() {
    const valid = (value: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (!valid(fromInput) || !valid(toInput)) return;
    setDates({ dateFrom: fromInput ? new Date(`${fromInput}T00:00:00+09:00`).toISOString() : undefined, dateTo: toInput ? new Date(`${toInput}T23:59:59+09:00`).toISOString() : undefined });
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil((sessions.data?.total ?? 0) / (sessions.data?.limit ?? 20)));
  return <Screen title="운행 기록" subtitle={`총 ${sessions.data?.total ?? 0}건`}>
    <Card tone="sunken">
      <Label small muted>기간 (한국 시간)</Label>
      <Row>
        <View style={{ flex: 1 }}><Input placeholder="YYYY-MM-DD" value={fromInput} onChangeText={setFromInput} /></View>
        <Text style={{ color: palette.muted }}>~</Text>
        <View style={{ flex: 1 }}><Input placeholder="YYYY-MM-DD" value={toInput} onChangeText={setToInput} /></View>
      </Row>
      <Button compact title="기간 적용" onPress={applyDates} />
      <Label small muted>버스</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip title="전체" active={!busId} onPress={() => { setBusId(undefined); setPage(1); }} />
        {buses.data?.map(bus => <Chip key={bus.id} title={bus.name} active={busId === bus.id} onPress={() => { setBusId(bus.id); setPage(1); }} />)}
      </ScrollView>
      <Label small muted>기사</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip title="전체" active={!driverId} onPress={() => { setDriverId(undefined); setPage(1); }} />
        {drivers.data?.map(driver => <Chip key={driver.id} title={driver.username} active={driverId === driver.id} onPress={() => { setDriverId(driver.id); setPage(1); }} />)}
      </ScrollView>
    </Card>

    {sessions.data?.items.map(session => <Pressable key={session.id} onPress={() => router.push({ pathname: '/admin/sessions/[sessionId]', params: { sessionId: session.id } })} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card>
        <Row gap={12}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{session.busName}</Text>
            <Text style={{ color: palette.muted, fontSize: 13 }}>{dateText(session.startedAt)} · {session.driverUsername}</Text>
          </View>
          <ChevronRight size={18} color={palette.muted} />
        </Row>
        <Row>
          <View style={{ backgroundColor: palette.sunken, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }}>{(session.distanceMeters / 1000).toFixed(1)} km</Text></View>
          <View style={{ backgroundColor: palette.sunken, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }}>평균 {Math.round(session.averageSpeed * 3.6)} km/h</Text></View>
          {!session.endedAt && <View style={{ backgroundColor: palette.accent, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ color: palette.accentText, fontWeight: '800', fontSize: 13 }}>운행 중</Text></View>}
        </Row>
      </Card>
    </Pressable>)}
    {sessions.data?.items.length === 0 && <Empty text="운행 기록이 없습니다." />}
    {sessions.error && <Empty text="운행 기록을 불러오지 못했습니다." />}
    <Pager page={page} pages={pages} onPrev={() => setPage(value => value - 1)} onNext={() => setPage(value => value + 1)} />
  </Screen>;
}
