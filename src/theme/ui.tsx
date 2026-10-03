import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export function usePalette() {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    background: dark ? '#0F1013' : '#F3F1EA',
    card: dark ? '#181A1F' : '#FFFFFF',
    sunken: dark ? '#1F2228' : '#F7F6F1',
    text: dark ? '#F3F2EE' : '#16181D',
    muted: dark ? '#7F8590' : '#8A8F99',
    line: dark ? '#2A2D34' : '#E4E1D7',
    ink: dark ? '#F3F2EE' : '#16181D',
    inkText: dark ? '#16181D' : '#F3F1EA',
    accent: '#FFC21A',
    accentText: '#1A1500',
    primary: '#16181D',
    success: '#12A36A',
    warning: '#E08A00',
    danger: '#E2483D',
  };
}
export type Palette = ReturnType<typeof usePalette>;

export function Screen({ children, title, subtitle, back = true, right }: PropsWithChildren<{ title?: string; subtitle?: string; back?: boolean; right?: ReactNode }>) {
  const palette = usePalette();
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {(title || back) && <View style={styles.header}>
        {back && router.canGoBack() && <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.card, borderColor: palette.line }]}><ChevronLeft size={20} color={palette.text} /></Pressable>}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {title && <Text style={[styles.title, { color: palette.text }]}>{title}</Text>}
            {subtitle && <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      </View>}
      {children}
    </ScrollView>
  </SafeAreaView>;
}

export function Card({ children, tone = 'default', style }: PropsWithChildren<{ tone?: 'default' | 'ink' | 'accent' | 'sunken'; style?: ViewStyle }>) {
  const palette = usePalette();
  const backgroundColor = tone === 'ink' ? palette.ink : tone === 'accent' ? palette.accent : tone === 'sunken' ? palette.sunken : palette.card;
  return <View style={[styles.card, { backgroundColor, borderColor: tone === 'default' ? palette.line : 'transparent' }, style]}>{children}</View>;
}

export function Label({ children, title = false, muted = false, small = false, color }: PropsWithChildren<{ title?: boolean; muted?: boolean; small?: boolean; color?: string }>) {
  const palette = usePalette();
  return <Text style={{ color: color ?? (muted ? palette.muted : palette.text), fontSize: title ? 20 : small ? 12 : 15, fontWeight: title ? '800' : small ? '600' : '500', letterSpacing: title ? -0.5 : 0, lineHeight: title ? 26 : small ? 16 : 21 }}>{children}</Text>;
}

export function Eyebrow({ children, color }: PropsWithChildren<{ color?: string }>) {
  const palette = usePalette();
  return <Text style={{ color: color ?? palette.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>{children}</Text>;
}

export function Button({ title, onPress, busy = false, danger = false, secondary = false, accent = false, disabled = false, icon, compact = false }: { title: string; onPress: () => void; busy?: boolean; danger?: boolean; secondary?: boolean; accent?: boolean; disabled?: boolean; icon?: ReactNode; compact?: boolean }) {
  const palette = usePalette();
  const backgroundColor = secondary ? palette.card : danger ? palette.danger : accent ? palette.accent : palette.ink;
  const color = secondary ? palette.text : danger ? '#FFFFFF' : accent ? palette.accentText : palette.inkText;
  return <Pressable accessibilityRole="button" disabled={busy || disabled} onPress={onPress} style={({ pressed }) => [compact ? styles.buttonCompact : styles.button, { backgroundColor, borderColor: secondary ? palette.line : 'transparent', opacity: busy || disabled ? 0.45 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
    {busy ? <ActivityIndicator color={color} /> : <>{icon}<Text style={{ color, fontWeight: '700', fontSize: compact ? 13 : 15 }}>{title}</Text></>}
  </Pressable>;
}

export function Chip({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  const palette = usePalette();
  return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? palette.ink : palette.card, borderColor: active ? palette.ink : palette.line }]}><Text style={{ color: active ? palette.inkText : palette.text, fontWeight: '700', fontSize: 13 }}>{title}</Text></Pressable>;
}

export function Input({ label, ...props }: TextInputProps & { label?: string }) {
  const palette = usePalette();
  return <View style={{ gap: 6 }}>
    {label && <Text style={{ color: palette.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>}
    <TextInput placeholderTextColor={palette.muted} {...props} style={[styles.input, { color: palette.text, backgroundColor: palette.sunken, borderColor: palette.line }, props.style]} />
  </View>;
}

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';
export function StatusTag({ text, tone }: { text: string; tone: Tone }) {
  const palette = usePalette();
  const color = tone === 'success' ? palette.success : tone === 'warning' ? palette.warning : tone === 'danger' ? palette.danger : palette.muted;
  return <View style={styles.tag}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={{ color, fontSize: 12, fontWeight: '700' }}>{text}</Text></View>;
}

export function Stat({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  const palette = usePalette();
  return <View style={[styles.stat, { backgroundColor: accent ? palette.accent : palette.sunken }]}>
    <Text style={{ color: accent ? palette.accentText : palette.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 }}>{value}</Text>
    <Text style={{ color: accent ? '#1A1500AA' : palette.muted, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{label}</Text>
  </View>;
}

export function Row({ children, gap = 8, style }: PropsWithChildren<{ gap?: number; style?: ViewStyle }>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return <View style={[styles.kv, { backgroundColor: palette.sunken }]}><Text style={{ color: palette.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text><Text style={{ color: palette.text, fontSize: 15, fontWeight: '700', marginTop: 3 }}>{value}</Text></View>;
}

export function Pager({ page, pages, onPrev, onNext }: { page: number; pages: number; onPrev: () => void; onNext: () => void }) {
  const palette = usePalette();
  return <Row style={{ justifyContent: 'space-between' }}>
    <Button compact secondary title="이전" disabled={page <= 1} onPress={onPrev} />
    <Text style={{ color: palette.muted, fontWeight: '700' }}>{page} / {pages}</Text>
    <Button compact secondary title="다음" disabled={page >= pages} onPress={onNext} />
  </Row>;
}

export function Empty({ text }: { text: string }) {
  const palette = usePalette();
  return <View style={{ paddingVertical: 32, alignItems: 'center' }}><Text style={{ color: palette.muted, fontWeight: '600' }}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 14, paddingBottom: 56 },
  header: { gap: 14, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -1.2, lineHeight: 36 },
  subtitle: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  card: { borderRadius: 22, padding: 18, gap: 12, borderWidth: 1 },
  button: { minHeight: 52, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexDirection: 'row', gap: 8 },
  buttonCompact: { minHeight: 38, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stat: { flex: 1, borderRadius: 16, padding: 14 },
  kv: { flex: 1, borderRadius: 14, padding: 12 },
});
