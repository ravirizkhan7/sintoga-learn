import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  Grid,
  RefreshCcw,
  CheckCircle2,
  X,
  ShieldAlert,
  Trash2,
  Clock,
  XCircle,
} from 'lucide-react';
import { PilihanJawaban } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import api from '../../lib/axios';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SoalResponse {
  id: number;
  id_ujian: number;
  teks_soal: string;
  tipe_soal: 'objektif' | 'ganda_kompleks' | 'isian' | 'essay' | 'menjodohkan';
  pilihan_jawaban: PilihanJawaban[];
}

interface LocationState {
  siswaUjian: {
    id: number;
    ujian_id: number;
    siswa_id: number;
    waktu_mulai: string;
    waktu_selesai: string;
    status: string;
    urutan_soal: number[];
  };
  ujianInfo: {
    judul_ujian: string;
    durasi_menit: string | number;
    waktu_mulai: string;
    waktu_selesai: string;
    kode_ujian?: string;
    tipe_ujian?: string;
  };
  soals: SoalResponse[] | null;
}

// Alasan ujian selesai
type FinishReason = 'manual' | 'timeout' | 'violation';

// ─────────────────────────────────────────────
// Seeded shuffle
// ─────────────────────────────────────────────
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let m = shuffled.length, t, i;
  let currentSeed = seed;
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };
  while (m) {
    i = Math.floor(random() * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
  }
  return shuffled;
};

// ─────────────────────────────────────────────
// MatchingInterface
// ─────────────────────────────────────────────
interface MatchingProps {
  soalId: number;
  pilihan: PilihanJawaban[];
  jawaban: { [key: string]: string };
  onAnswer: (val: { [key: string]: string }) => void;
}

function MatchingInterface({ soalId, pilihan, jawaban, onAnswer }: MatchingProps) {
  const { user } = useAuth();
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs  = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const rightRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [lines, setLines] = useState<
    { from: string; to: string; x1: number; y1: number; x2: number; y2: number }[]
  >([]);

  const statements = useMemo(
    () => pilihan.filter(p => !!p.teks_pilihan).map(p => p.teks_pilihan!),
    [pilihan, soalId],
  );

  const pairs = useMemo(() => {
    const p = pilihan.map(p => p.teks_pasangan!).filter(Boolean);
    const seed = soalId + (user?.id || 0);
    return seededShuffle(p, seed);
  }, [pilihan, soalId, user?.id]);

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines = Object.entries(jawaban)
      .map(([left, right]) => {
        const leftEl  = leftRefs.current[left];
        const rightEl = rightRefs.current[right];
        if (leftEl && rightEl) {
          const leftRect  = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();
          return {
            from: left, to: right,
            x1: leftRect.right  - containerRect.left,
            y1: leftRect.top    + leftRect.height / 2  - containerRect.top,
            x2: rightRect.left  - containerRect.left,
            y2: rightRect.top   + rightRect.height / 2 - containerRect.top,
          };
        }
        return null;
      })
      .filter(Boolean) as any[];
    setLines(newLines);
  }, [jawaban]);

  useLayoutEffect(() => {
    updateLines();
    const t = setTimeout(updateLines, 50);
    window.addEventListener('resize', updateLines);
    return () => { window.removeEventListener('resize', updateLines); clearTimeout(t); };
  }, [updateLines]);

  const removeMatch = (left: string) => {
    const next = { ...jawaban };
    delete next[left];
    onAnswer(next);
  };

  return (
    <div
      ref={containerRef}
      className="relative grid grid-cols-2 gap-10 lg:gap-20 p-2 lg:p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        {lines.map(line => (
          <motion.path
            key={`${line.from}-${line.to}`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            d={`M ${line.x1} ${line.y1} C ${line.x1 + 30} ${line.y1}, ${line.x2 - 30} ${line.y2}, ${line.x2} ${line.y2}`}
            stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" fill="transparent"
            className="drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]"
          />
        ))}
      </svg>

      {/* Kiri */}
      <div className="space-y-3 z-20">
        {/* FIX: <div> bukan <p> agar tidak ada block element di dalam inline element */}
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-light-blue" />
          Pernyataan Utama
        </div>
        {statements.map(text => (
          <div key={text} className="flex items-center gap-2 group">
            <button
              ref={el => { leftRefs.current[text] = el; }}
              onClick={() => setActiveLeft(text === activeLeft ? null : text)}
              className={cn(
                'flex-1 p-3 lg:p-4 rounded-lg border text-left text-[11px] font-black uppercase tracking-tight transition-all shadow-sm ring-offset-2',
                activeLeft === text
                  ? 'border-light-blue bg-blue-50 text-light-blue ring-2 ring-light-blue/50 scale-[1.02]'
                  : jawaban[text]
                  ? 'border-exam-success bg-green-50 text-navy'
                  : 'border-white bg-white text-slate-500 hover:border-slate-200',
              )}
            >
              {text}
            </button>
            <AnimatePresence>
              {jawaban[text] && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                  onClick={() => removeMatch(text)}
                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full bg-white border border-red-50 shadow-sm transition-colors"
                >
                  <Trash2 size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Kanan */}
      <div className="space-y-3 z-20">
        {/* FIX: <div> bukan <p> */}
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-right flex items-center justify-end gap-2">
          Pasangan Jawaban
          <div className="w-1.5 h-1.5 rounded-full bg-exam-success" />
        </div>
        {pairs.map(text => {
          const isPaired = Object.values(jawaban).includes(text);
          return (
            <button
              key={text}
              ref={el => { rightRefs.current[text] = el; }}
              onClick={() => {
                if (activeLeft) { onAnswer({ ...jawaban, [activeLeft]: text }); setActiveLeft(null); }
              }}
              className={cn(
                'w-full p-3 lg:p-4 rounded-lg border text-right text-[11px] font-black uppercase tracking-tight transition-all shadow-sm ring-offset-2',
                isPaired
                  ? 'border-exam-success bg-green-50 text-navy'
                  : activeLeft
                  ? 'border-light-blue/20 bg-blue-50/10 text-navy hover:bg-blue-50 hover:border-light-blue'
                  : 'border-white bg-white text-slate-500 hover:border-slate-200',
              )}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function RuangUjian() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user }   = useAuth();

  const locationState  = location.state as LocationState | null;
  const siswaUjianId   = locationState?.siswaUjian?.id ?? Number(id);
  const ujianInfo      = locationState?.ujianInfo ?? null;
  const urutanSoal     = locationState?.siswaUjian?.urutan_soal ?? [];

  // ── State soal ────────────────────────────────────────
  const [soalList, setSoalList]             = useState<SoalResponse[]>([]);
  const [isLoadingSoal, setIsLoadingSoal]   = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiError, setApiError]             = useState<string | null>(null);

  // ── State navigasi & jawaban ──────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban]       = useState<{ [soalId: number]: any }>({});
  const [flagged, setFlagged]       = useState<{ [soalId: number]: boolean }>({});

  // ── Timer ─────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(0);

  // ── UI ───────────────────────────────────────────────
  const [showConfirm, setShowConfirm]       = useState(false);
  const [isSidebarOpen, setIsSidebarOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [isFinished, setIsFinished]         = useState(false);
  const [finishReason, setFinishReason]     = useState<FinishReason>('manual');
  const [tempScore, setTempScore]           = useState(0);

  // ── Keamanan ─────────────────────────────────────────
  const [violations, setViolations]   = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<'fullscreen' | 'visibility'>('fullscreen');

  // ── Cache soal ────────────────────────────────────────
  const soalCacheRef = useRef<{ [soalId: number]: SoalResponse }>({});

  // ── Guard refs — FIX UTAMA 422 ────────────────────────
  // Menggunakan ref (bukan state) agar guard selalu baca nilai terkini
  // tanpa tergantung stale closure di event listener.
  const isSubmittingRef = useRef(false);
  const isFinishedRef   = useRef(false);

  // ─────────────────────────────────────────────
  // Guard: redirect jika tidak ada state
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!locationState?.siswaUjian) {
      navigate('/siswa', { replace: true });
      return;
    }

    if (locationState.soals && Array.isArray(locationState.soals) && locationState.soals.length > 0) {
      const soalsArr: SoalResponse[] = locationState.soals;
      soalsArr.forEach(s => { soalCacheRef.current[s.id] = s; });
      setSoalList(soalsArr);
    }

    const durasi = Number(locationState.ujianInfo?.durasi_menit ?? 90);
    setTimeLeft(durasi * 60);
    setIsInitializing(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // Fetch soal per-index
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isInitializing) return;
    if (soalList[currentIdx]) return;
    if (urutanSoal.length === 0) return;

    const soalId = urutanSoal[currentIdx];
    if (!soalId) return;

    if (soalCacheRef.current[soalId]) {
      setSoalList(prev => { const u = [...prev]; u[currentIdx] = soalCacheRef.current[soalId]; return u; });
      return;
    }

    const ujianId = locationState?.siswaUjian?.ujian_id;
    if (!ujianId) return;

    const fetchSoal = async () => {
      try {
        setIsLoadingSoal(true);
        const res = await api.get<{ data: SoalResponse }>(`/ujian/${ujianId}/soal/${soalId}`);
        const soal = res.data?.data ?? res.data;
        soalCacheRef.current[soalId] = soal;
        setSoalList(prev => { const u = [...prev]; u[currentIdx] = soal; return u; });
      } catch (err: any) {
        setApiError(err.response?.data?.message ?? `Gagal memuat soal ${currentIdx + 1}.`);
      } finally {
        setIsLoadingSoal(false);
      }
    };
    fetchSoal();
  }, [isInitializing, currentIdx, urutanSoal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefetch soal berikutnya
  useEffect(() => {
    if (isInitializing || urutanSoal.length === 0) return;
    const nextId = urutanSoal[currentIdx + 1];
    if (!nextId || soalCacheRef.current[nextId]) return;

    const ujianId = locationState?.siswaUjian?.ujian_id;
    if (!ujianId) return;

    api.get<{ data: SoalResponse }>(`/ujian/${ujianId}/soal/${nextId}`)
      .then(res => {
        const soal = res.data?.data ?? res.data;
        soalCacheRef.current[nextId] = soal;
        setSoalList(prev => { const u = [...prev]; if (!u[currentIdx + 1]) u[currentIdx + 1] = soal; return u; });
      })
      .catch(() => {});
  }, [currentIdx, isInitializing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────
  // Auto-save jawaban
  // ─────────────────────────────────────────────
  const saveJawaban = useCallback(async (soalId: number, val: any) => {
    try {
      await api.post(`/ujian/${siswaUjianId}/jawaban`, { id_soal: soalId, jawaban: val });
    } catch (err: any) {
      console.warn('Auto-save gagal:', err.response?.data?.message ?? err.message);
    }
  }, [siswaUjianId]);

  const handleAnswer = (val: any) => {
    const soal = soalList[currentIdx];
    if (!soal) return;
    setJawaban(prev => ({ ...prev, [soal.id]: val }));
    saveJawaban(soal.id, val);
  };

  // ─────────────────────────────────────────────
  // Submit ujian
  // FIX: Guard pakai ref bukan state → tidak ada stale closure
  // ─────────────────────────────────────────────
  const handleFinish = useCallback(async (reason: FinishReason = 'manual') => {
    // Baca ref — selalu nilai terkini, tidak terpengaruh stale closure
    if (isSubmittingRef.current || isFinishedRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      const jawabanPayload = Object.entries(jawaban).map(([soalId, val]) => ({
        id_soal: Number(soalId),
        jawaban: val,
      }));

      const res = await api.post(`/ujian/${siswaUjianId}/submit`, { jawaban: jawabanPayload });

      setTempScore(res.data?.data?.skor_sementara ?? res.data?.skor_sementara ?? res.data?.score ?? 0);
      setFinishReason(reason);
      isFinishedRef.current = true; // set ref dulu
      setIsFinished(true);
    } catch (err: any) {
      // Biarkan retry jika gagal
      isSubmittingRef.current = false;
      setApiError(err.response?.data?.message ?? 'Gagal mengirim jawaban. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [jawaban, siswaUjianId]);

  // Ref ke handleFinish terbaru — agar listener yang di-attach sekali
  // tetap memanggil versi dengan jawaban terkini
  const handleFinishRef = useRef(handleFinish);
  useEffect(() => { handleFinishRef.current = handleFinish; }, [handleFinish]);

  // ─────────────────────────────────────────────
  // Timer
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isInitializing || timeLeft <= 0) {
      if (!isInitializing && timeLeft <= 0 && !isFinishedRef.current) {
        handleFinishRef.current('timeout');
      }
      return;
    }
    const interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isInitializing]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  // ─────────────────────────────────────────────
  // Fullscreen & Security
  // FIX: 
  //   1. Listener di-attach setelah delay 1.5 detik — menghindari false-positive
  //      saat browser sedang proses requestFullscreen (yang bisa bikin
  //      fullscreenchange / visibilitychange fire di awal).
  //   2. Guard pakai isSubmittingRef & isFinishedRef bukan state.
  //   3. handleFinishRef dipakai agar selalu panggil versi jawaban terbaru.
  // ─────────────────────────────────────────────
  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.();
      }
    } catch {}
  };

  useEffect(() => {
    if (isInitializing) return;

    // Minta fullscreen
    const enter = async () => {
      try {
        const el = document.documentElement;
        await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
      } catch {}
    };
    enter();

    // Simpan cleanup listener agar bisa dipanggil saat unmount
    let removeListeners = () => {};

    // Delay 1.5 detik sebelum pasang listener — beri waktu browser selesai
    // proses fullscreen sehingga tidak ada false-positive di awal ujian
    const attachTimeout = setTimeout(() => {
      const onFullscreenChange = () => {
        if (!document.fullscreenElement && !isFinishedRef.current && !isSubmittingRef.current) {
          setViolations(prev => {
            const next = prev + 1;
            if (next >= 3) {
              handleFinishRef.current('violation');
            } else {
              setWarningType('fullscreen');
              setShowWarning(true);
            }
            return next;
          });
        }
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden' && !isFinishedRef.current && !isSubmittingRef.current) {
          handleFinishRef.current('violation');
        }
      };

      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      document.addEventListener('visibilitychange', onVisibility);

      removeListeners = () => {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }, 1500);

    return () => {
      clearTimeout(attachTimeout);
      removeListeners();
      exitFullscreen();
    };
  }, [isInitializing]); // hanya re-run ketika isInitializing berubah

  const handleReEnterFullscreen = async () => {
    setShowWarning(false);
    try { await document.documentElement.requestFullscreen(); } catch {}
  };

  const toggleFlag = () => {
    const soal = soalList[currentIdx];
    if (!soal) return;
    setFlagged(prev => ({ ...prev, [soal.id]: !prev[soal.id] }));
  };

  const totalSoal = urutanSoal.length > 0 ? urutanSoal.length : soalList.length;

  // ─────────────────────────────────────────────
  // Render: Splash
  // ─────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-exam-bg">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="animate-spin text-light-blue" size={40} />
          <p className="text-[10px] font-black text-navy uppercase tracking-widest">Inisialisasi Sesi Ujian...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Render: Error fatal
  // ─────────────────────────────────────────────
  if (!ujianInfo) {
    return (
      <div className="flex items-center justify-center h-screen bg-exam-bg p-4 text-center">
        <div className="bg-white p-10 rounded-lg border border-red-100 shadow-2xl max-w-md w-full">
          <AlertTriangle size={36} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-navy uppercase tracking-tighter mb-3">Sesi Tidak Valid</h2>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Data ujian tidak ditemukan. Silakan kembali ke dashboard dan masukkan kode ujian ulang.
          </p>
          <button
            onClick={() => navigate('/siswa')}
            className="w-full py-3 bg-navy text-white font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Render: Ujian Selesai — 3 varian berdasarkan finishReason
  // ─────────────────────────────────────────────
  if (isFinished) {
    const isManual    = finishReason === 'manual';
    const isTimeout   = finishReason === 'timeout';
    const isViolation = finishReason === 'violation';

    return (
      <div className="flex items-center justify-center h-screen bg-exam-bg p-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="bg-white p-10 rounded-lg border border-exam-border shadow-2xl max-w-md w-full"
        >
          {/* Icon */}
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg',
            isManual    && 'bg-green-50 text-exam-success shadow-green-100',
            isTimeout   && 'bg-yellow-50 text-yellow-500 shadow-yellow-100',
            isViolation && 'bg-red-50 text-red-500 shadow-red-100',
          )}>
            {isManual    && <CheckCircle2 size={48} />}
            {isTimeout   && <Clock size={48} />}
            {isViolation && <XCircle size={48} />}
          </div>

          {/* Judul */}
          <h2 className={cn(
            'text-2xl font-black uppercase italic tracking-tighter mb-3',
            isManual    && 'text-navy',
            isTimeout   && 'text-yellow-600',
            isViolation && 'text-red-600',
          )}>
            {isManual    && 'Ujian Selesai!'}
            {isTimeout   && 'Waktu Habis!'}
            {isViolation && 'Ujian Dihentikan!'}
          </h2>

          {/* Banner alasan — hanya untuk auto-submit */}
          {!isManual && (
            <div className={cn(
              'px-4 py-3 rounded border mb-5 text-[10px] font-black uppercase tracking-widest leading-relaxed',
              isTimeout   && 'bg-yellow-50 border-yellow-100 text-yellow-700',
              isViolation && 'bg-red-50 border-red-100 text-red-600',
            )}>
              {isTimeout
                ? '⏰ Durasi ujian telah berakhir. Semua jawaban yang telah diisi otomatis disimpan dan dikirim ke server.'
                : '🚨 Ujian dihentikan karena sistem mendeteksi pelanggaran integritas akademik (kecurangan). Hubungi guru pengawas.'}
            </div>
          )}

          {/* Skor */}
          <div className="mb-5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Skor Sementara (Objektif):
            </p>
            <h3 className="text-6xl font-black italic tracking-tighter text-navy leading-none">
              {tempScore}
            </h3>
          </div>

          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
            {isManual
              ? 'Jawaban kamu telah berhasil terkirim ke server pusat SMK Sintoga Learn. Soal essay & isian akan dinilai secara manual oleh guru.'
              : 'Semua jawaban yang telah terisi berhasil dikirim ke server. Nilai akhir akan diumumkan oleh guru.'}
          </p>

          <button
            onClick={() => { exitFullscreen(); navigate('/siswa'); }}
            className={cn(
              'w-full py-4 font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl transition-all active:scale-95',
              isManual    && 'bg-navy text-white shadow-navy/20',
              isTimeout   && 'bg-yellow-500 text-white shadow-yellow-200',
              isViolation && 'bg-red-600 text-white shadow-red-200',
            )}
          >
            Kembali ke Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentSoal    = soalList[currentIdx];
  const currentPilihan = currentSoal?.pilihan_jawaban ?? [];

  // ─────────────────────────────────────────────
  // Render: Ruang Ujian Utama
  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-exam-bg relative font-sans overflow-hidden">

      {/* API Error Toast */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white"
          >
            <AlertTriangle size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{apiError}</span>
            <button onClick={() => setApiError(null)} className="ml-2 hover:opacity-70"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrity Alert */}
      <AnimatePresence>
        {violations > 0 && violations < 3 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white"
          >
            <AlertTriangle size={18} className="animate-bounce" />
            <span className="text-xs font-black uppercase tracking-widest">PERINGATAN: PELANGGARAN {violations}/3</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-[60px] bg-navy text-white flex items-center justify-between px-6 border-b-4 border-light-blue shrink-0 z-[60] shadow-xl">
        <div className="text-sm lg:text-xl font-extrabold tracking-widest italic truncate max-w-[120px] lg:max-w-none">
          SINTOGA LEARN
        </div>

        <div className="flex items-center gap-2 lg:gap-4 bg-white/10 px-2 lg:px-4 py-1.5 rounded border border-white/5">
          <span className="text-[8px] lg:text-[10px] font-bold uppercase opacity-80 hidden sm:block">Sisa Waktu</span>
          <span className={cn('text-base lg:text-2xl font-mono font-bold tracking-tighter', timeLeft < 300 && 'text-red-400 animate-pulse')}>
            {formatTime(timeLeft)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block border-r border-white/10 pr-4">
            <div className="text-sm font-bold">{user?.nama_lengkap || 'Siswa'}</div>
            <div className="text-[10px] opacity-60 uppercase font-black tracking-widest">RPL - XII</div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-white/10 rounded">
            <Grid size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">

        {/* Content */}
        <section className="flex-1 bg-white p-4 lg:p-8 overflow-y-auto flex flex-col gap-4 lg:gap-6">
          <div className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Ujian / {ujianInfo.judul_ujian}
          </div>

          <div className="flex-1 flex flex-col border border-exam-border rounded p-4 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4 lg:mb-6 pb-4 border-b border-slate-50">
              <span className="text-sm font-black text-navy uppercase tracking-tighter">
                Soal No. {currentIdx + 1}{' '}
                <span className="text-slate-300 font-normal">/ {totalSoal}</span>
              </span>
              {currentSoal && (
                <span className="text-[10px] font-black uppercase text-navy/40 tracking-widest">
                  {currentSoal.tipe_soal.replace('_', ' ')}
                </span>
              )}
            </div>

            {isLoadingSoal || !currentSoal ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCcw className="animate-spin text-light-blue" size={28} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat soal...</p>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSoal.id}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="text-sm lg:text-lg text-exam-text font-bold leading-relaxed mb-6 lg:mb-8">
                    {currentSoal.teks_soal}
                  </div>

                  <div className="space-y-3">
                    {/* Objektif */}
                    {currentSoal.tipe_soal === 'objektif' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {currentPilihan.map((p, i) => (
                          <motion.button
                            key={p.id} whileHover={{ x: 5 }} whileTap={{ scale: 0.99 }}
                            onClick={() => handleAnswer(p.id)}
                            className={cn(
                              'flex items-center text-left p-3.5 lg:p-4 border rounded transition-all',
                              jawaban[currentSoal.id] === p.id
                                ? 'border-2 border-light-blue bg-blue-50/50 shadow-sm'
                                : 'border-exam-border hover:border-light-blue/50 hover:bg-slate-50',
                            )}
                          >
                            <div className={cn(
                              'w-7 h-7 lg:w-8 lg:h-8 rounded-full border shrink-0 flex items-center justify-center mr-4 font-black text-xs transition-all',
                              jawaban[currentSoal.id] === p.id
                                ? 'bg-light-blue border-light-blue text-white shadow-lg shadow-light-blue/30'
                                : 'border-exam-border text-slate-300 bg-white',
                            )}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            <span className={cn(
                              'font-bold text-xs lg:text-sm tracking-tight',
                              jawaban[currentSoal.id] === p.id ? 'text-navy' : 'text-slate-600',
                            )}>
                              {p.teks_pilihan}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Ganda Kompleks */}
                    {currentSoal.tipe_soal === 'ganda_kompleks' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {currentPilihan.map(p => {
                          const cur = Array.isArray(jawaban[currentSoal.id]) ? jawaban[currentSoal.id] : [];
                          const sel = cur.includes(p.id);
                          return (
                            <motion.button
                              key={p.id} whileHover={{ x: 5 }} whileTap={{ scale: 0.99 }}
                              onClick={() => handleAnswer(sel ? cur.filter((x: number) => x !== p.id) : [...cur, p.id])}
                              className={cn(
                                'flex items-center text-left p-3.5 lg:p-4 border rounded transition-all',
                                sel ? 'border-2 border-light-blue bg-blue-50/50 shadow-sm' : 'border-exam-border hover:border-slate-300 bg-white',
                              )}
                            >
                              <div className={cn(
                                'w-5 h-5 rounded border shrink-0 flex items-center justify-center mr-4 transition-all',
                                sel ? 'bg-light-blue border-light-blue shadow-lg shadow-light-blue/20' : 'border-slate-300 bg-white',
                              )}>
                                {sel && <CheckSquare color="white" size={14} />}
                              </div>
                              <span className="font-bold text-xs lg:text-sm text-navy uppercase tracking-tight">
                                {p.teks_pilihan}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Essay / Isian */}
                    {(currentSoal.tipe_soal === 'isian' || currentSoal.tipe_soal === 'essay') && (
                      <textarea
                        className="w-full p-6 pb-12 rounded border border-exam-border bg-slate-50 min-h-[220px] outline-none focus:border-light-blue focus:bg-white transition text-sm font-bold placeholder:italic placeholder:text-slate-300"
                        placeholder="Masukkan argumentasi atau jawaban tertulis di sini..."
                        value={jawaban[currentSoal.id] || ''}
                        onChange={e => handleAnswer(e.target.value)}
                      />
                    )}

                    {/* Menjodohkan */}
                    {currentSoal.tipe_soal === 'menjodohkan' && (
                      <MatchingInterface
                        soalId={currentSoal.id}
                        pilihan={currentPilihan}
                        jawaban={jawaban[currentSoal.id] || {}}
                        onAnswer={handleAnswer}
                      />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Navigasi */}
            <div className="mt-8 pt-6 lg:pt-8 flex items-center justify-between border-t border-slate-50 gap-4">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(p => p - 1)}
                className="flex-1 lg:flex-none px-4 lg:px-8 py-3 rounded bg-slate-50 border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Kembali
              </button>
              <button
                onClick={toggleFlag}
                className={cn(
                  'flex-1 lg:flex-none px-2 lg:px-8 py-3 rounded font-black text-[10px] uppercase tracking-widest transition-all border',
                  currentSoal && flagged[currentSoal.id]
                    ? 'bg-exam-warning border-exam-warning text-navy shadow-lg shadow-exam-warning/20'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-navy hover:border-navy',
                )}
              >
                {currentSoal && flagged[currentSoal.id] ? 'KONDISI RAGU' : 'RAGU-RAGU'}
              </button>
              <button
                disabled={currentIdx === totalSoal - 1}
                onClick={() => setCurrentIdx(p => p + 1)}
                className="flex-1 lg:flex-none px-4 lg:px-8 py-3 rounded bg-navy text-white font-black text-[10px] uppercase tracking-widest hover:bg-navy/90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xl shadow-navy/20"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </section>

        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={cn(
          'w-80 bg-sidebar-bg border-l border-exam-border p-6 flex flex-col gap-6 fixed lg:static right-0 top-0 h-full z-50 transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none',
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full',
        )}>
          <div className="flex items-center justify-between lg:hidden mb-4 border-b border-exam-border pb-4">
            <h3 className="text-xs font-black text-navy uppercase tracking-widest">Navigasi</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400"><X size={20} /></button>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">MAPPING SOAL</div>
            <div className="grid grid-cols-5 gap-1.5">
              {(urutanSoal.length > 0 ? urutanSoal : soalList.map(s => s.id)).map((soalId, idx) => {
                const soal       = soalList[idx];
                const isAnswered = soal ? !!jawaban[soal.id] : false;
                const isFlagged  = soal ? !!flagged[soal.id]  : false;
                return (
                  <button
                    key={soalId}
                    onClick={() => { setCurrentIdx(idx); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                    className={cn(
                      'aspect-square rounded border font-black text-[10px] transition-all flex items-center justify-center',
                      currentIdx === idx ? 'border-2 border-navy text-navy bg-white shadow-md z-10 scale-110' :
                      isFlagged          ? 'bg-exam-warning border-exam-warning text-navy active:scale-95' :
                      isAnswered         ? 'bg-navy border-navy text-white active:scale-95 shadow-lg shadow-navy/10' :
                                           'bg-white border-exam-border text-slate-400 hover:border-slate-300',
                    )}
                  >
                    {(idx + 1).toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-[9px] uppercase font-black text-slate-400 tracking-widest">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-navy" /><span>Tersimpan</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-exam-warning" /><span>Ragu</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded border-2 border-navy" /><span>Fokus</span></div>
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-6 border-t border-exam-border">
            <div className="bg-white p-4 border border-exam-border rounded text-[9px] text-slate-500 font-bold space-y-2 uppercase tracking-wide shadow-sm">
              <p className="text-navy font-black text-[10px] mb-1 italic">SESSION INFO:</p>
              <div className="flex justify-between"><span>TYPE:</span><span className="text-navy">{ujianInfo.tipe_ujian ?? 'UJIAN'}</span></div>
              <div className="flex justify-between"><span>INTERVAL:</span><span className="text-navy">{ujianInfo.durasi_menit} MIN</span></div>
              <div className="flex justify-between"><span>SESSION_ID:</span><span className="text-exam-success">{siswaUjianId}</span></div>
              <div className="flex justify-between"><span>NET_KEY:</span><span className="text-exam-success">SECURE</span></div>
            </div>
            <button
              disabled={isSubmitting}
              onClick={() => setShowConfirm(true)}
              className="w-full bg-exam-success hover:bg-exam-success/90 text-white font-black py-4 rounded shadow-xl shadow-exam-success/10 transition text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {isSubmitting ? <RefreshCcw className="animate-spin" size={16} /> : 'FINALISASI SESI'}
            </button>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-[30px] bg-white border-t border-exam-border flex items-center justify-between px-6 text-[9px] text-slate-400 font-black uppercase shrink-0 hover:bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-exam-success">
            <div className="w-1.5 h-1.5 rounded-full bg-exam-success animate-pulse" /> CLOUD_SYNC: OK
          </div>
          <div className="hidden sm:block">TERMINAL_ID: LAB_1_05</div>
        </div>
        <div className="hidden md:block">SMK SINTOGA - INTEGRATED EXAM SYSTEM PRO</div>
        <div>V1.2.5.H-DENSE</div>
      </footer>

      {/* Security Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 flex items-center justify-center z-[150] p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-600/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-8 max-w-md w-full relative z-[160] text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-2xl font-black text-navy mb-4 uppercase italic tracking-tighter">INTEGRITY BREACH!</h3>
              <p className="text-slate-600 mb-8 text-xs font-bold leading-relaxed uppercase tracking-tight">
                {warningType === 'fullscreen'
                  ? 'Sistem mendeteksi anda keluar dari mode layar penuh. Ini adalah pelanggaran integritas serius.'
                  : 'Dilarang membuka aplikasi lain atau berpindah tab selama ujian berlangsung.'}
              </p>
              <div className="p-4 bg-red-50 rounded border border-red-100 mb-8">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Akumulasi Pelanggaran</p>
                <div className="flex justify-center gap-2 mt-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn(
                      'w-4 h-4 rounded-full border-2',
                      violations >= i ? 'bg-red-600 border-red-600' : 'bg-white border-slate-200',
                    )} />
                  ))}
                </div>
                <p className="text-[8px] text-red-400 font-bold uppercase mt-2">
                  Ujian otomatis SELESAI pada pelanggaran ke-3
                </p>
              </div>
              <button
                onClick={handleReEnterFullscreen}
                className="w-full py-4 bg-navy text-white font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl shadow-navy/20 active:scale-95 transition-all"
              >
                KEMBALI KE UJIAN
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-navy/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded p-10 max-w-lg w-full relative z-[110] text-center shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-black text-navy mb-4 uppercase italic tracking-tighter">Selesaikan Ujian?</h3>
              <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed uppercase tracking-tight">
                Pastikan seluruh jawaban kamu telah terisi dengan benar. Data yang sudah terkirim tidak dapat diubah kembali.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 text-slate-500 font-black text-xs uppercase tracking-widest bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition"
                >
                  Periksa Kembali
                </button>
                <button
                  onClick={() => handleFinish('manual')}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-navy text-white font-black text-xs uppercase tracking-widest rounded shadow-xl shadow-navy/20 hover:bg-navy/90 transition disabled:opacity-60 flex items-center justify-center"
                >
                  {isSubmitting ? <RefreshCcw className="animate-spin" size={16} /> : 'Kirim Sekarang'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}