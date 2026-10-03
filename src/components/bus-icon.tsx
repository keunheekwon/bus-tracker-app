import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

// Animates a heading toward its target along the shortest arc (350° -> 10° turns +20°, not -340°).
// The result feeds a flat Marker's native `rotation` prop, which is measured from north and follows map rotation,
// so the bus front matches the direction of travel no matter how the camera is turned.
export function useSmoothHeading(target: number | null | undefined, duration = 800) {
  const [value, setValue] = useState(target ?? 0);
  const current = useRef(target ?? 0);
  useEffect(() => {
    if (target == null) return;
    const from = current.current;
    const to = from + (((target - from) % 360 + 540) % 360 - 180);
    const started = Date.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - started) / duration);
      const next = from + (to - from) * (1 - (1 - t) ** 3);
      current.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

// Top-down bus drawn with plain Views (react-native-svg inside Google Maps markers renders blank on Android).
// The front (windshield) faces up, i.e. north when the marker rotation is 0.
export function BusIcon({ size = 34, body = '#FFC21A', outline = '#16181D' }: { size?: number; body?: string; outline?: string }) {
  const height = Math.round(size * 0.8);
  const width = Math.round(height * 0.5);
  const unit = height / 40;
  const mirror = { position: 'absolute' as const, top: unit * 7, width: unit * 3, height: unit * 4, borderRadius: unit, backgroundColor: outline };
  const window = { width: width - unit * 10, height: unit * 6, borderRadius: unit * 1.5, backgroundColor: outline, opacity: 0.25 };
  return <View collapsable={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: width + unit * 6, height, alignItems: 'center' }}>
      <View style={[mirror, { left: 0 }]} />
      <View style={[mirror, { right: 0 }]} />
      <View style={{ width, height, borderRadius: unit * 5, backgroundColor: body, borderWidth: Math.max(1.5, unit * 2), borderColor: outline, alignItems: 'center', paddingTop: unit * 2, gap: unit * 3 }}>
        <View style={{ width: width - unit * 7, height: unit * 6, borderRadius: unit * 2, backgroundColor: outline }} />
        <View style={window} />
        <View style={window} />
      </View>
    </View>
  </View>;
}
