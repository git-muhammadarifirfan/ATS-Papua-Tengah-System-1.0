import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AlertItem, AppData, AppSession, AppUser, AtsRecord, FieldOfficer, InterventionStatus, RouteKey, UserRole } from './types';
import { computeDashboard } from './lib/analytics';
import { authApi, dataApi } from './lib/dataProvider';
import { seedData } from './lib/dummyData';
import { downloadTextFile, formatNumber, maskNik, todayId, uid } from './lib/format';
import { isSupabaseConfigured } from './lib/supabaseClient';

const routeMeta: Record<RouteKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Monitoring dan pengelolaan data Anak Tidak Sekolah (ATS) di Papua Tengah' },
  pendataan: { title: 'Pendataan ATS', subtitle: 'Input, validasi, dan kelola profil anak tidak sekolah secara terstruktur' },
  peta: { title: 'Peta Sebaran', subtitle: 'Analisis sebaran ATS berdasarkan kabupaten, distrik, kampung, dan status intervensi' },
  intervensi: { title: 'Intervensi', subtitle: 'Pantau tindak lanjut, kunjungan keluarga, rujukan layanan, dan kembali sekolah' },
  petugas: { title: 'Petugas Lapangan', subtitle: 'Kelola penugasan, produktivitas, dan sinkronisasi data lapangan' },
  laporan: { title: 'Laporan', subtitle: 'Generate laporan PDF dan Excel untuk kebutuhan dinas dan pelaporan pusat' },
  notifikasi: { title: 'Notifikasi', subtitle: 'Peringatan duplikasi, data belum ditindaklanjuti, dan sinkronisasi pending' },
  pengguna: { title: 'Pengguna', subtitle: 'Manajemen akun, role, wilayah akses, dan status pengguna' },
  pengaturan: { title: 'Pengaturan', subtitle: 'Konfigurasi sistem, keamanan, sinkronisasi, dan integrasi data' },
};

const navItems: Array<{ key: RouteKey; label: string; icon: string; badge?: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'pendataan', label: 'Pendataan ATS', icon: 'form' },
  { key: 'peta', label: 'Peta Sebaran', icon: 'map' },
  { key: 'intervensi', label: 'Intervensi', icon: 'pin' },
  { key: 'petugas', label: 'Petugas Lapangan', icon: 'user-check' },
  { key: 'laporan', label: 'Laporan', icon: 'file' },
  { key: 'notifikasi', label: 'Notifikasi', icon: 'bell', badge: '12' },
  { key: 'pengguna', label: 'Pengguna', icon: 'users' },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'settings' },
];

const fields = {
  regency: ['Mimika', 'Nabire', 'Paniai', 'Dogiyai', 'Deiyai', 'Intan Jaya', 'Puncak Jaya'],
  district: ['Kuala Kencana', 'Nabire', 'Enarotali', 'Kamuu', 'Tigi', 'Sugapa', 'Mulia'],
  education: ['Tidak Sekolah', 'SD', 'SMP', 'SMA/SMK', 'Paket A', 'Paket B', 'Paket C'],
  reason: ['Faktor Ekonomi', 'Bekerja', 'Menikah', 'Jarak & Transportasi', 'Minat & Motivasi', 'Tidak Ada Sekolah'],
};

function routeFromHash(): RouteKey {
  const key = window.location.hash.replace('#', '') as RouteKey;
  return routeMeta[key] ? key : 'dashboard';
}

export default function App() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [route, setRoute] = useState<RouteKey>(routeFromHash);
  const [data, setData] = useState<AppData>(seedData);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const reload = async () => setData(await dataApi.load());

  useEffect(() => {
    async function boot() {
      const currentSession = await authApi.getSession();
      setSession(currentSession);
      setData(await dataApi.load());
      setLoading(false);
    }
    boot();
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    const handler = (event: Event) => notify((event as CustomEvent<string>).detail || 'Aksi berhasil diproses.');
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  const computed = useMemo(() => computeDashboard(data), [data]);
  const meta = routeMeta[route];

  async function handleLogin(email: string, password: string) {
    const result = await authApi.login(email, password);
    setSession(result);
    setData(await dataApi.load());
    notify('Login berhasil.');
  }

  async function handleRegister(name: string, email: string, password: string) {
    const result = await authApi.register(name, email, password);
    setSession(result);
    notify(isSupabaseConfigured ? 'Akun dibuat. Ikuti instruksi konfirmasi dari Supabase jika aktif.' : 'Akun lokal berhasil dibuat.');
  }

  async function handleLogout() {
    setConfirmLogout(true);
  }

  async function confirmLogoutAction() {
    await authApi.logout();
    setConfirmLogout(false);
    setSession(null);
    notify('Anda berhasil keluar dari sistem.');
  }

  function navigate(next: RouteKey) {
    window.location.hash = next;
    setRoute(next);
    setSidebarOpen(false);
  }

  if (loading) return <Splash />;
  if (!session) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} toast={toast} />;

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button className="mobile-backdrop" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} />
      <Sidebar current={route} navigate={navigate} computed={computed} alertsCount={data.alerts.filter((a) => a.status === 'Unread').length} />
      <main className="main-area">
        <Topbar meta={meta} search={globalSearch} setSearch={setGlobalSearch} session={session} logout={handleLogout} onMenuClick={() => setSidebarOpen(true)} alerts={data.alerts} />
        <div className="content-area">
          {route === 'dashboard' && <DashboardPage data={data} computed={computed} search={globalSearch} navigate={navigate} reload={reload} notify={notify} />}
          {route === 'pendataan' && <PendataanPage data={data} search={globalSearch} reload={reload} notify={notify} />}
          {route === 'peta' && <PetaPage data={data} computed={computed} search={globalSearch} notify={notify} reload={reload} />}
          {route === 'intervensi' && <IntervensiPage data={data} search={globalSearch} reload={reload} notify={notify} />}
          {route === 'petugas' && <PetugasPage data={data} reload={reload} notify={notify} />}
          {route === 'laporan' && <LaporanPage data={data} computed={computed} notify={notify} />}
          {route === 'notifikasi' && <NotifikasiPage data={data} reload={reload} notify={notify} />}
          {route === 'pengguna' && <PenggunaPage data={data} reload={reload} notify={notify} />}
          {route === 'pengaturan' && <PengaturanPage session={session} notify={notify} />}
        </div>
      </main>
      {toast && <Toast message={toast} />}
      {confirmLogout && <ConfirmModal tone="danger" title="Keluar dari sistem?" message="Sesi aktif akan ditutup dan Anda harus masuk kembali untuk mengakses dashboard." confirmLabel="Ya, keluar" cancelLabel="Batal" onConfirm={confirmLogoutAction} onCancel={() => setConfirmLogout(false)} />}
    </div>
  );
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-card simple-loader">
        <div className="brand">
          <img className="brand-emblem" src="/assets/papua-tengah-logo.png" alt="Logo" />
          <div><strong>Sistem ATS</strong><span>Papua Tengah</span></div>
        </div>
        <div className="loader-line" aria-hidden="true"><i /></div>
        <p>Memuat sistem...</p>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, onRegister, toast }: { onLogin: (email: string, password: string) => Promise<void>; onRegister: (name: string, email: string, password: string) => Promise<void>; toast: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister(name, email, password);
    } catch (err) {
      setError('Email belum terdaftar atau password tidak sesuai. Periksa kembali akun Anda.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen simple">
      <section className="login-card clean">
        <div className="brand login-brand"><img className="brand-emblem" src="/assets/papua-tengah-logo.png" alt="Logo Papua Tengah" /><div><strong>Sistem ATS</strong><span>Papua Tengah</span></div></div>
        <h1>{mode === 'login' ? 'Masuk Sistem' : 'Daftarkan Akun'}</h1>
        <p className="muted">Akses dashboard pendataan, peta sebaran, intervensi, dan laporan Anak Tidak Sekolah.</p>
        <form onSubmit={submit} className="form-grid one login-form">
          {mode === 'register' && <LabelInput label="Nama lengkap" value={name} onChange={setName} required />}
          <LabelInput label="Email" value={email} onChange={setEmail} type="email" required />
          <LabelInput label="Password" value={password} onChange={setPassword} type="password" required />
          {error && <div className="alert-inline danger">{error}</div>}
          <button className="primary-btn login-submit" disabled={busy}>{busy ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Akun'}</button>
        </form>
        <button className="link-btn full" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Daftarkan akun baru' : 'Kembali ke login'}</button>

      </section>
      {toast && <Toast message={toast} />}
    </div>
  );
}

function Sidebar({ current, navigate, computed, alertsCount }: { current: RouteKey; navigate: (key: RouteKey) => void; computed: ReturnType<typeof computeDashboard>; alertsCount: number }) {
  return (
    <aside className="sidebar">
      <div className="brand"><img className="brand-emblem" src="/assets/papua-tengah-logo.png" alt="Logo Papua Tengah" /><div><strong>Sistem ATS</strong><span>Papua Tengah</span></div></div>
      <nav className="nav-menu">
        {navItems.map((item) => { const badge = item.key === 'notifikasi' ? alertsCount : undefined; return <button key={item.key} className={`nav-item ${current === item.key ? 'active' : ''}`} onClick={() => navigate(item.key)}><Icon name={item.icon} /><span>{item.label}</span>{badge ? <em>{badge}</em> : null}</button>; })}
      </nav>
      <div className="sidebar-spacer" />
      <div className="field-mode-card">
        <div className="field-mode-head"><strong>Mode Lapangan</strong><span>Offline</span></div>
        <p>Terakhir sinkronisasi<br /><b>Hari ini, 08:45 WIT</b></p>
        <button onClick={() => window.dispatchEvent(new Event('sync-offline'))}>Sinkronisasi Sekarang <Icon name="refresh" /></button>
      </div>
      <div className="ministry-footer"><div className="ministry-seal">K</div><span>Kementerian Pendidikan, Kebudayaan,<br />Riset, dan Teknologi<br />Republik Indonesia</span></div>
      <small className="muted center">{computed.unsyncedCount} data lapangan pending</small>
    </aside>
  );
}

function Topbar({ meta, search, setSearch, session, logout, onMenuClick, alerts }: { meta: { title: string; subtitle: string }; search: string; setSearch: (value: string) => void; session: AppSession; logout: () => void; onMenuClick: () => void; alerts: AlertItem[] }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = alerts.filter((a) => a.status === 'Unread').length;
  const quickAlerts = alerts.filter((a) => a.status !== 'Resolved').slice(0, 4);
  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenuClick} aria-label="Buka menu"><span /><span /><span /></button>
      <div className="page-title"><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
      <div className="topbar-actions">
        <label className="search-box"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIK, wilayah, atau sekolah..." /><kbd>⌘ K</kbd></label>
        <button className="icon-btn" title="Sinkronisasi" onClick={() => window.dispatchEvent(new Event('sync-offline'))}><Icon name="cloud" /></button>
        <div className="notif-anchor">
          <button className="icon-btn badge-dot" data-count={unreadCount} title="Notifikasi" onClick={() => setNotifOpen((v) => !v)}><Icon name="bell" /></button>
          {notifOpen && <div className="notif-popover"><div className="notif-pop-head"><strong>Notifikasi</strong><button onClick={() => { setNotifOpen(false); window.location.hash = 'notifikasi'; }}>Lihat semua</button></div>{quickAlerts.map((alert) => <button key={alert.id} className={`notif-pop-item ${alert.tone}`} onClick={() => { setNotifOpen(false); window.location.hash = 'notifikasi'; }}><Icon name={alert.tone === 'danger' ? 'warning' : 'bell'} /><span><b>{alert.title}</b><small>{alert.message}</small></span></button>)}</div>}
        </div>
        <details className="profile-menu">
          <summary><span className="avatar">{(session.name || 'Admin').slice(0, 2).toUpperCase()}</span><span><strong>{session.name || 'Admin'}</strong><small>{session.role}</small></span><Icon name="chevron" /></summary>
          <button className="danger-text" onClick={logout}>Keluar</button>
        </details>
      </div>
    </header>
  );
}

function FilterBar({ regency, setRegency, district, setDistrict }: { regency: string; setRegency: (value: string) => void; district: string; setDistrict: (value: string) => void }) {
  const [panel, setPanel] = useState<'date' | 'advanced' | null>(null);
  return (
    <>
      <div className="filter-row">
        <SelectChip icon="pin" value={regency} onChange={setRegency} options={['Semua Kabupaten', ...fields.regency]} />
        <SelectChip icon="building" value={district} onChange={setDistrict} options={['Semua Distrik', ...fields.district]} />
        <SelectChip icon="map" value="Semua Kampung" onChange={() => undefined} options={['Semua Kampung']} />
        <button className="filter-chip" onClick={() => setPanel('date')}><Icon name="calendar" />01 Mei 2024 - 31 Mei 2024</button>
        <button className="filter-chip" onClick={() => setPanel('advanced')}><Icon name="filter" />Filter Lainnya</button>
      </div>
      {panel === 'date' && <InfoModal title="Periode Data" onClose={() => setPanel(null)} body="Dashboard menampilkan periode 01 Mei 2024 - 31 Mei 2024. Pada mode Supabase, filter periode siap dihubungkan ke kolom created_at dan updated_at." />}
      {panel === 'advanced' && <InfoModal title="Filter Lanjutan" onClose={() => setPanel(null)} body="Filter dapat dikombinasikan berdasarkan kabupaten, distrik, kampung, status verifikasi, status intervensi, jenjang terakhir, alasan putus sekolah, dan petugas lapangan." />}
    </>
  );
}

function DashboardPage({ data, computed, search, navigate, reload, notify }: { data: AppData; computed: ReturnType<typeof computeDashboard>; search: string; navigate: (key: RouteKey) => void; reload: () => Promise<void>; notify: (msg: string) => void }) {
  const [regency, setRegency] = useState('Semua Kabupaten');
  const [district, setDistrict] = useState('Semua Distrik');
  const [selected, setSelected] = useState<AtsRecord | null>(null);
  const [mapZoom, setMapZoom] = useState(1);

  useEffect(() => {
    const sync = async () => { await dataApi.syncAll(); await reload(); notify('Data offline berhasil disinkronkan.'); };
    window.addEventListener('sync-offline', sync);
    return () => window.removeEventListener('sync-offline', sync);
  }, [reload, notify]);

  const filteredRecords = filterRecords(data.records, search, regency, district);
  const filteredData = useMemo(() => ({ ...data, records: filteredRecords }), [data, filteredRecords]);
  const filteredComputed = useMemo(() => computeDashboard(filteredData), [filteredData]);
  const records = filteredRecords.slice(0, 6);

  return (
    <div className="page-stack">
      <FilterBar regency={regency} setRegency={setRegency} district={district} setDistrict={setDistrict} />
      <section className="kpi-grid">
        <KpiCard label="Total ATS" value={filteredComputed.totalAts} delta="8,2% dari bulan lalu" tone="blue" icon="users" />
        <KpiCard label="Data Terverifikasi" value={filteredComputed.verified} delta="7,5% dari bulan lalu" tone="green" icon="shield" />
        <KpiCard label="Dalam Intervensi" value={filteredComputed.inIntervention} delta="5,1% dari bulan lalu" tone="orange" icon="hands" />
        <KpiCard label="Kembali Sekolah" value={filteredComputed.returnedSchool} delta="6,3% dari bulan lalu" tone="purple" icon="school" />
      </section>
      <section className="dashboard-mosaic">
        <Card className="map-card mosaic-map"><CardHeader title="Peta Sebaran ATS – Papua Tengah" action={<button className="small-select" onClick={() => navigate('peta')}>Lihat Detail <Icon name="chevron" /></button>} /><LeafletAtsMap records={filteredRecords} districts={filteredComputed.districts} height={292} zoomSignal={mapZoom} onRecordClick={setSelected} onZoomIn={() => setMapZoom((z) => z + 1)} onZoomOut={() => setMapZoom((z) => z - 1)} /></Card>
        <Card className="mosaic-status"><CardHeader title="Status Intervensi" /><DonutChart data={filteredComputed.interventionBreakdown} total={filteredComputed.inIntervention} label="Dalam Intervensi" /><button className="card-link" onClick={() => navigate('intervensi')}>Lihat Detail Intervensi <Icon name="arrow" /></button></Card>
        <DashboardTasksCard data={data} navigate={navigate} notify={notify} reload={reload} />
        <Card className="mosaic-trend"><CardHeader title="Trend ATS (6 Bulan Terakhir)" action={<button className="small-select">6 Bulan <Icon name="chevron" /></button>} /><LineChart data={filteredComputed.trend} /></Card>
        <Card className="mosaic-reason"><CardHeader title="Alasan Putus Sekolah" /><DonutChart data={filteredComputed.reasonBreakdown} total={Math.max(1, filteredComputed.totalAts - 2000)} label="Total" compact /></Card>
        <DashboardAlertsCard data={data} navigate={navigate} notify={notify} reload={reload} />
        <Card className="mosaic-bar"><CardHeader title="ATS per Kabupaten/Distrik" action={<button className="small-select">Top 8 <Icon name="chevron" /></button>} /><BarChart data={filteredComputed.districts} /></Card>
        <DashboardFieldCard computed={computed} notify={notify} reload={reload} />
      </section>
      <Card><CardHeader title="Data ATS Terbaru" action={<button className="small-select" onClick={() => navigate('pendataan')}>Lihat Semua Data</button>} /><AtsTable records={records} onView={setSelected} /></Card>
      <RecordModal record={selected} onClose={() => setSelected(null)} onUpdated={async () => { await reload(); notify('Data ATS diperbarui.'); }} />
    </div>
  );
}


function DashboardTasksCard({ data, navigate, notify, reload }: { data: AppData; navigate: (key: RouteKey) => void; notify: (msg: string) => void; reload: () => Promise<void> }) {
  return (
    <Card className="mosaic-tasks"><CardHeader title="Tugas & Tindak Lanjut" icon="list" />
      <div className="task-list compact">{data.tasks.slice(0, 3).map((task) => <div key={task.id} className="task-item"><label><input type="checkbox" checked={task.status === 'Selesai'} onChange={async () => { await dataApi.updateTask(task.id, task.status === 'Selesai' ? 'Aktif' : 'Selesai'); await reload(); notify('Status tugas diperbarui.'); }} /><span><strong>{task.title}</strong><small>{task.location}</small></span></label><b>{task.atsCount} ATS</b><em>{task.priority}</em></div>)}</div>
      <button className="card-link" onClick={() => navigate('intervensi')}>Lihat Semua Tugas <Icon name="arrow" /></button>
    </Card>
  );
}

function DashboardAlertsCard({ data, navigate, notify, reload }: { data: AppData; navigate: (key: RouteKey) => void; notify: (msg: string) => void; reload: () => Promise<void> }) {
  return (
    <Card className="mosaic-alerts"><CardHeader title="Peringatan & Notifikasi" />
      <div className="alert-list compact">{data.alerts.slice(0, 3).map((alert) => <button key={alert.id} className={`alert-item ${alert.tone}`} onClick={async () => { await dataApi.updateAlert(alert.id, 'Read'); await reload(); notify('Notifikasi ditandai dibaca.'); }}><Icon name="warning" /><span><strong>{alert.title}</strong><small>{alert.message}</small></span><em>{alert.timeLabel}</em></button>)}</div>
      <button className="card-link" onClick={() => navigate('notifikasi')}>Lihat Semua Notifikasi <Icon name="arrow" /></button>
    </Card>
  );
}

function DashboardFieldCard({ computed, notify, reload }: { computed: ReturnType<typeof computeDashboard>; notify: (msg: string) => void; reload: () => Promise<void> }) {
  return <Card className="field-app-card mosaic-field"><div className="field-app-head"><span className="sync-icon"><Icon name="refresh" /></span><strong>Mode Lapangan</strong><em>Offline</em></div><p>Aplikasi lapangan siap digunakan.</p><div className="sync-box">Data yang belum disinkron: <b>{computed.unsyncedCount}</b><br />Terakhir sinkronisasi: Hari ini, 08:45 WIT</div><button className="outline-btn" onClick={async () => { await dataApi.syncAll(); await reload(); notify('Sinkronisasi data lapangan berhasil.'); }}>Buka Aplikasi Lapangan <Icon name="external" /></button></Card>;
}

function RightRail({ data, computed, navigate, notify, reload }: { data: AppData; computed: ReturnType<typeof computeDashboard>; navigate: (key: RouteKey) => void; notify: (msg: string) => void; reload: () => Promise<void> }) {
  return (
    <aside className="right-rail">
      <Card><CardHeader title="Tugas & Tindak Lanjut" icon="list" />
        <div className="task-list">{data.tasks.slice(0, 3).map((task) => <div key={task.id} className="task-item"><label><input type="checkbox" checked={task.status === 'Selesai'} onChange={async () => { await dataApi.updateTask(task.id, task.status === 'Selesai' ? 'Aktif' : 'Selesai'); await reload(); notify('Status tugas diperbarui.'); }} /><span><strong>{task.title}</strong><small>{task.location}</small></span></label><b>{task.atsCount} ATS</b><em>{task.priority}</em></div>)}</div>
        <button className="card-link" onClick={() => navigate('intervensi')}>Lihat Semua Tugas <Icon name="arrow" /></button>
      </Card>
      <Card><CardHeader title="Peringatan & Notifikasi" />
        <div className="alert-list">{data.alerts.slice(0, 3).map((alert) => <button key={alert.id} className={`alert-item ${alert.tone}`} onClick={async () => { await dataApi.updateAlert(alert.id, 'Read'); await reload(); notify('Notifikasi ditandai dibaca.'); }}><Icon name="warning" /><span><strong>{alert.title}</strong><small>{alert.message}</small></span><em>{alert.timeLabel}</em></button>)}</div>
        <button className="card-link" onClick={() => navigate('notifikasi')}>Lihat Semua Notifikasi <Icon name="arrow" /></button>
      </Card>
      <Card className="field-app-card"><div className="field-app-head"><span className="sync-icon"><Icon name="refresh" /></span><strong>Mode Lapangan</strong><em>Offline</em></div><p>Aplikasi lapangan siap digunakan.</p><div className="sync-box">Data yang belum disinkron: <b>{computed.unsyncedCount}</b><br />Terakhir sinkronisasi: Hari ini, 08:45 WIT</div><button className="outline-btn" onClick={async () => { await dataApi.syncAll(); await reload(); notify('Sinkronisasi data lapangan berhasil.'); }}>Buka Aplikasi Lapangan <Icon name="external" /></button></Card>
    </aside>
  );
}

function PendataanPage({ data, search, reload, notify }: { data: AppData; search: string; reload: () => Promise<void>; notify: (msg: string) => void }) {
  const [regency, setRegency] = useState('Semua Kabupaten');
  const [district, setDistrict] = useState('Semua Distrik');
  const [modal, setModal] = useState<'create' | null>(null);
  const [selected, setSelected] = useState<AtsRecord | null>(null);
  const rows = filterRecords(data.records, search, regency, district);
  return (
    <div className="page-stack">
      <FilterBar regency={regency} setRegency={setRegency} district={district} setDistrict={setDistrict} />
      <div className="page-toolbar"><div><h2>Data Anak Tidak Sekolah</h2><p>Kelola data ATS, validasi identitas, dan tindak lanjut intervensi.</p></div><button className="primary-btn" onClick={() => setModal('create')}><Icon name="plus" /> Tambah Data ATS</button></div>
      <section className="mini-stat-grid"><MiniStat title="Total data" value={rows.length} /><MiniStat title="Belum verifikasi" value={rows.filter((r) => r.verificationStatus === 'Belum Diverifikasi').length} /><MiniStat title="Duplikasi" value={rows.filter((r) => r.verificationStatus === 'Duplikat').length} /><MiniStat title="Offline pending" value={rows.filter((r) => !r.synced).length} /></section>
      <Card><AtsTable records={rows} onView={setSelected} full /></Card>
      <AtsFormModal open={modal === 'create'} onClose={() => setModal(null)} officers={data.officers} onSubmit={async (record) => { await dataApi.createRecord(record); setModal(null); await reload(); notify('Data ATS baru berhasil disimpan.'); }} />
      <RecordModal record={selected} onClose={() => setSelected(null)} onDeleted={async () => { setSelected(null); await reload(); notify('Data ATS dihapus.'); }} onUpdated={async () => { await reload(); notify('Data ATS diperbarui.'); }} />
    </div>
  );
}

function PetaPage({ data, computed, search, notify, reload }: { data: AppData; computed: ReturnType<typeof computeDashboard>; search: string; notify: (msg: string) => void; reload: () => Promise<void> }) {
  const [regency, setRegency] = useState('Semua Kabupaten');
  const [district, setDistrict] = useState('Semua Distrik');
  const [zoomSignal, setZoomSignal] = useState(0);
  const [selected, setSelected] = useState<AtsRecord | null>(null);
  const records = filterRecords(data.records, search, regency, district);
  const filteredComputed = computeDashboard({ ...data, records });
  return (
    <div className="page-stack">
      <FilterBar regency={regency} setRegency={setRegency} district={district} setDistrict={setDistrict} />
      <section className="map-page-grid">
        <Card className="map-card full-map"><CardHeader title="Peta Interaktif Sebaran ATS" action={<button className="small-select" onClick={() => { setZoomSignal(0); notify('Tampilan peta direset.'); }}>Reset Peta</button>} /><LeafletAtsMap records={records} districts={filteredComputed.districts} height={560} zoomSignal={zoomSignal} onRecordClick={setSelected} /></Card>
        <Card><CardHeader title="Ringkasan Wilayah" /><div className="region-list">{filteredComputed.districts.map((d) => <button key={d.district} onClick={() => { setRegency(d.regency); notify(`Filter wilayah ${d.regency} diterapkan.`); }}><span><strong>{d.district}</strong><small>{formatNumber(d.value)} ATS terdata</small></span><Badge tone={d.tone === 'red' ? 'red' : d.tone === 'orange' ? 'orange' : 'green'}>{d.value > 2000 ? 'Prioritas' : 'Monitoring'}</Badge></button>)}</div></Card>
      </section>
      <Card><CardHeader title="Data pada Filter Peta" /><AtsTable records={records.slice(0, 10)} onView={setSelected} /></Card>
      <RecordModal record={selected} onClose={() => setSelected(null)} onUpdated={async () => { await reload(); notify('Data ATS diperbarui.'); }} />
    </div>
  );
}

function IntervensiPage({ data, search, reload, notify }: { data: AppData; search: string; reload: () => Promise<void>; notify: (msg: string) => void }) {
  const [selectedStatus, setSelectedStatus] = useState<InterventionStatus | 'Semua'>('Semua');
  const [selected, setSelected] = useState<AtsRecord | null>(null);
  const baseRecords = filterRecords(data.records, search);
  const filtered = baseRecords.filter((item) => selectedStatus === 'Semua' || item.interventionStatus === selectedStatus);
  const statuses: Array<InterventionStatus | 'Semua'> = ['Semua', 'Identifikasi Awal', 'Pendekatan Keluarga', 'Proses Intervensi', 'Rujukan Layanan', 'Kembali Sekolah'];
  return (
    <div className="page-stack">
      <div className="segmented">{statuses.map((status) => <button key={status} className={selectedStatus === status ? 'active' : ''} onClick={() => setSelectedStatus(status)}>{status}</button>)}</div>
      <section className="kanban-grid">{statuses.filter((s) => s !== 'Semua').map((status) => <Card key={status}><CardHeader title={status} /><div className="intervention-list">{baseRecords.filter((record) => record.interventionStatus === status).slice(0, 5).map((record) => <div className="intervention-card" key={record.id} onClick={() => setSelected(record)}><strong>{record.name}</strong><small>{record.regency} - {record.district}</small><span>{record.dropoutReason}</span><div className="intervention-actions"><button onClick={(e) => { e.stopPropagation(); setSelected(record); }}>Detail</button><button onClick={async (e) => { e.stopPropagation(); await dataApi.updateRecord(record.id, { interventionStatus: nextIntervention(record.interventionStatus) }); await reload(); notify('Status intervensi diperbarui.'); }}>Majukan</button></div></div>)}</div></Card>)}</section>
      <Card><CardHeader title={`Daftar Intervensi ${selectedStatus}`} /><AtsTable records={filtered} onView={setSelected} /></Card>
      <RecordModal record={selected} onClose={() => setSelected(null)} onUpdated={async () => { await reload(); notify('Data intervensi diperbarui.'); }} />
    </div>
  );
}

function PetugasPage({ data, reload, notify }: { data: AppData; reload: () => Promise<void>; notify: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="page-stack">
      <div className="page-toolbar"><div><h2>Manajemen Petugas Lapangan</h2><p>Assign wilayah, pantau kunjungan, dan status sinkronisasi.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><Icon name="plus" />Tambah Petugas</button></div>
      <section className="officer-grid">{data.officers.map((officer) => <Card key={officer.id} className="officer-card"><div className="officer-head"><div className="avatar">{officer.name.slice(0, 2).toUpperCase()}</div><span><strong>{officer.name}</strong><small>{officer.role}</small></span><Badge tone={officer.status === 'Aktif' ? 'green' : officer.status === 'Offline' ? 'orange' : 'gray'}>{officer.status}</Badge></div><p>{officer.regency} - {officer.district}<br />{officer.phone}</p><div className="officer-stats"><span><b>{officer.visits}</b><small>Kunjungan</small></span><span><b>{officer.verified}</b><small>Terverifikasi</small></span><span><b>{officer.syncPending}</b><small>Pending</small></span></div><Progress value={Math.min(100, officer.visits * 2)} /></Card>)}</section>
      <Card><CardHeader title="Jadwal Tugas Lapangan" /><div className="task-table">{data.tasks.map((task) => <div key={task.id}><span><strong>{task.title}</strong><small>{task.location}</small></span><Badge tone="blue">{task.atsCount} ATS</Badge><Badge tone={task.priority === 'Hari ini' ? 'red' : 'gray'}>{task.priority}</Badge></div>)}</div></Card>
      <OfficerModal open={open} onClose={() => setOpen(false)} onSubmit={async (officer) => { await dataApi.createOfficer(officer); setOpen(false); await reload(); notify('Petugas baru ditambahkan.'); }} />
    </div>
  );
}

function LaporanPage({ data, computed, notify }: { data: AppData; computed: ReturnType<typeof computeDashboard>; notify: (msg: string) => void }) {
  const [period, setPeriod] = useState('Mei 2024');
  const [selected, setSelected] = useState<AtsRecord | null>(null);
  const rows = useMemo(() => filterByPeriod(data.records, period), [data.records, period]);
  const reportComputed = useMemo(() => computeDashboard({ ...data, records: rows }), [data, rows]);
  function exportCsv() {
    const header = ['Nama','NIK','Kabupaten','Distrik','Jenjang','Alasan','Verifikasi','Intervensi','Petugas'];
    const body = rows.map((r) => [r.name, r.nik, r.regency, r.district, r.lastEducation, r.dropoutReason, r.verificationStatus, r.interventionStatus, r.officerName].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','));
    downloadTextFile(`laporan-ats-${period.toLowerCase().replaceAll(' ', '-')}.csv`, [header.join(','), ...body].join('\n'), 'text/csv;charset=utf-8');
    notify('Laporan CSV berhasil dibuat.');
  }
  return (
    <div className="page-stack">
      <div className="page-toolbar"><div><h2>Laporan Dinas</h2><p>Preview laporan bulanan, export CSV, atau cetak ke PDF dari browser.</p></div><div className="toolbar-actions"><select value={period} onChange={(e) => setPeriod(e.target.value)}><option>Mei 2024</option><option>Triwulan II 2024</option><option>Tahun 2024</option><option>Semua Data</option><option>Januari 2025</option></select><button className="outline-btn" onClick={() => window.print()}><Icon name="file" />Cetak PDF</button><button className="primary-btn" onClick={exportCsv}><Icon name="download" />Export Excel/CSV</button></div></div>
      <section className="report-grid"><Card><h3>Total ATS</h3><strong>{formatNumber(reportComputed.totalAts)}</strong><p>Akumulasi data ATS pada periode {period}.</p></Card><Card><h3>Intervensi berjalan</h3><strong>{formatNumber(reportComputed.inIntervention)}</strong><p>Data yang sedang masuk proses tindak lanjut.</p></Card><Card><h3>Kembali sekolah</h3><strong>{formatNumber(reportComputed.returnedSchool)}</strong><p>Indikator keberhasilan program intervensi.</p></Card></section>
      <Card className="print-sheet"><div className="report-head"><div><h2>Laporan Pendataan ATS Papua Tengah</h2><p>Periode {period} • Dicetak {todayId()}</p></div><img className="brand-emblem mini" src="/assets/papua-tengah-logo.png" alt="Logo" /></div><AtsTable records={rows.slice(0, 12)} onView={setSelected} /></Card>
      <RecordModal record={selected} onClose={() => setSelected(null)} onUpdated={async () => notify('Data laporan diperbarui.')} />
    </div>
  );
}

function NotifikasiPage({ data, reload, notify }: { data: AppData; reload: () => Promise<void>; notify: (msg: string) => void }) {
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const activeAlerts = data.alerts.filter((alert) => alert.status !== 'Resolved');
  const unreadCount = data.alerts.filter((alert) => alert.status === 'Unread').length;
  async function markRead(alert: AlertItem) {
    await dataApi.updateAlert(alert.id, 'Read');
    await reload();
    notify('Notifikasi ditandai dibaca.');
  }
  async function resolveAlert(alert: AlertItem) {
    await dataApi.updateAlert(alert.id, 'Resolved');
    setSelected(null);
    await reload();
    notify('Notifikasi diselesaikan.');
  }
  return (
    <div className="page-stack">
      <div className="page-toolbar"><div><h2>Pusat Notifikasi</h2><p>{unreadCount} notifikasi belum dibaca dari {data.alerts.length} total notifikasi.</p></div><button className="outline-btn" onClick={async () => { await Promise.all(data.alerts.map((a) => dataApi.updateAlert(a.id, 'Read'))); await reload(); notify('Semua notifikasi ditandai dibaca.'); }}>Tandai semua dibaca</button></div>
      <div className="notification-list">{activeAlerts.length === 0 ? <Card className="empty-state"><Icon name="shield" /><strong>Tidak ada notifikasi aktif</strong><p>Semua peringatan sudah diselesaikan.</p></Card> : activeAlerts.map((alert) => <Card key={alert.id} className={`notification-card ${alert.tone} ${alert.status === 'Unread' ? 'unread' : ''}`}><Icon name={alert.tone === 'danger' ? 'warning' : alert.tone === 'success' ? 'shield' : 'bell'} /><div><strong>{alert.title}</strong><p>{alert.message}</p><small>{alert.timeLabel} • {alert.status === 'Unread' ? 'Belum dibaca' : 'Sudah dibaca'}</small></div><div className="row-actions"><button onClick={() => setSelected(alert)}>Detail</button><button onClick={async () => markRead(alert)}>Baca</button><button className="danger-text" onClick={async () => resolveAlert(alert)}>Selesaikan</button></div></Card>)}</div>
      {selected && <AlertDetailModal alert={selected} onClose={() => setSelected(null)} onRead={async () => markRead(selected)} onResolve={async () => resolveAlert(selected)} />}
    </div>
  );
}

function PenggunaPage({ data, reload, notify }: { data: AppData; reload: () => Promise<void>; notify: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<AppUser | null>(null);
  return (
    <div className="page-stack">
      <div className="page-toolbar"><div><h2>Pengguna & Hak Akses</h2><p>Kelola akun internal, role, dan cakupan wilayah data.</p></div><button className="primary-btn" onClick={() => setOpen(true)}><Icon name="plus" />Tambah Pengguna</button></div>
      <Card><div className="user-table">{data.users.map((user) => <div key={user.id} className="user-row"><div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div><span><strong>{user.name}</strong><small>{user.email}</small></span><Badge tone="blue">{user.role}</Badge><span>{user.wilayah}</span><Badge tone={user.status === 'Aktif' ? 'green' : 'gray'}>{user.status}</Badge><button onClick={() => setConfirmUser(user)}>{user.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button></div>)}</div></Card>
      <UserModal open={open} onClose={() => setOpen(false)} onSubmit={async (user) => { await dataApi.createUser(user); setOpen(false); await reload(); notify('Pengguna baru ditambahkan.'); }} />
      {confirmUser && <ConfirmModal tone={confirmUser.status === 'Aktif' ? 'danger' : 'success'} title={confirmUser.status === 'Aktif' ? 'Nonaktifkan pengguna?' : 'Aktifkan pengguna?'} message={`${confirmUser.name} akan ${confirmUser.status === 'Aktif' ? 'dinonaktifkan' : 'diaktifkan'} dari sistem.`} confirmLabel="Lanjutkan" cancelLabel="Batal" onCancel={() => setConfirmUser(null)} onConfirm={async () => { const next = confirmUser.status === 'Aktif' ? 'Nonaktif' : 'Aktif'; await dataApi.toggleUserStatus(confirmUser.id, next); setConfirmUser(null); await reload(); notify('Status pengguna diperbarui.'); }} />}
    </div>
  );
}

function PengaturanPage({ session, notify }: { session: AppSession; notify: (msg: string) => void }) {
  const [autoSync, setAutoSync] = useState(true);
  const [publicDash, setPublicDash] = useState(false);
  const [backup, setBackup] = useState('Harian');
  const [saved, setSaved] = useState(false);
  return (
    <div className="page-stack settings-page">
      <section className="settings-hero"><div><span>Konfigurasi Operasional</span><h2>Pengaturan Sistem ATS</h2><p>Atur sinkronisasi, mode lapangan, akses publik, dan koneksi data pendukung dari satu halaman.</p></div><button className="primary-btn" onClick={() => { setSaved(true); notify('Pengaturan berhasil disimpan.'); window.setTimeout(() => setSaved(false), 1800); }}>Simpan Semua</button></section>
      <section className="settings-grid modern">
        <Card><CardHeader title="Akses Aktif" /><div className="settings-list modern"><p><strong>Akun</strong><span>{session.name}</span></p><p><strong>Role</strong><span>{session.role}</span></p><p><strong>Status sesi</strong><span>Aktif</span></p></div></Card>
        <Card><CardHeader title="Sinkronisasi & Lapangan" /><Toggle label="Sinkronisasi otomatis" checked={autoSync} setChecked={setAutoSync} /><Toggle label="Dashboard publik agregat" checked={publicDash} setChecked={setPublicDash} /><label className="field-label compact"><span>Cadangan data</span><select value={backup} onChange={(e) => setBackup(e.target.value)}><option>Harian</option><option>Mingguan</option><option>Bulanan</option></select></label>{saved && <div className="save-state">Pengaturan tersimpan</div>}</Card>
      </section>
      <Card><CardHeader title="Kesiapan Integrasi Data" /><div className="integration-grid"><Integration name="Dapodik" status="Siap diproses" /><Integration name="Dukcapil" status="Perlu aktivasi resmi" /><Integration name="DTKS/BDT" status="Siap pemetaan" /><Integration name="EMIS Kemenag" status="Opsional" /></div></Card>
    </div>
  );
}

function AtsTable({ records, onView, full = false }: { records: AtsRecord[]; onView: (record: AtsRecord) => void; full?: boolean }) {
  return (
    <div className="table-scroll"><table className="data-table"><thead><tr><th>Nama</th><th>NIK</th><th>Wilayah</th><th>Jenjang Terakhir</th><th>Status Verifikasi</th><th>Status Intervensi</th><th>Petugas</th><th>Tanggal Input</th><th>Aksi</th></tr></thead><tbody>{records.length === 0 ? <tr><td colSpan={9} className="empty-cell">Tidak ada data yang cocok dengan filter atau pencarian.</td></tr> : records.map((record) => <tr key={record.id}><td><b>{record.name}</b></td><td>{record.nik}</td><td>{record.regency} - {record.district}</td><td>{record.lastEducation} {record.lastClass}</td><td><Badge tone={statusTone(record.verificationStatus)}>{record.verificationStatus}</Badge></td><td><Badge tone={interventionTone(record.interventionStatus)}>{record.interventionStatus}</Badge></td><td>{record.officerName}</td><td>{new Date(record.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><button className="row-btn" onClick={() => onView(record)}>Detail</button></td></tr>)}</tbody></table>{full && <div className="table-footer"><span>Tampilkan {records.length} data</span><div className="pager"><button>‹</button><button className="active">1</button><button>2</button><button>3</button><button>›</button></div></div>}</div>
  );
}

function RecordModal({ record, onClose, onUpdated, onDeleted }: { record: AtsRecord | null; onClose: () => void; onUpdated?: () => Promise<void>; onDeleted?: () => Promise<void> }) {
  const [draft, setDraft] = useState<AtsRecord | null>(record);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setDraft(record), [record]);
  if (!record || !draft) return null;
  const patch = async (values: Partial<AtsRecord>, closeAfter = true) => { await dataApi.updateRecord(record.id, values); await onUpdated?.(); setDraft({ ...draft, ...values }); if (closeAfter) onClose(); };
  return (
    <Modal title="Detail Data ATS" onClose={onClose} wide>
      <div className="detail-grid"><section><h3>{record.name}</h3><p>{record.regency} - {record.district} - {record.village}</p><div className="profile-detail"><span>NIK</span><b>{record.nik}</b><span>Jenis kelamin</span><b>{record.gender}</b><span>Jenjang terakhir</span><b>{record.lastEducation} {record.lastClass}</b><span>Alasan putus sekolah</span><b>{record.dropoutReason}</b><span>Wali</span><b>{record.parentName}</b><span>Kontak</span><b>{record.contact}</b></div></section><section className="modal-actions"><label className="field-label compact">Status Verifikasi<select value={draft.verificationStatus} onChange={(e) => setDraft({ ...draft, verificationStatus: e.target.value as AtsRecord['verificationStatus'] })}><option>Terverifikasi</option><option>Belum Diverifikasi</option><option>Perlu Revisi</option><option>Duplikat</option><option>Ditolak</option></select></label><label className="field-label compact">Status Intervensi<select value={draft.interventionStatus} onChange={(e) => setDraft({ ...draft, interventionStatus: e.target.value as AtsRecord['interventionStatus'] })}><option>Identifikasi Awal</option><option>Pendekatan Keluarga</option><option>Proses Intervensi</option><option>Rujukan Layanan</option><option>Kembali Sekolah</option></select></label><textarea value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={5} /><button className="primary-btn" onClick={() => patch({ verificationStatus: draft.verificationStatus, interventionStatus: draft.interventionStatus, notes: draft.notes })}>Simpan Perubahan</button><button className="outline-btn" onClick={() => patch({ verificationStatus: 'Terverifikasi' })}>Verifikasi Data</button>{onDeleted && <button className="danger-btn" onClick={() => setConfirmDelete(true)}>Hapus Data</button>}{confirmDelete && <ConfirmModal tone="danger" title="Hapus data ATS?" message="Data ini akan dihapus dari daftar pendataan dan tidak ditampilkan lagi pada dashboard." confirmLabel="Ya, hapus" cancelLabel="Batal" onCancel={() => setConfirmDelete(false)} onConfirm={async () => { await dataApi.deleteRecord(record.id); setConfirmDelete(false); await onDeleted?.(); }} />}</section></div>
    </Modal>
  );
}

function AtsFormModal({ open, onClose, officers, onSubmit }: { open: boolean; onClose: () => void; officers: FieldOfficer[]; onSubmit: (record: Partial<AtsRecord>) => Promise<void> }) {
  const [form, setForm] = useState<Partial<AtsRecord>>({ gender: 'Laki-laki', regency: 'Mimika', district: 'Kuala Kencana', village: '', lastEducation: 'SD', lastClass: 'Kelas 6', dropoutYear: 2024, dropoutReason: 'Faktor Ekonomi', familyEconomic: 'Rentan', verificationStatus: 'Belum Diverifikasi', interventionStatus: 'Identifikasi Awal', officerName: officers[0]?.name ?? 'Belum diassign' });
  if (!open) return null;
  const change = <K extends keyof AtsRecord>(key: K, value: AtsRecord[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <Modal title="Tambah Data ATS" onClose={onClose} wide>
      <form className="form-grid" onSubmit={async (e) => { e.preventDefault(); await onSubmit({ ...form, nik: maskNik(form.nik ?? '') }); }}>
        <LabelInput label="Nama lengkap" value={form.name ?? ''} onChange={(v) => change('name', v)} required />
        <LabelInput label="NIK / nomor identitas" value={form.nik ?? ''} onChange={(v) => change('nik', v)} required />
        <LabelSelect label="Jenis kelamin" value={form.gender ?? 'Laki-laki'} onChange={(v) => change('gender', v as AtsRecord['gender'])} options={['Laki-laki', 'Perempuan']} />
        <LabelInput label="Tanggal lahir" type="date" value={form.birthDate ?? ''} onChange={(v) => change('birthDate', v)} />
        <LabelSelect label="Kabupaten" value={form.regency ?? 'Mimika'} onChange={(v) => change('regency', v)} options={fields.regency} />
        <LabelSelect label="Distrik" value={form.district ?? 'Kuala Kencana'} onChange={(v) => change('district', v)} options={fields.district} />
        <LabelInput label="Kampung" value={form.village ?? ''} onChange={(v) => change('village', v)} />
        <LabelSelect label="Jenjang terakhir" value={form.lastEducation ?? 'SD'} onChange={(v) => change('lastEducation', v)} options={fields.education} />
        <LabelInput label="Kelas terakhir" value={form.lastClass ?? ''} onChange={(v) => change('lastClass', v)} />
        <LabelInput label="Tahun putus sekolah" type="number" value={String(form.dropoutYear ?? 2024)} onChange={(v) => change('dropoutYear', Number(v))} />
        <LabelSelect label="Alasan putus sekolah" value={form.dropoutReason ?? 'Faktor Ekonomi'} onChange={(v) => change('dropoutReason', v)} options={fields.reason} />
        <LabelInput label="Kondisi ekonomi keluarga" value={form.familyEconomic ?? ''} onChange={(v) => change('familyEconomic', v)} />
        <LabelInput label="Nama orang tua/wali" value={form.parentName ?? ''} onChange={(v) => change('parentName', v)} />
        <LabelInput label="Nomor kontak" value={form.contact ?? ''} onChange={(v) => change('contact', v)} />
        <LabelSelect label="Petugas" value={form.officerName ?? ''} onChange={(v) => change('officerName', v)} options={officers.map((o) => o.name)} />
        <label className="field-label full-field"><span>Catatan lapangan</span><textarea rows={4} value={form.notes ?? ''} onChange={(e) => change('notes', e.target.value)} /></label>
        <div className="form-actions full-field"><button type="button" className="outline-btn" onClick={onClose}>Batal</button><button className="primary-btn">Simpan Data</button></div>
      </form>
    </Modal>
  );
}

function OfficerModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (officer: Omit<FieldOfficer, 'id'>) => Promise<void> }) {
  const [form, setForm] = useState<Omit<FieldOfficer, 'id'>>({ name: '', role: 'Petugas Lapangan', regency: 'Mimika', district: 'Kuala Kencana', phone: '', visits: 0, verified: 0, syncPending: 0, status: 'Aktif' });
  if (!open) return null;
  return <Modal title="Tambah Petugas" onClose={onClose}><form className="form-grid one" onSubmit={async (e) => { e.preventDefault(); await onSubmit(form); }}><LabelInput label="Nama" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required /><LabelInput label="Jabatan" value={form.role} onChange={(v) => setForm({ ...form, role: v })} /><LabelSelect label="Kabupaten" value={form.regency} onChange={(v) => setForm({ ...form, regency: v })} options={fields.regency} /><LabelSelect label="Distrik" value={form.district} onChange={(v) => setForm({ ...form, district: v })} options={fields.district} /><LabelInput label="Telepon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /><button className="primary-btn">Simpan Petugas</button></form></Modal>;
}

function UserModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (user: Omit<AppUser, 'id'>) => Promise<void> }) {
  const [form, setForm] = useState<Omit<AppUser, 'id'>>({ name: '', email: '', role: 'Petugas Lapangan', wilayah: 'Mimika', status: 'Aktif' });
  if (!open) return null;
  const roles: UserRole[] = ['Admin Provinsi', 'Admin Kabupaten', 'Petugas Lapangan', 'Kepala Dinas', 'Publik'];
  return <Modal title="Tambah Pengguna" onClose={onClose}><form className="form-grid one" onSubmit={async (e) => { e.preventDefault(); await onSubmit(form); }}><LabelInput label="Nama" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required /><LabelInput label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required /><LabelSelect label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v as UserRole })} options={roles} /><LabelInput label="Wilayah" value={form.wilayah} onChange={(v) => setForm({ ...form, wilayah: v })} /><button className="primary-btn">Simpan Pengguna</button></form></Modal>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function CardHeader({ title, action, icon }: { title: string; action?: ReactNode; icon?: string }) { return <div className="card-head"><h3>{icon && <Icon name={icon} />} {title}</h3>{action}</div>; }
function KpiCard({ label, value, delta, tone, icon }: { label: string; value: number; delta: string; tone: string; icon: string }) { return <Card className="kpi-card"><div className={`kpi-icon ${tone}`}><Icon name={icon} /></div><div><span className={tone}>{label}</span><strong>{formatNumber(value)}</strong><small>▲ {delta}</small></div></Card>; }
function MiniStat({ title, value }: { title: string; value: number }) { return <Card className="mini-stat"><span>{title}</span><strong>{formatNumber(value)}</strong></Card>; }
function Badge({ tone, children }: { tone: string; children: ReactNode }) { return <span className={`badge ${tone}`}>{children}</span>; }
function Progress({ value }: { value: number }) { return <div className="progress"><i style={{ width: `${value}%` }} /><span>{value}%</span></div>; }
function Toggle({ label, checked, setChecked }: { label: string; checked: boolean; setChecked: (value: boolean) => void }) { return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /><i /></label>; }
function Integration({ name, status }: { name: string; status: string }) { return <div className="integration-card"><strong>{name}</strong><span>{status}</span></div>; }

function InfoModal({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><p className="modal-copy">{body}</p><div className="form-actions"><button className="primary-btn" onClick={onClose}>Mengerti</button></div></Modal>;
}

function AlertDetailModal({ alert, onClose, onRead, onResolve }: { alert: AlertItem; onClose: () => void; onRead: () => Promise<void>; onResolve: () => Promise<void> }) {
  return <Modal title="Detail Notifikasi" onClose={onClose}><div className={`alert-detail ${alert.tone}`}><div className="alert-detail-icon"><Icon name={alert.tone === 'danger' ? 'warning' : alert.tone === 'success' ? 'shield' : 'bell'} /></div><div><strong>{alert.title}</strong><p>{alert.message}</p><small>{alert.timeLabel} • {alert.status === 'Unread' ? 'Belum dibaca' : alert.status === 'Read' ? 'Sudah dibaca' : 'Selesai'}</small></div></div><div className="modal-info-grid"><span>Jenis</span><b>{alert.tone === 'danger' ? 'Kritis' : alert.tone === 'warning' ? 'Peringatan' : alert.tone === 'success' ? 'Berhasil' : 'Informasi'}</b><span>Status</span><b>{alert.status}</b><span>Rekomendasi</span><b>{alert.tone === 'danger' ? 'Periksa data terkait dan tindak lanjuti segera.' : 'Tinjau informasi lalu tandai selesai jika sudah diproses.'}</b></div><div className="form-actions"><button className="outline-btn" onClick={onRead}>Tandai Dibaca</button><button className="primary-btn" onClick={onResolve}>Selesaikan</button></div></Modal>;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className={`modal ${wide ? 'wide' : ''}`}><div className="modal-head"><h2>{title}</h2><button className="modal-close" onClick={onClose}><Icon name="x" /></button></div>{children}</div></div>;
}

function ConfirmModal({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel, tone = 'danger' }: { title: string; message: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void | Promise<void>; onCancel: () => void; tone?: 'danger' | 'success' | 'blue' }) {
  const [busy, setBusy] = useState(false);
  return <div className="modal-backdrop confirm-layer" role="dialog" aria-modal="true"><div className={`confirm-modal ${tone}`}><div className="confirm-icon"><Icon name={tone === 'danger' ? 'warning' : 'shield'} /></div><div><h2>{title}</h2><p>{message}</p></div><div className="confirm-actions"><button className="outline-btn" onClick={onCancel} disabled={busy}>{cancelLabel}</button><button className={tone === 'danger' ? 'danger-btn' : 'primary-btn'} disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }}>{busy ? 'Memproses...' : confirmLabel}</button></div></div></div>;
}

function Toast({ message }: { message: string }) {
  const lower = message.toLowerCase();
  const tone = lower.includes('hapus') || lower.includes('keluar') || lower.includes('gagal') ? 'danger' : 'success';
  return <div className={`toast ${tone}`}><span><Icon name={tone === 'danger' ? 'warning' : 'shield'} /></span><b>{message}</b></div>;
}

function LabelInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="field-label"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}
function LabelSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="field-label"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
function SelectChip({ icon, value, onChange, options }: { icon: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="filter-chip"><Icon name={icon} /><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><Icon name="chevron" /></label>;
}

const districtCoordinates: Record<string, [number, number]> = {
  'Kuala Kencana': [-4.43, 136.88],
  'Tembagapura': [-4.04, 137.13],
  'Nabire': [-3.36, 135.49],
  'Wanggar': [-3.25, 135.42],
  'Enarotali': [-3.92, 136.34],
  'Bogobaida': [-3.91, 136.22],
  'Kamuu': [-4.03, 135.93],
  'Tigi': [-4.04, 136.27],
  'Sugapa': [-3.72, 136.67],
  'Mulia': [-3.71, 137.99],
};

function markerTone(value: number) {
  if (value > 2000) return 'red';
  if (value > 1000) return 'orange';
  if (value > 500) return 'yellow';
  return 'green';
}

function LeafletAtsMap({ records, districts, height = 320, zoomSignal = 0, onRecordClick, onZoomIn, onZoomOut }: { records: AtsRecord[]; districts: ReturnType<typeof computeDashboard>['districts']; height?: number; zoomSignal?: number; onRecordClick?: (record: AtsRecord) => void; onZoomIn?: () => void; onZoomOut?: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const lastZoomSignal = useRef(zoomSignal);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([-3.75, 136.45], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-ats-legend');
      div.innerHTML = '<strong>Jumlah ATS</strong><span><i class="red"></i>&gt; 2.000</span><span><i class="orange"></i>1.001 - 2.000</span><span><i class="yellow"></i>501 - 1.000</span><span><i class="green"></i>≤ 500</span>';
      return div;
    };
    legend.addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    districts.forEach((district) => {
      const firstRecord = records.find((r) => r.district === district.district || r.regency === district.regency);
      const fallback = districtCoordinates[district.district];
      const coordinate: [number, number] | undefined = firstRecord?.latitude && firstRecord?.longitude ? [firstRecord.latitude, firstRecord.longitude] : fallback;
      if (!coordinate) return;
      bounds.push(coordinate);
      const tone = markerTone(district.value);
      const marker = L.marker(coordinate, {
        icon: L.divIcon({
          className: `ats-map-marker ${tone}`,
          html: `<span>${formatNumber(district.value)}</span><em>${district.district}</em>`,
          iconSize: [64, 64],
          iconAnchor: [32, 32],
        }),
      });
      marker.bindPopup(`<b>${district.district}</b><br>${formatNumber(district.value)} ATS terdata<br>${district.regency}`);
      marker.on('click', () => {
        const record = firstRecord || records[0];
        if (record) onRecordClick?.(record);
      });
      marker.addTo(layer);
    });
    if (bounds.length) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [34, 34], maxZoom: 9 });
  }, [records, districts, onRecordClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (zoomSignal > lastZoomSignal.current) map.zoomIn();
    if (zoomSignal < lastZoomSignal.current) map.zoomOut();
    lastZoomSignal.current = zoomSignal;
  }, [zoomSignal]);

  return (
    <div className="leaflet-map-wrap" style={{ height }}>
      <div ref={containerRef} className="leaflet-map" />
      <div className="map-floating-actions">
        <button onClick={onZoomIn || (() => mapRef.current?.zoomIn())}>+</button>
        <button onClick={onZoomOut || (() => mapRef.current?.zoomOut())}>−</button>
        <button onClick={() => mapRef.current?.setView([-3.75, 136.45], 7)}><Icon name="expand" /></button>
      </div>
    </div>
  );
}


function LineChart({ data }: { data: ReturnType<typeof computeDashboard>['trend'] }) {
  const width = 430, height = 215, pad = { top: 22, right: 18, bottom: 34, left: 44 };
  const max = Math.max(...data.map(d => d.value), 14000), plotW = width - pad.left - pad.right, plotH = height - pad.top - pad.bottom;
  const points = data.map((d, i) => ({ ...d, x: pad.left + (i / Math.max(data.length - 1, 1)) * plotW, y: pad.top + (1 - d.value / max) * plotH }));
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  return <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`}>{[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000].map((tick) => { const y = pad.top + (1 - tick / max) * plotH; return <g key={tick}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} className="grid-line" /><text x={pad.left - 10} y={y + 4} textAnchor="end">{tick / 1000 ? `${tick / 1000}K` : '0'}</text></g>; })}<path d={path} className="line-path" />{points.map((p) => <g key={p.month}><text x={p.x} y={height - 9} textAnchor="middle">{p.month}</text><circle cx={p.x} cy={p.y} r="4.5" className="line-dot" /><text x={p.x} y={p.y - 9} textAnchor="middle" className="value-label">{formatNumber(p.value)}</text></g>)}</svg>;
}

function DonutChart({ data, total, label, compact = false }: { data: ReturnType<typeof computeDashboard>['reasonBreakdown']; total: number; label: string; compact?: boolean }) {
  const colors: Record<string, string> = { blue: '#2563eb', teal: '#14b8a6', orange: '#f59e0b', purple: '#7c3aed', sky: '#38bdf8', gray: '#94a3b8', green: '#10b981', red: '#ef4444' };
  let current = 0;
  return <div className={`donut-layout ${compact ? 'compact' : ''}`}><svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="72" fill="none" stroke="#eef2f7" strokeWidth="28" />{data.map((slice) => { const angle = (slice.value / Math.max(total, 1)) * 360; const path = describeArc(110, 110, 72, current, current + angle); current += angle; return <path key={slice.label} d={path} fill="none" stroke={colors[slice.tone]} strokeWidth="28" />; })}<text x="110" y="105" textAnchor="middle" className="donut-total">{formatNumber(total)}</text><text x="110" y="126" textAnchor="middle" className="donut-subtitle">{label}</text></svg><div className="legend-list">{data.map((slice) => <div className="legend-item" key={slice.label}><i style={{ background: colors[slice.tone] }} /><span><strong>{slice.label}</strong><small>{formatNumber(slice.value)} ({slice.percent}%)</small></span></div>)}</div></div>;
}

function BarChart({ data }: { data: ReturnType<typeof computeDashboard>['districts'] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return <div className="bar-list">{data.map((item) => <div className="bar-row" key={item.district}><span>{item.district}</span><div><i style={{ width: `${(item.value / max) * 100}%` }} /></div><b>{formatNumber(item.value)}</b></div>)}<div className="bar-axis"><span>0</span><span>500</span><span>1K</span><span>1.5K</span><span>2K</span><span>2.5K</span></div></div>;
}

function DashboardMiniPreview() { const computed = computeDashboard(seedData); return <div className="mini-preview"><div className="mini-preview-top"><span /><span /><span /></div><div className="mini-preview-kpis"><i /><i /><i /><i /></div><LineChart data={computed.trend} /></div>; }

function filterByPeriod(records: AtsRecord[], period: string) {
  if (period === 'Semua Data') return records;
  if (period === 'Januari 2025') return records.filter((record) => { const date = new Date(record.createdAt); return date.getMonth() === 0 && date.getFullYear() === 2025; });
  return records.filter((record) => {
    const date = new Date(record.createdAt);
    const month = date.getMonth();
    const year = date.getFullYear();
    if (period === 'Mei 2024') return month === 4 && year === 2024;
    if (period === 'Triwulan II 2024') return year === 2024 && month >= 3 && month <= 5;
    if (period === 'Tahun 2024') return year === 2024;
    return true;
  });
}

function filterRecords(records: AtsRecord[], search: string, regency = 'Semua Kabupaten', district = 'Semua Distrik') {
  const q = search.trim().toLowerCase();
  return records.filter((r) => {
    const matchText = !q || [r.name, r.nik, r.regency, r.district, r.village, r.officerName, r.dropoutReason].join(' ').toLowerCase().includes(q);
    const matchRegency = regency === 'Semua Kabupaten' || r.regency === regency;
    const matchDistrict = district === 'Semua Distrik' || r.district === district;
    return matchText && matchRegency && matchDistrict;
  });
}

function nextIntervention(status: InterventionStatus): InterventionStatus {
  const order: InterventionStatus[] = ['Identifikasi Awal', 'Pendekatan Keluarga', 'Proses Intervensi', 'Rujukan Layanan', 'Kembali Sekolah'];
  return order[Math.min(order.indexOf(status) + 1, order.length - 1)];
}

function statusTone(status: string) {
  if (status === 'Terverifikasi') return 'green';
  if (status === 'Duplikat' || status === 'Ditolak') return 'red';
  if (status === 'Perlu Revisi') return 'orange';
  return 'gray';
}

function interventionTone(status: string) {
  if (status === 'Kembali Sekolah') return 'green';
  if (status === 'Rujukan Layanan') return 'purple';
  if (status === 'Proses Intervensi') return 'blue';
  if (status === 'Pendekatan Keluarga') return 'orange';
  return 'sky';
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

function Icon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    form: <><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M9 13h6M9 17h4" /></>,
    map: <><path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>,
    pin: <><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2" /></>,
    'user-check': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></>,
    file: <><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    settings: <><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.3l.06.06A1.65 1.65 0 0 0 8.92 3h.16A1.65 1.65 0 0 0 10 1.5V1a2 2 0 1 1 4 0v.5A1.65 1.65 0 0 0 15.08 3h.16a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.24.49.74.8 1.29.8H21a2 2 0 1 1 0 4h-.31c-.55 0-1.05.31-1.29.8Z" /></>,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    cloud: <><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 0 1 0 9Z" /><path d="M12 12v6M9 15l3-3 3 3" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    hands: <><path d="M7 11V7a3 3 0 0 1 6 0v4" /><path d="M17 11V8a3 3 0 0 0-3-3" /><path d="M5 12h14l-1 7H6l-1-7Z" /></>,
    school: <><path d="m22 10-10-5-10 5 10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    warning: <><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" /><path d="M12 9v4M12 17h.01" /></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    x: <><path d="M18 6 6 18M6 6l12 12" /></>,
    calendar: <><path d="M8 2v4M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></>,
    filter: <><path d="M22 3H2l8 9v7l4 2v-9l8-9Z" /></>,
    building: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h.01M9 13h.01M9 17h.01" /></>,
    expand: <><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></>,
    external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.file}</svg>;
}
