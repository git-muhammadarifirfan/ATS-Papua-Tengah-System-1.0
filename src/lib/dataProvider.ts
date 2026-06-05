import type { AlertItem, AppData, AppSession, AppUser, AtsRecord, FieldOfficer, FieldTask } from '../types';
import { seedData } from './dummyData';
import { maskNik, uid } from './format';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const storageKey = 'ats-papua-tengah-demo-data-v3';
const sessionKey = 'ats-papua-tengah-demo-session-v3';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function readLocal(): AppData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {
    // Browser storage may be unavailable in private mode; fallback keeps app usable.
  }
  const initial = clone(seedData);
  writeLocal(initial);
  return initial;
}

function writeLocal(data: AppData) {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* ignore quota/browser restriction */ }
}

const rowToRecord = (row: Record<string, unknown>): AtsRecord => ({
  id: String(row.id),
  name: String(row.name ?? ''),
  nik: String(row.nik_masked ?? row.nik ?? ''),
  gender: (row.gender as AtsRecord['gender']) ?? 'Laki-laki',
  birthDate: String(row.birth_date ?? ''),
  regency: String(row.regency ?? ''),
  district: String(row.district ?? ''),
  village: String(row.village ?? ''),
  lastEducation: String(row.last_education ?? ''),
  lastClass: String(row.last_class ?? ''),
  dropoutYear: Number(row.dropout_year ?? 2024),
  dropoutReason: String(row.dropout_reason ?? ''),
  familyEconomic: String(row.family_economic ?? ''),
  parentName: String(row.parent_name ?? ''),
  contact: String(row.contact ?? ''),
  verificationStatus: (row.verification_status as AtsRecord['verificationStatus']) ?? 'Belum Diverifikasi',
  interventionStatus: (row.intervention_status as AtsRecord['interventionStatus']) ?? 'Identifikasi Awal',
  officerName: String(row.officer_name ?? ''),
  createdAt: String(row.created_at ?? new Date().toISOString()),
  updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  synced: Boolean(row.synced ?? true),
  latitude: row.latitude === null || row.latitude === undefined ? undefined : Number(row.latitude),
  longitude: row.longitude === null || row.longitude === undefined ? undefined : Number(row.longitude),
  notes: row.notes ? String(row.notes) : '',
});

const cleanUndefined = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;

const recordToRow = (record: Partial<AtsRecord>) => cleanUndefined({
  name: record.name,
  nik: record.nik,
  nik_masked: record.nik ? maskNik(record.nik) : undefined,
  gender: record.gender,
  birth_date: record.birthDate,
  regency: record.regency,
  district: record.district,
  village: record.village,
  last_education: record.lastEducation,
  last_class: record.lastClass,
  dropout_year: record.dropoutYear,
  dropout_reason: record.dropoutReason,
  family_economic: record.familyEconomic,
  parent_name: record.parentName,
  contact: record.contact,
  verification_status: record.verificationStatus,
  intervention_status: record.interventionStatus,
  officer_name: record.officerName,
  synced: record.synced,
  latitude: record.latitude,
  longitude: record.longitude,
  notes: record.notes,
});

export const authApi = {
  async getSession(): Promise<AppSession | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return null;
      const user = data.session.user;
      return {
        name: String(user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Admin'),
        email: user.email ?? '',
        role: (user.user_metadata?.role as AppSession['role']) ?? 'Admin Provinsi',
        isDemo: false,
      };
    }
    const raw = localStorage.getItem(sessionKey);
    return raw ? JSON.parse(raw) as AppSession : null;
  },
  async login(email: string, password: string): Promise<AppSession> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return {
        name: String(data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? 'Admin'),
        email: data.user.email ?? email,
        role: (data.user.user_metadata?.role as AppSession['role']) ?? 'Admin Provinsi',
        isDemo: false,
      };
    }
    const session: AppSession = { name: 'Yohanis Tabuni, S.Pd', email, role: 'Admin Provinsi', isDemo: true };
    localStorage.setItem(sessionKey, JSON.stringify(session));
    return session;
  },
  async register(name: string, email: string, password: string): Promise<AppSession> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role: 'Admin Provinsi' } } });
      if (error) throw new Error(error.message);
      return { name, email: data.user?.email ?? email, role: 'Admin Provinsi', isDemo: false };
    }
    const session: AppSession = { name, email, role: 'Admin Provinsi', isDemo: true };
    localStorage.setItem(sessionKey, JSON.stringify(session));
    return session;
  },
  async logout() {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    localStorage.removeItem(sessionKey);
  },
};

export const dataApi = {
  async load(): Promise<AppData> {
    if (!isSupabaseConfigured || !supabase) return readLocal();
    try {
      const [records, officers, tasks, alerts, users] = await Promise.all([
        supabase.from('ats_records').select('*').order('created_at', { ascending: false }),
        supabase.from('field_officers').select('*').order('name'),
        supabase.from('field_tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('app_users').select('*').order('name'),
      ]);
      if (records.error) throw records.error;
      const appData: AppData = {
        records: records.data?.length ? records.data.map(rowToRecord) : seedData.records,
        officers: officers.data?.length ? officers.data.map((o) => ({ id: o.id, name: o.name, role: o.role, regency: o.regency, district: o.district, phone: o.phone, visits: o.visits, verified: o.verified, syncPending: o.sync_pending, status: o.status })) as FieldOfficer[] : seedData.officers,
        tasks: tasks.data?.length ? tasks.data.map((t) => ({ id: t.id, title: t.title, location: t.location, atsCount: t.ats_count, dueLabel: t.due_label, priority: t.priority, status: t.status })) as FieldTask[] : seedData.tasks,
        alerts: alerts.data?.length ? alerts.data.map((a) => ({ id: a.id, title: a.title, message: a.message, timeLabel: a.time_label, tone: a.tone, status: a.status })) as AlertItem[] : seedData.alerts,
        users: users.data?.length ? users.data.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, wilayah: u.wilayah, status: u.status })) as AppUser[] : seedData.users,
      };
      writeLocal(appData);
      return appData;
    } catch {
      return readLocal();
    }
  },
  async createRecord(input: Partial<AtsRecord>): Promise<AtsRecord> {
    const record: AtsRecord = {
      id: uid('ats'), name: input.name ?? '', nik: maskNik(input.nik ?? ''), gender: input.gender ?? 'Laki-laki', birthDate: input.birthDate ?? '', regency: input.regency ?? '', district: input.district ?? '', village: input.village ?? '', lastEducation: input.lastEducation ?? '', lastClass: input.lastClass ?? '', dropoutYear: input.dropoutYear ?? new Date().getFullYear(), dropoutReason: input.dropoutReason ?? 'Faktor Ekonomi', familyEconomic: input.familyEconomic ?? '', parentName: input.parentName ?? '', contact: input.contact ?? '', verificationStatus: input.verificationStatus ?? 'Belum Diverifikasi', interventionStatus: input.interventionStatus ?? 'Identifikasi Awal', officerName: input.officerName ?? 'Belum diassign', createdAt: new Date().toISOString(), synced: isSupabaseConfigured,
      latitude: input.latitude, longitude: input.longitude, notes: input.notes ?? '',
    };
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('ats_records').insert(recordToRow(record)).select('*').single();
      if (!error && data) return rowToRecord(data);
    }
    const local = readLocal();
    local.records = [record, ...local.records];
    writeLocal(local);
    return record;
  },
  async updateRecord(id: string, patch: Partial<AtsRecord>): Promise<void> {
    if (isSupabaseConfigured && supabase) await supabase.from('ats_records').update(recordToRow({ ...patch, updatedAt: new Date().toISOString() })).eq('id', id);
    const local = readLocal();
    local.records = local.records.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    writeLocal(local);
  },
  async deleteRecord(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) await supabase.from('ats_records').delete().eq('id', id);
    const local = readLocal();
    local.records = local.records.filter((item) => item.id !== id);
    writeLocal(local);
  },
  async createOfficer(input: Omit<FieldOfficer, 'id'>): Promise<FieldOfficer> {
    const officer = { id: uid('ofc'), ...input };
    if (isSupabaseConfigured && supabase) await supabase.from('field_officers').insert({ name: officer.name, role: officer.role, regency: officer.regency, district: officer.district, phone: officer.phone, visits: officer.visits, verified: officer.verified, sync_pending: officer.syncPending, status: officer.status });
    const local = readLocal(); local.officers = [officer, ...local.officers]; writeLocal(local); return officer;
  },
  async updateTask(id: string, status: FieldTask['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) await supabase.from('field_tasks').update({ status }).eq('id', id);
    const local = readLocal(); local.tasks = local.tasks.map((task) => task.id === id ? { ...task, status } : task); writeLocal(local);
  },
  async updateAlert(id: string, status: AlertItem['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) await supabase.from('alerts').update({ status }).eq('id', id);
    const local = readLocal(); local.alerts = local.alerts.map((alert) => alert.id === id ? { ...alert, status } : alert); writeLocal(local);
  },
  async createUser(input: Omit<AppUser, 'id'>): Promise<AppUser> {
    const user = { id: uid('usr'), ...input };
    if (isSupabaseConfigured && supabase) await supabase.from('app_users').insert(user);
    const local = readLocal(); local.users = [user, ...local.users]; writeLocal(local); return user;
  },
  async toggleUserStatus(id: string, status: AppUser['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) await supabase.from('app_users').update({ status }).eq('id', id);
    const local = readLocal(); local.users = local.users.map((u) => u.id === id ? { ...u, status } : u); writeLocal(local);
  },
  async syncAll(): Promise<void> {
    const local = readLocal();
    local.records = local.records.map((record) => ({ ...record, synced: true }));
    local.officers = local.officers.map((officer) => ({ ...officer, syncPending: 0 }));
    writeLocal(local);
  },
};
