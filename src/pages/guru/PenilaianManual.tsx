import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  User,
  Search,
  CheckCircle2,
  BookOpen,
  Check,
  X,
  Send,
  RefreshCcw,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────

interface Soal {
  id: number;
  id_ujian: number;
  tipe_soal: string;
  teks_soal: string;
  path_gambar: string | null;
  pilihan_jawaban: any[];
}

interface JawabanPending {
  id: number;
  id_ujian: number;
  /**
   * ID dari record siswa_ujian — ini yang dipakai sebagai {siswaUjian}
   * di endpoint PUT /ujian/{siswaUjian}/essay dan /isian
   */
  id_siswa_ujian: number;
  soal_id: number;
  jawaban_teks: string | null;
  nilai_manual_guru: number | null;
  soal?: Soal;
  siswa?: { id: number; nama: string };
  waktu_selesai?: string;
}

interface UjianManual {
  id: number;
  judul_ujian: string;
  kode_ujian: string | null;
  kelas: string;
  tipe_ujian: string;
  pending_count: number;
}

export default function PenilaianManual() {
  const { user } = useAuth();

  const [ujians, setUjians] = useState<UjianManual[]>([]);
  const [selectedUjianId, setSelectedUjianId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // ✅ Fix: key adalah string "siswaUjianId-soalId", bukan number
  const [scores, setScores] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAnswers, setPendingAnswers] = useState<JawabanPending[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch list ujian ──────────────────────────────────────────
  const fetchUjians = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/ujian');
      const raw = res.data?.data;
      const allUjians = Array.isArray(raw) ? raw : raw?.data ?? [];
      setUjians(allUjians);
      if (allUjians.length > 0 && !selectedUjianId) {
        setSelectedUjianId(allUjians[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengambil data ujian');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Fetch pending answers ─────────────────────────────────────
  //
  // Alur yang benar:
  //   Step 1 → GET /ujian/{ujianId}/list-manual
  //             Response: { data: { ujian, total_siswa_belum_dinilai, siswa_ujians[] } }
  //             → dapat daftar siswa_ujian yang masih punya jawaban belum dinilai
  //
  //   Step 2 → GET /ujian/{siswaUjian.id}/jawaban-siswa  (per siswa)
  //             Response: { data: { siswa_ujian, jawaban[] } }
  //             → dapat detail jawaban + relasi soal per siswa
  //
  // const fetchPendingAnswers = async (ujianId: number) => {
  //   try {
  //     setIsLoading(true);
  //     setError(null);

  //     // ── Step 1: ambil list siswa_ujian yang pending ─────────────
  //     const manualRes = await api.get(`/ujian/${ujianId}/list-penilaian-manual`);
  //     const manualData = manualRes.data?.data;
  //     // siswa_ujians di response adalah array siswa_ujian objects
  //     const siswaUjians: any[] = Array.isArray(manualData?.siswa_ujians)
  //       ? manualData.siswa_ujians
  //       : [];

  //     if (siswaUjians.length === 0) {
  //       setPendingAnswers([]);
  //       return;
  //     }

  //     // ── Step 2: ambil jawaban per siswa secara paralel ──────────
  //     const allAnswers: JawabanPending[] = [];

  //     await Promise.all(
  //       siswaUjians.map(async (su: any) => {
  //         try {
  //           // GET /ujian/{siswaUjian}/jawaban-siswa
  //           console.log('[jawaban-siswa] su object:', JSON.stringify(su));
  //   console.log('[jawaban-siswa] su.id:', su.id);
  //   console.log('[jawaban-siswa] URL:', `/ujian/${su.id}/jawaban-siswa`);
  //           const jawabanRes = await api.get(`/ujian/${su.id}/jawaban-siswa`);
  //           const d = jawabanRes.data?.data;
  //           const siswaUjianInfo = d?.siswa_ujian ?? su;
  //           const jawabans: any[] = d?.jawaban ?? [];

  //           jawabans.forEach((jaw: any) => {
  //             const tipe = jaw.soal?.tipe_soal;

  //             // hanya isian & essay yang belum dinilai (nilai_manual_guru null)
  //             if (tipe !== 'isian' && tipe !== 'essay') return;
  //             if (jaw.nilai_manual_guru !== null && jaw.nilai_manual_guru !== undefined) return;

  //             allAnswers.push({
  //               id:                jaw.id,
  //               id_ujian:          ujianId,
  //               // ✅ simpan siswa_ujian.id — ini yang dipakai di PUT endpoints
  //               id_siswa_ujian:    su.id,
  //               soal_id:           jaw.soal_id,
  //               jawaban_teks:      jaw.jawaban_teks ?? null,
  //               nilai_manual_guru: jaw.nilai_manual_guru ?? null,
  //               soal:              jaw.soal ?? undefined,
  //               siswa:             su.siswa ?? siswaUjianInfo.siswa ?? undefined,
  //               waktu_selesai:     siswaUjianInfo.waktu_selesai ?? su.waktu_selesai,
  //             });
  //           });
  //         } catch {
  //           // skip individual fetch error, tetap lanjut siswa lain
  //         }
  //       })
  //     );

  //     setPendingAnswers(allAnswers);
  //   } catch (err: any) {
  //     setError(err.response?.data?.message || 'Gagal mengambil jawaban pending');
  //     setPendingAnswers([]);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
const fetchPendingAnswers = async (ujianId: number) => {
  try {
    setIsLoading(true);
    setError(null);

    const manualRes = await api.get(`/ujian/${ujianId}/list-penilaian-manual`);
    const manualData = manualRes.data?.data;
    const siswaUjians: any[] = Array.isArray(manualData?.siswa_ujians)
      ? manualData.siswa_ujians
      : [];

    if (siswaUjians.length === 0) {
      setPendingAnswers([]);
      return;
    }

    // ✅ Langsung pakai data jawabans dari response, tidak perlu fetch lagi
    const allAnswers: JawabanPending[] = [];

    siswaUjians.forEach((su: any) => {
      const jawabans: any[] = su.jawabans ?? [];

      jawabans.forEach((jaw: any) => {
        allAnswers.push({
          id:             jaw.jawaban_id,
          id_ujian:       ujianId,
          id_siswa_ujian: su.siswa_ujian_id,  // ✅ fix field name
          soal_id:        jaw.soal_id,
          jawaban_teks:   jaw.jawaban_teks ?? null,
          nilai_manual_guru: null,
          soal: {
            id:            jaw.soal_id,
            id_ujian:      ujianId,
            tipe_soal:     jaw.tipe_soal,
            teks_soal:     jaw.teks_soal,
            path_gambar:   null,
            pilihan_jawaban: [],
          },
          siswa:        su.siswa ?? undefined,
          waktu_selesai: su.waktu_selesai ?? undefined,
        });
      });
    });

    setPendingAnswers(allAnswers);
  } catch (err: any) {
    setError(err.response?.data?.message || 'Gagal mengambil jawaban pending');
    setPendingAnswers([]);
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchUjians();
  }, []);

  useEffect(() => {
    if (selectedUjianId) fetchPendingAnswers(selectedUjianId);
  }, [selectedUjianId]);

  // ─── Grade Isian ───────────────────────────────────────────────
  // PUT /ujian/{siswaUjian}/isian
  // Body: { jawaban: [{ soal_id, is_true }] }
  const handleGradeIsan = async (
    siswaUjianId: number,   // ← id_siswa_ujian, bukan id_ujian!
    soalId: number,
    isTrue: boolean
  ) => {
    try {
      setIsSaving(true);
      await api.put(`/ujian/${siswaUjianId}/isian`, {
        jawaban: [{ soal_id: soalId, is_true: isTrue }],
      });
      if (selectedUjianId) await fetchPendingAnswers(selectedUjianId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan nilai isian');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Grade Essay ───────────────────────────────────────────────
  // PUT /ujian/{siswaUjian}/essay
  // Body: { jawaban: [{ soal_id, nilai_manual_guru }] }
  const handleGradeEssay = async (
    siswaUjianId: number,   // ← id_siswa_ujian, bukan id_ujian!
    soalId: number,
    nilai: number
  ) => {
    try {
      setIsSaving(true);
      await api.put(`/ujian/${siswaUjianId}/essay`, {
        jawaban: [{ soal_id: soalId, nilai_manual_guru: nilai }],
      });
      if (selectedUjianId) await fetchPendingAnswers(selectedUjianId);
      // hapus score input setelah berhasil
      setScores(prev => {
        const next = { ...prev };
        delete next[`${siswaUjianId}-${soalId}`];
        return next;
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan nilai essay');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Filter & Group by soal ────────────────────────────────────
  const filtered = pendingAnswers.filter(ans => {
    if (!searchQuery) return true;
    const name = ans.siswa?.nama ?? '';
    const teks = ans.soal?.teks_soal ?? '';
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teks.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const groupedByQuestion = filtered.reduce<Record<number, JawabanPending[]>>(
    (acc, ans) => {
      if (!acc[ans.soal_id]) acc[ans.soal_id] = [];
      acc[ans.soal_id].push(ans);
      return acc;
    },
    {}
  );

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-white p-6 rounded border border-exam-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter flex items-center gap-2">
              <FileCheck className="text-light-blue" /> Penilaian Manual
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Koreksi jawaban isian dan essay siswa
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue transition"
              value={selectedUjianId || ''}
              onChange={e =>
                setSelectedUjianId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={isLoading}
            >
              <option value="">Pilih Ujian...</option>
              {ujians.map(u => (
                <option key={u.id} value={u.id}>
                  {u.judul_ujian} ({u.pending_count || 0})
                </option>
              ))}
            </select>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                placeholder="CARI SISWA..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue transition w-full"
              />
            </div>

            <button
              onClick={() => selectedUjianId && fetchPendingAnswers(selectedUjianId)}
              disabled={isLoading || !selectedUjianId}
              className="p-2 bg-navy text-white rounded hover:bg-light-blue transition disabled:opacity-50"
            >
              <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-12 rounded border border-exam-border flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <RefreshCcw size={32} className="text-slate-300 animate-spin" />
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  Memuat jawaban pending...
                </p>
              </div>
            </motion.div>
          ) : Object.keys(groupedByQuestion).length > 0 ? (
            Object.entries(groupedByQuestion).map(([soalId, answers], idx) => {
              const firstAnswer = answers[0];
              const soal = firstAnswer.soal;
              const isIsan = soal?.tipe_soal === 'isian';

              return (
                <motion.div
                  key={soalId}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
                >
                  {/* Question Header */}
                  <div className="p-5 bg-navy border-b border-white/10 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-light-blue" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-blue">
                          {soal?.tipe_soal || 'soal'}
                        </span>
                      </div>
                      <span className="bg-white/10 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-white/10">
                        {answers.length} Siswa
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{soal?.teks_soal}</p>
                    {soal?.path_gambar && (
                      <img
                        src={soal.path_gambar}
                        alt="Soal"
                        className="mt-4 max-h-40 rounded border border-white/20 object-contain"
                      />
                    )}
                  </div>

                  {/* Answers */}
                  <div
                    className={cn(
                      isIsan
                        ? 'p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 bg-slate-50/50'
                        : 'divide-y divide-slate-100'
                    )}
                  >
                    {answers.map(ans => {
                      // ✅ Fix: key pakai id_siswa_ujian bukan id_ujian
                      const scoreKey = `${ans.id_siswa_ujian}-${ans.soal_id}`;

                      // ── Isian Card ──────────────────────────────
                      if (isIsan) {
                        return (
                          <div
                            key={ans.id}
                            className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-light-blue transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black text-navy uppercase truncate">
                                  {ans.siswa?.nama || '-'}
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {ans.waktu_selesai
                                    ? new Date(ans.waktu_selesai).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '-'}
                                </p>
                              </div>
                              <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 shrink-0">
                                <User size={10} />
                              </div>
                            </div>

                            <div className="flex-1 py-1">
                              <p className="text-[11px] font-bold text-navy italic text-center break-words bg-orange-50/50 p-2 rounded border border-orange-100/50">
                                "{ans.jawaban_teks || '?'}"
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              {/* ✅ Fix: pakai ans.id_siswa_ujian */}
                              <button
                                onClick={() =>
                                  handleGradeIsan(ans.id_siswa_ujian, ans.soal_id, false)
                                }
                                disabled={isSaving}
                                className="flex-1 py-1.5 flex items-center justify-center bg-red-50 text-red-500 rounded border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() =>
                                  handleGradeIsan(ans.id_siswa_ujian, ans.soal_id, true)
                                }
                                disabled={isSaving}
                                className="flex-1 py-1.5 flex items-center justify-center bg-green-50 text-green-500 rounded border border-green-100 hover:bg-green-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // ── Essay Row ───────────────────────────────
                      return (
                        <div
                          key={ans.id}
                          className="p-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="md:w-1/4 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <User size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-navy uppercase truncate">
                                  {ans.siswa?.nama || '-'}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {ans.waktu_selesai
                                    ? new Date(ans.waktu_selesai).toLocaleTimeString()
                                    : '-'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="p-3 rounded border font-bold text-xs italic leading-relaxed bg-light-blue/5 border-light-blue/10">
                              {ans.jawaban_teks || (
                                <span className="text-slate-300 uppercase italic tracking-widest text-[9px]">
                                  ( Tidak Ada Jawaban )
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="md:w-1/4 shrink-0 flex justify-end">
                            <div className="flex items-center gap-1.5 w-full max-w-[140px]">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="SKOR..."
                                value={scores[scoreKey] ?? ''}
                                onChange={e =>
                                  setScores(prev => ({
                                    ...prev,
                                    [scoreKey]: Number(e.target.value),
                                  }))
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-black outline-none focus:border-light-blue"
                              />
                              {/* ✅ Fix: pakai ans.id_siswa_ujian */}
                              <button
                                onClick={() => {
                                  if (scores[scoreKey] !== undefined) {
                                    handleGradeEssay(
                                      ans.id_siswa_ujian,
                                      ans.soal_id,
                                      scores[scoreKey]
                                    );
                                  }
                                }}
                                disabled={scores[scoreKey] === undefined || isSaving}
                                className="p-2.5 bg-navy text-white rounded transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-navy/10"
                              >
                                <Send size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-12 rounded border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest italic">
                  Semua Terkoreksi
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  Tidak ada jawaban yang menunggu penilaian manual saat ini.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}