import type { ExpoConfig } from 'expo/config';
import packageJson from './package.json';

const config: ExpoConfig = {
  name: 'Bus Tracker', slug: 'bus-tracker-app', version: packageJson.version,
  orientation: 'portrait', scheme: 'bustrackerapp', userInterfaceStyle: 'automatic',
  icon: './assets/images/bus-tracker-icon.png',
  android: {
    package: 'com.kkeunhee09.bustrackerapp', versionCode: 4,
    permissions: ['INTERNET', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_LOCATION', 'POST_NOTIFICATIONS', 'REQUEST_INSTALL_PACKAGES'],
    adaptiveIcon: { backgroundColor: '#FFC21A', foregroundImage: './assets/images/bus-tracker-foreground.png', monochromeImage: './assets/images/bus-tracker-foreground.png' },
  },
  plugins: ['expo-router', 'expo-secure-store', ['expo-location', { isAndroidBackgroundLocationEnabled: true, isAndroidForegroundServiceEnabled: true }], ['react-native-maps', { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' }]],
  extra: { eas: { projectId: '3ee3bf32-476e-4065-afa1-dbeb7e994108' } },
  experiments: { typedRoutes: true },
};
export default config;
