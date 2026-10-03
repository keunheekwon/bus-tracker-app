import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Crosshair, LocateFixed, X } from 'lucide-react-native';
import { BusIcon, useSmoothHeading } from '@/components/bus-icon';
import type { Bus, LocationPoint } from '@/api/types';
import { useViewerLocation } from '@/features/map/use-viewer-location';
import { agoText, speedText } from '@/utils/format';
import { Button, Eyebrow, KeyValue, Row, StatusTag, usePalette, type Tone } from '@/theme/ui';

export function busState(bus: Bus): { text: string; tone: Tone } {
  if (bus.status !== 'RUNNING') return { text: '운행 대기', tone: 'neutral' };
  if (bus.locationStatus === 'OFFLINE') return { text: '위치 연결 끊김', tone: 'danger' };
  if (bus.locationStatus === 'STALE') return { text: '위치 지연', tone: 'warning' };
  return { text: '운행 중', tone: 'success' };
}

function BusMarker({ bus, selected, select }: { bus: Bus; selected: boolean; select: () => void }) {
  const point = bus.location;
  const [coordinate, setCoordinate] = useState({ latitude: point?.latitude ?? 0, longitude: point?.longitude ?? 0 });
  const previous = useRef<LocationPoint | null>(point);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (!point) return;
    const old = previous.current;
    previous.current = point;
    if (!old || Math.abs(point.latitude - old.latitude) + Math.abs(point.longitude - old.longitude) > 0.01) {
      setCoordinate({ latitude: point.latitude, longitude: point.longitude });
    } else if (old.latitude !== point.latitude || old.longitude !== point.longitude) {
      const started = Date.now();
      const animate = () => {
        const fraction = Math.min(1, (Date.now() - started) / 900);
        setCoordinate({ latitude: old.latitude + (point.latitude - old.latitude) * fraction, longitude: old.longitude + (point.longitude - old.longitude) * fraction });
        if (fraction < 1) frame.current = requestAnimationFrame(animate);
      };
      frame.current = requestAnimationFrame(animate);
    }
    return () => { if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [point]);
  const rotation = useSmoothHeading(point?.heading);
  if (!point) return null;
  return <>
    <Marker coordinate={coordinate} onPress={select} flat rotation={rotation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges zIndex={selected ? 11 : 2}>
      <BusIcon size={selected ? 46 : 40} body={selected ? '#FFC21A' : '#FFFFFF'} />
    </Marker>
    <Marker coordinate={coordinate} onPress={select} anchor={{ x: 0.5, y: -0.9 }} tracksViewChanges zIndex={selected ? 10 : 1}>
      <View collapsable={false} style={[styles.marker, { backgroundColor: selected ? '#FFC21A' : '#16181D' }]}>
        <Text numberOfLines={1} style={[styles.markerText, { color: selected ? '#1A1500' : '#FFFFFF' }]}>{bus.name}</Text>
      </View>
    </Marker>
  </>;
}

export function LiveMap({ buses, selectedId, onSelect, height, admin = false, showCurrentLocation = false, topInset = 0 }: { buses: Bus[]; selectedId: string | null; onSelect: (id: string | null) => void; height?: number; admin?: boolean; showCurrentLocation?: boolean; topInset?: number }) {
  const palette = usePalette();
  const map = useRef<MapView>(null);
  const centered = useRef(false);
  const centeredOnFreshLocation = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const follow = followId !== null && followId === selectedId;
  const followRef = useRef(false);
  const setFollow = (on: boolean) => { followRef.current = on; setFollowId(on ? selectedId : null); };
  const resetNorth = useCallback(async () => {
    const camera = await map.current?.getCamera();
    if (camera && !followRef.current && Math.abs(camera.heading ?? 0) > 0.5) map.current?.setCamera({ ...camera, heading: 0 });
  }, []);
  const viewer = useViewerLocation(showCurrentLocation);
  const selected = buses.find(bus => bus.id === selectedId);
  const points = useMemo(() => buses.map(bus => bus.location).filter((point): point is LocationPoint => point !== null), [buses]);
  const initial = points[0];
  const selectedLocation = selected?.location;
  // While following, the map turns so the bus's direction of travel points up.
  const [lastHeading, setLastHeading] = useState(0);
  const followHeading = selectedLocation?.heading ?? null;
  if (follow && followHeading != null && followHeading !== lastHeading) setLastHeading(followHeading);
  const mapHeading = follow ? followHeading ?? lastHeading : 0;
  useEffect(() => {
    if (follow && selectedLocation) map.current?.animateCamera({ center: { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }, heading: mapHeading }, { duration: 900 });
  }, [follow, selectedLocation, mapHeading]);
  useEffect(() => { followRef.current = follow; if (!follow && mapReady) void resetNorth(); }, [follow, mapReady, resetNorth]);
  useEffect(() => {
    if (!mapReady) return;
    if (showCurrentLocation && viewer.coordinate && (!centered.current || (viewer.status === 'ready' && !centeredOnFreshLocation.current))) {
      centered.current = true;
      if (viewer.status === 'ready') centeredOnFreshLocation.current = true;
      map.current?.animateToRegion({ ...viewer.coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
    } else if (!centered.current && (!showCurrentLocation || viewer.status === 'denied' || viewer.status === 'unavailable') && points.length) {
      centered.current = true;
      map.current?.fitToCoordinates(points.map(point => ({ latitude: point.latitude, longitude: point.longitude })), { edgePadding: { top: 90, right: 70, bottom: 200, left: 70 }, animated: false });
    }
  }, [mapReady, points, showCurrentLocation, viewer.coordinate, viewer.status]);
  async function recenter() {
    setFollow(false);
    const coordinate = await viewer.locate();
    if (coordinate) {
      map.current?.animateToRegion({ ...coordinate, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 500);
      centered.current = true;
      centeredOnFreshLocation.current = true;
    }
  }
  const notice = !showCurrentLocation ? '' : viewer.status === 'denied' ? '위치 권한을 허용하면 내 위치가 표시됩니다.' : viewer.status === 'unavailable' ? '현재 위치를 가져올 수 없습니다.' : '';
  const state = selected ? busState(selected) : null;
  return <View style={[styles.container, { backgroundColor: palette.sunken }, height === undefined ? styles.fill : { height }]}>
    {process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      ? <MapView ref={map} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} onMapReady={() => setMapReady(true)} onPanDrag={() => { if (followRef.current) setFollow(false); }} onRegionChangeComplete={() => { if (!followRef.current) void resetNorth(); }} showsUserLocation={showCurrentLocation && viewer.granted} showsMyLocationButton={false} toolbarEnabled={false} rotateEnabled={false} initialRegion={{ latitude: viewer.coordinate?.latitude ?? initial?.latitude ?? 37.5665, longitude: viewer.coordinate?.longitude ?? initial?.longitude ?? 126.978, latitudeDelta: 0.08, longitudeDelta: 0.08 }}>
        {buses.map(bus => <BusMarker key={bus.id} bus={bus} selected={bus.id === selectedId} select={() => onSelect(bus.id)} />)}
      </MapView>
      : <View style={styles.missing}><Text style={{ color: palette.muted, textAlign: 'center', fontWeight: '600' }}>{'Google Maps API 키를 설정한 뒤\n앱을 다시 빌드해 주세요.'}</Text></View>}

    {notice ? <View style={[styles.notice, { top: topInset + 12, backgroundColor: palette.ink }]}><Text style={{ color: palette.inkText, fontSize: 12, fontWeight: '700' }}>{notice}</Text></View> : null}

    {showCurrentLocation && <Pressable accessibilityLabel="현재 위치로 이동" disabled={viewer.status === 'locating'} onPress={() => void recenter()} style={[styles.fab, { top: topInset + (notice ? 56 : 12), backgroundColor: palette.card, opacity: viewer.status === 'locating' ? 0.6 : 1 }]}><LocateFixed size={20} color={palette.text} /></Pressable>}

    {selected && state && <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>SELECTED BUS</Eyebrow>
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 }}>{selected.name}</Text>
          <StatusTag {...state} />
        </View>
        <Pressable accessibilityLabel="선택 해제" onPress={() => onSelect(null)} style={[styles.close, { backgroundColor: palette.sunken }]}><X size={16} color={palette.text} /></Pressable>
      </Row>
      <Row>
        <KeyValue label={selected.locationStatus === 'ONLINE' ? '현재 속도' : '마지막 기록 속도'} value={speedText(selected.location?.speed)} />
        <KeyValue label="마지막 업데이트" value={agoText(selected.updatedAt)} />
      </Row>
      {(admin && selected.driver) || selected.location?.heading != null ? <Row>
        {admin && selected.driver ? <KeyValue label="기사" value={selected.driver.username} /> : null}
        {selected.location?.heading != null ? <KeyValue label="진행 방향" value={`${Math.round(selected.location.heading)}°`} /> : null}
      </Row> : null}
      <Button compact title={follow ? '버스 따라가는 중' : '버스 가운데 고정'} accent={follow} secondary={!follow} disabled={!selectedLocation} icon={<Crosshair size={16} color={follow ? palette.accentText : palette.text} />} onPress={() => setFollow(!follow)} />
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 24 },
  fill: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  marker: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1.5, borderColor: '#FFFFFF', maxWidth: 130 },
  markerText: { fontWeight: '800', fontSize: 11 },
  notice: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  fab: { position: 'absolute', right: 12, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
