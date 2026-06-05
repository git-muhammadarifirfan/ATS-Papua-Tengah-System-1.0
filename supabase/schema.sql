-- Sistem ATS Papua Tengah - Supabase schema
-- Jalankan file ini di Supabase SQL Editor sebelum menjalankan seed.sql.

create extension if not exists "pgcrypto";

create table if not exists public.ats_records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nik text,
  nik_masked text,
  gender text check (gender in ('Laki-laki','Perempuan')) default 'Laki-laki',
  birth_date date,
  regency text not null,
  district text not null,
  village text,
  last_education text,
  last_class text,
  dropout_year int,
  dropout_reason text,
  family_economic text,
  parent_name text,
  contact text,
  verification_status text check (verification_status in ('Terverifikasi','Belum Diverifikasi','Perlu Revisi','Duplikat','Ditolak')) default 'Belum Diverifikasi',
  intervention_status text check (intervention_status in ('Identifikasi Awal','Pendekatan Keluarga','Proses Intervensi','Rujukan Layanan','Kembali Sekolah')) default 'Identifikasi Awal',
  officer_name text,
  synced boolean default true,
  latitude numeric,
  longitude numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.field_officers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  regency text not null,
  district text not null,
  phone text,
  visits int default 0,
  verified int default 0,
  sync_pending int default 0,
  status text check (status in ('Aktif','Offline','Cuti')) default 'Aktif',
  created_at timestamptz default now()
);

create table if not exists public.field_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  ats_count int default 0,
  due_label text,
  priority text check (priority in ('Hari ini','Besok','20 Mei','Minggu ini')) default 'Minggu ini',
  status text check (status in ('Aktif','Selesai')) default 'Aktif',
  created_at timestamptz default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  time_label text,
  tone text check (tone in ('warning','danger','info','success')) default 'info',
  status text check (status in ('Unread','Read','Resolved')) default 'Unread',
  created_at timestamptz default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text check (role in ('Admin Provinsi','Admin Kabupaten','Petugas Lapangan','Kepala Dinas','Publik')) default 'Petugas Lapangan',
  wilayah text default 'Papua Tengah',
  status text check (status in ('Aktif','Nonaktif')) default 'Aktif',
  created_at timestamptz default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ats_updated_at on public.ats_records;
create trigger trg_ats_updated_at before update on public.ats_records for each row execute function public.touch_updated_at();

alter table public.ats_records enable row level security;
alter table public.field_officers enable row level security;
alter table public.field_tasks enable row level security;
alter table public.alerts enable row level security;
alter table public.app_users enable row level security;

-- Demo policy: user yang sudah login boleh CRUD. Untuk produksi, sempitkan policy berdasarkan role/wilayah.
do $$ begin
  create policy "authenticated can manage ats_records" on public.ats_records for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated can manage field_officers" on public.field_officers for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated can manage field_tasks" on public.field_tasks for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated can manage alerts" on public.alerts for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "authenticated can manage app_users" on public.app_users for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

create index if not exists idx_ats_records_regency on public.ats_records(regency);
create index if not exists idx_ats_records_district on public.ats_records(district);
create index if not exists idx_ats_records_status on public.ats_records(verification_status, intervention_status);
