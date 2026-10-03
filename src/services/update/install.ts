import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import type { Update } from '@/api/types';

export async function downloadAndInstall(update: Update, progress: (value: number) => void) {
  if (Platform.OS !== 'android' || !update.download?.url) throw new Error('APK를 설치할 수 없습니다.');
  const url = new URL(update.download.url);
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !/^bus-tracker-v\d+\.\d+\.\d+\.apk$/.test(update.download.fileName)) throw new Error('업데이트 주소가 유효하지 않습니다.');
  const destination = `${FileSystem.cacheDirectory}${update.download.fileName}`;
  const task = FileSystem.createDownloadResumable(url.toString(), destination, {}, event => {
    if (event.totalBytesExpectedToWrite > 0) progress(event.totalBytesWritten / event.totalBytesExpectedToWrite);
  });
  const file = await task.downloadAsync();
  if (!file?.uri) throw new Error('APK 다운로드에 실패했습니다.');
  const contentUri = await FileSystem.getContentUriAsync(file.uri);
  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, type: 'application/vnd.android.package-archive', flags: 1 });
  } catch {
    await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', { data: `package:${Application.applicationId}` });
    throw new Error('이 출처의 앱 설치를 허용한 뒤 다시 시도해 주세요.');
  }
}
