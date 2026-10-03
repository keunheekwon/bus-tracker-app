import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

type Coordinate = { latitude: number; longitude: number };
type Status = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable';

export function useViewerLocation(enabled: boolean) {
  const mounted = useRef(false);
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [granted, setGranted] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const readPosition = useCallback(async (): Promise<Coordinate | null> => {
    let cached: Coordinate | null = null;
    try {
      setStatus('locating');
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (lastKnown) {
        cached = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        if (mounted.current) setCoordinate(cached);
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const fresh = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      if (mounted.current) {
        setCoordinate(fresh);
        setStatus('ready');
      }
      return fresh;
    } catch {
      if (mounted.current) setStatus(cached ? 'ready' : 'unavailable');
      return cached;
    }
  }, []);

  const locate = useCallback(async (): Promise<Coordinate | null> => {
    if (!enabled) return null;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return null;
      setGranted(permission.granted);
      if (!permission.granted) {
        setStatus('denied');
        return null;
      }
      return readPosition();
    } catch {
      if (mounted.current) setStatus('unavailable');
      return null;
    }
  }, [enabled, readPosition]);

  useEffect(() => {
    if (!enabled) return;
    void Location.requestForegroundPermissionsAsync().then(permission => {
      if (!mounted.current) return;
      setGranted(permission.granted);
      if (permission.granted) void readPosition();
      else setStatus('denied');
    }).catch(() => { if (mounted.current) setStatus('unavailable'); });
  }, [enabled, readPosition]);

  return { coordinate, granted, status, locate };
}
