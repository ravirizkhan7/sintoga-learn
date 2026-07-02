import { useState } from 'react';
import { Search, Play, AlertCircle, X, ShieldAlert, BadgeCheck, RefreshCcw, MapPin } from 'lucide-react';
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

export default function DashboardSiswa() {
  const [examCode, setExamCode] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ujianPreview, setUjianPreview] = useState<CheckCodeResult | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * STEP 1: VALIDASI GPS + LocalStorage
   * ═══════════════════════════════════════════════════════════════════════
   * Dipanggil PERTAMA kali saat user klik "MASUK PANEL"
   * - Coba ambil GPS
   * - Jika gagal, fallback ke localStorage (id_pc_lab)
   * - Kirim ke backend untuk validasi
   */
  const handleValidasiAkses = async () => {
    if (!examCode.trim()) {
      setErrorStatus('Masukkan kode ujian terlebih dahulu.');
      setTimeout(() => setErrorStatus(null), 3000);
      return;
    }

    try {
      setIsChecking(true);
      setValidationStatus('Memeriksa keamanan perangkat...');
      setErrorStatus(null);

      // Cek apakah browser support geolocation
      if (navigator.geolocation) {
        // Coba ambil GPS
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // GPS BERHASIL
            kirimValidasiKeBackend({
              metode: 'GPS',
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              id_pc: localStorage.getItem('id_pc_lab') || null,
            });
          },
          (error) => {
            // GPS GAGAL -> Fallback ke LocalStorage
            console.warn('GPS Error:', error.message);
            fallbackKeLocalStorage();
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      } else {
        // Browser tidak support GPS -> Fallback
        fallbackKeLocalStorage();
      }
    } catch (err) {
      setErrorStatus('Terjadi kesalahan saat memeriksa perangkat.');
      setIsChecking(false);
    }
  };

  /**
   * FALLBACK: Jika GPS gagal, gunakan localStorage
   */
  const fallbackKeLocalStorage = () => {
    const idPcStored = localStorage.getItem('id_pc_lab');

    if (!idPcStored) {
      setValidationStatus(null);
      setErrorStatus('GPS tidak aktif dan perangkat Anda belum terdaftar!');
      setIsChecking(false);
      return;
    }

    kirimValidasiKeBackend({
      metode: 'LOCAL_STORAGE',
      id_pc: idPcStored,
    });
  };

  /**
   * Kirim validasi ke backend
   */
  const kirimValidasiKeBackend = async (payload: any) => {
    try {
      setValidationStatus('Memverifikasi dengan server...');

      const res = await api.post('/validasi-akses', payload);

      if (res.data.success) {
        setValidationStatus(res.data.message);
        // Validasi berhasil, lanjut ke step 2 (check-code)
        await handleEnterExam();
      } else {
        setErrorStatus(res.data.message);
        setValidationStatus(null);
        setIsChecking(false);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memverifikasi perangkat.';
      setErrorStatus(msg);
      setValidationStatus(null);
      setIsChecking(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * STEP 2: CEK KODE UJIAN
   * ═══════════════════════════════════════════════════════════════════════
   * Dipanggil SETELAH validasi GPS/LocalStorage berhasil
   */
  const handleEnterExam = async () => {
    try {
      setValidationStatus('Mengecek kode ujian...');

      const res = await api.get('/ujian/check-code', {
        params: { kode_ujian: examCode.trim().toUpperCase() },
      });

      const data: CheckCodeResult = res.data?.data;
      setUjianPreview(data);
      setShowConfirmModal(true);
      setValidationStatus(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Kode ujian tidak valid atau ujian tidak aktif.';
      setErrorStatus(msg);
      setValidationStatus(null);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * STEP 3: MULAI UJIAN
   * ═══════════════════════════════════════════════════════════════════════
   * Dipanggil saat user klik "MULAI SESI UJIAN" di modal
   */
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
            Verifikasi perangkat melalui GPS atau ID komputer laboratorium yang terdaftar.
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
                onKeyDown={(e) => e.key === 'Enter' && !isChecking && handleValidasiAkses()}
                disabled={isChecking}
              />
            </div>
            <button
              onClick={handleValidasiAkses}
              disabled={isChecking}
              className="w-full sm:w-auto px-10 py-4 bg-light-blue hover:bg-white hover:text-navy text-white font-black rounded-lg text-sm uppercase tracking-tighter transition-all active:scale-95 shadow-xl shadow-light-blue/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isChecking
                ? <><RefreshCcw size={14} className="animate-spin" /> MEMERIKSA...</>
                : <><MapPin size={14} /> MASUK PANEL</>}
            </button>
          </div>

          <AnimatePresence>
            {validationStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 inline-flex items-center gap-2 text-light-blue font-bold uppercase text-[10px] tracking-widest"
              >
                <RefreshCcw size={14} className="animate-spin" />
                {validationStatus}
              </motion.div>
            )}
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
            { num: '01', title: 'Verifikasi Perangkat', desc: 'Sistem secara otomatis memeriksa lokasi GPS atau ID komputer laboratorium yang terdaftar di database.' },
            { num: '02', title: 'Input Kode Ujian', desc: 'Masukkan kode unik ujian yang telah divalidasi oleh proktor atau pengawas ruangan pada panel di atas.' },
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