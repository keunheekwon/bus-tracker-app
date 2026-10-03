import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import type { LocationPoint } from '@/api/types';
import { Label, usePalette } from '@/theme/ui';

const HEIGHT = 110;

export function SpeedChart({ points, at, seek }: { points: LocationPoint[]; at: number; seek: (value: number) => void }) {
  const palette = usePalette();
  const [width, setWidth] = useState(320);
  if (points.length < 2) return <Label small muted>그래프를 그릴 위치 기록이 없습니다.</Label>;
  const start = Date.parse(points[0].recordedAt);
  const end = Date.parse(points[points.length - 1].recordedAt);
  const max = Math.max(1, ...points.map(point => point.speed ?? 0));
  const coords = points.map(point => [((Date.parse(point.recordedAt) - start) / (end - start)) * width, HEIGHT - 6 - ((point.speed ?? 0) / max) * (HEIGHT - 16)] as const);
  const route = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `0,${HEIGHT} ${route} ${width},${HEIGHT}`;
  const cursor = Math.max(0, Math.min(width, ((at - start) / (end - start)) * width));
  const nearest = coords.reduce((best, point) => Math.abs(point[0] - cursor) < Math.abs(best[0] - cursor) ? point : best, coords[0]);
  return <View style={{ gap: 6 }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Text style={{ color: palette.muted, fontSize: 12, fontWeight: '700' }}>속도 · 최고 {Math.round(max * 3.6)} km/h</Text>
    <Pressable onTouchEnd={event => seek(start + Math.max(0, Math.min(1, event.nativeEvent.locationX / width)) * (end - start))}>
      <Svg width={width} height={HEIGHT}>
        <Defs><LinearGradient id="speed" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={palette.accent} stopOpacity={0.55} /><Stop offset="1" stopColor={palette.accent} stopOpacity={0} /></LinearGradient></Defs>
        <Polygon points={area} fill="url(#speed)" />
        <Polyline points={route} fill="none" stroke={palette.text} strokeWidth={2} strokeLinejoin="round" />
        <Line x1={cursor} x2={cursor} y1={0} y2={HEIGHT} stroke={palette.text} strokeWidth={1} strokeDasharray="3 3" />
        <Circle cx={nearest[0]} cy={nearest[1]} r={5} fill={palette.accent} stroke={palette.text} strokeWidth={2} />
      </Svg>
    </Pressable>
  </View>;
}
