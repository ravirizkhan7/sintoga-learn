/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'admin' | 'guru' | 'siswa';

export interface User {
  id: number;
  email: string;
  nama_lengkap: string;
  role: Role;
  nisn?: string;
  id_jurusan?: number;
  tahun_masuk?: string;
}

export interface Jurusan {
  id: number;
  nama_jurusan: string;
  kode_jurusan: string;
}

export interface DaftarUjian {
  id: number;
  id_guru: number;
  kelas: string;
  jurusan_id: number;
  tahun_ajaran: string;
  judul_ujian: string;
  tipe_ujian: 'STS' | 'UTS' | 'UAS' | 'Harian';
  semester: boolean; // true for Ganjil (1), false for Genap (0)
  kode_ujian: string;
  durasi_menit: number;
  waktu_mulai: string; // ISO string
  waktu_selesai: string; // ISO string
  status_aktif: boolean;
}

export interface BankSoal {
  id: number;
  id_ujian: number;
  teks_soal: string;
  tipe_soal: 'objektif' | 'ganda_kompleks' | 'menjodohkan' | 'isian' | 'essay';
  jalur_gambar?: string;
}

export interface PilihanJawaban {
  id: number;
  id_soal: number;
  teks_pilihan?: string;
  teks_pasangan?: string;
  apakah_benar: boolean;
  persentase_nilai: number;
}

export interface PengaturanUjian {
  id: number;
  id_ujian: number;
  bobot_objektif: number;
  bobot_ganda_kompleks: number;
  bobot_menjodohkan: number;
  bobot_isian: number;
  bobot_essay: number;
}

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
  jawaban_teks?: string; // For isian/essay
  id_pilihan_terpilih?: number[]; // IDs of PilihanJawaban
  pasangan_terpilih?: { [key: string]: string }; // For matching
  skor?: number; // Nilai dari guru (0-100 atau poin)
  komentar_guru?: string;
}

export interface KonfigurasiSistem {
  ip_gateway_sekolah: string;
  is_lock_lokasi_aktif: boolean;
}
