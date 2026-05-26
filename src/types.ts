export type Role = 'superadmin' | 'admin' | 'guru' | 'siswa';

export interface User {
  id: number;
  email: string;
  nama: string;
  role: Role;
  nisn?: string;
  jurusan_id?: number;
}

export interface Jurusan {
  id: number;
  nama_jurusan: string;
  kode_jurusan: string;
}

// ─── Ujian ────────────────────────────────────────────────────
export interface DaftarUjian {
  id: number;
  guru_id: number;               // ← fix: id_guru → guru_id (sesuai API)
  kelas: string;
  tahun_ajar: string;            // ← fix: tahun_ajaran → tahun_ajar
  judul_ujian: string;
  tipe_ujian: 'sts' | 'uts' | 'uas' | 'harian'; // ← fix: lowercase sesuai backend validasi
  semester: 'ganjil' | 'genap'; // ← fix: boolean → string sesuai API
  kode_ujian: string | null;
  durasi_menit: number;
  tanggal_ujian: string;         // ← tambah: ada di API
  waktu_mulai: string;
  waktu_selesai: string;
  status: 'draft' | 'published' | 'ongoing' | 'finished'; // ← fix: status_aktif → status
}

// ─── Soal ─────────────────────────────────────────────────────
export interface BankSoal {
  id: number;
  ujian_id: number;              // ← fix: id_ujian → ujian_id (sesuai API)
  teks_soal: string;
  tipe_soal: 'objektif' | 'ganda_kompleks' | 'menjodohkan' | 'isian' | 'essay';
  path_gambar?: string | null;   // ← fix: jalur_gambar → path_gambar (sesuai API)
  pilihan_jawaban?: PilihanJawaban[]; // ← tambah: API return nested
}

// ─── Pilihan Jawaban ──────────────────────────────────────────
export interface PilihanJawaban {
  id?: number;
  teks_pilihan?: string;
  teks_pasangan?: string;
  is_true: boolean;              // ← fix: apakah_benar → is_true (sesuai API)
  persentase_nilai: number;
}

// ─── Internal only (tidak dikirim ke API) ─────────────────────
export interface PilihanInternal extends PilihanJawaban {
  _id: number;                   // ← key lokal React, dibuang sebelum kirim
}

// ─── Pengaturan Ujian ─────────────────────────────────────────
export interface PengaturanUjian {
  id: number;
  ujian_id: number;              // ← fix: id_ujian → ujian_id
  bobot_objektif: number;
  bobot_ganda_kompleks: number;
  bobot_menjodohkan: number;
  bobot_isian: number;
  bobot_essay: number;
}

// ─── State form soal baru ─────────────────────────────────────
export interface NewSoalState {
  tipe_soal: BankSoal['tipe_soal'];
  teks_soal: string;
  gambarFile: File | null;
  gambarPreview: string;
  gambarHapus: boolean;
  pilihan: PilihanInternal[];
}

export interface BobotForm {
  bobot_objektif: number;
  bobot_ganda_kompleks: number;
  bobot_menjodohkan: number;
  bobot_isian: number;
  bobot_essay: number;
}

// ─── Ujian Siswa ──────────────────────────────────────────────
export interface UjianSiswa {
  id: number;
  id_ujian: number;
  id_siswa: number;
  status: 'pengerjaan' | 'dikirim' | 'dinilai';
  nilai_akhir?: number;
  waktu_mulai: string;
  waktu_selesai?: string;
}

export interface JawabanSiswa {
  id: number;
  id_ujian_siswa: number;
  id_soal: number;
  jawaban_teks?: string;
  id_pilihan_terpilih?: number[];
  pasangan_terpilih?: Record<string, string>;
  skor?: number;
  komentar_guru?: string;
}

export interface KonfigurasiSistem {
  ip_gateway_sekolah: string;
  is_lock_lokasi_aktif: boolean;
}