import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Slider from '@react-native-community/slider';
import { Pressable, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import { adminApi } from '@/api/routes';
import type { LocationPoint } from '@/api/types';
import { SpeedChart } from '@/components/speed-chart';
import { interpolate } from '@/features/replay/replay';
import { useAuth } from '@/stores/auth';
import { Card, Empty, KeyValue, Label, Row, Screen, usePalette } from '@/theme/ui';
import { dateText, speedText, timeText } from '@/utils/format';

const rates = [0.5, 1, 2, 4, 8];
const emptyPoints: LocationPoint[] = [];
const speedColors = { slow: '#12A36A', mid: '#2F7CF6', fast: '#F26B1D' };
async function allLocations(id: string): Promise<LocationPoint[]> {
  const points: LocationPoint[] = [];
  for (let page = 1; page <= 100; page++) {
    const response = await adminApi.locations(id, page);
    points.push(...response.items);
    if (!response.hasMore) return points;
  }
  throw new Error('위치 기록이 너무 많습니다. 기간을 나누어 조회해야 합니다.');
}
export default function SessionReplay() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const id = params.sessionId;
  const palette = usePalette();
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const detail = useQuery({ queryKey: ['session', id], queryFn: () => adminApi.session(id), enabled: !!id && user?.role === 'ADMIN' });
  const history = useQuery({ queryKey: ['locations', id], queryFn: () => allLocations(id), enabled: !!id && user?.role === 'ADMIN' });
  const points = history.data ?? emptyPoints;
  const start = points.length ? Date.parse(points[0].recordedAt) : 0;
  const end = points.length ? Date.parse(points[points.length - 1].recordedAt) : 0;
  const [at, setAt] = useState(0);
  const effectiveAt = at || start;
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  useEffect(() => {
    if (!playing || !end) return;
    const timer = setInterval(() => setAt(current => { const next = (current || start) + 100 * rate; if (next >= end) { setPlaying(false); return end; } return next; }), 100);
    return () => clearInterval(timer);
  }, [playing, rate, start, end]);
  const current = useMemo(() => interpolate(points, effectiveAt), [points, effectiveAt]);
  const coordinates = points.map(point => ({ latitude: point.latitude, longitude: point.longitude }));
  const segments = useMemo(() => {
    const result: { color: string; coordinates: { latitude: number; longitude: number }[] }[] = [];
    for (let index = 1; index < points.length; index++) {
      const speed = (points[index].speed ?? 0) * 3.6;
      const color = speed < 15 ? speedColors.slow : speed < 40 ? speedColors.mid : speedColors.fast;
      const first = points[index - 1];
      const second = points[index];
      const last = result[result.length - 1];
      if (last?.color === color) last.coordinates.push({ latitude: second.latitude, longitude: second.longitude });
      else result.push({ color, coordinates: [{ latitude: first.latitude, longitude: first.longitude }, { latitude: second.latitude, longitude: second.longitude }] });
    }
    return result;
  }, [points]);
  const session = detail.data;
  const control = (onPress: () => void, icon: ReactNode, primary = false) => <Pressable onPress={onPress} style={({ pressed }) => ({ width: primary ? 60 : 44, height: primary ? 60 : 44, borderRadius: 30, backgroundColor: primary ? palette.accent : palette.sunken, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>{icon}</Pressable>;
  const legend = (color: string, text: string) => <Row gap={6}><View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: color }} /><Text style={{ color: palette.muted, fontSize: 11, fontWeight: '600' }}>{text}</Text></Row>;

  return <Screen title={session?.busName ?? '운행 상세'} subtitle={session ? `${dateText(session.startedAt)} → ${dateText(session.endedAt)}` : undefined}>
    {session && <>
      <Row>
        <KeyValue label="거리" value={`${(session.distanceMeters / 1000).toFixed(2)} km`} />
        <KeyValue label="운행 시간" value={`${Math.round(session.durationSeconds / 60)}분`} />
        <KeyValue label="기사" value={session.driverUsername} />
      </Row>
      <Row>
        <KeyValue label="평균 / 최고" value={`${speedText(session.averageSpeed)} / ${speedText(session.maxSpeed)}`} />
        <KeyValue label="이동 / 정차" value={`${Math.round(session.movingSeconds / 60)}분 / ${Math.round(session.stoppedSeconds / 60)}분`} />
      </Row>
      <Label small muted>GPS {session.gpsRecordCount}개 · 연결 공백 {session.gpsDisconnectionCount}회 · 최대 {session.longestGpsGapSeconds}초</Label>
    </>}

    {history.isLoading && <Empty text="경로를 불러오는 중..." />}
    {history.error && <Empty text="경로를 불러오지 못했습니다." />}

    {current && <>
      {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        ? <View style={{ height: 360, borderRadius: 24, overflow: 'hidden' }}><MapView provider={PROVIDER_GOOGLE} style={{ flex: 1 }} initialRegion={{ latitude: current.latitude, longitude: current.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}>
          {segments.map((segment, index) => <Polyline key={index} coordinates={segment.coordinates} strokeColor={segment.color} strokeWidth={5} />)}
          <Marker coordinate={coordinates[0]} title="시작" pinColor={palette.success} />
          <Marker coordinate={coordinates[coordinates.length - 1]} title="종료" pinColor={palette.danger} />
          <Marker coordinate={{ latitude: current.latitude, longitude: current.longitude }} title="재생 위치" anchor={{ x: 0.5, y: 0.5 }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: palette.accent, borderWidth: 3, borderColor: '#16181D' }} /></Marker>
        </MapView></View>
        : <Card tone="sunken"><Label muted>Google Maps API 키를 설정한 뒤 앱을 다시 빌드해 주세요.</Label></Card>}
      <Row gap={14} style={{ justifyContent: 'center' }}>{legend(speedColors.slow, '15 km/h 미만')}{legend(speedColors.mid, '15~40')}{legend(speedColors.fast, '40 이상')}</Row>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: palette.text, fontSize: 28, fontWeight: '800', letterSpacing: -1 }}>{timeText(current.recordedAt)}</Text>
          <Pressable onPress={() => setRate(value => rates[(rates.indexOf(value) + 1) % rates.length])} style={{ backgroundColor: palette.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}><Text style={{ color: palette.inkText, fontWeight: '800' }}>{rate}x</Text></Pressable>
        </Row>
        <SpeedChart points={points} at={effectiveAt} seek={setAt} />
        <Slider minimumValue={start} maximumValue={end} value={effectiveAt} onValueChange={setAt} minimumTrackTintColor={palette.text} maximumTrackTintColor={palette.line} thumbTintColor={palette.accent} />
        <Row gap={18} style={{ justifyContent: 'center' }}>
          {control(() => { setPlaying(false); setAt(start); }, <SkipBack size={18} color={palette.text} />)}
          {control(() => { if (effectiveAt >= end) setAt(start); setPlaying(value => !value); }, playing ? <Pause size={24} color={palette.accentText} fill={palette.accentText} /> : <Play size={24} color={palette.accentText} fill={palette.accentText} />, true)}
          {control(() => { setPlaying(false); setAt(end); }, <SkipForward size={18} color={palette.text} />)}
        </Row>
        <Row>
          <KeyValue label="속도" value={speedText(current.speed)} />
          <KeyValue label="방향" value={current.heading == null ? '-' : `${Math.round(current.heading)}°`} />
          <KeyValue label="정확도" value={`±${current.accuracy.toFixed(1)}m`} />
        </Row>
      </Card>
    </>}
  </Screen>;
}
