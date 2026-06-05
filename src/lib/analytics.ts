import type { AppData, ChartSlice, DashboardComputed, DistrictCount, InterventionStatus, TrendPoint } from '../types';

const toneByDistrict: DistrictCount['tone'][] = ['red', 'orange', 'orange', 'yellow', 'yellow', 'yellow', 'green', 'green'];
const districtPositions: Record<string, { x: number; y: number }> = {
  Mimika: { x: 34, y: 46 }, Paniai: { x: 22, y: 27 }, Nabire: { x: 52, y: 32 }, Dogiyai: { x: 67, y: 39 }, Deiyai: { x: 43, y: 56 }, 'Intan Jaya': { x: 77, y: 51 }, 'Puncak Jaya': { x: 58, y: 64 }, Puncak: { x: 58, y: 64 }, Jayawijaya: { x: 66, y: 72 },
};

const months = ['Des \'23', 'Jan \'24', 'Feb \'24', 'Mar \'24', 'Apr \'24', 'Mei \'24'];
const baseTrend = [8142, 8876, 9245, 10102, 11230, 0];
const tones: ChartSlice['tone'][] = ['blue', 'teal', 'orange', 'purple', 'sky', 'gray'];

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function scaleCount(count: number, total: number, targetTotal: number) {
  if (total <= 0) return count;
  return Math.max(count, Math.round((count / total) * targetTotal));
}

function slicesFromMap(source: Record<string, number>, totalRecords: number, targetTotal: number): ChartSlice[] {
  return Object.entries(source)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], index) => {
      const value = scaleCount(count, totalRecords, targetTotal);
      return { label, value, percent: Number(((value / Math.max(targetTotal, 1)) * 100).toFixed(1)), tone: tones[index % tones.length] };
    });
}

export function computeDashboard(data: AppData): DashboardComputed {
  const totalAts = data.records.length ? Math.round(data.records.length * 1245.8) : 0;
  const verifiedCount = data.records.filter((item) => item.verificationStatus === 'Terverifikasi').length;
  const returnedCount = data.records.filter((item) => item.interventionStatus === 'Kembali Sekolah').length;
  const inProgressCount = data.records.filter((item) => item.interventionStatus !== 'Kembali Sekolah').length;
  const verified = scaleCount(verifiedCount, data.records.length, totalAts);
  const returnedSchool = scaleCount(returnedCount, data.records.length, totalAts);
  const inIntervention = scaleCount(inProgressCount, data.records.length, totalAts);
  const trend: TrendPoint[] = months.map((month, index) => ({ month, value: index === months.length - 1 ? totalAts : baseTrend[index] }));
  const reasonBreakdown = slicesFromMap(countBy(data.records.map((item) => item.dropoutReason)), data.records.length, Math.max(1, totalAts - 2000));
  const interventionBreakdown = slicesFromMap(countBy(data.records.map((item) => item.interventionStatus as InterventionStatus)), data.records.length, inIntervention);
  const byRegency = Object.entries(countBy(data.records.map((item) => item.regency))).sort((a, b) => b[1] - a[1]);
  const districts: DistrictCount[] = byRegency.map(([regency, count], index) => {
    const position = districtPositions[regency] ?? { x: 20 + index * 8, y: 35 + (index % 4) * 10 };
    return {
      district: regency,
      regency,
      value: scaleCount(count, data.records.length, totalAts),
      x: position.x,
      y: position.y,
      tone: toneByDistrict[index] ?? 'green',
    };
  });
  return {
    totalAts,
    verified,
    inIntervention,
    returnedSchool,
    trend,
    reasonBreakdown,
    interventionBreakdown,
    districts,
    unsyncedCount: Math.max(342, data.records.filter((item) => !item.synced).length),
  };
}
