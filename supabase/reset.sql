-- OPSIONAL: jalankan file ini jika sebelumnya pernah install versi lama dan ingin reset total tabel aplikasi.
-- PERINGATAN: semua data pada tabel aplikasi ATS akan dihapus.

drop table if exists public.intervention_plans cascade;
drop table if exists public.intervention_notes cascade;
drop table if exists public.ats_records cascade;
drop table if exists public.field_officers cascade;
drop table if exists public.field_tasks cascade;
drop table if exists public.alerts cascade;
drop table if exists public.app_users cascade;
drop function if exists public.touch_updated_at() cascade;
