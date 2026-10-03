import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { adminApi } from '@/api/routes';
import { useAuth } from '@/stores/auth';
import { Card, Empty, Pager, Screen, usePalette } from '@/theme/ui';
import { dateText } from '@/utils/format';

export default function AuditScreen() {
  const palette = usePalette();
  const user = useAuth(state => state.user);
  const ready = useAuth(state => state.ready);
  const [page, setPage] = useState(1);
  const audit = useQuery({ queryKey: ['audit', page], queryFn: () => adminApi.audit(page), enabled: user?.role === 'ADMIN' });
  useEffect(() => { if (ready && user?.role !== 'ADMIN') router.replace('/'); }, [ready, user]);
  const items = audit.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((audit.data?.total ?? 0) / (audit.data?.limit ?? 20)));
  return <Screen title="감사 기록" subtitle="관리자 작업 이력">
    {items.length > 0 && <Card style={{ paddingVertical: 8 }}>
      {items.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderColor: palette.line }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent, marginTop: 6 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>{item.action}</Text>
          <Text style={{ color: palette.muted, fontSize: 12 }} numberOfLines={1}>{item.targetType} · {item.targetId}</Text>
          <Text style={{ color: palette.muted, fontSize: 12 }}>{dateText(item.createdAt)}</Text>
        </View>
      </View>)}
    </Card>}
    {audit.data && !items.length && <Empty text="기록이 없습니다." />}
    {audit.error && <Empty text="감사 기록을 불러오지 못했습니다." />}
    <Pager page={page} pages={pages} onPrev={() => setPage(value => value - 1)} onNext={() => setPage(value => value + 1)} />
  </Screen>;
}
