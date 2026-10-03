import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { BusFront, Plus } from 'lucide-react-native';
import { adminApi } from '@/api/routes';
import { useAuth } from '@/stores/auth';
import { Button, Card, Chip, Empty, Input, Label, Row, Screen, usePalette } from '@/theme/ui';

export default function Buses() {
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const client = useQueryClient();
  const palette = usePalette();
  const buses = useQuery({ queryKey: ['admin-buses'], queryFn: adminApi.buses, enabled: user?.role === 'ADMIN' });
  const drivers = useQuery({ queryKey: ['admin-drivers'], queryFn: adminApi.drivers, enabled: user?.role === 'ADMIN' });
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); await Promise.all([client.invalidateQueries({ queryKey: ['admin-buses'] }), client.invalidateQueries({ queryKey: ['admin-drivers'] })]); }
    catch (error) { Alert.alert('처리 실패', error instanceof Error ? error.message : '서버와 통신할 수 없습니다.'); }
    finally { setBusy(false); }
  }
  const freeDrivers = drivers.data?.filter(driver => !driver.bus) ?? [];
  return <Screen title="버스 관리" subtitle={`등록된 버스 ${buses.data?.length ?? 0}대`}>
    <Card tone="sunken">
      <Input label="새 버스" placeholder="버스 이름 (예: 1호차)" value={name} onChangeText={setName} />
      <Button title="버스 추가" accent icon={<Plus size={16} color={palette.accentText} />} busy={busy} disabled={!name.trim()} onPress={() => void mutate(async () => { await adminApi.createBus(name.trim()); setName(''); })} />
    </Card>

    {buses.data?.map(bus => <Card key={bus.id}>
      <Row gap={12}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: bus.driver ? palette.accent : palette.sunken, alignItems: 'center', justifyContent: 'center' }}><BusFront size={20} color={bus.driver ? palette.accentText : palette.muted} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{bus.name}</Text>
          <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>담당 기사 · {bus.driver?.username ?? '미배정'}</Text>
        </View>
      </Row>

      {editing === bus.id
        ? <View style={{ gap: 8 }}>
          <Input value={editedName} onChangeText={setEditedName} autoFocus />
          <Row><View style={{ flex: 1 }}><Button compact secondary title="취소" onPress={() => setEditing(null)} /></View><View style={{ flex: 1 }}><Button compact title="저장" busy={busy} disabled={!editedName.trim()} onPress={() => void mutate(async () => { await adminApi.editBus(bus.id, editedName.trim()); setEditing(null); })} /></View></Row>
        </View>
        : null}

      {!bus.driver && freeDrivers.length > 0 && <View style={{ gap: 8 }}>
        <Label small muted>기사 배정</Label>
        <Row style={{ flexWrap: 'wrap' }}>{freeDrivers.map(driver => <Chip key={driver.id} title={`+ ${driver.username}`} active={false} onPress={() => { if (!busy) void mutate(() => adminApi.assign(bus.id, driver.id)); }} />)}</Row>
      </View>}

      <Row style={{ flexWrap: 'wrap' }}>
        {editing !== bus.id && <Button compact secondary title="이름 변경" disabled={busy} onPress={() => { setEditing(bus.id); setEditedName(bus.name); }} />}
        {bus.driver && <Button compact secondary title="배정 해제" busy={busy} onPress={() => void mutate(() => adminApi.unassign(bus.id))} />}
        <View style={{ flex: 1 }} />
        <Button compact danger title="삭제" disabled={busy} onPress={() => Alert.alert('버스 삭제', `${bus.name}을 삭제하시겠습니까?`, [{ text: '취소' }, { text: '삭제', style: 'destructive', onPress: () => void mutate(() => adminApi.deleteBus(bus.id)) }])} />
      </Row>
    </Card>)}
    {buses.data?.length === 0 && <Empty text="등록된 버스가 없습니다." />}
    {buses.error && <Empty text="버스 목록을 불러오지 못했습니다." />}
  </Screen>;
}
