export type RouteKey = 'dashboard' | 'pendataan' | 'peta' | 'intervensi' | 'petugas' | 'laporan' | 'notifikasi' | 'pengguna' | 'pengaturan';
export type AtsStatus = 'Terverifikasi' | 'Belum Diverifikasi' | 'Perlu Revisi' | 'Duplikat' | 'Ditolak';
export type InterventionStatus = 'Identifikasi Awal' | 'Pendekatan Keluarga' | 'Proses Intervensi' | 'Rujukan Layanan' | 'Kembali Sekolah';
export type UserRole = 'Admin Provinsi' | 'Admin Kabupaten' | 'Petugas Lapangan' | 'Kepala Dinas' | 'Publik';
export type Gender = 'Laki-laki' | 'Perempuan';

export interface AtsRecord {
  id: string;
  name: string;
  nik: string;
  gender: Gender;
  birthDate: string;
  regency: string;
  district: string;
  village: string;
  lastEducation: string;
  lastClass: string;
  dropoutYear: number;
  dropoutReason: string;
  familyEconomic: string;
  parentName: string;
  contact: string;
  verificationStatus: AtsStatus;
  interventionStatus: InterventionStatus;
  officerName: string;
  createdAt: string;
  updatedAt?: string;
  synced: boolean;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface FieldOfficer {
  id: string;
  name: string;
  role: string;
  regency: string;
  district: string;
  phone: string;
  visits: number;
  verified: number;
  syncPending: number;
  status: 'Aktif' | 'Offline' | 'Cuti';
}

export interface FieldTask {
  id: string;
  title: string;
  location: string;
  atsCount: number;
  dueLabel: string;
  priority: 'Hari ini' | 'Besok' | '20 Mei' | 'Minggu ini';
  status: 'Aktif' | 'Selesai';
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  tone: 'warning' | 'danger' | 'info' | 'success';
  status: 'Unread' | 'Read' | 'Resolved';
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  wilayah: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface ChartSlice {
  label: string;
  value: number;
  percent?: number;
  tone: 'blue' | 'teal' | 'orange' | 'purple' | 'sky' | 'gray' | 'green' | 'red';
}

export interface TrendPoint {
  month: string;
  value: number;
}

export interface DistrictCount {
  district: string;
  regency: string;
  value: number;
  x: number;
  y: number;
  tone: 'green' | 'yellow' | 'orange' | 'red';
}

export interface AppData {
  records: AtsRecord[];
  officers: FieldOfficer[];
  tasks: FieldTask[];
  alerts: AlertItem[];
  users: AppUser[];
}

export interface DashboardComputed {
  totalAts: number;
  verified: number;
  inIntervention: number;
  returnedSchool: number;
  trend: TrendPoint[];
  reasonBreakdown: ChartSlice[];
  interventionBreakdown: ChartSlice[];
  districts: DistrictCount[];
  unsyncedCount: number;
}

export interface AppSession {
  name: string;
  email: string;
  role: UserRole;
  isDemo: boolean;
}
