import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { io } from 'socket.io-client';
import type { SocketLocation, SocketStatus } from '@/api/types';

export function subscribeLive(handlers: { location: (value: SocketLocation) => void; status: (value: SocketStatus) => void; connection: (connected: boolean) => void }) {
  const url = process.env.EXPO_PUBLIC_SOCKET_URL ?? process.env.EXPO_PUBLIC_API_URL;
  if (!url) return () => {};
  const socket = io(url, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000 });
  socket.on('bus:location', handlers.location);
  socket.on('bus:status', handlers.status);
  socket.on('connect', () => handlers.connection(true));
  socket.on('disconnect', () => handlers.connection(false));
  const app = AppState.addEventListener('change', state => { if (state === 'active') socket.connect(); else socket.disconnect(); });
  const network = NetInfo.addEventListener(state => { if (state.isConnected && AppState.currentState === 'active') socket.connect(); });
  return () => { app.remove(); network(); socket.removeAllListeners(); socket.disconnect(); };
}
