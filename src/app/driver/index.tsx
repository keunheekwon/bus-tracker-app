import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AppState, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LogOut, Map, Play, Square } from 'lucide-react-native';
import { driverApi, publicApi } from '@/api/routes';
import { DriverMap } from '@/components/driver-map';
import { ensureTracking, getLatestFix, retryQueuedLocation, stopTracking } from '@/services/location/tracking';
import { useAuth } from '@/stores/auth';
import { Button, Card, Eyebrow, KeyValue, Label, Row, Screen, StatusTag, usePalette } from '@/theme/ui';
import { dateText, speedText } from '@/utils/format';

export default function Driver() {
  const palette = usePalette();
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const logout = useAuth(state => state.logout);
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['driver-me'], queryFn: driverApi.me, enabled: user?.role === 'DRIVER' });
  const current = useQuery({ queryKey: ['driver-session'], queryFn: driverApi.current, enabled: user?.role === 'DRIVER', refetchInterval: 15000 });
  const busId = profile.data?.bus?.id;
  const busPosition = useQuery({ queryKey: ['public-bus', busId], queryFn: () => publicApi.bus(busId!), enabled: !!busId && !!current.data?.session, refetchInterval: 3000 });
  const refreshCurrent = current.refetch;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);
  const session = current.data?.session;
  useEffect(() => { if (ready && user?.role !== 'DRIVER') router.replace('/'); }, [ready, user]);
  useEffect(() => {
    if (!session || !profile.data?.bus) return;
    void ensureTracking(profile.data.bus.name, false).catch(error => setMessage(error instanceof Error ? error.message : '위치 공유를 다시 시작할 수 없습니다.'));
  }, [session, profile.data?.bus]);
  useEffect(() => {
    if (current.isSuccess && !session) void stopTracking();
  }, [current.isSuccess, session]);
  useEffect(() => {
    const app = AppState.addEventListener('change', state => { if (state === 'active') { void refreshCurrent(); void retryQueuedLocation(); } });
    const network = NetInfo.addEventListener(state => { if (state.isConnected) void retryQueuedLocation(); });
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => { app.remove(); network(); clearInterval(timer); };
  }, [refreshCurrent]);
  async function start() {
    setBusy(true); setMessage('');
    try {
      await driverApi.start();
      await queryClient.invalidateQueries({ queryKey: ['driver-session'] });
      try { await ensureTracking(profile.data?.bus?.name ?? '버스', true); }
      catch (error) { setMessage(error instanceof Error ? error.message : '위치 권한이 필요합니다.'); }
    } catch (error) { Alert.alert('운행 시작 실패', error instanceof Error ? error.message : '서버와 통신할 수 없습니다.'); }
    finally { setBusy(false); }
  }
  async function stop() {
    setBusy(true); setMessage('');
    try {
      await stopTracking();
      await driverApi.stop();
      await queryClient.invalidateQueries({ queryKey: ['driver-session'] });
      setMessage('운행을 종료했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '운행을 종료할 수 없습니다.');
      if (session && profile.data?.bus) void ensureTracking(profile.data.bus.name, false).catch(() => {});
    } finally { setBusy(false); }
  }
  const fix = getLatestFix();
  const serverSpeed = busPosition.data?.status === 'RUNNING' ? busPosition.data.location?.speed : null;
  const localSpeed = fix && tick > 0 && tick - fix.timestamp < 10000 ? fix.coords.speed : null;
  const currentSpeed = busPosition.data?.locationStatus === 'ONLINE' ? serverSpeed ?? localSpeed : localSpeed;
  const displayedSpeed = currentSpeed ?? serverSpeed;
  const heroText = session ? palette.accentText : palette.inkText;
  return <Screen title="기사 대시보드" subtitle={`${profile.data?.username ?? user?.username ?? ''} 기사님`} back={false}>
    <Card tone={session ? 'accent' : 'ink'} style={{ padding: 22, gap: 18 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow color={session ? '#1A1500AA' : palette.accent}>{session ? 'ON DUTY' : 'OFF DUTY'}</Eyebrow>
        <Text style={{ color: heroText, fontSize: 30, fontWeight: '800', letterSpacing: -1 }}>{profile.data?.bus?.name ?? '할당된 버스 없음'}</Text>
        <Text style={{ color: heroText, opacity: 0.7, fontSize: 14, fontWeight: '600' }}>{session ? `운행 시작 ${dateText(session.startedAt)}` : '운행을 시작하면 위치가 실시간으로 공유됩니다.'}</Text>
      </View>
      {session
        ? <Button title="운행 종료" danger busy={busy} icon={<Square size={16} color="#fff" fill="#fff" />} onPress={() => Alert.alert('운행 종료', '운행을 종료하시겠습니까?', [{ text: '취소', style: 'cancel' }, { text: '운행 종료', style: 'destructive', onPress: () => void stop() }])} />
        : <Button title="운행 시작" accent busy={busy} disabled={!profile.data?.bus} icon={<Play size={16} color={palette.accentText} fill={palette.accentText} />} onPress={() => void start()} />}
    </Card>

    <DriverMap latitude={fix?.coords.latitude} longitude={fix?.coords.longitude} heading={fix?.coords.heading} />

    {session && <Card>
      <Row style={{ justifyContent: 'space-between' }}><Label small muted>실시간 GPS</Label><StatusTag text="위치 공유 중" tone="success" /></Row>
      <Row>
        <KeyValue label={currentSpeed == null && serverSpeed != null ? '마지막 기록 속도' : '현재 속도'} value={speedText(displayedSpeed)} />
        <KeyValue label="GPS 정확도" value={fix?.coords.accuracy == null ? '-' : `±${fix.coords.accuracy.toFixed(1)}m`} />
      </Row>
    </Card>}

    {message ? <Card tone="sunken"><Label>{message}</Label></Card> : null}

    <Button title="실시간 지도" secondary icon={<Map size={16} color={palette.text} />} onPress={() => router.push('/')} />
    <Button title="로그아웃" secondary disabled={!!session} icon={<LogOut size={16} color={palette.text} />} onPress={() => void logout().then(() => router.replace('/'))} />
    {session && <Label small muted>로그아웃하려면 먼저 운행을 종료해 주세요.</Label>}
  </Screen>;
}
