import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BusIcon, useSmoothHeading } from '@/components/bus-icon';
import { usePalette } from '@/theme/ui';

type Coordinate = { latitude: number; longitude: number };

// Driver's own map: panning is disabled and the camera re-centers on every fix, so the driver always stays in the middle.
export function DriverMap({ latitude, longitude, heading, height = 280 }: { latitude?: number; longitude?: number; heading?: number | null; height?: number }) {
  const palette = usePalette();
  const map = useRef<MapView>(null);
  const rotation = useSmoothHeading(heading != null && heading >= 0 ? heading : null);
  const center = (next: Coordinate) => map.current?.animateCamera({ center: next }, { duration: 600 });
  useEffect(() => { if (latitude != null && longitude != null) map.current?.animateCamera({ center: { latitude, longitude } }, { duration: 600 }); }, [latitude, longitude]);
  if (!process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) return <View style={[styles.box, styles.missing, { height, backgroundColor: palette.sunken }]}><Text style={{ color: palette.muted, fontWeight: '600' }}>Google Maps API 키가 필요합니다.</Text></View>;
  return <View style={[styles.box, { height, backgroundColor: palette.sunken }]}>
    <MapView
      ref={map}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      showsUserLocation={latitude == null}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      scrollEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      initialRegion={{ latitude: latitude ?? 37.5665, longitude: longitude ?? 126.978, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      onUserLocationChange={event => { const value = event.nativeEvent.coordinate; if (value) center({ latitude: value.latitude, longitude: value.longitude }); }}
>
      {latitude != null && longitude != null && <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 0.5 }} flat rotation={rotation} tracksViewChanges><BusIcon size={48} /></Marker>}
    </MapView>
  </View>;
}

const styles = StyleSheet.create({
  box: { borderRadius: 22, overflow: 'hidden' },
  missing: { alignItems: 'center', justifyContent: 'center' },
});
