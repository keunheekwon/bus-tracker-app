import { useEffect, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { BusFront, ChevronRight, History, Map, ScrollText, Users } from 'lucide-react-native';
import { adminApi, publicApi } from '@/api/routes';
import { useAuth } from '@/stores/auth';
import { Button, Card, Label, Row, Screen, Stat, StatusTag, usePalette } from '@/theme/ui';

function MenuItem({ icon, title, subtitle, href }: { icon: ReactNode; title: string; subtitle: string; href: Href }) {
  const palette = usePalette();
  return <Pressable onPress={() => router.push(href)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}>
    <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: palette.sunken, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
    <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{title}</Text><Text style={{ color: palette.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text></View>
    <ChevronRight size={18} color={palette.muted} />
  </Pressable>;
}

export default function Admin() {
  const palette = usePalette();
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const logout = useAuth(state => state.logout);
  const live = useQuery({ queryKey: ['admin-live'], queryFn: adminApi.live, enabled: user?.role === 'ADMIN', refetchInterval: 15000 });
  const health = useQuery({ queryKey: ['health'], queryFn: publicApi.health, refetchInterval: 60000 });
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  const buses = live.data ?? [];
  const ok = (value?: string) => value === 'ok';
  const serviceTag = (value?: string) => <StatusTag text={value ?? '확인 중'} tone={!value ? 'neutral' : ok(value) ? 'success' : 'danger'} />;
  const icon = (node: (color: string) => ReactNode) => node(palette.text);
  return <Screen title="관리자" subtitle="운행 현황과 계정을 관리합니다." back={false}>
    <Row>
      <Stat accent value={buses.filter(bus => bus.status === 'RUNNING').length} label="운행 중" />
      <Stat value={buses.filter(bus => bus.locationStatus === 'ONLINE').length} label="위치 정상" />
      <Stat value={buses.filter(bus => bus.status === 'RUNNING' && bus.locationStatus === 'OFFLINE').length} label="위치 끊김" />
    </Row>
    <Button title="실시간 운행 지도" icon={<Map size={16} color={palette.inkText} />} onPress={() => router.push('/admin/live')} />
    <Card style={{ paddingVertical: 6 }}>
      <MenuItem href="/admin/buses" title="버스 관리" subtitle="버스 등록·이름 변경·기사 배정" icon={icon(color => <BusFront size={20} color={color} />)} />
      <MenuItem href="/admin/drivers" title="기사 관리" subtitle="기사 계정 생성·수정" icon={icon(color => <Users size={20} color={color} />)} />
      <MenuItem href="/admin/sessions" title="운행 기록" subtitle="지난 운행 조회와 경로 재생" icon={icon(color => <History size={20} color={color} />)} />
      <MenuItem href="/admin/audit" title="감사 기록" subtitle="관리 작업 이력" icon={icon(color => <ScrollText size={20} color={color} />)} />
    </Card>
    <Card>
      <Label small muted>서버 상태</Label>
      <Row style={{ justifyContent: 'space-between' }}><Label>API</Label>{serviceTag(health.data?.status)}</Row>
      <Row style={{ justifyContent: 'space-between' }}><Label>Database</Label>{serviceTag(health.data?.database)}</Row>
      <Row style={{ justifyContent: 'space-between' }}><Label>Redis</Label>{serviceTag(health.data?.redis)}</Row>
    </Card>
    <Button title="로그아웃" secondary onPress={() => void logout().then(() => router.replace('/'))} />
  </Screen>;
}
