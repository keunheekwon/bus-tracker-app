import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { adminApi } from '@/api/routes';
import { useAuth } from '@/stores/auth';
import { Button, Card, Empty, Input, Label, Row, Screen, usePalette } from '@/theme/ui';

export default function Drivers() {
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const client = useQueryClient();
  const palette = usePalette();
  const drivers = useQuery({ queryKey: ['admin-drivers'], queryFn: adminApi.drivers, enabled: user?.role === 'ADMIN' });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); await client.invalidateQueries({ queryKey: ['admin-drivers'] }); setUsername(''); setPassword(''); setEditing(null); }
    catch (error) { Alert.alert('처리 실패', error instanceof Error ? error.message : '서버와 통신할 수 없습니다.'); }
    finally { setBusy(false); }
  }
  const invalid = !username.trim() || (!editing && password.length < 12) || (password.length > 0 && password.length < 12);
  return <Screen title="기사 관리" subtitle={`등록된 기사 ${drivers.data?.length ?? 0}명`}>
    <Card tone="sunken">
      <Label small muted>{editing ? '기사 정보 수정' : '새 기사 등록'}</Label>
      <Input label="아이디" placeholder="아이디" autoCapitalize="none" value={username} onChangeText={setUsername} />
      <Input label="비밀번호" placeholder={editing ? '변경할 때만 입력' : '12자 이상'} secureTextEntry value={password} onChangeText={setPassword} />
      <Row>
        {editing && <View style={{ flex: 1 }}><Button title="취소" secondary onPress={() => { setEditing(null); setUsername(''); setPassword(''); }} /></View>}
        <View style={{ flex: 1 }}><Button title={editing ? '수정 저장' : '기사 등록'} accent busy={busy} disabled={invalid} onPress={() => void mutate(() => editing ? adminApi.editDriver(editing, { username: username.trim(), ...(password ? { password } : {}) }) : adminApi.createDriver(username.trim(), password))} /></View>
      </Row>
    </Card>

    {drivers.data?.map(driver => <Card key={driver.id} style={editing === driver.id ? { borderColor: palette.ink, borderWidth: 2 } : undefined}>
      <Row gap={12}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: palette.inkText, fontWeight: '800', fontSize: 16 }}>{driver.username.slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '800' }}>{driver.username}</Text>
          <Text style={{ color: palette.muted, fontSize: 13, marginTop: 2 }}>배정 버스 · {driver.bus?.name ?? '없음'}</Text>
        </View>
      </Row>
      <Row>
        <Button compact secondary title="수정" onPress={() => { setEditing(driver.id); setUsername(driver.username); setPassword(''); }} />
        <View style={{ flex: 1 }} />
        <Button compact danger title="삭제" disabled={busy} onPress={() => Alert.alert('기사 삭제', `${driver.username} 계정을 삭제하시겠습니까?`, [{ text: '취소' }, { text: '삭제', style: 'destructive', onPress: () => void mutate(() => adminApi.deleteDriver(driver.id)) }])} />
      </Row>
    </Card>)}
    {drivers.data?.length === 0 && <Empty text="등록된 기사가 없습니다." />}
    {drivers.error && <Empty text="기사 목록을 불러오지 못했습니다." />}
  </Screen>;
}
