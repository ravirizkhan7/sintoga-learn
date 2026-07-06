import { useState } from 'react';
import { Search, Play, AlertCircle, X, ShieldAlert, BadgeCheck, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/axios';

interface UjianInfo {
  judul_ujian: string;
  durasi_menit: string | number;
  waktu_mulai: string;
  waktu_selesai: string;
}

interface SiswaUjian {
  id: number;
  ujian_id: number;
  siswa_id: number;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
  urutan_soal: any[];
}

interface RedeemResult {
  siswa_ujian: SiswaUjian;
  ujian: UjianInfo;
  soals: any;
}

interface CheckCodeResult {
  judul_ujian: string;
  durasi_menit: string | number;
  waktu_mulai: string;
  waktu_selesai: string;
}

interface ValidasiAksesResult {
  metode: string;
  nama_pc: string;
}

// ─── Helper: id_pc diambil dari perangkat yang SUDAH didaftarkan lewat ─────
// halaman Konfigurasi (lihat Konfigurasi.tsx → DEVICE_STORAGE_KEY).
// Key HARUS sama persis dengan yang dipakai di sana, karena id yang
// tersimpan adalah id hasil POST /perangkat, bukan id acak/UUID.
const DEVICE_STORAGE_KEY = 'device_id';

function getRegisteredIdPc(): string | null {
  return localStorage.getItem(DEVICE_STORAGE_KEY);
}

// ─── Helper: ambil koordinat lokasi (lat, lon) via browser geolocation ─────
function getGeolocation(): Promise<{ lat: string; lon: string }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation tidak didukung oleh browser ini.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: String(position.coords.latitude),
          lon: String(position.coords.longitude),
        });
      },
      (error) => {
        let msg = 'Gagal mengambil lokasi perangkat.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Akses lokasi ditolak. Aktifkan izin lokasi untuk melanjutkan.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Lokasi perangkat tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu pengambilan lokasi habis, coba lagi.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export default function DashboardSiswa() {
  const [examCode, setExamCode] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ujianPreview, setUjianPreview] = useState<CheckCodeResult | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  // ─── Step 1: Cek kode — GET /ujian/check-code ───────────────────────────
  // Hanya validasi, TIDAK insert ke database sama sekali.
  // Siswa bisa batal setelah ini tanpa efek apapun ke DB.
  //
  // ─── Step 2: Validasi akses — POST /validasi-akses ──────────────────────
  // Cukup SALAH SATU metode yang valid, tidak perlu keduanya.
  // Urutan: 1) lokasi (GPS/lat-lon) dicoba dulu, 2) kalau gagal baru
  // fallback ke id_pc (LOCAL_STORAGE) dari perangkat yang sudah terdaftar.
  // Begitu salah satu berhasil, langsung lanjut ke modal konfirmasi.
  //
  // PENTING: pesan penolakan yang ditampilkan ke siswa HARUS persis pesan
  // dari backend (field `message` di response error), bukan pesan buatan
  // frontend sendiri — supaya siswa/admin tau persis alasan sebenarnya
  // (mis. "diluar radius lokasi", "perangkat tidak terdaftar untuk ujian ini", dst).
  const tryValidasiAkses = async (): Promise<ValidasiAksesResult> => {
    let lastErrorMessage: string | null = null;

    // Percobaan 1: via lokasi (geolocation)
    try {
      const geo = await getGeolocation();
      const res = await api.post('/validasi-akses', {
        metode: 'GEOLOCATION',
        id_pc: '',
        lat: geo.lat,
        lon: geo.lon,
      });
      return res.data?.data;
    } catch (err: any) {
      // Simpan pesan asli dari backend (kalau memang error dari server, bukan
      // error client seperti geolocation ditolak browser)
      const backendMsg = err?.response?.data?.message;
      console.warn('[tryValidasiAkses] Percobaan GEOLOCATION gagal:', {
        status: err?.response?.status,
        message: backendMsg || err?.message,
      });
      if (backendMsg) lastErrorMessage = backendMsg;
    }

    // Percobaan 2: via id_pc (perangkat yang sudah didaftarkan di Konfigurasi)
    const idPc = getRegisteredIdPc();
    if (idPc) {
      try {
        const res = await api.post('/validasi-akses', {
          metode: 'LOCAL_STORAGE',
          id_pc: idPc,
          lat: '',
          lon: '',
        });
        return res.data?.data;
      } catch (err: any) {
        const backendMsg = err?.response?.data?.message;
        console.warn('[tryValidasiAkses] Percobaan LOCAL_STORAGE (id_pc=' + idPc + ') gagal:', {
          status: err?.response?.status,
          message: backendMsg || err?.message,
        });
        // Pesan dari percobaan id_pc dianggap paling relevan karena ini percobaan terakhir
        if (backendMsg) lastErrorMessage = backendMsg;
      }
    } else {
      console.warn('[tryValidasiAkses] Tidak ada id_pc di localStorage, lewati percobaan LOCAL_STORAGE.');
    }

    // Lempar pesan ASLI dari backend. Kalau kedua percobaan tidak ada pesan
    // dari server sama sekali (mis. error jaringan murni), baru pakai fallback umum.
    throw new Error(lastErrorMessage || 'Validasi akses gagal, silakan coba lagi.');
  };

  const handleEnterExam = async () => {
    if (!examCode.trim()) {
      setErrorStatus('Masukkan kode ujian terlebih dahulu.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    try {
      setIsChecking(true);
      setErrorStatus(null);

      // Step 1: cek kode ujian
      const res = await api.get('/ujian/check-code', {
        params: { kode_ujian: examCode.trim().toUpperCase() },
      });

      const data: CheckCodeResult = res.data?.data;

      // Step 2: validasi akses — cukup salah satu (id_pc ATAU lokasi)
      try {
        const validasiData = await tryValidasiAkses();
        // Validasi akses lolos → baru buka modal konfirmasi
        console.log('Validasi akses berhasil:', validasiData);
      } catch (validasiErr: any) {
        // Pesan ini sudah berupa pesan asli dari backend (lihat tryValidasiAkses)
        setErrorStatus(validasiErr.message);
        setTimeout(() => setErrorStatus(null), 3000);
        return;
      }

      // Semua tahap lolos → tampilkan modal konfirmasi
      setUjianPreview(data);
      setShowConfirmModal(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kode ujian tidak valid atau ujian tidak aktif.';
      setErrorStatus(msg);
      setTimeout(() => setErrorStatus(null), 3000);
    } finally {
      setIsChecking(false);
    }
  };

  // ─── Step 3: Mulai ujian — POST /ujian/redeem ────────────────────────────
  // Baru di sini insert ke DB + waktu_mulai di-set.
  // Dipanggil hanya ketika siswa klik "Mulai Sesi Ujian".
  const handleStartExam = async () => {
    if (!ujianPreview || isStarting) return;

    try {
      setIsStarting(true);

      const res = await api.post('/ujian/redeem', {
        kode_ujian: examCode.trim().toUpperCase(),
      });

      const data: RedeemResult = res.data?.data;
      setShowConfirmModal(false);

      navigate(`/siswa/ujian/${data.siswa_ujian.id}`, {
        state: {
          siswaUjian: data.siswa_ujian,
          ujianInfo: data.ujian,
          soals: data.soals,
        },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memulai ujian, coba lagi.';
      setErrorStatus(msg);
      setShowConfirmModal(false);
      setTimeout(() => setErrorStatus(null), 3000);
    } finally {
      setIsStarting(false);
    }
  };

  const handleCloseModal = () => {
    if (isStarting) return;
    setShowConfirmModal(false);
    setUjianPreview(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Section / Portal Card */}
      <div className="bg-navy rounded-lg p-8 text-white relative overflow-hidden shadow-xl border-b-8 border-light-blue">
        <div className="absolute top-0 right-0 w-64 h-64 bg-light-blue/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded border border-white/20 mb-4 animate-pulse">
            <ShieldAlert size={14} className="text-light-blue" />
            <span className="text-[9px] font-black uppercase tracking-widest">Sistem Ujian Terintegrasi v2.0</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter mb-2 uppercase leading-none">Portal Akses Ujian</h1>
          <p className="text-blue-100/70 text-xs font-bold uppercase tracking-widest max-w-md mx-auto lg:mx-0">
            Otorisasi pengerjaan soal dimulai dengan validasi kode yang diberikan oleh pengawas.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto lg:mx-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="INPUT KODE DISINI..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 border-2 border-white/20 rounded-lg backdrop-blur-md outline-none focus:bg-white/20 focus:border-light-blue transition-all placeholder:text-white/30 font-black uppercase text-base tracking-widest shadow-inner"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isChecking && handleEnterExam()}
              />
            </div>
            <button
              onClick={handleEnterExam}
              disabled={isChecking}
              className="w-full sm:w-auto px-10 py-4 bg-light-blue hover:bg-white hover:text-navy text-white font-black rounded-lg text-sm uppercase tracking-tighter transition-all active:scale-95 shadow-xl shadow-light-blue/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isChecking
                ? <><RefreshCcw size={14} className="animate-spin" /> MENGECEK...</>
                : 'MASUK UJIAN'}
            </button>
          </div>

          <AnimatePresence>
            {errorStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 inline-flex items-center gap-2 text-red-400 font-bold uppercase text-[10px] tracking-widest"
              >
                <AlertCircle size={14} />
                {errorStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-lg p-8 border border-exam-border shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <BadgeCheck className="text-light-blue" size={20} />
          <h2 className="text-xs font-black text-navy uppercase tracking-[0.3em]">
            Prosedur Standar Ujian Digital
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {[
            { num: '01', title: 'Persiapan Sesi', desc: 'Masukkan kode unik ujian yang telah divalidasi oleh proktor atau pengawas ruangan pada panel di atas.' },
            { num: '02', title: 'Monitoring Ketat', desc: 'Dilarang berpindah tab atau menutup browser. Sistem akan mendeteksi aktivitas mencurigakan secara otomatis.' },
            { num: '03', title: 'Finalisasi Data', desc: 'Pastikan semua jawaban terisi sebelum klik tombol selesai. Data yang terkirim tidak dapat dianulir kembali.' },
          ].map((item) => (
            <div key={item.num} className="space-y-3 relative">
              <span className="text-4xl font-black text-slate-50 absolute -top-4 -left-2 z-0">{item.num}</span>
              <div className="relative z-10">
                <h4 className="font-black text-xs text-navy uppercase tracking-tight mb-2">{item.title}</h4>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && ujianPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-xl border border-exam-border shadow-2xl w-full max-w-lg relative z-[110] overflow-hidden"
            >
              <div className="bg-navy p-6 border-b-4 border-light-blue text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-light-blue px-2 py-0.5 bg-light-blue/10 rounded">
                    KONFIRMASI INTEGRITAS
                  </span>
                  <button onClick={handleCloseModal} disabled={isStarting} className="text-white/50 hover:text-white transition disabled:opacity-30">
                    <X size={20} />
                  </button>
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                  {ujianPreview.judul_ujian}
                </h3>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DURASI</p>
                    <p className="text-sm font-black text-navy">{ujianPreview.durasi_menit} MENIT</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">WAKTU MULAI</p>
                    <p className="text-sm font-black text-navy">{ujianPreview.waktu_mulai}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-navy uppercase tracking-widest border-b border-slate-100 pb-2">
                    Aturan & Protokol Ujian
                  </h4>
                  <ul className="space-y-3">
                    {[
                      'Dilarang keras memberikan atau menerima bantuan dalam bentuk apapun (Mencontek).',
                      'Sistem mendeteksi jika anda berpindah tab, membuka window baru, atau minimize browser.',
                      'Jika terdeteksi meninggalkan halaman pengerjaan, ujian akan otomatis dianggap SELESAI.',
                      'Menutup aplikasi secara paksa akan langsung mengirimkan state jawaban terakhir.',
                      'Gunakan koneksi internet yang stabil untuk mencegah data loss saat pengiriman.',
                    ].map((rule, idx) => (
                      <li key={idx} className="flex gap-3 text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={handleCloseModal}
                    disabled={isStarting}
                    className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-lg border border-slate-200 transition-all disabled:opacity-50"
                  >
                    KEMBALI
                  </button>
                  <button
                    onClick={handleStartExam}
                    disabled={isStarting}
                    className="flex-[2] py-4 bg-navy text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-xl shadow-navy/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isStarting
                      ? <><RefreshCcw size={14} className="animate-spin" /> MEMULAI...</>
                      : <><Play size={14} className="fill-current" /> MULAI SESI UJIAN</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}