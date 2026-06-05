-- Dummy data untuk demo grafik, peta, tabel, intervensi, petugas, notifikasi, dan pengguna.
-- Reset data demo. CASCADE dipakai agar aman jika database masih punya tabel lama
-- seperti intervention_plans yang memiliki foreign key ke ats_records.
truncate table public.ats_records, public.field_officers, public.field_tasks, public.alerts, public.app_users restart identity cascade;

insert into public.ats_records (name,nik,nik_masked,gender,birth_date,regency,district,village,last_education,last_class,dropout_year,dropout_reason,family_economic,parent_name,contact,verification_status,intervention_status,officer_name,synced,latitude,longitude,notes,created_at) values
('Yuliana Magai','91020500004321','910205********4321','Perempuan','2010-08-14','Mimika','Kuala Kencana','Iwaka','SMP','Kelas 2',2024,'Faktor Ekonomi','Rentan','Daniel Magai','081245110001','Terverifikasi','Pendekatan Keluarga','Maria M.',true,-4.438,136.884,'Perlu pendekatan keluarga dan bantuan biaya transportasi.','2024-05-19 08:45:00+09'),
('Nataniel Wonda','91010200005678','910102********5678','Laki-laki','2011-01-21','Nabire','Nabire','Karang Mulia','SD','Kelas 6',2024,'Bekerja','Menengah bawah','Yosina Wonda','081245110002','Terverifikasi','Proses Intervensi','Yonas Tabuni',true,-3.366,135.496,'Anak membantu keluarga bekerja harian.','2024-05-19 07:20:00+09'),
('Melkianus Gobai','91030900006789','910309********6789','Laki-laki','2010-05-09','Paniai','Enarotali','Madi','SMP','Kelas 1',2023,'Jarak & Transportasi','Rentan','Petrus Gobai','081245110003','Belum Diverifikasi','Identifikasi Awal','Petrus Kobak',true,-3.920,136.340,'Perlu verifikasi lokasi dan akses sekolah terdekat.','2024-05-18 16:10:00+09'),
('Agustina Yogi','91040700002345','910407********2345','Perempuan','2009-03-01','Intan Jaya','Sugapa','Bilogai','Tidak Sekolah','-',2022,'Tidak Ada Sekolah','Rentan','Maria Yogi','081245110004','Terverifikasi','Rujukan Layanan','Maria M.',true,-3.720,136.670,'Rujukan layanan pendidikan nonformal.','2024-05-18 13:30:00+09'),
('Yosepina Murib','91051100003456','910511********3456','Perempuan','2012-09-11','Dogiyai','Kamuu','Mowanemani','SD','Kelas 5',2024,'Faktor Ekonomi','Sangat rentan','Yosef Murib','081245110005','Belum Diverifikasi','Pendekatan Keluarga','Yonas Tabuni',false,-4.030,135.930,'Data dari mode offline belum sinkron.','2024-05-18 09:05:00+09'),
('Mikael Pigai','91061200001452','910612********1452','Laki-laki','2008-11-20','Deiyai','Tigi','Waghete','SMP','Kelas 3',2023,'Minat & Motivasi','Menengah bawah','Elis Pigai','081245110006','Perlu Revisi','Identifikasi Awal','Petrus Kobak',true,-4.040,136.270,'Nomor kontak wali perlu diperbarui.','2024-04-22 10:30:00+09'),
('Anastasia Kogoya','91070800007788','910708********7788','Perempuan','2010-12-02','Puncak Jaya','Mulia','Pagaleme','SMP','Kelas 2',2022,'Menikah','Rentan','Titus Kogoya','081245110007','Terverifikasi','Kembali Sekolah','Maria M.',true,-3.710,137.990,'Sudah kembali sekolah melalui program pendampingan.','2024-03-10 15:42:00+09'),
('Yakobus Tabuni','91080500006677','910805********6677','Laki-laki','2011-02-18','Mimika','Tembagapura','Banti','SD','Kelas 4',2024,'Jarak & Transportasi','Rentan','Stefanus Tabuni','081245110008','Duplikat','Identifikasi Awal','Yonas Tabuni',true,-4.050,137.130,'Terdeteksi NIK mirip dengan data sebelumnya.','2024-02-27 11:30:00+09'),
('Martha Wandikbo','91090200005512','910902********5512','Perempuan','2009-06-25','Paniai','Bogobaida','Kebo','SMP','Kelas 1',2024,'Bekerja','Menengah bawah','Obet Wandikbo','081245110009','Terverifikasi','Proses Intervensi','Petrus Kobak',true,-3.910,136.220,'Dalam pendampingan agar masuk Paket B.','2024-01-21 12:10:00+09'),
('Yustinus Kadepa','91100600004319','911006********4319','Laki-laki','2012-04-12','Nabire','Wanggar','Wiraska','SD','Kelas 3',2024,'Faktor Ekonomi','Sangat rentan','Lukas Kadepa','081245110010','Terverifikasi','Rujukan Layanan','Maria M.',false,-3.250,135.420,'Butuh rujukan bantuan sosial pendidikan.','2023-12-20 08:15:00+09');

insert into public.field_officers (name,role,regency,district,phone,visits,verified,sync_pending,status) values
('Maria M.','Petugas Validasi','Mimika','Kuala Kencana','081245221001',42,38,4,'Aktif'),
('Yonas Tabuni','Koordinator Lapangan','Nabire','Nabire','081245221002',37,32,12,'Aktif'),
('Petrus Kobak','Petugas Lapangan','Paniai','Enarotali','081245221003',29,24,8,'Offline'),
('Agnes Yogi','Petugas Lapangan','Intan Jaya','Sugapa','081245221004',18,16,2,'Cuti');

insert into public.field_tasks (title,location,ats_count,due_label,priority,status) values
('Pendekatan keluarga','Mimika - Distrik Kuala Kencana',15,'Hari ini','Hari ini','Aktif'),
('Verifikasi data lapangan','Nabire - Distrik Nabire',8,'Besok','Besok','Aktif'),
('Rapat koordinasi intervensi','Paniai - Distrik Enarotali',20,'20 Mei','20 Mei','Aktif');

insert into public.alerts (title,message,time_label,tone,status) values
('Duplikasi NIK','Terdeteksi 23 data dengan duplikasi NIK','2 jam yang lalu','warning','Unread'),
('Data belum ditindaklanjuti','156 data ATS belum ada tindak lanjut','5 jam yang lalu','danger','Unread'),
('Sinkronisasi pending','342 data lapangan belum tersinkron','1 hari yang lalu','info','Unread');

insert into public.app_users (name,email,role,wilayah,status) values
('Yohanis Tabuni, S.Pd','admin@papuatengah.go.id','Admin Provinsi','Papua Tengah','Aktif'),
('Maria M.','maria.petugas@papuatengah.go.id','Petugas Lapangan','Mimika','Aktif'),
('Yonas Tabuni','yonas.petugas@papuatengah.go.id','Petugas Lapangan','Nabire','Aktif'),
('Kepala Dinas Pendidikan','kadis@papuatengah.go.id','Kepala Dinas','Papua Tengah','Aktif');
