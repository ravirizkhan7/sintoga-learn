import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckSquare, AlertTriangle, Grid, RefreshCcw,
  CheckCircle2, X, Trash2, Clock, XCircle,
} from 'lucide-react';
import { PilihanJawaban } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import api, { APP_URL } from '../../lib/axios';

// ─── Constants ──────────────────────────────────────────────
const BASE_STORAGE_URL = `${APP_URL}/storage/`;
const MAX_VIOLATIONS = 3;
const DEVTOOLS_THRESHOLD = 160;
const BLUR_DEBOUNCE_MS = 300;
const LISTENER_ATTACH_DELAY = 1500;

const TIPE_SOAL_LABELS: Record<string, string> = {
  objektif: 'Objektif',
  ganda_kompleks: 'Ganda Kompleks',
  isian: 'Isian',
  essay: 'Essay',
  menjodohkan: 'Menjodohkan',
};

// ─── Types ──────────────────────────────────────────────────
interface SoalResponse {
  id: number;
  id_ujian: number;
  teks_soal: string;
  tipe_soal: 'objektif' | 'ganda_kompleks' | 'isian' | 'essay' | 'menjodohkan';
  pilihan_jawaban: PilihanJawaban[];
  path_gambar?: string | null;
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

type FinishReason = 'manual' | 'timeout' | 'violation';
type WarningType = 'fullscreen' | 'visibility' | 'devtools' | 'focus';

interface MatchLine {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ─── Pure Utilities ─────────────────────────────────────────
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let m = shuffled.length;
  let s = seed;
  const rand = () => { const x = Math.sin(s++) * 10000; return x - Math.floor(x); };
  while (m) {
    const i = Math.floor(rand() * m--);
    [shuffled[m], shuffled[i]] = [shuffled[i], shuffled[m]];
  }
  return shuffled;
};

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const requestFullscreen = async () => {
  try {
    if (document.fullscreenElement) return; // sudah fullscreen, skip
    const el = document.documentElement;
    await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
  } catch {}
};

const exitFullscreen = () => {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.();
    }
  } catch {}
};

// ─── Finished Screen Config ─────────────────────────────────
const FINISH_CONFIG: Record<FinishReason, {
  icon: typeof CheckCircle2;
  iconBg: string;
  title: string;
  titleColor: string;
  message?: string;
  messageStyle?: string;
  buttonBg: string;
  description: string;
}> = {
  manual: {
    icon: CheckCircle2,
    iconBg: 'bg-green-50 text-exam-success shadow-green-100',
    title: 'Ujian Selesai!',
    titleColor: 'text-navy',
    buttonBg: 'bg-navy text-white shadow-navy/20',
    description: 'Jawaban kamu telah berhasil terkirim ke server pusat. Soal essay & isian akan dinilai secara manual oleh guru.',
  },
  timeout: {
    icon: Clock,
    iconBg: 'bg-yellow-50 text-yellow-500 shadow-yellow-100',
    title: 'Waktu Habis!',
    titleColor: 'text-yellow-600',
    message: '⏰ Durasi ujian telah berakhir. Semua jawaban yang telah diisi otomatis dikirim ke server.',
    messageStyle: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    buttonBg: 'bg-yellow-500 text-white shadow-yellow-200',
    description: 'Semua jawaban yang telah terisi berhasil dikirim ke server.',
  },
  violation: {
    icon: XCircle,
    iconBg: 'bg-red-50 text-red-500 shadow-red-100',
    title: 'Ujian Dihentikan!',
    titleColor: 'text-red-600',
    message: '🚨 Ujian dihentikan karena sistem mendeteksi pelanggaran integritas akademik. Hubungi guru pengawas.',
    messageStyle: 'bg-red-50 border-red-100 text-red-600',
    buttonBg: 'bg-red-600 text-white shadow-red-200',
    description: 'Semua jawaban yang telah terisi berhasil dikirim ke server.',
  },
};

// ─── Custom Hook: Exam Security ─────────────────────────────
function useExamSecurity(
  isInitializing: boolean,
  onFinish: (reason: FinishReason) => void
) {
  const isFinishedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState<WarningType>('fullscreen');

  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  const registerViolation = useCallback((type: WarningType) => {
    if (isFinishedRef.current || isSubmittingRef.current) return;
    setViolations(prev => {
      const next = prev + 1;
      if (next >= MAX_VIOLATIONS) {
        onFinishRef.current('violation');
      } else {
        setWarningType(type);
        setShowWarning(true);
      }
      return next;
    });
  }, []);

  // Hanya attach listener keamanan — TIDAK urus fullscreen di sini
  useEffect(() => {
    if (isInitializing) return;

    let cleanup = () => {};

    const attachTimeout = setTimeout(() => {
      const onFullscreenChange = () => {
        if (!document.fullscreenElement && !isFinishedRef.current && !isSubmittingRef.current) {
          registerViolation('fullscreen');
        }
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden' && !isFinishedRef.current && !isSubmittingRef.current) {
          onFinishRef.current('violation');
        }
      };

      let devtoolsWasOpen = false;
      const checkDevTools = () => {
        if (isFinishedRef.current || isSubmittingRef.current) return;
        const isOpen =
          (window.outerWidth - window.innerWidth) > DEVTOOLS_THRESHOLD ||
          (window.outerHeight - window.innerHeight) > DEVTOOLS_THRESHOLD;
        if (isOpen && !devtoolsWasOpen) {
          devtoolsWasOpen = true;
          registerViolation('devtools');
        } else if (!isOpen) {
          devtoolsWasOpen = false;
        }
      };
      const devtoolsInterval = setInterval(checkDevTools, 1000);

      let blurTimer: ReturnType<typeof setTimeout> | null = null;
      const onBlur = () => {
        if (isFinishedRef.current || isSubmittingRef.current) return;
        blurTimer = setTimeout(() => {
          if (document.visibilityState === 'visible' && !document.hasFocus()) {
            registerViolation('focus');
          }
        }, BLUR_DEBOUNCE_MS);
      };
      const onFocus = () => {
        if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      };

      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('blur', onBlur);
      window.addEventListener('focus', onFocus);

      cleanup = () => {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('focus', onFocus);
        clearInterval(devtoolsInterval);
        if (blurTimer) clearTimeout(blurTimer);
      };
    }, LISTENER_ATTACH_DELAY);

    return () => {
      clearTimeout(attachTimeout);
      cleanup();
    };
  }, [isInitializing, registerViolation]);

  return {
    violations,
    showWarning,
    warningType,
    setShowWarning,
    isFinishedRef,
    isSubmittingRef,
    handleReEnterFullscreen: async () => {
      setShowWarning(false);
      await requestFullscreen();
    },
  };
}

// ─── Matching Interface Component ───────────────────────────
function MatchingInterface({ soalId, pilihan, jawaban, onAnswer }: {
  soalId: number;
  pilihan: PilihanJawaban[];
  jawaban: { [key: string]: string };
  onAnswer: (val: { [key: string]: string }) => void;
}) {
  const { user } = useAuth();
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<MatchLine[]>([]);

  const statements = useMemo(
    () => pilihan.filter(p => p.teks_pilihan).map(p => p.teks_pilihan!),
    [pilihan, soalId],
  );

  const pairs = useMemo(
    () => seededShuffle(pilihan.map(p => p.teks_pasangan!).filter(Boolean), soalId * 1000 + (user?.id || 0)),
    [pilihan, soalId, user?.id],
  );

  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const newLines: MatchLine[] = [];
    for (const [left, right] of Object.entries(jawaban)) {
      const lEl = leftRefs.current[left];
      const rEl = rightRefs.current[right];
      if (!lEl || !rEl) continue;
      const lR = lEl.getBoundingClientRect();
      const rR = rEl.getBoundingClientRect();
      newLines.push({
        from: left, to: right,
        x1: lR.right - cRect.left, y1: lR.top + lR.height / 2 - cRect.top,
        x2: rR.left - cRect.left, y2: rR.top + rR.height / 2 - cRect.top,
      });
    }
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
    <div ref={containerRef} className="relative grid grid-cols-2 gap-10 lg:gap-20 p-2 lg:p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
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

      <div className="space-y-3 z-20">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-light-blue" /> Pernyataan Utama
        </div>
        {statements.map(text => (
          <div key={text} className="flex items-center gap-2">
            <button
              ref={el => { leftRefs.current[text] = el; }}
              onClick={() => setActiveLeft(text === activeLeft ? null : text)}
              className={cn(
                'flex-1 p-3 lg:p-4 rounded-lg border text-left text-[11px] font-black uppercase tracking-tight transition-all shadow-sm ring-offset-2',
                activeLeft === text ? 'border-light-blue bg-blue-50 text-light-blue ring-2 ring-light-blue/50 scale-[1.02]'
                  : jawaban[text] ? 'border-exam-success bg-green-50 text-navy'
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

      <div className="space-y-3 z-20">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-right flex items-center justify-end gap-2">
          Pasangan Jawaban <div className="w-1.5 h-1.5 rounded-full bg-exam-success" />
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
                isPaired ? 'border-exam-success bg-green-50 text-navy'
                  : activeLeft ? 'border-light-blue/20 bg-blue-50/10 text-navy hover:bg-blue-50 hover:border-light-blue'
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

// ─── Finished Screen Component ──────────────────────────────
function FinishedScreen({ reason, score, onBack }: { reason: FinishReason; score: string | number; onBack: () => void }) {
  const config = FINISH_CONFIG[reason];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center h-screen bg-exam-bg p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="bg-white p-10 rounded-lg border border-exam-border shadow-2xl max-w-md w-full"
      >
        <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg', config.iconBg)}>
          <Icon size={48} />
        </div>
        <h2 className={cn('text-2xl font-black uppercase italic tracking-tighter mb-3', config.titleColor)}>
          {config.title}
        </h2>
        {config.message && (
          <div className={cn('px-4 py-3 rounded border mb-5 text-[10px] font-black uppercase tracking-widest leading-relaxed', config.messageStyle)}>
            {config.message}
          </div>
        )}
        <div className="mb-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nilai Sementara:</p>
          <h3 className="text-6xl font-black italic tracking-tighter text-navy leading-none">{score}</h3>
        </div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
          {config.description}
        </p>
        <button
          onClick={onBack}
          className={cn('w-full py-4 font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl transition-all active:scale-95', config.buttonBg)}
        >
          Kembali ke Dashboard
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function RuangUjian() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const locationState = location.state as LocationState | null;
  const siswaUjianId = locationState?.siswaUjian?.id ?? Number(id);
  const ujianInfo = locationState?.ujianInfo ?? null;
  const urutanSoal = locationState?.siswaUjian?.urutan_soal ?? [];

  // State
  const [soalList, setSoalList] = useState<SoalResponse[]>([]);
  const [isLoadingSoal, setIsLoadingSoal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState<Record<number, any>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finishReason, setFinishReason] = useState<FinishReason>('manual');
  const [tempScore, setTempScore] = useState<string | number>(0);

  const soalCacheRef = useRef<Record<number, SoalResponse>>({});

  // ── FULLSCREEN LANGSUNG ON MOUNT ─────────────────────────
  // Ini kunci fix-nya: request fullscreen di render pertama,
  // bukan setelah isInitializing selesai. Browser perlu
  // fullscreen request sedekat mungkin dengan user gesture
  // (klik "Mulai Ujian" di halaman sebelumnya).
  useEffect(() => {
    requestFullscreen();
  }, []);

  // ── Security hook (hanya urus listener, bukan fullscreen) ──
  const {
    violations, showWarning, setShowWarning,
    isFinishedRef, isSubmittingRef, handleReEnterFullscreen,
  } = useExamSecurity(isInitializing, (reason) => handleFinish(reason));

  // ── Helpers ──────────────────────────────────────────────
  const updateSoalAtIndex = useCallback((index: number, soal: SoalResponse) => {
    setSoalList(prev => {
      const next = [...prev];
      next[index] = soal;
      return next;
    });
  }, []);

  const fetchNilaiSementara = useCallback(async (): Promise<string | number> => {
    try {
      const hasil = await api.get(`/siswa-ujian/${siswaUjianId}/hasil`);
      const raw = hasil.data?.data;
      return raw?.nilai_sementara ?? raw?.nilai_akhir ?? raw?.siswa_ujian?.nilai_sementara ?? raw?.siswa_ujian?.nilai_akhir ?? 0;
    } catch {
      return 0;
    }
  }, [siswaUjianId]);

  // ── Computed values ──────────────────────────────────────
  const shuffledPilihan = useMemo(() => {
    const soal = soalList[currentIdx];
    if (!soal?.pilihan_jawaban?.length) return [];
    if (soal.tipe_soal === 'menjodohkan') return soal.pilihan_jawaban;
    return seededShuffle([...soal.pilihan_jawaban], soal.id * 1000 + siswaUjianId);
  }, [soalList, currentIdx, siswaUjianId]);

  const { hasRaguRagu, jumlahRagu } = useMemo(() => {
    const values = Object.values(flagged);
    return {
      hasRaguRagu: values.some(Boolean),
      jumlahRagu: values.filter(Boolean).length,
    };
  }, [flagged]);

  const totalSoal = urutanSoal.length || soalList.length;
  const currentSoal = soalList[currentIdx];

  // ── Initialize ───────────────────────────────────────────
  useEffect(() => {
    if (!locationState?.siswaUjian) {
      navigate('/siswa', { replace: true });
      return;
    }
    if (locationState.soals?.length) {
      locationState.soals.forEach(s => { soalCacheRef.current[s.id] = s; });
      setSoalList(locationState.soals);
    }
    setTimeLeft(Number(locationState.ujianInfo?.durasi_menit ?? 90) * 60);
    setIsInitializing(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch soal on demand ─────────────────────────────────
  useEffect(() => {
    if (isInitializing || soalList[currentIdx] || !urutanSoal.length) return;
    const soalId = urutanSoal[currentIdx];
    const ujianId = locationState?.siswaUjian?.ujian_id;
    if (!soalId || !ujianId) return;

    if (soalCacheRef.current[soalId]) {
      updateSoalAtIndex(currentIdx, soalCacheRef.current[soalId]);
      return;
    }

    (async () => {
      try {
        setIsLoadingSoal(true);
        const res = await api.get<{ data: SoalResponse }>(`/ujian/${ujianId}/soal/${soalId}`);
        const soal = res.data?.data ?? (res.data as any);
        soalCacheRef.current[soalId] = soal;
        updateSoalAtIndex(currentIdx, soal);
      } catch (err: any) {
        setApiError(err.response?.data?.message ?? `Gagal memuat soal ${currentIdx + 1}.`);
      } finally {
        setIsLoadingSoal(false);
      }
    })();
  }, [isInitializing, currentIdx, urutanSoal, locationState?.siswaUjian?.ujian_id, updateSoalAtIndex]);

  // ── Prefetch next soal ───────────────────────────────────
  useEffect(() => {
    if (isInitializing || !urutanSoal.length) return;
    const nextIdx = currentIdx + 1;
    const nextId = urutanSoal[nextIdx];
    const ujianId = locationState?.siswaUjian?.ujian_id;
    if (!nextId || !ujianId || soalCacheRef.current[nextId]) return;

    api.get<{ data: SoalResponse }>(`/ujian/${ujianId}/soal/${nextId}`)
      .then(res => {
        const soal = res.data?.data ?? (res.data as any);
        soalCacheRef.current[nextId] = soal;
        setSoalList(prev => { if (!prev[nextIdx]) { const u = [...prev]; u[nextIdx] = soal; return u; } return prev; });
      })
      .catch(() => {});
  }, [currentIdx, isInitializing, urutanSoal, locationState?.siswaUjian?.ujian_id]);

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (isInitializing || timeLeft <= 0) return;
    const iv = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(iv);
  }, [timeLeft, isInitializing]);

  useEffect(() => {
    if (timeLeft === 0 && !isInitializing && !isFinishedRef.current) {
      handleFinish('timeout');
    }
  }, [timeLeft, isInitializing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build payload per tipe soal ──────────────────────────
  const buildJawabanPayload = useCallback((soal: SoalResponse, val: any): Record<string, any> => {
    const base: Record<string, any> = { soal_id: soal.id };
    switch (soal.tipe_soal) {
      case 'objektif':
        base.id_pilihan_terpilih = val != null ? [val] : [];
        break;
      case 'ganda_kompleks':
        base.id_pilihan_terpilih = Array.isArray(val) ? val : [];
        break;
      case 'isian':
      case 'essay':
        base.jawaban_teks = String(val ?? '');
        break;
      case 'menjodohkan': {
        const pasangan: { pilihan_id: number; pasangan_id: number }[] = [];
        if (val && typeof val === 'object') {
          for (const [leftText, rightText] of Object.entries(val as Record<string, string>)) {
            const left = soal.pilihan_jawaban.find(p => p.teks_pilihan === leftText);
            const right = soal.pilihan_jawaban.find(p => p.teks_pasangan === rightText);
            if (left && right) pasangan.push({ pilihan_id: left.id, pasangan_id: right.id });
          }
        }
        base.pasangan_terpilih = pasangan;
        break;
      }
    }
    return base;
  }, []);

  // ── Auto-save ────────────────────────────────────────────
  const saveJawaban = useCallback(async (soal: SoalResponse, val: any) => {
    if (isFinishedRef.current) return;
    try {
      await api.post(`/ujian/${siswaUjianId}/jawaban`, buildJawabanPayload(soal, val));
    } catch (err: any) {
      console.warn('Auto-save gagal:', err.response?.data?.message ?? err.message);
    }
  }, [siswaUjianId, buildJawabanPayload]);

  const handleAnswer = useCallback((val: any) => {
    const soal = soalList[currentIdx];
    if (!soal) return;
    setJawaban(prev => ({ ...prev, [soal.id]: val }));
    saveJawaban(soal, val);
  }, [soalList, currentIdx, saveJawaban]);

  // ── Submit ujian ─────────────────────────────────────────
  const handleFinish = useCallback(async (reason: FinishReason = 'manual') => {
    if (isSubmittingRef.current || isFinishedRef.current) return;
    if (reason === 'manual' && hasRaguRagu) {
      setShowConfirm(false);
      setApiError('Masih ada soal berstatus RAGU-RAGU. Tinjau ulang dulu sebelum finalisasi.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      await api.post(`/ujian/${siswaUjianId}/submit`);
      setTempScore(await fetchNilaiSementara());
      setFinishReason(reason);
      isFinishedRef.current = true;
      setIsFinished(true);
    } catch (err: any) {
      if (err.response?.status === 422) {
        setTempScore(await fetchNilaiSementara());
        setFinishReason(reason);
        isFinishedRef.current = true;
        setIsFinished(true);
      } else {
        isSubmittingRef.current = false;
        setApiError(err.response?.data?.message || 'Gagal mengirim jawaban. Coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [siswaUjianId, hasRaguRagu, fetchNilaiSementara]);

  const toggleFlag = useCallback(() => {
    const soal = soalList[currentIdx];
    if (!soal) return;
    setFlagged(prev => ({ ...prev, [soal.id]: !prev[soal.id] }));
  }, [soalList, currentIdx]);

  // ─────────────────────────────────────────────
  // Render: Splash
  // ─────────────────────────────────────────────
  if (isInitializing) return (
    <div className="flex items-center justify-center h-screen bg-exam-bg">
      <div className="flex flex-col items-center gap-4">
        <RefreshCcw className="animate-spin text-light-blue" size={40} />
        <p className="text-[10px] font-black text-navy uppercase tracking-widest">Inisialisasi Sesi Ujian...</p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // Render: Invalid Session
  // ─────────────────────────────────────────────
  if (!ujianInfo) return (
    <div className="flex items-center justify-center h-screen bg-exam-bg p-4 text-center">
      <div className="bg-white p-10 rounded-lg border border-red-100 shadow-2xl max-w-md w-full">
        <AlertTriangle size={36} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-navy uppercase tracking-tighter mb-3">Sesi Tidak Valid</h2>
        <p className="text-sm text-slate-500 font-medium mb-6">
          Data ujian tidak ditemukan. Silakan kembali ke dashboard dan masukkan kode ujian ulang.
        </p>
        <button onClick={() => navigate('/siswa')} className="w-full py-3 bg-navy text-white font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl">
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // Render: Finished
  // ─────────────────────────────────────────────
  if (isFinished) {
    return (
      <FinishedScreen
        reason={finishReason}
        score={tempScore}
        onBack={() => { exitFullscreen(); navigate('/siswa'); }}
      />
    );
  }

  // ─────────────────────────────────────────────
  // Render: Main Exam Room
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

      {/* Violation Toast */}
      <AnimatePresence>
        {violations > 0 && violations < MAX_VIOLATIONS && (
          <motion.div
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white"
          >
            <AlertTriangle size={18} className="animate-bounce" />
            <span className="text-xs font-black uppercase tracking-widest">PERINGATAN: PELANGGARAN {violations}/{MAX_VIOLATIONS}</span>
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
                Soal No. {currentIdx + 1}
                <span className="text-slate-300 font-normal"> / {totalSoal}</span>
              </span>
              {currentSoal && (
                <span className="text-[10px] font-black uppercase text-navy/40 tracking-widest">
                  {TIPE_SOAL_LABELS[currentSoal.tipe_soal] ?? currentSoal.tipe_soal}
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
                  <div className="text-sm lg:text-lg text-exam-text font-bold leading-relaxed mb-4 lg:mb-6">
                    {currentSoal.teks_soal}
                  </div>

                  {currentSoal.path_gambar && (
                    <div className="mb-5 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={`${BASE_STORAGE_URL}${currentSoal.path_gambar}`} alt="Gambar soal" className="w-full max-h-72 object-contain" />
                    </div>
                  )}

                  <div className="space-y-3">
                    {currentSoal.tipe_soal === 'objektif' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {shuffledPilihan.map((p, i) => (
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
                            <span className={cn('font-bold text-xs lg:text-sm tracking-tight', jawaban[currentSoal.id] === p.id ? 'text-navy' : 'text-slate-600')}>
                              {p.teks_pilihan}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {currentSoal.tipe_soal === 'ganda_kompleks' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {shuffledPilihan.map(p => {
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
                        onChange={e => handleAnswer(e.target.value)}
                      />
                    )}

                    {currentSoal.tipe_soal === 'menjodohkan' && (
                      <MatchingInterface
                        soalId={currentSoal.id}
                        pilihan={currentSoal.pilihan_jawaban ?? []}
                        jawaban={jawaban[currentSoal.id] || {}}
                        onAnswer={handleAnswer}
                      />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

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

        {/* Mobile Overlay */}
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
                const soal = soalList[idx];
                const isAnswered = soal ? !!jawaban[soal.id] : false;
                const isFlagged = soal ? !!flagged[soal.id] : false;
                return (
                  <button
                    key={soalId}
                    onClick={() => { setCurrentIdx(idx); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                    className={cn(
                      'aspect-square rounded border font-black text-[10px] transition-all flex items-center justify-center',
                      currentIdx === idx ? 'border-2 border-navy text-navy bg-white shadow-md scale-110'
                        : isFlagged ? 'bg-exam-warning border-exam-warning text-navy active:scale-95'
                        : isAnswered ? 'bg-navy border-navy text-white active:scale-95 shadow-lg shadow-navy/10'
                        : 'bg-white border-exam-border text-slate-400 hover:border-slate-300',
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
              disabled={isSubmitting || hasRaguRagu}
              onClick={() => setShowConfirm(true)}
              title={hasRaguRagu ? `Masih ada ${jumlahRagu} soal RAGU-RAGU. Tinjau ulang dulu.` : undefined}
              className={cn(
                'w-full text-white font-black py-4 rounded shadow-xl transition text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2',
                hasRaguRagu
                  ? 'bg-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-exam-success hover:bg-exam-success/90 shadow-exam-success/10 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? <RefreshCcw className="animate-spin" size={16} /> : 'FINALISASI SESI'}
            </button>

            {hasRaguRagu && (
              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center leading-relaxed">
                Masih ada {jumlahRagu} soal RAGU-RAGU. Tinjau &amp; lepas tanda ragu dulu sebelum bisa finalisasi.
              </p>
            )}
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-[30px] bg-white border-t border-exam-border flex items-center justify-between px-6 text-[9px] text-slate-400 font-black uppercase shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-exam-success">
            <div className="w-1.5 h-1.5 rounded-full bg-exam-success animate-pulse" /> CLOUD_SYNC: OK
          </div>
        </div>
        <div className="hidden md:block">SMK SINTOGA - INTEGRATED EXAM SYSTEM PRO</div>
        <div>V1.0</div>
      </footer>

      {/* Security Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <div className="fixed inset-0 flex items-center justify-center z-[150] p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
              onClick={handleReEnterFullscreen}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white p-8 rounded-xl border-2 border-red-100 shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-navy uppercase tracking-tighter mb-2">Peringatan Integritas</h3>
              <p className="text-sm text-slate-500 mb-2">
                Sistem mendeteksi aktivitas mencurigakan. Pelanggaran {violations} dari {MAX_VIOLATIONS}.
              </p>
              <p className="text-xs text-red-500 font-bold mb-6">
                Jika mencapai {MAX_VIOLATIONS} pelanggaran, ujian akan dihentikan secara otomatis.
              </p>
              <button
                onClick={handleReEnterFullscreen}
                className="w-full py-3 bg-navy text-white font-black text-xs uppercase tracking-[0.2em] rounded shadow-xl hover:bg-navy/90 transition"
              >
                Mengerti, Lanjutkan Ujian
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Finish Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-[150] p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white p-8 rounded-xl border-2 border-exam-border shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-exam-success" />
              </div>
              <h3 className="text-lg font-black text-navy uppercase tracking-tighter mb-2">Finalisasi Ujian?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Pastikan semua jawaban sudah benar. Setelah difinalisasi, kamu tidak bisa mengubah jawaban lagi.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleFinish('manual')}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-exam-success text-white font-black text-xs uppercase tracking-widest rounded shadow-xl hover:bg-exam-success/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? <RefreshCcw className="animate-spin" size={14} /> : 'Ya, Finalisasi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}