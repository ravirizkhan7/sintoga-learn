import { useState, useEffect, useCallback } from 'react';
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

// ─── Constants ──────────────────────────────────────────────
const BASE_STORAGE_URL = `${APP_URL}/storage/`;

const TIPE_SOAL = {
  OBJEKTIF: 'objektif',
  GANDA_KOMPLEKS: 'ganda_kompleks',
  MENJODOHKAN: 'menjodohkan',
  ISIAN: 'isian',
  ESSAY: 'essay',
} as const;

type TipeSoal = (typeof TIPE_SOAL)[keyof typeof TIPE_SOAL];

const AUTO_GRADE_TYPES = new Set<TipeSoal>([
  TIPE_SOAL.OBJEKTIF,
  TIPE_SOAL.GANDA_KOMPLEKS,
  TIPE_SOAL.MENJODOHKAN,
]);

const TEKS_TYPES = new Set<TipeSoal>([TIPE_SOAL.ISIAN, TIPE_SOAL.ESSAY]);
const PILIHAN_TYPES = new Set<TipeSoal>([TIPE_SOAL.OBJEKTIF, TIPE_SOAL.GANDA_KOMPLEKS]);

// ─── Types (Cleaned - removed unused fields) ────────────────
interface PasanganTerpilih {
  item_id?: number;
  pilihan_id?: number;
  id?: number;
  soal_id?: number;
  pasangan?: string;
  teks_pasangan?: string;
  jawaban?: string;
  teks?: string;
  pasangan_id?: number;
}

interface RiwayatItem {
  id: number;
  ujian_id: number;
  siswa_id: number;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  status: string;
  nilai_akhir: string | null;
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
}

interface JawabanSiswa {
  id_pilihan_terpilih: number[] | null;
  jawaban_teks: string | null;
  pasangan_terpilih: PasanganTerpilih[] | null;
  nilai_manual_guru: number | null;
}

interface Soal {
  id: number;
  teks_soal: string;
  tipe_soal: TipeSoal;
  jalur_gambar: string | null;
  path_gambar?: string | null;
  pilihan_jawaban: PilihanJawaban[];
}

interface JawabanItem {
  soal: Soal;
  jawaban_siswa: JawabanSiswa;
  nilai: number | null;
}

interface DetailHasil {
  siswa: string;
  nilai_akhir: string;
  is_nilai_sementara: boolean;
  jawabans: JawabanItem[];
}

interface MatchResult {
  pilihan: PilihanJawaban;
  teksJawaban: string | null;
  isMatch: boolean;
}

// ─── Status Config ──────────────────────────────────────────
type StatusJawaban = 'benar' | 'hampir_benar' | 'salah' | 'tidak_menjawab';

const STATUS_CONFIG: Record<StatusJawaban, {
  label: string;
  badge: string;
  header: string;
  text: string;
}> = {
  benar: {
    label: 'Benar',
    badge: 'bg-green-50 border-green-200 text-green-700',
    header: 'bg-green-50 border-green-100',
    text: 'text-green-600',
  },
  hampir_benar: {
    label: 'Hampir Benar',
    badge: 'bg-amber-50 border-amber-200 text-amber-700',
    header: 'bg-amber-50 border-amber-100',
    text: 'text-amber-600',
  },
  salah: {
    label: 'Salah',
    badge: 'bg-red-50 border-red-200 text-red-600',
    header: 'bg-red-50 border-red-100',
    text: 'text-red-500',
  },
  tidak_menjawab: {
    label: 'Tidak Menjawab',
    badge: 'bg-slate-50 border-slate-200 text-slate-400',
    header: 'bg-slate-50 border-slate-100',
    text: 'text-slate-400',
  },
};

// ─── Pure Utility Functions ─────────────────────────────────
function getStatusJawaban(skor: number, adaJawaban: boolean): StatusJawaban {
  if (!adaJawaban) return 'tidak_menjawab';
  if (skor >= 100) return 'benar';
  if (skor <= 0) return 'salah';
  return 'hampir_benar';
}

function getJudulUjian(item: RiwayatItem): string {
  return item.ujian?.judul_ujian || item.judul_ujian || `Ujian #${item.ujian_id}`;
}

function formatTanggal(dateStr: string | null): string {
  return dateStr ? new Date(dateStr).toLocaleDateString('id-ID') : '-';
}

function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE_STORAGE_URL}${path}`;
}

function hasAnswer(item: JawabanItem): boolean {
  const { tipe_soal: tipe } = item.soal;
  const js = item.jawaban_siswa;

  if (tipe === TIPE_SOAL.MENJODOHKAN) return (js?.pasangan_terpilih ?? []).length > 0;
  if (TEKS_TYPES.has(tipe)) return !!js?.jawaban_teks;
  return (js?.id_pilihan_terpilih ?? []).length > 0;
}

// ─── Menjodohkan Helpers (Single Source of Truth) ──────────
function findPasanganTerpilih(
  list: PasanganTerpilih[] | undefined,
  pilihanId: number
): PasanganTerpilih | undefined {
  return list?.find(
    pt => pt?.item_id === pilihanId || pt?.pilihan_id === pilihanId || pt?.id === pilihanId || pt?.soal_id === pilihanId
  );
}

function resolveTeksJawaban(
  match: PasanganTerpilih | undefined,
  allPilihan: PilihanJawaban[]
): string | null {
  if (!match) return null;
  return (
    match.pasangan ||
    match.teks_pasangan ||
    match.jawaban ||
    match.teks ||
    (match.pasangan_id != null
      ? allPilihan.find(x => x.id === match.pasangan_id)?.teks_pasangan ?? null
      : null) ||
    null
  );
}

function computeMatchResults(
  pilihanJawaban: PilihanJawaban[],
  pasanganTerpilih: PasanganTerpilih[] | undefined
): MatchResult[] {
  return pilihanJawaban.map(p => {
    const match = findPasanganTerpilih(pasanganTerpilih, p.id);
    const teksJawaban = resolveTeksJawaban(match, pilihanJawaban);
    const isMatch = teksJawaban != null &&
      teksJawaban.trim().toLowerCase() === p.teks_pasangan.trim().toLowerCase();
    return { pilihan: p, teksJawaban, isMatch };
  });
}

// ─── Skor Calculation ──────────────────────────────────────
function hitungSkor(item: JawabanItem): number {
  const { soal, jawaban_siswa, nilai } = item;
  if (nilai !== null && nilai !== undefined) return nilai;

  const { tipe_soal: tipe, pilihan_jawaban: pilihan } = soal;

  // Isian / Essay: nilai manual guru
  if (TEKS_TYPES.has(tipe)) {
    return jawaban_siswa?.nilai_manual_guru ?? 0;
  }

  // Objektif: 1 pilihan
  if (tipe === TIPE_SOAL.OBJEKTIF) {
    const selectedId = jawaban_siswa?.id_pilihan_terpilih?.[0];
    const dipilih = selectedId != null ? pilihan.find(p => p.id === selectedId) : null;
    return dipilih?.is_true === 1 ? (dipilih.persentase_nilai ?? 100) : 0;
  }

  // Ganda Kompleks: multiple choice dengan partial score
  if (tipe === TIPE_SOAL.GANDA_KOMPLEKS) {
    const selectedIds = jawaban_siswa?.id_pilihan_terpilih ?? [];
    if (selectedIds.length === 0) return 0;

    const correctIds = new Set(pilihan.filter(p => p.is_true === 1).map(p => p.id));
    const selectedSet = new Set(selectedIds);

    // Exact match → 100 (avoid rounding errors like 33+33+33=99)
    if (correctIds.size === selectedSet.size && [...correctIds].every(id => selectedSet.has(id))) {
      return 100;
    }

    const total = selectedIds.reduce((sum, id) => {
      const p = pilihan.find(x => x.id === id);
      return sum + (p?.is_true === 1 ? (p.persentase_nilai ?? 0) : 0);
    }, 0);
    return Math.min(100, Math.round(total));
  }

  // Menjodohkan: hitung pasangan benar
  if (tipe === TIPE_SOAL.MENJODOHKAN) {
    const pasanganTerpilih = jawaban_siswa?.pasangan_terpilih ?? [];
    if (pasanganTerpilih.length === 0) return 0;

    const pasanganValid = pilihan.filter(p => p.teks_pilihan?.trim() && p.teks_pasangan?.trim());
    const totalValid = pasanganValid.length;
    if (totalValid === 0) return 0;

    const results = computeMatchResults(pasanganValid, pasanganTerpilih);
    const benar = results.filter(r => r.isMatch).length;
    return Math.round((benar / totalValid) * 100);
  }

  return 0;
}

// ─── Sub-components ────────────────────────────────────────
function SectionLabel({
  icon,
  label,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'neutral' | 'green' | 'blue' | 'orange';
}) {
  const styles = {
    neutral: { bar: 'bg-slate-300', text: 'text-slate-400' },
    green:   { bar: 'bg-green-400', text: 'text-green-500' },
    blue:    { bar: 'bg-light-blue', text: 'text-light-blue' },
    orange:  { bar: 'bg-amber-400', text: 'text-amber-500' },
  }[variant];

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className={cn('block w-[3px] h-4 rounded-full shrink-0', styles.bar)} />
      <span className={cn('flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest', styles.text)}>
        {icon}
        {label}
      </span>
    </div>
  );
}

function StatusIcon({ status, size = 14 }: { status: StatusJawaban; size?: number }) {
  const Icon = status === 'benar' ? CheckCircle2 : status === 'hampir_benar' ? AlertCircle : XCircle;
  return <Icon size={size} className="shrink-0" />;
}

function SkorBadge({ skor, status }: { skor: number; status: StatusJawaban }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest',
      config.badge,
    )}>
      <StatusIcon status={status} size={11} />
      {config.label} · Nilai: {skor}
    </div>
  );
}

function AnswerRow({ text, isCorrect }: { text: string; isCorrect: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-3 rounded-lg border text-[11px] font-bold',
      isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600',
    )}>
      {isCorrect ? <CheckCircle2 size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
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

// ─── Soal Card Sections ────────────────────────────────────
function PilihanSection({
  selectedPilihan,
  correctPilihan,
  status,
  skor,
}: {
  selectedPilihan: PilihanJawaban[];
  correctPilihan: PilihanJawaban[];
  status: StatusJawaban;
  skor: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel icon={<User size={10} />} label="Jawaban Kamu" variant="neutral" />
        <div className="space-y-1.5">
          {selectedPilihan.length === 0
            ? <EmptyRow />
            : selectedPilihan.map(p => <AnswerRow key={p.id} text={p.teks_pilihan} isCorrect={p.is_true === 1} />)
          }
        </div>
      </div>
      <div>
        <SectionLabel icon={<GraduationCap size={10} />} label="Kunci Jawaban" variant="green" />
        <div className="space-y-1.5">
          {correctPilihan.length === 0
            ? <EmptyRow label="Tidak ada kunci jawaban" />
            : correctPilihan.map(p => <KunciRow key={p.id} text={p.teks_pilihan} />)
          }
        </div>
      </div>
      <div>
        <SectionLabel icon={<History size={10} />} label="Perolehan Nilai" variant="orange" />
        <SkorBadge skor={skor} status={status} />
      </div>
    </div>
  );
}

function MenjodohkanSection({
  matchResults,
  pilihanJawaban,
  status,
  skor,
}: {
  matchResults: MatchResult[];
  pilihanJawaban: PilihanJawaban[];
  status: StatusJawaban;
  skor: number;
}) {
  const Row = ({ p, teksJawaban, isMatch, isKunci }: {
    p: PilihanJawaban;
    teksJawaban?: string | null;
    isMatch?: boolean;
    isKunci?: boolean;
  }) => {
    const showIcon = isKunci ? true : teksJawaban != null;
    const iconColor = isKunci || isMatch ? 'text-green-500' : 'text-red-400';
    const Icon = isKunci || isMatch ? CheckCircle2 : XCircle;

    return (
      <div className={cn(
        'grid grid-cols-[1fr_20px_1fr_20px] items-center gap-1 p-3 rounded-lg border text-[11px] font-bold',
        isKunci
          ? 'bg-green-50 border-green-200'
          : isMatch
            ? 'bg-green-50 border-green-200'
            : teksJawaban
              ? 'bg-red-50 border-red-200'
              : 'bg-slate-50 border-slate-200',
      )}>
        <span className="text-navy truncate">{p.teks_pilihan}</span>
        <span className="text-slate-300 text-center">→</span>
        <span className={cn(
          'truncate',
          isKunci || isMatch ? 'text-green-600' : teksJawaban ? 'text-red-500' : 'text-slate-300 italic',
        )}>
          {isKunci ? p.teks_pasangan : teksJawaban ?? 'Tidak dijawab'}
        </span>
        {showIcon && (
          <span className="flex justify-center">
            <Icon size={12} className={iconColor} />
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel icon={<User size={10} />} label="Jawaban Kamu" variant="neutral" />
        <div className="space-y-1.5">
          {matchResults.map(({ pilihan, teksJawaban, isMatch }) => (
            <Row key={pilihan.id} p={pilihan} teksJawaban={teksJawaban} isMatch={isMatch} />
          ))}
        </div>
      </div>
      <div>
        <SectionLabel icon={<GraduationCap size={10} />} label="Kunci Jawaban" variant="green" />
        <div className="space-y-1.5">
          {pilihanJawaban.map(p => (
            <Row key={p.id} p={p} isKunci />
          ))}
        </div>
      </div>
      <div>
        <SectionLabel icon={<History size={10} />} label="Perolehan Nilai" variant="orange" />
        <SkorBadge skor={skor} status={status} />
      </div>
    </div>
  );
}

function TeksSection({ jawabanTeks, skor, status }: { jawabanTeks: string | null; skor: number; status: StatusJawaban }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel icon={<User size={10} />} label="Jawaban Kamu" variant="neutral" />
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          {jawabanTeks ? (
            <p className="text-xs font-bold text-navy italic leading-relaxed">"{jawabanTeks}"</p>
          ) : (
            <p className="text-[11px] text-slate-300 italic">Tidak menjawab</p>
          )}
        </div>
      </div>
      <div>
        <SectionLabel icon={<History size={10} />} label="Perolehan Nilai" variant="orange" />
        <SkorBadge skor={skor} status={status} />
      </div>
    </div>
  );
}

// ─── Soal Card ─────────────────────────────────────────────
function SoalCard({ item, index }: { item: JawabanItem; index: number }) {
  const { soal, jawaban_siswa } = item;
  const tipe = soal.tipe_soal;
  const skor = hitungSkor(item);
  const status = getStatusJawaban(skor, hasAnswer(item));
  const config = STATUS_CONFIG[status];
  const gambarUrl = resolveImageUrl(soal.jalur_gambar || soal.path_gambar);

  // Precompute data per tipe
  const selectedIds = jawaban_siswa?.id_pilihan_terpilih ?? [];
  const selectedPilihan = soal.pilihan_jawaban.filter(p => selectedIds.includes(p.id));
  const correctPilihan = soal.pilihan_jawaban.filter(p => p.is_true === 1);
  const matchResults = computeMatchResults(soal.pilihan_jawaban, jawaban_siswa?.pasangan_terpilih);

  return (
    <div className="bg-white border border-exam-border rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className={cn('px-6 py-3 flex items-center justify-between border-b', config.header)}>
        <span className="text-[10px] font-black text-navy uppercase">Soal No. {index + 1}</span>
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-1.5', config.text)}>
            <StatusIcon status={status} size={14} />
            <span className="text-[9px] font-black uppercase">{config.label}</span>
          </div>
          <div className={cn('px-2 py-0.5 rounded border text-[10px] font-black', config.badge)}>
            Skor: {skor}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {gambarUrl && (
          <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 w-fit max-w-full">
            <img src={gambarUrl} alt="Gambar soal" className="max-h-52 object-contain" />
          </div>
        )}
        <p className="text-sm font-bold text-navy leading-relaxed">{soal.teks_soal}</p>

        <div className="border-t border-slate-100 pt-5">
          {PILIHAN_TYPES.has(tipe) && (
            <PilihanSection
              selectedPilihan={selectedPilihan}
              correctPilihan={correctPilihan}
              status={status}
              skor={skor}
            />
          )}
          {tipe === TIPE_SOAL.MENJODOHKAN && (
            <MenjodohkanSection
              matchResults={matchResults}
              pilihanJawaban={soal.pilihan_jawaban}
              status={status}
              skor={skor}
            />
          )}
          {TEKS_TYPES.has(tipe) && (
            <TeksSection
              jawabanTeks={jawaban_siswa?.jawaban_teks ?? null}
              skor={skor}
              status={status}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────
export default function HistoriSiswa() {
  const [selectedItem, setSelectedItem] = useState<RiwayatItem | null>(null);
  const [detail, setDetail] = useState<DetailHasil | null>(null);

  const [riwayat, setRiwayat] = useState<RiwayatItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchRiwayat = useCallback(async () => {
    try {
      setIsLoadingList(true);
      setListError(null);
      const res = await api.get('/riwayat-ujian');
      const responseData = res.data?.data;
      const items: RiwayatItem[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.data) ? responseData.data : [];
      setRiwayat(items);
    } catch (err: any) {
      setListError(err.response?.data?.message || 'Gagal mengambil histori ujian');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const fetchDetail = useCallback(async (item: RiwayatItem) => {
    try {
      setIsLoadingDetail(true);
      setSelectedItem(item);
      const res = await api.get(`/siswa-ujian/${item.id}/hasil`);
      const raw = res.data?.data;

      const nilaiAkhir = raw?.nilai_akhir ?? raw?.siswa_ujian?.nilai_akhir ?? null;
      const nilaiSementara = raw?.siswa_ujian?.nilai_sementara ?? null;

      setDetail({
        siswa: raw?.siswa || '',
        nilai_akhir: nilaiAkhir || nilaiSementara || item.nilai_akhir || '0',
        is_nilai_sementara: !nilaiAkhir && !!nilaiSementara,
        jawabans: raw?.jawabans ?? raw?.jawaban ?? [],
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengambil detail hasil ujian');
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedItem(null);
    setDetail(null);
  }, []);

  useEffect(() => { fetchRiwayat(); }, [fetchRiwayat]);

  // ─── Detail View ─────────────────────────────────────────
  if (selectedItem && detail) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-navy transition tracking-widest"
        >
          <ArrowLeft size={16} /> Kembali ke List Histori
        </button>

        {/* Header Score */}
        <div className="bg-navy rounded-lg p-6 text-white relative overflow-hidden shadow-xl border-b-8 border-light-blue">
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
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
            <div className="text-left sm:text-right mt-4 sm:mt-0 border-t border-white/10 pt-4 sm:border-t-0 sm:pt-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-light-blue mb-1">
                {detail.is_nilai_sementara ? 'NILAI SEMENTARA' : 'NILAI AKHIR'}
              </p>
              <h2 className="text-5xl sm:text-7xl font-black italic tracking-tighter leading-none">
                {detail.nilai_akhir}
              </h2>
              {detail.is_nilai_sementara && (
                <p className="text-[9px] text-yellow-300/70 font-black uppercase tracking-widest mt-1">
                  ⏳ Menunggu penilaian manual guru
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Review Soal */}
        {detail.jawabans.length === 0 ? (
          <div className="bg-white rounded-lg p-16 border border-exam-border text-center">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Belum ada data jawaban tersedia</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs font-black text-navy uppercase tracking-[0.3em]">Review Soal & Jawaban</h2>
            {detail.jawabans.map((item, idx) => (
              <SoalCard key={item.soal.id} item={item} index={idx} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── List View ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black italic tracking-tighter uppercase text-navy">Histori Hasil Ujian</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Lacak kemajuan belajar dan evaluasi hasil latihanmu
        </p>
      </div>

      {isLoadingList ? (
        <LoadingState />
      ) : listError ? (
        <ErrorState message={listError} onRetry={fetchRiwayat} />
      ) : riwayat.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {riwayat.map(item => (
            <RiwayatCard
              key={item.id}
              item={item}
              isLoading={isLoadingDetail}
              onClick={() => !isLoadingDetail && fetchDetail(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── List View Sub-components ──────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
        Memuat histori ujian...
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-400 text-xs font-black uppercase tracking-widest">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2 hover:bg-navy/90"
      >
        <RefreshCcw size={12} /> Coba Lagi
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg p-20 border border-exam-border text-center">
      <History size={48} className="mx-auto text-slate-200 mb-4" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Belum ada histori ujian tersedia</p>
    </div>
  );
}

function RiwayatCard({ item, isLoading, onClick }: { item: RiwayatItem; isLoading: boolean; onClick: () => void }) {
  const tipeUjian = item.ujian?.tipe_ujian;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="bg-white rounded-lg border border-exam-border overflow-hidden shadow-sm hover:shadow-xl hover:border-light-blue transition-all cursor-pointer group"
    >
      <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-navy text-white text-[8px] font-black uppercase tracking-widest rounded w-fit">
              {tipeUjian || `Ujian #${item.ujian_id}`}
            </span>
            {tipeUjian && (
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">#{item.ujian_id}</span>
            )}
          </div>
          <h3 className="text-sm font-black text-navy uppercase tracking-tighter leading-tight group-hover:text-light-blue transition-colors mt-2 line-clamp-2">
            {getJudulUjian(item)}
          </h3>
          {item.ujian?.mata_pelajaran && (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.ujian.mata_pelajaran}</p>
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
            <span className="text-[10px] font-bold text-navy">{formatTanggal(item.waktu_mulai)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">WAKTU SELESAI</span>
            <span className="text-[10px] font-bold text-navy">{formatTanggal(item.waktu_selesai)}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className={cn(
            'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded',
            item.status === 'dinilai' ? 'bg-green-50 text-green-600'
              : item.status === 'selesai' ? 'bg-blue-50 text-light-blue'
              : 'bg-amber-50 text-amber-600',
          )}>
            {item.status}
          </span>
          <div className={cn(
            'p-2 rounded transition-all',
            isLoading
              ? 'bg-slate-100 text-slate-300'
              : 'bg-light-blue/10 text-light-blue group-hover:bg-light-blue group-hover:text-white shadow-lg shadow-light-blue/10',
          )}>
            {isLoading ? <RefreshCcw size={16} className="animate-spin" /> : <BookOpen size={16} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}