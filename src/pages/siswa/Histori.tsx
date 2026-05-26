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
import api from '../../lib/axios';

type TipeUjian = 'Semua' | 'STS' | 'UTS' | 'UAS' | 'Harian';

// ─── Types ────────────────────────────────────────────────────

interface RiwayatItem {
  id: number;                    // ← siswa_ujian.id
  ujian_id: number;
  siswa_id: number;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  status: string;
  nilai_akhir: string | null;
  urutan_soal?: any[];
  created_at?: string;
  updated_at?: string;
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
    jalur_gambar: string | null;
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
  // Endpoint: GET /ujian/riwayat
  // Response: { data: { current_page, data[], ... } }
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
  // Endpoint: GET /ujian/{siswaUjian}/detail
  // {siswaUjian} = item.id (ID dari siswa_ujian)
  // Response: { data: { siswa, nilai_akhir, breakdown[], jawabans[] } }
  const fetchDetail = async (item: RiwayatItem) => {
    try {
      setIsLoadingDetail(true);
      setSelectedItem(item);

      const res = await api.get(`/ujian/${item.id}/hasil`);
      console.log('response detail:', res.data);
      
      const raw = res.data?.data;
      setDetail({
        siswa: raw.siswa || '',
        nilai_akhir: raw.nilai_akhir || '0',
        breakdown: raw.breakdown ?? [],
        jawabans: raw.jawabans ?? [],
      });

      setSelectedSiswaUjianId(item.id);
    } catch (err: any) {
      console.error('error detail:', err);
      alert(err.response?.data?.message || 'Gagal mengambil detail hasil ujian');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ─── Load data saat mount ──────────────────────────────────────
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
            <h1 className="text-3xl font-black italic tracking-tighter mb-2 uppercase">
              {detail.siswa || 'Siswa'}
            </h1>
            <p className="text-blue-100/70 text-[10px] font-black uppercase tracking-widest">
              Status: {selectedItem.status}
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
              const gambarUrl = soal.jalur_gambar || null;

              return (
                <div 
                  key={soal.id} 
                  className="bg-white border border-exam-border rounded-lg overflow-hidden shadow-sm"
                >
                  {/* Card Header */}
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

                  {/* Card Body */}
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
                      {/* Pilihan Ganda / Objektif */}
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

                      {/* Menjodohkan */}
                      {soal.tipe_soal === 'menjodohkan' && (
                        <div className="space-y-2">
                          {soal.pilihan_jawaban.map(p => {
                            const pasanganTerpilih = jawaban_siswa?.pasangan_terpilih?.find(
                              (pt: any) => pt?.item_id === p.id
                            );
                            return (
                              <div 
                                key={p.id} 
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-100 text-[11px] font-bold text-navy"
                              >
                                <span className="flex-1">{p.teks_pilihan}</span>
                                <span className="text-slate-300">→</span>
                                <span className="flex-1 text-light-blue">
                                  {pasanganTerpilih?.pasangan || '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Isian / Essay */}
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
                  <span className="px-2 py-0.5 bg-navy text-white text-[8px] font-black uppercase tracking-widest rounded w-fit">
                    Ujian #{item.ujian_id}
                  </span>
                  <h3 className="text-sm font-black text-navy uppercase tracking-tighter leading-tight group-hover:text-light-blue transition-colors mt-2 truncate">
                    {item.status}
                  </h3>
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