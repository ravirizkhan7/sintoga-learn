import { 
  User, 
  Jurusan, 
  DaftarUjian, 
  BankSoal, 
  KonfigurasiSistem, 
  UjianSiswa, 
  PengaturanUjian,
  PilihanJawaban,
  JawabanSiswa
} from '../types';

export const mockUsers: User[] = [
  { id: 1, email: 'admin@gmail.com', nama_lengkap: 'Super Admin', role: 'admin' },
  { id: 2, email: 'guru@gmail.com', nama_lengkap: 'Budi Santoso, S.Pd', role: 'guru' },
  { id: 3, email: 'siswa@gmail.com', nama_lengkap: 'Siswa Teladan', role: 'siswa', nisn: '12345678', id_jurusan: 1 },
  { id: 4, email: 'calon@gmail.com', nama_lengkap: 'Calon Siswa Baru', role: 'siswa' },
];

export const mockJurusan: Jurusan[] = [
  { id: 1, nama_jurusan: 'Rekayasa Perangkat Lunak', kode_jurusan: 'RPL' },
  { id: 2, nama_jurusan: 'Teknik Komputer Jaringan', kode_jurusan: 'TKJ' },
];

export const mockDaftarUjian: DaftarUjian[] = [
  {
    id: 1,
    id_guru: 2,
    kelas: "XII",
    jurusan_id: 1,
    tahun_ajaran: "2023/2024",
    judul_ujian: "Ulangan Harian Jaringan",
    kode_ujian: "RPL77",
    durasi_menit: 60,
    tipe_ujian: "Harian",
    semester: true,
    status_aktif: true,
    waktu_mulai: "2024-01-01T08:00:00Z",
    waktu_selesai: "2024-12-31T17:00:00Z",
  },
  {
    id: 2,
    id_guru: 2,
    kelas: "XI",
    jurusan_id: 2,
    tahun_ajaran: "2023/2024",
    judul_ujian: "Ujian Akhir Dasar Desain",
    kode_ujian: "DKV99",
    durasi_menit: 90,
    tipe_ujian: "UAS",
    semester: true,
    status_aktif: false,
    waktu_mulai: "2024-06-01T08:00:00Z",
    waktu_selesai: "2024-06-30T17:00:00Z",
  }
];

export const mockBankSoal: BankSoal[] = [
  { id: 101, id_ujian: 1, teks_soal: "Apa fungsi Router dalam sebuah jaringan komputer?", tipe_soal: "objektif" },
  { id: 102, id_ujian: 1, teks_soal: "Manakah yang merupakan perangkat input? (Pilih semua yang benar)", tipe_soal: "ganda_kompleks" },
  { id: 103, id_ujian: 1, teks_soal: "Pasangkan perangkat dengan fungsinya:", tipe_soal: "menjodohkan" },
  { id: 104, id_ujian: 1, teks_soal: "Sebutkan kepanjangan dari CPU!", tipe_soal: "isian" },
  { id: 105, id_ujian: 1, teks_soal: "Jelaskan perbedaan antara TCP dan UDP!", tipe_soal: "essay" }
];

export const mockPilihanJawaban: PilihanJawaban[] = [
  // Soal 101 (Objektif)
  { id: 1, id_soal: 101, teks_pilihan: "Menghubungkan dua atau lebih jaringan berbeda", apakah_benar: true, persentase_nilai: 100 },
  { id: 2, id_soal: 101, teks_pilihan: "Mengubah sinyal analog menjadi digital", apakah_benar: false, persentase_nilai: 0 },
  { id: 3, id_soal: 101, teks_pilihan: "Menyimpan data permanen", apakah_benar: false, persentase_nilai: 0 },
  { id: 4, id_soal: 101, teks_pilihan: "Mencetak dokumen", apakah_benar: false, persentase_nilai: 0 },
  
  // Soal 102 (Ganda Kompleks)
  { id: 5, id_soal: 102, teks_pilihan: "Mouse", apakah_benar: true, persentase_nilai: 50 },
  { id: 6, id_soal: 102, teks_pilihan: "Keyboard", apakah_benar: true, persentase_nilai: 50 },
  { id: 7, id_soal: 102, teks_pilihan: "Monitor", apakah_benar: false, persentase_nilai: 0 },
  { id: 8, id_soal: 102, teks_pilihan: "CPU", apakah_benar: false, persentase_nilai: 0 },
  
  // Soal 103 (Menjodohkan)
  { id: 9, id_soal: 103, teks_pilihan: "RAM", teks_pasangan: "Penyimpanan Sementara", apakah_benar: true, persentase_nilai: 33 },
  { id: 10, id_soal: 103, teks_pilihan: "HDD", teks_pasangan: "Penyimpanan Permanen", apakah_benar: true, persentase_nilai: 33 },
  { id: 11, id_soal: 103, teks_pilihan: "CPU", teks_pasangan: "Otak Komputer", apakah_benar: true, persentase_nilai: 34 },
  // Distractors
  { id: 12, id_soal: 103, teks_pilihan: "", teks_pasangan: "Perangkat Lunak Pengolah Kata", apakah_benar: false, persentase_nilai: 0 },
  { id: 13, id_soal: 103, teks_pilihan: "", teks_pasangan: "Alat Pemindai Dokumen", apakah_benar: false, persentase_nilai: 0 },
];

export const mockPengaturanUjianData: PengaturanUjian[] = [
  {
    id: 1,
    id_ujian: 1,
    bobot_objektif: 20,
    bobot_ganda_kompleks: 20,
    bobot_menjodohkan: 20,
    bobot_isian: 20,
    bobot_essay: 20
  }
];

export const mockKonfigurasiSistem: KonfigurasiSistem = {
  ip_gateway_sekolah: "192.168.1.1",
  is_lock_lokasi_aktif: false
};

export const mockUjianSiswa: UjianSiswa[] = [
  { id: 1, id_ujian: 1, id_siswa: 3, status: 'dikirim', waktu_mulai: "2024-01-01T08:00:00Z", waktu_selesai: "2024-01-01T09:00:00Z" }
];

export const mockJawabanSiswa: JawabanSiswa[] = [
  { 
    id: 1, 
    id_ujian_siswa: 1, 
    id_soal: 104, 
    jawaban_teks: "Central Processing Unit",
  },
  { 
    id: 2, 
    id_ujian_siswa: 1, 
    id_soal: 105, 
    jawaban_teks: "TCP itu connection oriented sedangkan UDP itu connectionless. TCP lebih lambat tapi handal, UDP cepat tapi bisa hilang datanya.",
  }
];
