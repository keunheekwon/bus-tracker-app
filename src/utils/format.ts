export const dateText = (value: string | null) => value ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '기록 없음';
export const timeText = (value: string | null) => value ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)) : '-';
export const speedText = (metersPerSecond: number | null | undefined) => metersPerSecond == null ? '-' : `${Math.round(metersPerSecond * 3.6)} km/h`;
export const agoText = (value: string | null) => { if (!value) return '기록 없음'; const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000)); return seconds < 60 ? `${seconds}초 전` : `${Math.floor(seconds / 60)}분 전`; };
