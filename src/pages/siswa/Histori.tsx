import { useState, useEffect } from 'react';
import { 
  History, 
  ChevronDown, 
  Filter,
  CheckCircle2, 
  XCircle, 
  BookOpen,
  ArrowLeft,
  RefreshCcw,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import api, { APP_URL } from '../../lib/axios';

// ─── Storage URL (sama seperti di guru/useBankSoal) ───────────
const BASE_STORAGE_URL = `${APP_URL}/storage/`;

type TipeUjian = 'Semua' | 'STS' | 'UTS' | 'UAS' | 'Harian';

// ─── Types ────────────────────────────────────────────────────

interface RiwayatItem {
  id: number;
  ujian_id: number;
  siswa_id: number;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  status: string;
  nilai_akhir: string | null;
  urutan_soal?: any[];
  created_at?: string;
  updated_at?: string;
  ujian?: {
    id: number;
    judul_ujian: string;
    tipe_ujian?: string;
    mata_pelajaran?: string;
  };
  judul_ujian?: string;
}

interface PilihanJawaban {
  id: number;
  soal_id: number;
  teks_pilihan: string;
  teks_pasangan: string;
  persentase_nilai: number;
  is_true: number;
  created_at?: string;
  updated_at?: string;
}

interface JawabanItem {
  soal: {
    id: number;
    teks_soal: string;
    tipe_soal: string;
    jalur_gambar: string | null;  // endpoint 1
    path_gambar?: string | null;  // endpoint 2 fallback
    pilihan_jawaban: PilihanJawaban[];
  };
  jawaban_siswa: {
    id_pilihan_terpilih: number[] | null;
    jawaban_teks: string | null;
    pasangan_terpilih: any[] | null;
    nilai_manual_guru: number | null;
  };
  nilai: number;
}

interface DetailHasil {
  siswa: string;
  nilai_akhir: string;
  breakdown: any[];
  jawabans: JawabanItem[];
}

// ─── Helper: ambil judul ujian dari item ─────────────────────
const getJudulUjian = (item: RiwayatItem): string => {
  return (
    item.ujian?.judul_ujian ||
    item.judul_ujian ||
    `Ujian #${item.ujian_id}`
  );
};

const getTipeUjian = (item: RiwayatItem): string | null => {
  return item.ujian?.tipe_ujian || null;
};

// ─── Component ────────────────────────────────────────────────
export default function HistoriSiswa() {
  const [filterType, setFilterType] = useState<TipeUjian>('Semua');
  const [selectedSiswaUjianId, setSelectedSiswaUjianId] = useState<number | null>(null);

  // List state
  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Detail state
  const [detail, setDetail] = useState<DetailHasil | null>(null);
  const [selectedItem, setSelectedItem] = useState<RiwayatItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ─── Fetch list riwayat ───────────────────────────────────────
  const fetchRiwayat = async () => {
    try {
      setIsLoadingList(true);
      setListError(null);
      const res = await api.get('/riwayat-ujian');
      console.log('response riwayat:', res.data);
      
      const paginatedData = res.data?.data;
      const items: RiwayatItem[] = Array.isArray(paginatedData?.data) 
        ? paginatedData.data 
        : [];
      
      console.log('parsed riwayat:', items);
      setRiwayat(items);
    } catch (err: any) {
      console.error('error riwayat:', err);
      setListError(err.response?.data?.message || 'Gagal mengambil histori ujian');
    } finally {
      setIsLoadingList(false);
    }
  };

  // ─── Fetch detail hasil ────────────────────────────────────────
  const fetchDetail = async (item: RiwayatItem) => {
    try {
      setIsLoadingDetail(true);
      setSelectedItem(item);

      // ✅ endpoint yang benar adalah /siswa-ujian/{id}/hasil
      const res = await api.get(`/siswa-ujian/${item.id}/hasil`);
      console.log('response detail:', res.data);

      const raw = res.data?.data;
      // 🔍 Debug: log semua key yang ada di response
      console.log('raw keys:', raw ? Object.keys(raw) : 'null');
      console.log('raw.jawabans:', raw?.jawabans);
      console.log('raw.jawaban:', raw?.jawaban);
      console.log('raw.nilai_akhir:', raw?.nilai_akhir);

      setDetail({
        siswa: raw?.siswa || '',
        // ✅ FIX: fallback ke siswa_ujian.nilai_akhir atau nilai dari list card
        nilai_akhir:
          raw?.nilai_akhir ||
          raw?.siswa_ujian?.nilai_akhir ||
          item.nilai_akhir ||
          '0',
        breakdown: raw?.breakdown ?? [],
        // ✅ FIX: handle "jawabans" (endpoint 1) DAN "jawaban" (endpoint 2)
        jawabans: raw?.jawabans ?? raw?.jawaban ?? [],
      });

      setSelectedSiswaUjianId(item.id);
    } catch (err: any) {
      console.error('error detail:', err);
      alert(err.response?.data?.message || 'Gagal mengambil detail hasil ujian');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchRiwayat();
  }, []);

  // ─── Detail View ───────────────────────────────────────────────
  if (selectedSiswaUjianId && detail && selectedItem) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedSiswaUjianId(null);
            setDetail(null);
            setSelectedItem(null);
          }}
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-navy transition tracking-widest"
        >
          <ArrowLeft size={16} /> Kembali ke List Histori
        </button>

        {/* Header Score */}
        <div className="bg-navy rounded-lg p-8 text-white relative overflow-hidden shadow-xl border-b-8 border-light-blue">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded border border-white/20 mb-4">
              <History size={14} className="text-light-blue" />
              <span className="text-[9px] font-black uppercase tracking-widest">Detail Hasil Ujian</span>
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter mb-1 uppercase">
              {getJudulUjian(selectedItem)}
            </h1>
            <p className="text-blue-100/70 text-[10px] font-black uppercase tracking-widest">
              {detail.siswa} · Status: {selectedItem.status}
            </p>
          </div>
          <div className="absolute top-1/2 right-12 -translate-y-1/2 text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-light-blue mb-0">SKOR AKHIR</p>
            <h2 className="text-7xl font-black italic tracking-tighter leading-none">
              {detail.nilai_akhir}
            </h2>
          </div>
        </div>

        {/* Review Soal & Jawaban */}
        {detail.jawabans.length === 0 ? (
          <div className="bg-white rounded-lg p-16 border border-exam-border text-center">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Belum ada data jawaban tersedia</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-navy uppercase tracking-[0.3em] mb-6">
              Review Soal & Jawaban
            </h2>
            {detail.jawabans.map((item, idx) => {
              const { soal, jawaban_siswa, nilai } = item;
              const isCorrect = nilai > 0;
              // ✅ Ambil raw path (jalur_gambar endpoint 1, path_gambar endpoint 2)
              const rawGambar = soal.jalur_gambar || soal.path_gambar || null;
              // ✅ Kalau path relatif → prefix BASE_STORAGE_URL (sama seperti SoalList guru)
              //    Kalau sudah full URL (http/https) → pakai langsung
              const gambarUrl = rawGambar
                ? rawGambar.startsWith('http')
                  ? rawGambar
                  : `${BASE_STORAGE_URL}${rawGambar}`
                : null;

              return (
                <div 
                  key={soal.id} 
                  className="bg-white border border-exam-border rounded-lg overflow-hidden shadow-sm"
                >
                  <div className={cn(
                    "px-6 py-3 flex items-center justify-between border-b",
                    isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                  )}>
                    <span className="text-[10px] font-black text-navy uppercase">Soal No. {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 size={14} />
                          <span className="text-[9px] font-black uppercase">BENAR</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <XCircle size={14} />
                          <span className="text-[9px] font-black uppercase">SALAH</span>
                        </div>
                      )}
                      <div className="ml-4 px-2 py-0.5 bg-white rounded border border-slate-200 text-[10px] font-black text-navy">
                        SKOR: {nilai}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {gambarUrl && (
                      <img
                        src={gambarUrl}
                        alt="Soal"
                        className="mb-4 rounded-lg max-h-48 object-contain border border-slate-100"
                      />
                    )}
                    <p className="text-sm font-bold text-navy mb-6 leading-relaxed">
                      {soal.teks_soal}
                    </p>

                    <div className="space-y-2">
                      {['objektif', 'ganda_kompleks'].includes(soal.tipe_soal) && 
                        soal.pilihan_jawaban.map(p => {
                          const isSelected = jawaban_siswa?.id_pilihan_terpilih?.includes(p.id);
                          const isTrue = p.is_true === 1;
                          
                          return (
                            <div
                              key={p.id}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded text-[11px] font-bold border transition-all",
                                isTrue
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : isSelected
                                    ? "bg-red-50 border-red-200 text-red-700"
                                    : "bg-slate-50 border-slate-100 text-slate-500"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center text-[9px] border shrink-0",
                                isTrue
                                  ? "bg-green-600 border-green-600 text-white"
                                  : isSelected
                                    ? "bg-red-600 border-red-600 text-white"
                                    : "bg-white border-slate-200"
                              )}>
                                {isSelected && !isTrue && <XCircle size={10} />}
                                {isTrue && <CheckCircle2 size={10} />}
                              </div>
                              <span className="flex-1">{p.teks_pilihan}</span>
                              {isTrue && (
                                <span className="ml-auto text-[8px] font-black uppercase bg-green-200/50 px-1.5 py-0.5 rounded shrink-0">
                                  Kunci
                                </span>
                              )}
                            </div>
                          );
                        })
                      }

                      {soal.tipe_soal === 'menjodohkan' && (
                        <div className="space-y-2">
                          {/* Header kolom */}
                          <div className="grid grid-cols-[1fr_16px_1fr_16px_1fr] gap-2 px-3 pb-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item</span>
                            <span />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jawaban Kamu</span>
                            <span />
                            <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Kunci Jawaban</span>
                          </div>

                          {soal.pilihan_jawaban.map(p => {
                            // ✅ Cari jawaban siswa untuk item ini
                            // Handle berbagai kemungkinan struktur pasangan_terpilih dari API
                            const pasanganTerpilih = jawaban_siswa?.pasangan_terpilih?.find(
                              (pt: any) =>
                                pt?.item_id === p.id ||
                                pt?.pilihan_id === p.id ||
                                pt?.id === p.id ||
                                pt?.soal_id === p.id
                            );

                            // ✅ Ambil teks jawaban siswa — coba berbagai field name
                            const teksJawaban =
                              pasanganTerpilih?.pasangan ||
                              pasanganTerpilih?.teks_pasangan ||
                              pasanganTerpilih?.jawaban ||
                              pasanganTerpilih?.teks ||
                              // Kalau store pasangan_id, cari teks_pasangan dari pilihan yang sesuai
                              (pasanganTerpilih?.pasangan_id != null
                                ? soal.pilihan_jawaban.find(
                                    x => x.id === pasanganTerpilih.pasangan_id
                                  )?.teks_pasangan ?? null
                                : null) ||
                              null;

                            // ✅ Bandingkan jawaban siswa dengan kunci
                            const isMatch =
                              teksJawaban != null &&
                              teksJawaban.trim().toLowerCase() ===
                                p.teks_pasangan.trim().toLowerCase();

                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  'grid grid-cols-[1fr_16px_1fr_16px_1fr] items-center gap-2 p-3 rounded border text-[11px] font-bold transition-all',
                                  isMatch
                                    ? 'bg-green-50 border-green-200'
                                    : teksJawaban
                                      ? 'bg-red-50 border-red-200'
                                      : 'bg-slate-50 border-slate-100'
                                )}
                              >
                                {/* Item kiri */}
                                <span className="text-navy leading-snug">{p.teks_pilihan}</span>

                                {/* Panah */}
                                <span className="text-slate-300 text-center">→</span>

                                {/* Jawaban siswa */}
                                <span className={cn(
                                  'leading-snug',
                                  isMatch
                                    ? 'text-green-600'
                                    : teksJawaban
                                      ? 'text-red-500'
                                      : 'text-slate-300 italic'
                                )}>
                                  {teksJawaban ?? 'Tidak dijawab'}
                                </span>

                                {/* Pembatas */}
                                <span className="text-slate-200 text-center">|</span>

                                {/* Kunci jawaban */}
                                <span className="flex items-center gap-1 text-green-600 leading-snug">
                                  <CheckCircle2 size={10} className="shrink-0 mt-0.5" />
                                  <span>{p.teks_pasangan}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {['isian', 'essay'].includes(soal.tipe_soal) && (
                        <div className="space-y-3">
                          <div className="p-4 bg-slate-50 rounded border border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              Jawaban Kamu:
                            </p>
                            <p className="text-xs font-bold text-navy italic">
                              "{jawaban_siswa?.jawaban_teks || 'Tidak menjawab'}"
                            </p>
                          </div>
                          {jawaban_siswa?.nilai_manual_guru !== null && 
                            jawaban_siswa?.nilai_manual_guru !== undefined && (
                            <div className="p-4 bg-light-blue/5 rounded border border-light-blue/10">
                              <p className="text-[9px] font-black text-light-blue uppercase tracking-widest mb-1">
                                Nilai Manual Guru:
                              </p>
                              <p className="text-sm font-black text-navy">
                                {jawaban_siswa.nilai_manual_guru}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase text-navy">
            Histori Hasil Ujian
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Lacak kemajuan belajar dan evaluasi hasil latihanmu
          </p>
        </div>
      </div>

      {isLoadingList ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
            Memuat histori ujian...
          </p>
        </div>
      ) : listError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400 text-xs font-black uppercase tracking-widest">
            {listError}
          </p>
          <button
            onClick={fetchRiwayat}
            className="px-4 py-2 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2 hover:bg-navy/90"
          >
            <RefreshCcw size={12} /> Coba Lagi
          </button>
        </div>
      ) : riwayat.length === 0 ? (
        <div className="bg-white rounded-lg p-20 border border-exam-border text-center">
          <History size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Belum ada histori ujian tersedia
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {riwayat.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ y: -5 }}
              onClick={() => !isLoadingDetail && fetchDetail(item)}
              className="bg-white rounded-lg border border-exam-border overflow-hidden shadow-sm hover:shadow-xl hover:border-light-blue transition-all cursor-pointer group"
            >
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-navy text-white text-[8px] font-black uppercase tracking-widest rounded w-fit">
                      {getTipeUjian(item) || `Ujian #${item.ujian_id}`}
                    </span>
                    {getTipeUjian(item) && (
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                        #{item.ujian_id}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-navy uppercase tracking-tighter leading-tight group-hover:text-light-blue transition-colors mt-2 line-clamp-2">
                    {getJudulUjian(item)}
                  </h3>
                  {item.ujian?.mata_pelajaran && (
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {item.ujian.mata_pelajaran}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NILAI AKHIR</p>
                  <h4 className="text-4xl font-black italic tracking-tighter text-navy group-hover:scale-110 transition-transform origin-right">
                    {item.nilai_akhir ?? '-'}
                  </h4>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      WAKTU MULAI
                    </span>
                    <span className="text-[10px] font-bold text-navy">
                      {item.waktu_mulai
                        ? new Date(item.waktu_mulai).toLocaleDateString('id-ID')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      WAKTU SELESAI
                    </span>
                    <span className="text-[10px] font-bold text-navy">
                      {item.waktu_selesai
                        ? new Date(item.waktu_selesai).toLocaleDateString('id-ID')
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                    item.status === 'dinilai'
                      ? 'bg-green-50 text-green-600'
                      : item.status === 'selesai'
                        ? 'bg-blue-50 text-light-blue'
                        : 'bg-amber-50 text-amber-600'
                  )}>
                    {item.status}
                  </span>
                  <div className={cn(
                    "p-2 rounded transition-all",
                    isLoadingDetail
                      ? "bg-slate-100 text-slate-300"
                      : "bg-light-blue/10 text-light-blue group-hover:bg-light-blue group-hover:text-white shadow-lg shadow-light-blue/10"
                  )}>
                    {isLoadingDetail
                      ? <RefreshCcw size={16} className="animate-spin" />
                      : <BookOpen size={16} />
                    }
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}