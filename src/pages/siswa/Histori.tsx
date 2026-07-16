import { useState, useEffect } from 'react';
import {
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  ArrowLeft,
  RefreshCcw,
  GraduationCap,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import api, { APP_URL } from '../../lib/axios';

// ─── Storage URL ───────────────────────────────────────────────
const BASE_STORAGE_URL = `${APP_URL}/storage/`;

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
    jalur_gambar: string | null;
    path_gambar?: string | null;
    pilihan_jawaban: PilihanJawaban[];
  };
  jawaban_siswa: {
    id_pilihan_terpilih: number[] | null;
    jawaban_teks: string | null;
    pasangan_terpilih: any[] | null;
    nilai_manual_guru: number | null;
  };
  nilai: number | null;
  sudah_dinilai?: boolean;
}

interface DetailHasil {
  siswa: string;
  nilai_akhir: string;
  is_nilai_sementara: boolean;
  breakdown: any[];
  jawabans: JawabanItem[];
}

// ─── Status Jawaban (Benar / Hampir Benar / Salah) ─────────────
type StatusJawaban = 'benar' | 'hampir_benar' | 'salah' | 'tidak_menjawab';

function getStatusJawaban(skor: number, adaJawaban: boolean): StatusJawaban {
  if (!adaJawaban) return 'tidak_menjawab';
  if (skor >= 100) return 'benar';
  if (skor <= 0) return 'salah';
  return 'hampir_benar';
}

const STATUS_CONFIG: Record<
  StatusJawaban,
  { label: string; badgeClasses: string; headerClasses: string; textClasses: string }
> = {
  benar: {
    label: 'Benar',
    badgeClasses: 'bg-green-50 border-green-200 text-green-700',
    headerClasses: 'bg-green-50 border-green-100',
    textClasses: 'text-green-600',
  },
  hampir_benar: {
    label: 'Hampir Benar',
    badgeClasses: 'bg-amber-50 border-amber-200 text-amber-700',
    headerClasses: 'bg-amber-50 border-amber-100',
    textClasses: 'text-amber-600',
  },
  salah: {
    label: 'Salah',
    badgeClasses: 'bg-red-50 border-red-200 text-red-600',
    headerClasses: 'bg-red-50 border-red-100',
    textClasses: 'text-red-500',
  },
  tidak_menjawab: {
    label: 'Tidak Menjawab',
    badgeClasses: 'bg-slate-50 border-slate-200 text-slate-400',
    headerClasses: 'bg-slate-50 border-slate-100',
    textClasses: 'text-slate-400',
  },
};

function StatusIcon({ status, size = 14 }: { status: StatusJawaban; size?: number }) {
  if (status === 'benar') return <CheckCircle2 size={size} className="shrink-0" />;
  if (status === 'hampir_benar') return <AlertCircle size={size} className="shrink-0" />;
  return <XCircle size={size} className="shrink-0" />;
}

// ─────────────────────────────────────────────────────────────
// Hitung skor per soal di frontend
// Backend kirim nilai: null untuk objektif/ganda/menjodohkan,
// jadi kita hitung sendiri dari data pilihan_jawaban yang sudah ada.
// ─────────────────────────────────────────────────────────────
function hitungSkor(item: JawabanItem): number {
  const { soal, jawaban_siswa, nilai } = item;

  // Kalau backend sudah kasih nilai (non-null), pakai langsung
  if (nilai !== null && nilai !== undefined) return nilai;

  const tipe = soal.tipe_soal;
  const pilihan = soal.pilihan_jawaban ?? [];

  // ── Isian / Essay: nilai dari guru ──────────────────────────
  if (tipe === 'isian' || tipe === 'essay') {
    return jawaban_siswa?.nilai_manual_guru ?? 0;
  }

  // ── Objektif: 1 pilihan, ambil persentase_nilai jika benar ──
  if (tipe === 'objektif') {
    const selectedId = jawaban_siswa?.id_pilihan_terpilih?.[0];
    if (selectedId == null) return 0;
    const pilihanDipilih = pilihan.find(p => p.id === selectedId);
    if (!pilihanDipilih) return 0;
    // Benar jika is_true === 1, ambil persentase_nilai-nya
    return pilihanDipilih.is_true === 1 ? (pilihanDipilih.persentase_nilai ?? 100) : 0;
  }

  // ── Ganda Kompleks: bisa pilih banyak, jumlah persentase yg benar ──
  if (tipe === 'ganda_kompleks') {
    const selectedIds = jawaban_siswa?.id_pilihan_terpilih ?? [];
    if (selectedIds.length === 0) return 0;

    const correctIds = pilihan.filter(p => p.is_true === 1).map(p => p.id);
    const correctSet = new Set(correctIds);
    const selectedSet = new Set(selectedIds);

    // Kalau jawaban siswa PERSIS sama dengan kunci jawaban, paksa 100.
    // Ini menghindari error pembulatan backend, misal 33+33+33 = 99 padahal seharusnya 100.
    const isExactMatch =
      correctSet.size === selectedSet.size &&
      [...correctSet].every(id => selectedSet.has(id));
    if (isExactMatch) return 100;

    // Selain itu (sebagian benar / ada yang salah dipilih), jumlahkan apa adanya
    const total = selectedIds.reduce((acc, id) => {
      const p = pilihan.find(x => x.id === id);
      if (!p) return acc;
      return acc + (p.is_true === 1 ? (p.persentase_nilai ?? 0) : 0);
    }, 0);
    return Math.min(100, Math.round(total));
  }

  // ── Menjodohkan: hitung pasangan benar / pasangan valid ──────
  if (tipe === 'menjodohkan') {
    const pasanganTerpilih = jawaban_siswa?.pasangan_terpilih ?? [];
    if (pasanganTerpilih.length === 0) return 0;

    // Pasangan valid = KEDUANYA teks_pilihan DAN teks_pasangan terisi
    // Pengecoh bisa punya salah satu kosong — tidak ikut dihitung di denominator
    const pasanganValid = pilihan.filter(
      p =>
        p.teks_pilihan != null && p.teks_pilihan.trim() !== '' &&
        p.teks_pasangan != null && p.teks_pasangan.trim() !== ''
    );
    const totalValid = pasanganValid.length;
    if (totalValid === 0) return 0;

    // Hitung berapa pasangan valid yang dijawab benar
    let benar = 0;
    pasanganValid.forEach(p => {
      const match = pasanganTerpilih.find(
        (pt: any) =>
          pt?.item_id === p.id ||
          pt?.pilihan_id === p.id ||
          pt?.id === p.id ||
          pt?.soal_id === p.id
      );
      if (!match) return;

      // Resolve teks jawaban siswa untuk item ini
      const teksJawaban =
        match?.pasangan ||
        match?.teks_pasangan ||
        match?.jawaban ||
        match?.teks ||
        (match?.pasangan_id != null
          ? pilihan.find(x => x.id === match.pasangan_id)?.teks_pasangan ?? null
          : null) ||
        null;

      if (
        teksJawaban != null &&
        teksJawaban.trim().toLowerCase() === p.teks_pasangan.trim().toLowerCase()
      ) {
        benar++;
      }
    });

    // Skor = (pasangan benar / pasangan valid) * 100
    // Contoh: 3 benar dari 3 pasangan valid → 100, meski ada 2 pengecoh
    return Math.round((benar / totalValid) * 100);
  }

  return 0;
}

// ─── Sub-components ───────────────────────────────────────────

function SectionLabel({
  icon,
  label,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'neutral' | 'green' | 'blue' | 'orange';
}) {
  const colorBar = {
    neutral: 'bg-slate-300',
    green:   'bg-green-400',
    blue:    'bg-light-blue',
    orange:  'bg-amber-400',
  }[variant];
  const colorText = {
    neutral: 'text-slate-400',
    green:   'text-green-500',
    blue:    'text-light-blue',
    orange:  'text-amber-500',
  }[variant];

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={cn('block w-[3px] h-4 rounded-full shrink-0', colorBar)} />
      <span className={cn('flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest', colorText)}>
        {icon}
        {label}
      </span>
    </div>
  );
}

// Badge status untuk soal auto-grade (objektif, ganda_kompleks, menjodohkan)
function StatusBadge({ status, skor }: { status: StatusJawaban; skor: number }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest',
      config.badgeClasses,
    )}>
      <StatusIcon status={status} size={11} />
      {config.label} · Nilai: {skor}
    </div>
  );
}

// Badge nilai murni untuk isian/essay (nilai manual guru, bukan 0-100 auto-grade)
function SkorBadge({ nilai, isCorrect }: { nilai: number; isCorrect: boolean }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest',
      isCorrect
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-red-50 border-red-200 text-red-600',
    )}>
      {isCorrect
        ? <CheckCircle2 size={11} className="shrink-0" />
        : <XCircle size={11} className="shrink-0" />
      }
      Nilai: {nilai}
    </div>
  );
}

function AnswerRow({ text, isCorrect }: { text: string; isCorrect: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-3 rounded-lg border text-[11px] font-bold',
      isCorrect
        ? 'bg-green-50 border-green-200 text-green-700'
        : 'bg-red-50 border-red-200 text-red-600',
    )}>
      {isCorrect
        ? <CheckCircle2 size={13} className="shrink-0" />
        : <XCircle size={13} className="shrink-0" />
      }
      <span className="flex-1">{text}</span>
    </div>
  );
}

function KunciRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg text-[11px] font-bold text-green-700">
      <CheckCircle2 size={13} className="shrink-0" />
      <span className="flex-1">{text}</span>
    </div>
  );
}

function EmptyRow({ label = 'Tidak menjawab' }: { label?: string }) {
  return (
    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-[11px] text-slate-300 italic">
      {label}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────
export default function HistoriSiswa() {
  const [selectedSiswaUjianId, setSelectedSiswaUjianId] = useState<number | null>(null);

  const [riwayat, setRiwayat]       = useState<RiwayatItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError]   = useState<string | null>(null);

  const [detail, setDetail]         = useState<DetailHasil | null>(null);
  const [selectedItem, setSelectedItem] = useState<RiwayatItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ─── Fetch list ───────────────────────────────────────────────
  const fetchRiwayat = async () => {
    try {
      setIsLoadingList(true);
      setListError(null);
      const res = await api.get('/riwayat-ujian');
      const responseData = res.data?.data;

      // Backend bisa balikin plain array ATAU paginated object { data: [...] }
      const items: RiwayatItem[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data)
          ? responseData.data
          : [];

      setRiwayat(items);
    } catch (err: any) {
      setListError(err.response?.data?.message || 'Gagal mengambil histori ujian');
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchDetail = async (item: RiwayatItem) => {
    try {
      setIsLoadingDetail(true);
      setSelectedItem(item);
      const res = await api.get(`/siswa-ujian/${item.id}/hasil`);
      const raw = res.data?.data;

      // Pisahkan nilai_akhir vs nilai_sementara
      const nilaiAkhir     = raw?.nilai_akhir ?? raw?.siswa_ujian?.nilai_akhir ?? null;
      const nilaiSementara = raw?.siswa_ujian?.nilai_sementara ?? null;
      const isSementara    = !nilaiAkhir && !!nilaiSementara;

      setDetail({
        siswa:              raw?.siswa || '',
        nilai_akhir:        nilaiAkhir || nilaiSementara || item.nilai_akhir || '0',
        is_nilai_sementara: isSementara,
        breakdown:          raw?.breakdown ?? [],
        jawabans:           raw?.jawabans ?? raw?.jawaban ?? [],
      });
      setSelectedSiswaUjianId(item.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengambil detail hasil ujian');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => { fetchRiwayat(); }, []);

  // ─── Detail View ───────────────────────────────────────────────
  if (selectedSiswaUjianId && detail && selectedItem) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedSiswaUjianId(null); setDetail(null); setSelectedItem(null); }}
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-navy transition tracking-widest"
        >
          <ArrowLeft size={16} /> Kembali ke List Histori
        </button>

        {/* ── Header Score ── */}
        <div className="bg-navy rounded-lg p-6 text-white relative overflow-hidden shadow-xl border-b-8 border-light-blue">
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">

            {/* Sisi Kiri: Detail info ujian */}
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded border border-white/20 mb-3">
                <History size={14} className="text-light-blue" />
                <span className="text-[9px] font-black uppercase tracking-widest">Detail Hasil Ujian</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter mb-1 uppercase break-all">
                {getJudulUjian(selectedItem)}
              </h1>
              <p className="text-blue-100/70 text-[10px] font-black uppercase tracking-widest">
                {detail.siswa} · Status: {selectedItem.status}
              </p>
            </div>

            {/* Sisi Kanan: Nilai Akhir */}
            <div className="text-left sm:text-right mt-4 sm:mt-0 border-t border-white/10 pt-4 sm:border-t-0 sm:pt-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-light-blue mb-1">
                {detail.is_nilai_sementara ? 'NILAI SEMENTARA' : 'NILAI AKHIR'}
              </p>
              <h2 className="text-5xl sm:text-7xl font-black italic tracking-tighter leading-none text-white">
                {detail.nilai_akhir ?? '0'}
              </h2>
              {detail.is_nilai_sementara && (
                <p className="text-[9px] text-yellow-300/70 font-black uppercase tracking-widest mt-1">
                  ⏳ Menunggu penilaian manual guru
                </p>
              )}
            </div>

          </div>
        </div>

        {/* ── Review Soal & Jawaban ── */}
        {detail.jawabans.length === 0 ? (
          <div className="bg-white rounded-lg p-16 border border-exam-border text-center">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Belum ada data jawaban tersedia</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-navy uppercase tracking-[0.3em]">Review Soal & Jawaban</h2>

            {detail.jawabans.map((jawabanItem, idx) => {
              const { soal, jawaban_siswa } = jawabanItem;
              const tipe = soal.tipe_soal;

              // ── Hitung skor di frontend karena backend kirim nilai: null ──
              const skorAkhir = hitungSkor(jawabanItem);

              // ── Gambar ──
              const rawGambar = soal.jalur_gambar || soal.path_gambar || null;
              const gambarUrl = rawGambar
                ? rawGambar.startsWith('http') ? rawGambar : `${BASE_STORAGE_URL}${rawGambar}`
                : null;

              // ── Objektif / Ganda: precompute ──
              const selectedIds     = jawaban_siswa?.id_pilihan_terpilih ?? [];
              const selectedPilihan = soal.pilihan_jawaban.filter(p => selectedIds.includes(p.id));
              const correctPilihan  = soal.pilihan_jawaban.filter(p => p.is_true === 1);

              // ── Menjodohkan: precompute matches ──
              const matchResults = soal.pilihan_jawaban.map(p => {
                const pasanganTerpilih = jawaban_siswa?.pasangan_terpilih?.find(
                  (pt: any) => pt?.item_id === p.id || pt?.pilihan_id === p.id || pt?.id === p.id || pt?.soal_id === p.id
                );
                const teksJawaban =
                  pasanganTerpilih?.pasangan ||
                  pasanganTerpilih?.teks_pasangan ||
                  pasanganTerpilih?.jawaban ||
                  pasanganTerpilih?.teks ||
                  (pasanganTerpilih?.pasangan_id != null
                    ? soal.pilihan_jawaban.find(x => x.id === pasanganTerpilih.pasangan_id)?.teks_pasangan ?? null
                    : null) ||
                  null;
                const isMatch =
                  teksJawaban != null &&
                  teksJawaban.trim().toLowerCase() === p.teks_pasangan.trim().toLowerCase();
                return { p, teksJawaban, isMatch };
              });

              // ── Tentukan apakah soal ini termasuk auto-grade (punya status Benar/Hampir Benar/Salah) ──
              const isAutoGrade = ['objektif', 'ganda_kompleks', 'menjodohkan'].includes(tipe);

              // ── Apakah siswa menjawab soal ini sama sekali? ──
              const adaJawaban =
                tipe === 'menjodohkan'
                  ? (jawaban_siswa?.pasangan_terpilih ?? []).length > 0
                  : ['isian', 'essay'].includes(tipe)
                    ? !!jawaban_siswa?.jawaban_teks
                    : selectedIds.length > 0;

              const status = getStatusJawaban(skorAkhir, adaJawaban);
              const statusConfig = STATUS_CONFIG[status];

              return (
                <div
                  key={soal.id}
                  className="bg-white border border-exam-border rounded-lg overflow-hidden shadow-sm"
                >
                  {/* ── Card Header ── */}
                  <div className={cn(
                    'px-6 py-3 flex items-center justify-between border-b',
                    statusConfig.headerClasses,
                  )}>
                    <span className="text-[10px] font-black text-navy uppercase">Soal No. {idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <div className={cn('flex items-center gap-1.5', statusConfig.textClasses)}>
                        <StatusIcon status={status} size={14} />
                        <span className="text-[9px] font-black uppercase">{statusConfig.label}</span>
                      </div>
                      {/* Skor di header card */}
                      <div className={cn(
                        'px-2 py-0.5 rounded border text-[10px] font-black',
                        statusConfig.badgeClasses,
                      )}>
                        Skor: {skorAkhir}
                      </div>
                    </div>
                  </div>

                  {/* ── Card Body ── */}
                  <div className="p-6 space-y-5">
                    {/* Gambar soal */}
                    {gambarUrl && (
                      <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 w-fit max-w-full">
                        <img
                          src={gambarUrl}
                          alt="Gambar soal"
                          className="max-h-52 object-contain"
                        />
                      </div>
                    )}

                    {/* Teks soal */}
                    <p className="text-sm font-bold text-navy leading-relaxed">
                      {soal.teks_soal}
                    </p>

                    {/* ── Jawaban Section ── */}
                    <div className="border-t border-slate-100 pt-5 space-y-5">

                      {/* ──────────────────────────────────── */}
                      {/* OBJEKTIF / GANDA KOMPLEKS            */}
                      {/* ──────────────────────────────────── */}
                      {['objektif', 'ganda_kompleks'].includes(tipe) && (
                        <div className="space-y-4">

                          <div>
                            <SectionLabel icon={<User size={10} />} label="Jawaban Kamu" variant="neutral" />
                            <div className="space-y-1.5">
                              {selectedPilihan.length === 0 ? (
                                <EmptyRow />
                              ) : (
                                selectedPilihan.map(p => (
                                  <AnswerRow key={p.id} text={p.teks_pilihan} isCorrect={p.is_true === 1} />
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <SectionLabel icon={<GraduationCap size={10} />} label="Kunci Jawaban" variant="green" />
                            <div className="space-y-1.5">
                              {correctPilihan.length === 0 ? (
                                <EmptyRow label="Tidak ada kunci jawaban" />
                              ) : (
                                correctPilihan.map(p => (
                                  <KunciRow key={p.id} text={p.teks_pilihan} />
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <SectionLabel icon={<History size={10} />} label="Perolehan Nilai" variant="orange" />
                            <StatusBadge status={status} skor={skorAkhir} />
                          </div>

                        </div>
                      )}

                      {/* ──────────────────────────────────── */}
                      {/* MENJODOHKAN                         */}
                      {/* ──────────────────────────────────── */}
                      {tipe === 'menjodohkan' && (
                        <div className="space-y-4">

                          <div>
                            <SectionLabel icon={<User size={10} />} label="Jawaban Kamu" variant="neutral" />
                            <div className="space-y-1.5">
                              {matchResults.map(({ p, teksJawaban, isMatch }) => (
                                <div
                                  key={p.id}
                                  className={cn(
                                    'grid grid-cols-[1fr_20px_1fr_20px] items-center gap-1 p-3 rounded-lg border text-[11px] font-bold',
                                    isMatch
                                      ? 'bg-green-50 border-green-200'
                                      : teksJawaban
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-slate-50 border-slate-200',
                                  )}
                                >
                                  <span className="text-navy truncate">{p.teks_pilihan}</span>
                                  <span className="text-slate-300 text-center">→</span>
                                  <span className={cn(
                                    'truncate',
                                    isMatch ? 'text-green-600' : teksJawaban ? 'text-red-500' : 'text-slate-300 italic',
                                  )}>
                                    {teksJawaban ?? 'Tidak dijawab'}
                                  </span>
                                  <span className="flex justify-center">
                                    {isMatch
                                      ? <CheckCircle2 size={12} className="text-green-500" />
                                      : teksJawaban
                                        ? <XCircle size={12} className="text-red-400" />
                                        : null
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <SectionLabel icon={<GraduationCap size={10} />} label="Kunci Jawaban" variant="green" />
                            <div className="space-y-1.5">
                              {soal.pilihan_jawaban.map(p => (
                                <div
                                  key={p.id}
                                  className="grid grid-cols-[1fr_20px_1fr_20px] items-center gap-1 p-3 bg-green-50 border border-green-200 rounded-lg text-[11px] font-bold"
                                >
                                  <span className="text-navy truncate">{p.teks_pilihan}</span>
                                  <span className="text-slate-300 text-center">→</span>
                                  <span className="text-green-600 truncate">{p.teks_pasangan}</span>
                                  <span className="flex justify-center">
                                    <CheckCircle2 size={12} className="text-green-500" />
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <SectionLabel icon={<History size={10} />} label="Perolehan Nilai" variant="orange" />
                            <StatusBadge status={status} skor={skorAkhir} />
                          </div>

                        </div>
                      )}

                      {/* ──────────────────────────────────── */}
                      {/* ISIAN / ESSAY                       */}
                      {/* ──────────────────────────────────── */}
                      {['isian', 'essay'].includes(tipe) && (
                        <div className="space-y-4">

                          <div>
                            <SectionLabel icon={<User size={10} />} label="Jawaban Kamu" variant="neutral" />
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                              {jawaban_siswa?.jawaban_teks ? (
                                <p className="text-xs font-bold text-navy italic leading-relaxed">
                                  "{jawaban_siswa.jawaban_teks}"
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-300 italic">Tidak menjawab</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <SectionLabel icon={<History size={10} />} label="Perolehan Nilai" variant="orange" />
                            <SkorBadge nilai={skorAkhir} isCorrect={skorAkhir > 0} />
                          </div>

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
      <div>
        <h1 className="text-xl font-black italic tracking-tighter uppercase text-navy">
          Histori Hasil Ujian
        </h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Lacak kemajuan belajar dan evaluasi hasil latihanmu
        </p>
      </div>

      {isLoadingList ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
            Memuat histori ujian...
          </p>
        </div>
      ) : listError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-400 text-xs font-black uppercase tracking-widest">{listError}</p>
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
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">WAKTU MULAI</span>
                    <span className="text-[10px] font-bold text-navy">
                      {item.waktu_mulai ? new Date(item.waktu_mulai).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">WAKTU SELESAI</span>
                    <span className="text-[10px] font-bold text-navy">
                      {item.waktu_selesai ? new Date(item.waktu_selesai).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded',
                    item.status === 'dinilai'
                      ? 'bg-green-50 text-green-600'
                      : item.status === 'selesai'
                        ? 'bg-blue-50 text-light-blue'
                        : 'bg-amber-50 text-amber-600',
                  )}>
                    {item.status}
                  </span>
                  <div className={cn(
                    'p-2 rounded transition-all',
                    isLoadingDetail
                      ? 'bg-slate-100 text-slate-300'
                      : 'bg-light-blue/10 text-light-blue group-hover:bg-light-blue group-hover:text-white shadow-lg shadow-light-blue/10',
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

// ─── Helpers ──────────────────────────────────────────────────
function getJudulUjian(item: RiwayatItem): string {
  return item.ujian?.judul_ujian || item.judul_ujian || `Ujian #${item.ujian_id}`;
}

function getTipeUjian(item: RiwayatItem): string | null {
  return item.ujian?.tipe_ujian || null;
}