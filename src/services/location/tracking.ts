import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { PermissionsAndroid, Platform } from 'react-native';
import { driverApi } from '@/api/routes';
import type { LocationPoint } from '@/api/types';
import { ApiError } from '@/api/client';

const TASK = 'driver-location';
const QUEUE = 'pending-driver-location';
type Point = Omit<LocationPoint, 'id' | 'busId' | 'sessionId' | 'receivedAt'>;
let sending: Promise<void> | null = null;
let latestFix: Location.LocationObject | null = null;
let retryAt = 0;
let retryCount = 0;

function valid(location: Location.LocationObject): Point | null {
  const { coords, timestamp } = location;
  if (coords.accuracy == null || coords.accuracy < 0 || coords.accuracy > 100 || Date.now() - timestamp > 120000 || timestamp > Date.now() + 30000) return null;
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, speed: coords.speed == null || coords.speed < 0 || coords.speed > 45 ? null : coords.speed, heading: coords.heading == null || coords.heading < 0 || coords.heading > 360 ? null : coords.heading, altitude: coords.altitude, recordedAt: new Date(timestamp).toISOString() };
}

async function flush() {
  if (Date.now() < retryAt) return;
  const raw = await AsyncStorage.getItem(QUEUE);
  if (!raw) return;
  const point = JSON.parse(raw) as Point;
  if (Date.now() - Date.parse(point.recordedAt) > 110000) { await AsyncStorage.removeItem(QUEUE); return; }
  try {
    await driverApi.location(point);
    if (await AsyncStorage.getItem(QUEUE) === raw) await AsyncStorage.removeItem(QUEUE);
    retryCount = 0;
    retryAt = 0;
  } catch (error) {
    if (error instanceof ApiError && error.status > 0 && error.status !== 429) {
      await AsyncStorage.removeItem(QUEUE);
    } else {
      retryAt = Date.now() + Math.min(30000, 1000 * 2 ** Math.min(retryCount++, 5));
    }
  }
}

async function processLocations(locations: Location.LocationObject[]) {
  if (sending) await sending;
  sending = (async () => {
    const current = locations.at(-1);
    if (current) {
      latestFix = current;
      const point = valid(current);
      if (point) await AsyncStorage.setItem(QUEUE, JSON.stringify(point));
    }
    await flush();
  })().finally(() => { sending = null; });
  await sending;
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (!error && data?.locations?.length) await processLocations(data.locations);
});

export function getLatestFix() { return latestFix; }
export async function requestTrackingPermissions() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('정확한 위치 권한이 필요합니다.');
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) throw new Error('백그라운드 위치 권한이 필요합니다. 앱 설정에서 항상 허용을 선택해 주세요.');
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}
export async function ensureTracking(busName: string, askPermission: boolean) {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) return;
  if (askPermission) await requestTrackingPermissions();
  else {
    const [foreground, background] = await Promise.all([Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync()]);
    if (!foreground.granted || !background.granted) throw new Error('위치 권한이 필요합니다.');
  }
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0, deferredUpdatesInterval: 0, activityType: Location.ActivityType.AutomotiveNavigation, pausesUpdatesAutomatically: false,
    foregroundService: { notificationTitle: '버스 위치 공유 중', notificationBody: `${busName}의 실시간 위치를 전송하고 있습니다.`, notificationColor: '#FFC21A', killServiceOnDestroy: false },
  });
}
export async function stopTracking() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  await AsyncStorage.removeItem(QUEUE);
}
export async function retryQueuedLocation() { await flush(); }
