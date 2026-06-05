export const formatNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value);

export const compactNumber = (value: number) => new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value);

export function maskNik(value: string) {
  const clean = value.replace(/\D/g, '');
  if (clean.length < 8 || value.includes('*')) return value;
  return `${clean.slice(0, 6)}********${clean.slice(-4)}`;
}

export function todayId() {
  return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function downloadTextFile(filename: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
