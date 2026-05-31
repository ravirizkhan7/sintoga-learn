import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckSquare, 
  Send, 
  AlertTriangle,
  Grid,
  Info as InfoIcon,
  User as UserIcon,
  RefreshCcw,
  CheckCircle2,
  X,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { BankSoal, PilihanJawaban } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';

// ─────────────────────────────────────────────
// Types for API responses
// ─────────────────────────────────────────────
interface SoalResponse {
  id: number;
  id_ujian: number;
  teks_soal: string;
  tipe_soal: 'objektif' | 'ganda_kompleks' | 'isian' | 'essay' | 'menjodohkan';
  pilihan_jawaban: PilihanJawaban[];
}

interface UjianResponse {
  id: number;
  judul_ujian: string;
  kode_ujian: string;
  durasi_menit: number;
  tipe_ujian: string;
  siswa_ujian_id: number; // ID sesi ujian siswa, dipakai untuk POST jawaban & submit
  soal_ids: number[];     // Daftar ID soal yang sudah diacak dari server
}

// ─────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    // Token auth — sesuaikan dengan cara auth project lo (misal: Bearer token dari localStorage)
    'Authorization': `Bearer ${localStorage.getItem('token') ?? ''}`,
  },
});

// ─────────────────────────────────────────────
// Seeded shuffle (tetap di client untuk konsistensi tampilan)
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
// MatchingInterface (tidak berubah dari versi asli)
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
  const leftRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const rightRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [lines, setLines] = useState<{ from: string; to: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

  const statements = useMemo(() => pilihan.filter(p => !!p.teks_pilihan).map(p => p.teks_pilihan!), [pilihan, soalId]);

  const pairs = useMemo(() => {
    const p = pilihan.map(p => p.teks_pasangan!).filter(Boolean);
    const seed = soalId + (user?.id || 0);
    return seededShuffle(p, seed);
  }, [pilihan, soalId, user?.id]);

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newLines = Object.entries(jawaban).map(([left, right]) => {
      const leftEl = leftRefs.current[left];
      const rightEl = rightRefs.current[right];
      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        return {
          from: left,
          to: right,
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
        };
      }
      return null;
    }).filter(Boolean) as any[];

    setLines(newLines);
  }, [jawaban]);

  useLayoutEffect(() => {
    updateLines();
    const timeoutId = setTimeout(updateLines, 50);
    window.addEventListener('resize', updateLines);
    return () => {
      window.removeEventListener('resize', updateLines);
      clearTimeout(timeoutId);
    };
  }, [updateLines]);

  const handleLeftClick = (text: string) => setActiveLeft(text === activeLeft ? null : text);

  const handleRightClick = (text: string) => {
    if (activeLeft) {
      onAnswer({ ...jawaban, [activeLeft]: text });
      setActiveLeft(null);
    }
  };

  const removeMatch = (left: string) => {
    const newJawaban = { ...jawaban };
    delete newJawaban[left];
    onAnswer(newJawaban);
  };

  return (
    <div ref={containerRef} className="relative grid grid-cols-2 gap-10 lg:gap-20 p-2 lg:p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
            <circle cx="5" cy="5" r="4" fill="#3b82f6" />
          </marker>
        </defs>
        {lines.map((line) => (
          <motion.path
            key={`${line.from}-${line.to}`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            d={`M ${line.x1} ${line.y1} C ${line.x1 + 30} ${line.y1}, ${line.x2 - 30} ${line.y2}, ${line.x2} ${line.y2}`}
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="transparent"
            className="drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]"
          />
        ))}
      </svg>

      <div className="space-y-3 z-20">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-light-blue" />
          Pernyataan Utama
        </p>
        {statements.map(text => (
          <div key={text} className="flex items-center gap-2 group">
            <button
              ref={el => leftRefs.current[text] = el}
              onClick={() => handleLeftClick(text)}
              className={cn(
                "flex-1 p-3 lg:p-4 rounded-lg border text-left text-[11px] font-black uppercase tracking-tight transition-all shadow-sm ring-offset-2",
                activeLeft === text ? "border-light-blue bg-blue-50 text-light-blue ring-2 ring-light-blue/50 scale-[1.02]" :
                  jawaban[text] ? "border-exam-success bg-green-50 text-navy" : "border-white bg-white text-slate-500 hover:border-slate-200"
              )}
            >
              {text}
            </button>
            <AnimatePresence>
              {jawaban[text] && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
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

      <div className="space-y-3 z-20">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-right flex items-center justify-end gap-2">
          Pasangan Jawaban
          <div className="w-1.5 h-1.5 rounded-full bg-exam-success" />
        </p>
        {pairs.map(text => {
          const isPaired = Object.values(jawaban).includes(text);
          return (
            <button
              key={text}
              ref={el => rightRefs.current[text] = el}
              onClick={() => handleRightClick(text)}
              className={cn(
                "w-full p-3 lg:p-4 rounded-lg border text-right text-[11px] font-black uppercase tracking-tight transition-all shadow-sm ring-offset-2",
                isPaired ? "border-exam-success bg-green-50 text-navy" :
                  activeLeft ? "border-light-blue/20 bg-blue-50/10 text-navy hover:bg-blue-50 hover:border-light-blue" : "border-white bg-white text-slate-500 hover:border-slate-200"
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
  const { id } = useParams();          // ID ujian
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── State ujian & soal dari API ──────────────────────────
  const [ujian, setUjian] = useState<UjianResponse | null>(null);
  const [soalList, setSoalList] = useState<SoalResponse[]>([]);
  const [isLoadingUjian, setIsLoadingUjian] = useState(true);
  const [isLoadingSoal, setIsLoadingSoal] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── State navigasi & jawaban ─────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState<{ [soalId: number]: any }>({});
  const [flagged, setFlagged] = useState<{ [soalId: number]: boolean }>({});

  // ── State timer ──────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(0);

  // ── State UI ─────────────────────────────────────────────
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [tempScore, setTempScore] = useState(0);

  // ── State keamanan ───────────────────────────────────────
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<'fullscreen' | 'visibility'>('fullscreen');

  // Cache soal yang sudah di-fetch agar tidak fetch ulang
  const soalCacheRef = useRef<{ [soalId: number]: SoalResponse }>({});

  // ─────────────────────────────────────────────
  // 1. Fetch info ujian saat komponen mount
  //    Termasuk siswa_ujian_id dan daftar soal_ids
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchUjian = async () => {
      try {
        setIsLoadingUjian(true);
        setApiError(null);

        // Endpoint untuk info ujian — sesuaikan dengan route backend lo
        const res = await api.get<UjianResponse>(`/ujian/${id}`);
        setUjian(res.data);
        setTimeLeft(res.data.durasi_menit * 60);
      } catch (err: any) {
        const msg = err.response?.data?.message ?? 'Gagal memuat data ujian.';
        setApiError(msg);
      } finally {
        setIsLoadingUjian(false);
      }
    };

    fetchUjian();
  }, [id]);

  // ─────────────────────────────────────────────
  // 2. Fetch soal satu per satu saat currentIdx berubah
  //    GET /ujian/{ujian}/soal/{soal}
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!ujian || ujian.soal_ids.length === 0) return;

    const soalId = ujian.soal_ids[currentIdx];
    if (!soalId) return;

    // Jika sudah ada di cache, langsung pakai
    if (soalCacheRef.current[soalId]) {
      setSoalList(prev => {
        const updated = [...prev];
        updated[currentIdx] = soalCacheRef.current[soalId];
        return updated;
      });
      return;
    }

    const fetchSoal = async () => {
      try {
        setIsLoadingSoal(true);

        // GET /ujian/{ujian}/soal/{soal}
        const res = await api.get<SoalResponse>(`/ujian/${id}/soal/${soalId}`);
        soalCacheRef.current[soalId] = res.data;

        setSoalList(prev => {
          const updated = [...prev];
          updated[currentIdx] = res.data;
          return updated;
        });
      } catch (err: any) {
        const msg = err.response?.data?.message ?? `Gagal memuat soal ${currentIdx + 1}.`;
        setApiError(msg);
      } finally {
        setIsLoadingSoal(false);
      }
    };

    fetchSoal();
  }, [ujian, currentIdx, id]);

  // Prefetch soal berikutnya di background
  useEffect(() => {
    if (!ujian) return;
    const nextSoalId = ujian.soal_ids[currentIdx + 1];
    if (!nextSoalId || soalCacheRef.current[nextSoalId]) return;

    const prefetch = async () => {
      try {
        const res = await api.get<SoalResponse>(`/ujian/${id}/soal/${nextSoalId}`);
        soalCacheRef.current[nextSoalId] = res.data;
        setSoalList(prev => {
          const updated = [...prev];
          if (!updated[currentIdx + 1]) {
            updated[currentIdx + 1] = res.data;
          }
          return updated;
        });
      } catch {
        // Prefetch gagal, tidak perlu notif user — akan di-fetch saat navigate
      }
    };

    prefetch();
  }, [ujian, currentIdx, id]);

  // ─────────────────────────────────────────────
  // 3. Simpan jawaban ke backend setiap kali user menjawab
  //    POST /ujian/{siswaUjian}/jawaban
  // ─────────────────────────────────────────────
  const saveJawaban = useCallback(async (soalId: number, val: any) => {
    if (!ujian) return;

    // Format payload — sesuaikan field name dengan backend lo
    const payload = {
      id_soal: soalId,
      jawaban: val,
    };

    try {
      // POST /ujian/{siswaUjian}/jawaban
      await api.post(`/ujian/${ujian.siswa_ujian_id}/jawaban`, payload);
    } catch (err: any) {
      // Auto-save gagal — silent fail, jawaban tetap tersimpan di state lokal
      console.warn('Auto-save jawaban gagal:', err.response?.data?.message ?? err.message);
    }
  }, [ujian]);

  const handleAnswer = (val: any) => {
    if (!soalList[currentIdx]) return;
    const soalId = soalList[currentIdx].id;

    setJawaban(prev => ({ ...prev, [soalId]: val }));

    // Auto-save ke backend (fire-and-forget)
    saveJawaban(soalId, val);
  };

  // ─────────────────────────────────────────────
  // 4. Submit ujian
  //    POST /ujian/{siswaUjian}/submit
  // ─────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    if (!ujian) return;

    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      // Kirim semua jawaban yang tersimpan lokal sebagai payload final
      // (sebagai fallback jika ada yang gagal auto-save)
      const jawabanPayload = Object.entries(jawaban).map(([soalId, val]) => ({
        id_soal: Number(soalId),
        jawaban: val,
      }));

      // POST /ujian/{siswaUjian}/submit
      const res = await api.post(`/ujian/${ujian.siswa_ujian_id}/submit`, {
        jawaban: jawabanPayload,
      });

      // Backend mengembalikan skor sementara (objektif)
      setTempScore(res.data?.skor_sementara ?? res.data?.score ?? 0);
      setIsFinished(true);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Gagal mengirim jawaban. Coba lagi.';
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [ujian, jawaban]);

  // ─────────────────────────────────────────────
  // 5. Timer
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0) {
      if (ujian && !isFinished) handleFinish();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, ujian, isFinished]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─────────────────────────────────────────────
  // 6. Fullscreen & Security
  // ─────────────────────────────────────────────
  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
        else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen();
      }
    } catch (err) {
      console.error('Exit fullscreen failed', err);
    }
  };

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
        else if ((el as any).msRequestFullscreen) await (el as any).msRequestFullscreen();
      } catch (err) {
        console.error('Fullscreen request failed', err);
      }
    };

    if (!isFinished && !isSubmitting) enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isFinished && !isSubmitting) {
        setViolations(prev => {
          const next = prev + 1;
          if (next >= 3) {
            handleFinish();
          } else {
            setWarningType('fullscreen');
            setShowWarning(true);
          }
          return next;
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isFinished && !isSubmitting) {
        handleFinish();
      }
    };

    const handleBlur = () => {
      if (!isFinished && !isSubmitting) handleFinish();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      exitFullscreen();
    };
  }, [isFinished, isSubmitting]);

  const handleReEnterFullscreen = async () => {
    setShowWarning(false);
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch (err) {
      console.error('Fullscreen re-entry failed', err);
    }
  };

  const toggleFlag = () => {
    if (!soalList[currentIdx]) return;
    const soalId = soalList[currentIdx].id;
    setFlagged(prev => ({ ...prev, [soalId]: !prev[soalId] }));
  };

  // ─────────────────────────────────────────────
  // Render: Loading ujian
  // ─────────────────────────────────────────────
  if (isLoadingUjian) {
    return (
      <div className="flex items-center justify-center h-screen bg-exam-bg">
        <div className="flex flex-col items-center gap-4">
          <RefreshCcw className="animate-spin text-light-blue" size={40} />
          <p className="text-[10px] font-black text-navy uppercase tracking-widest">Inisialisasi Data Ujian...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // Render: Error
  // ─────────────────────────────────────────────
  if (apiError && !ujian) {
    return (
      <div className="flex items-center justify-center h-screen bg-exam-bg p-4 text-center">
        <div className="bg-white p-10 rounded-lg border border-red-100 shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} />
          </div>
          <h2 className="text-xl font-black text-navy uppercase tracking-tighter mb-3">Gagal Memuat Ujian</h2>
          <p className="text-sm text-slate-500 font-medium mb-6">{apiError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-navy text-white font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!ujian) return null;

  // ─────────────────────────────────────────────
  // Render: Ujian Selesai
  // ─────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="flex items-center justify-center h-screen bg-exam-bg p-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-lg border border-exam-border shadow-2xl max-w-md w-full"
        >
          <div className="w-20 h-20 bg-green-50 text-exam-success rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-black text-navy uppercase italic tracking-tighter mb-2">Ujian Selesai!</h2>
          <div className="mb-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Skor Sementara (Objektif):</p>
            <h3 className="text-6xl font-black italic tracking-tighter text-navy leading-none">{tempScore}</h3>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
            Jawaban kamu telah berhasil terkirim ke server pusat SMK Sintoga Learn. Untuk soal essay dan isian akan dinilai secara manual oleh guru.
          </p>
          <button
            onClick={() => {
              exitFullscreen();
              navigate('/siswa');
            }}
            className="w-full bg-navy text-white font-black py-4 rounded text-xs uppercase tracking-[0.2em] shadow-xl shadow-navy/20"
          >
            Kembali ke Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const currentSoal = soalList[currentIdx];
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
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white"
          >
            <AlertTriangle size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{apiError}</span>
            <button onClick={() => setApiError(null)} className="ml-2 hover:opacity-70">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Integrity Alert */}
      <AnimatePresence>
        {violations > 0 && violations < 3 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white"
          >
            <AlertTriangle size={18} className="animate-bounce" />
            <span className="text-xs font-black uppercase tracking-widest">PERINGATAN: PELANGGARAN {violations}/3</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-[60px] bg-navy text-white flex items-center justify-between px-6 border-b-4 border-light-blue shrink-0 z-[60] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="text-sm lg:text-xl font-extrabold tracking-widest italic truncate max-w-[120px] lg:max-w-none">SINTOGA LEARN</div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 bg-white/10 px-2 lg:px-4 py-1.5 rounded transition-all border border-white/5">
          <span className="text-[8px] lg:text-[10px] font-bold uppercase opacity-80 hidden sm:block">Sisa Waktu</span>
          <span className={cn(
            "text-base lg:text-2xl font-mono font-bold tracking-tighter",
            timeLeft < 300 && "text-red-400 animate-pulse"
          )}>{formatTime(timeLeft)}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block border-r border-white/10 pr-4">
            <div className="text-sm font-bold">{user?.nama_lengkap || 'Siswa'}</div>
            <div className="text-[10px] opacity-60 uppercase font-black tracking-widest">RPL - XII</div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 hover:bg-white/10 rounded transition-colors"
          >
            <Grid size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">

        {/* Content Section */}
        <section className="flex-1 bg-white p-4 lg:p-8 overflow-y-auto flex flex-col gap-4 lg:gap-6 relative">
          <div className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Ujian / {ujian.judul_ujian} <span className="text-light-blue mx-2">/</span> {ujian.kode_ujian}
          </div>

          <div className="flex-1 flex flex-col border border-exam-border rounded p-4 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-4 lg:mb-6 pb-4 border-b border-slate-50">
              <span className="text-sm font-black text-navy uppercase tracking-tighter">Soal No. {currentIdx + 1}</span>
              {currentSoal && (
                <span className="text-[10px] font-black uppercase text-navy/40 tracking-widest">
                  {currentSoal.tipe_soal.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Loading soal */}
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
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="text-sm lg:text-lg text-exam-text font-bold leading-relaxed mb-6 lg:mb-8">
                    {currentSoal.teks_soal}
                  </div>

                  {/* Options Area */}
                  <div className="space-y-3">
                    {currentSoal.tipe_soal === 'objektif' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {currentPilihan.map((p, i) => (
                          <motion.button
                            key={p.id}
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleAnswer(p.id)}
                            className={cn(
                              "flex items-center text-left p-3.5 lg:p-4 border rounded transition-all",
                              jawaban[currentSoal.id] === p.id
                                ? "border-2 border-light-blue bg-blue-50/50 shadow-sm"
                                : "border-exam-border hover:border-light-blue/50 hover:bg-slate-50"
                            )}
                          >
                            <div className={cn(
                              "w-7 h-7 lg:w-8 lg:h-8 rounded-full border shrink-0 flex items-center justify-center mr-4 font-black text-xs transition-all",
                              jawaban[currentSoal.id] === p.id
                                ? "bg-light-blue border-light-blue text-white shadow-lg shadow-light-blue/30"
                                : "border-exam-border text-slate-300 bg-white"
                            )}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            <span className={cn(
                              "font-bold text-xs lg:text-sm tracking-tight",
                              jawaban[currentSoal.id] === p.id ? "text-navy" : "text-slate-600"
                            )}>
                              {p.teks_pilihan}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {currentSoal.tipe_soal === 'ganda_kompleks' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {currentPilihan.map((p) => {
                          const currentAnswers = Array.isArray(jawaban[currentSoal.id]) ? jawaban[currentSoal.id] : [];
                          const isSelected = currentAnswers.includes(p.id);
                          return (
                            <motion.button
                              key={p.id}
                              whileHover={{ x: 5 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => {
                                if (isSelected) {
                                  handleAnswer(currentAnswers.filter((pid: number) => pid !== p.id));
                                } else {
                                  handleAnswer([...currentAnswers, p.id]);
                                }
                              }}
                              className={cn(
                                "flex items-center text-left p-3.5 lg:p-4 border rounded transition-all",
                                isSelected ? "border-2 border-light-blue bg-blue-50/50 shadow-sm" : "border-exam-border hover:border-slate-300 bg-white"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded border shrink-0 flex items-center justify-center mr-4 transition-all",
                                isSelected ? "bg-light-blue border-light-blue shadow-lg shadow-light-blue/20" : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <CheckSquare color="white" size={14} />}
                              </div>
                              <span className="font-bold text-xs lg:text-sm text-navy uppercase tracking-tight">{p.teks_pilihan}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {(currentSoal.tipe_soal === 'isian' || currentSoal.tipe_soal === 'essay') && (
                      <textarea
                        className="w-full p-6 pb-12 rounded border border-exam-border bg-slate-50 min-h-[220px] outline-none focus:border-light-blue focus:bg-white transition text-sm font-bold placeholder:italic placeholder:text-slate-300"
                        placeholder="Masukkan argumentasi atau jawaban tertulis di sini..."
                        value={jawaban[currentSoal.id] || ''}
                        onChange={(e) => handleAnswer(e.target.value)}
                      />
                    )}

                    {currentSoal.tipe_soal === 'menjodohkan' && (
                      <MatchingInterface
                        soalId={currentSoal.id}
                        pilihan={currentPilihan}
                        jawaban={jawaban[currentSoal.id] || {}}
                        onAnswer={(val) => handleAnswer(val)}
                      />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Navigation Actions */}
            <div className="mt-8 pt-6 lg:pt-8 flex items-center justify-between border-t border-slate-50 gap-4">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="flex-1 lg:flex-none px-4 lg:px-8 py-3 rounded bg-slate-50 border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Kembali
              </button>

              <button
                onClick={toggleFlag}
                className={cn(
                  "flex-1 lg:flex-none px-2 lg:px-8 py-3 rounded font-black text-[10px] uppercase tracking-widest transition-all border",
                  currentSoal && flagged[currentSoal.id]
                    ? "bg-exam-warning border-exam-warning text-navy shadow-lg shadow-exam-warning/20"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-navy hover:border-navy"
                )}
              >
                {currentSoal && flagged[currentSoal.id] ? 'KONDISI RAGU' : 'RAGU-RAGU'}
              </button>

              <button
                disabled={currentIdx === ujian.soal_ids.length - 1}
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="flex-1 lg:flex-none px-4 lg:px-8 py-3 rounded bg-navy text-white font-black text-[10px] uppercase tracking-widest hover:bg-navy/90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xl shadow-navy/20"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </section>

        {/* Sidebar Overlay (mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={cn(
          "w-80 bg-sidebar-bg border-l border-exam-border p-6 flex flex-col gap-6 fixed lg:static right-0 top-0 h-full z-50 transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between lg:hidden mb-4 border-b border-exam-border pb-4">
            <h3 className="text-xs font-black text-navy uppercase tracking-widest">Navigasi</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400"><X size={20} /></button>
          </div>

          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">MAPPING ID SOAL</div>
            <div className="grid grid-cols-5 gap-1.5">
              {ujian.soal_ids.map((soalId, idx) => {
                const soal = soalList[idx];
                const isAnswered = soal ? !!jawaban[soal.id] : false;
                const isFlagged = soal ? !!flagged[soal.id] : false;
                return (
                  <button
                    key={soalId}
                    onClick={() => {
                      setCurrentIdx(idx);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "aspect-square rounded border font-black text-[10px] transition-all flex items-center justify-center",
                      currentIdx === idx
                        ? "border-2 border-navy text-navy bg-white shadow-md z-10 scale-110"
                        : isFlagged
                          ? "bg-exam-warning border-exam-warning text-navy active:scale-95"
                          : isAnswered
                            ? "bg-navy border-navy text-white active:scale-95 shadow-lg shadow-navy/10"
                            : "bg-white border-exam-border text-slate-400 hover:border-slate-300"
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
              <p className="text-navy font-black text-[10px] mb-1 italic">ENCRYPTED SESSION INFO:</p>
              <div className="flex justify-between"><span>TYPE:</span> <span className="text-navy">{ujian.tipe_ujian}</span></div>
              <div className="flex justify-between"><span>INTERVAL:</span> <span className="text-navy">{ujian.durasi_menit} MIN</span></div>
              <div className="flex justify-between"><span>SESSION_ID:</span> <span className="text-exam-success">{ujian.siswa_ujian_id}</span></div>
              <div className="flex justify-between"><span>NET_KEY:</span> <span className="text-exam-success">SECURE</span></div>
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
      <footer className="h-[30px] bg-white border-t border-exam-border flex items-center justify-between px-6 text-[9px] text-slate-400 font-black uppercase shrink-0 transition-colors hover:bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-exam-success"><div className="w-1.5 h-1.5 rounded-full bg-exam-success animate-pulse" /> CLOUD_SYNC: OK</div>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-600/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-8 max-w-md w-full relative z-[160] text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100 italic">
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
                      "w-4 h-4 rounded-full border-2",
                      violations >= i ? "bg-red-600 border-red-600" : "bg-white border-slate-200"
                    )} />
                  ))}
                </div>
                <p className="text-[8px] text-red-400 font-bold uppercase mt-2">Ujian otomatis SELESAI pada pelanggaran ke-3</p>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-navy/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
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
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-navy text-white font-black text-xs uppercase tracking-widest rounded shadow-xl shadow-navy/20 hover:bg-navy/90 transition disabled:opacity-60"
                >
                  {isSubmitting ? <RefreshCcw className="animate-spin mx-auto" size={16} /> : 'Kirim Sekarang'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}