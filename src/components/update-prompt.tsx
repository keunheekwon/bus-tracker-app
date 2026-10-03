import { useEffect, useState } from 'react';
import { BackHandler, Modal, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { Download } from 'lucide-react-native';
import { publicApi } from '@/api/routes';
import { downloadAndInstall } from '@/services/update/install';
import { Button, Eyebrow, usePalette } from '@/theme/ui';

export function UpdatePrompt() {
  const palette = usePalette();
  const version = Application.nativeApplicationVersion ?? '1.0.0';
  const update = useQuery({ queryKey: ['app-update', version], queryFn: () => publicApi.update(version), staleTime: 300000 });
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const available = update.data?.updateAvailable && update.data.download;
  const forced = Boolean(update.data?.forceUpdate && available);
  useEffect(() => {
    if (!forced) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => listener.remove();
  }, [forced]);
  async function install() {
    if (!update.data) return;
    setBusy(true); setError('');
    try { await downloadAndInstall(update.data, setProgress); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '업데이트에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <Modal transparent animationType="slide" visible={Boolean(available && (forced || !dismissed))} onRequestClose={() => { if (!forced) setDismissed(true); }}>
    <View style={{ flex: 1, backgroundColor: '#000A', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: palette.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}><Download size={24} color={palette.accentText} /></View>
        <Eyebrow>VERSION {update.data?.latestVersion}</Eyebrow>
        <Text style={{ color: palette.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 }}>{forced ? '필수 업데이트가 있습니다' : '새 버전이 나왔어요'}</Text>
        <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>{update.data?.release?.notes ?? '최신 버전을 설치해 주세요.'}</Text>
        {busy && <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.sunken, overflow: 'hidden' }}><View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: palette.accent }} /></View>}
        {error ? <Text style={{ color: palette.danger, fontWeight: '600' }}>{error}</Text> : null}
        <Button title={busy ? `다운로드 중 ${Math.round(progress * 100)}%` : '지금 업데이트'} accent busy={busy} onPress={() => void install()} />
        {!forced && <Button title="나중에" secondary onPress={() => setDismissed(true)} />}
      </View>
    </View>
  </Modal>;
}
