import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { BusFront } from 'lucide-react-native';
import { useAuth } from '@/stores/auth';
import { Button, Card, Input, Screen, usePalette } from '@/theme/ui';

export default function Login() {
  const palette = usePalette();
  const login = useAuth(state => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!username.trim() || !password) return;
    setBusy(true);
    try { const user = await login(username.trim(), password); router.replace(user.role === 'ADMIN' ? '/admin' : '/driver'); }
    catch (error) { Alert.alert('로그인 실패', error instanceof Error ? error.message : '로그인할 수 없습니다.'); }
    finally { setBusy(false); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <View style={{ gap: 16, marginTop: 24, marginBottom: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}><BusFront size={28} color={palette.accentText} /></View>
      <Text style={{ color: palette.text, fontSize: 32, fontWeight: '800', letterSpacing: -1.2, lineHeight: 38 }}>{'다시 오신 걸\n환영합니다'}</Text>
      <Text style={{ color: palette.muted, fontSize: 15 }}>기사 또는 관리자 계정으로 로그인하세요.</Text>
    </View>
    <Card>
      <Input label="아이디" autoCapitalize="none" autoCorrect={false} placeholder="아이디 입력" value={username} onChangeText={setUsername} returnKeyType="next" />
      <Input label="비밀번호" secureTextEntry placeholder="비밀번호 입력" value={password} onChangeText={setPassword} returnKeyType="go" onSubmitEditing={() => void submit()} />
      <View style={{ height: 4 }} />
      <Button title="로그인" accent onPress={() => void submit()} busy={busy} disabled={!username || !password} />
    </Card>
    <Button title="로그인 없이 지도 보기" secondary onPress={() => router.replace('/')} />
  </Screen></KeyboardAvoidingView>;
}
