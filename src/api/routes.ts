import { api, getRefreshToken } from './client';
import type { AdminBus, AdminDriver, Audit, Bus, LocationPoint, Page, Session, SessionDetail, Tokens, Update, User } from './types';

const prefix = '/api/v1';
const query = (values: Record<string, string | number | undefined>) => new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string | number] => entry[1] !== undefined).map(([key, value]) => [key, String(value)])).toString();
export const authApi = {
  login: (username: string, password: string) => api.post<Tokens>(`${prefix}/auth/login`, { username, password }, false),
  me: () => api.get<User>(`${prefix}/auth/me`),
  logout: async () => { const refreshToken = await getRefreshToken(); if (refreshToken) await api.post(`${prefix}/auth/logout`, { refreshToken }); },
};
export const publicApi = {
  buses: () => api.get<Bus[]>(`${prefix}/public/buses`, false),
  update: (version: string) => api.get<Update>(`${prefix}/public/app-update?${query({ platform: 'android', currentVersion: version })}`, false),
  health: () => api.get<{ status: string; database: string; redis: string }>('/health', false),
};
export const driverApi = {
  me: () => api.get<User>(`${prefix}/driver/me`),
  current: () => api.get<{ session: Session | null }>(`${prefix}/driver/current-session`),
  start: () => api.post<{ session: Session }>(`${prefix}/driver/start`),
  stop: () => api.post<{ session: Session }>(`${prefix}/driver/stop`),
  location: (point: Omit<LocationPoint, 'id' | 'busId' | 'sessionId' | 'receivedAt'>) => api.post<{ accepted: boolean; recordedAt: string }>(`${prefix}/driver/location`, point),
};
export const adminApi = {
  live: () => api.get<Bus[]>(`${prefix}/admin/live`),
  buses: () => api.get<AdminBus[]>(`${prefix}/admin/buses`),
  createBus: (name: string) => api.post<AdminBus>(`${prefix}/admin/buses`, { name }),
  editBus: (id: string, name: string) => api.patch<AdminBus>(`${prefix}/admin/buses/${id}`, { name }),
  deleteBus: (id: string) => api.delete(`${prefix}/admin/buses/${id}`),
  drivers: () => api.get<AdminDriver[]>(`${prefix}/admin/drivers`),
  createDriver: (username: string, password: string) => api.post<AdminDriver>(`${prefix}/admin/drivers`, { username, password }),
  editDriver: (id: string, body: { username?: string; password?: string }) => api.patch<AdminDriver>(`${prefix}/admin/drivers/${id}`, body),
  deleteDriver: (id: string) => api.delete(`${prefix}/admin/drivers/${id}`),
  assign: (busId: string, driverId: string) => api.put(`${prefix}/admin/buses/${busId}/driver/${driverId}`),
  unassign: (busId: string) => api.delete(`${prefix}/admin/buses/${busId}/driver`),
  forceStop: (busId: string) => api.post<{ session: Session }>(`${prefix}/admin/buses/${busId}/force-stop`),
  sessions: (params: { page: number; limit?: number; busId?: string; driverId?: string; dateFrom?: string; dateTo?: string }) => api.get<Page<Session>>(`${prefix}/admin/sessions?${query(params)}`),
  session: (id: string) => api.get<SessionDetail>(`${prefix}/admin/sessions/${id}`),
  locations: (id: string, page: number) => api.get<{ items: LocationPoint[]; hasMore: boolean }>(`${prefix}/admin/sessions/${id}/locations?${query({ page, limit: 1000 })}`),
  audit: (page: number) => api.get<Page<Audit>>(`${prefix}/admin/audit-logs?${query({ page, limit: 20 })}`),
};
