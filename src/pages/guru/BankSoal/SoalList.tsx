import React from 'react';
import { Plus, Search, Filter, Layers, HelpCircle, BookOpen, Trash2, CheckCircle2, RefreshCcw, Pencil, ImageIcon, GitMerge } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../../lib/utils';
import { BankSoal, BobotForm } from '../../../types';
import { BASE_STORAGE_URL } from './useBankSoal';

interface Props {
  soalList: BankSoal[];
  isLoadingSoal: boolean;
  deletingId: number | null;
  searchTerm: string;
  filterType: string;
  bobotForm: BobotForm;
  onSearchChange: (v: string) => void;
  onFilterChange: (v: string) => void;
  onDelete: (id: number) => void;
  onEdit: (soal: BankSoal) => void;
  onOpenModal: () => void;
}

const getTipeColor = (type: string) => {
  switch (type) {
    case 'objektif': return 'bg-blue-100 text-blue-700';
    case 'ganda_kompleks': return 'bg-purple-100 text-purple-700';
    case 'menjodohkan': return 'bg-orange-100 text-orange-700';
    case 'isian': return 'bg-green-100 text-green-700';
    case 'essay': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

// Potong teks ke maxLen karakter, tambah "..." kalau lebih
const truncate = (str: string, maxLen = 5): string =>
  str && str.length > maxLen ? str.slice(0, maxLen) + '...' : (str ?? '');

export default function SoalList({
  soalList, isLoadingSoal, deletingId,
  searchTerm, filterType, bobotForm,
  onSearchChange, onFilterChange,
  onDelete, onEdit, onOpenModal,
}: Props) {
  const getBobotForTipe = (tipe: string) => {
    const map: Record<string, keyof BobotForm> = {
      objektif: 'bobot_objektif',
      ganda_kompleks: 'bobot_ganda_kompleks',
      menjodohkan: 'bobot_menjodohkan',
      isian: 'bobot_isian',
      essay: 'bobot_essay',
    };
    return bobotForm[map[tipe]] ?? 0;
  };

  const filtered = soalList.filter(s => {
    const matchSearch = s.teks_soal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || s.tipe_soal === filterType;
    return matchSearch && matchType;
  });

  // Render label pasangan untuk soal menjodohkan
  // Format: "itemA...-pasanganA..., itemB...-pasanganB..."
  const renderPasanganLabel = (soal: BankSoal): string => {
    if (!soal.pilihan_jawaban?.length) return '-';
    return soal.pilihan_jawaban
      .map(p => `${truncate(p.teks_pilihan)}-${truncate(p.teks_pasangan)}`)
      .join(', ');
  };

  // Render label jawaban benar untuk tipe non-menjodohkan
  const renderJawabanBenarLabel = (soal: BankSoal): string => {
    const benar = soal.pilihan_jawaban?.filter(p => p.is_true) ?? [];
    return benar.map(p => truncate(p.teks_pilihan, 8)).join(', ');
  };

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari teks soal..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 rounded-xl border border-transparent focus:border-light-blue transition outline-none text-sm font-medium"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Filter className="text-slate-400 shrink-0" size={15} />
            <select
              className="flex-1 min-w-0 bg-slate-50 border border-transparent rounded-xl px-3 py-2.5 text-xs outline-none focus:border-light-blue transition font-bold"
              value={filterType}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              <option value="all">Semua Tipe</option>
              <option value="objektif">Objektif</option>
              <option value="ganda_kompleks">Ganda Kompleks</option>
              <option value="menjodohkan">Menjodohkan</option>
              <option value="isian">Isian</option>
              <option value="essay">Essay</option>
            </select>
          </div>
          <button
            onClick={onOpenModal}
            className="shrink-0 bg-light-blue text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-1.5 hover:bg-light-blue/90 transition shadow-lg shadow-light-blue/20 whitespace-nowrap"
          >
            <Plus size={15} />
            <span className="hidden xs:inline sm:inline">Tambah Soal</span>
            <span className="xs:hidden sm:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────── */}
      {isLoadingSoal ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat soal...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((soal, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={soal.id}
              className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 hover:border-light-blue hover:shadow-xl hover:shadow-slate-100 transition-all relative overflow-hidden"
            >
              {/* ── Card Header ── */}
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0',
                    getTipeColor(soal.tipe_soal),
                  )}>
                    {soal.tipe_soal.replace('_', ' ')}
                  </span>

                  {soal.path_gambar && (
                    <span
                      className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0"
                      title="Soal memiliki gambar"
                    >
                      <ImageIcon size={11} />
                      <span className="hidden sm:inline">Gambar</span>
                    </span>
                  )}

                  <span className="text-slate-300 font-mono text-xs font-bold shrink-0">
                    #{index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onEdit(soal)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-[10px] font-black uppercase tracking-widest"
                    title="Edit soal"
                  >
                    <Pencil size={12} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(soal.id)}
                    disabled={deletingId === soal.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    title="Hapus soal"
                  >
                    {deletingId === soal.id
                      ? <RefreshCcw size={12} className="animate-spin" />
                      : <Trash2 size={12} />
                    }
                    <span className="hidden sm:inline">
                      {deletingId === soal.id ? 'Hapus...' : 'Hapus'}
                    </span>
                  </button>
                </div>
              </div>

              {/* ── Card Body ── */}
              <div className="flex gap-3">
                {soal.path_gambar && (
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={`${BASE_STORAGE_URL}${soal.path_gambar}`}
                      alt="Soal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-bold text-navy mb-3 leading-relaxed line-clamp-2">
                    {soal.teks_soal}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {(soal.pilihan_jawaban?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                        <Layers size={12} className="text-light-blue shrink-0" />
                        {soal.pilihan_jawaban!.length} Pilihan
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                      <HelpCircle size={12} className="text-slate-300 shrink-0" />
                      {getBobotForTipe(soal.tipe_soal)} poin
                    </div>

                    {/* ── Pasangan / Jawaban Benar ── */}
                    {soal.tipe_soal === 'menjodohkan' ? (
                      // Menjodohkan: tampil "itemA...-pasanganA..., ..."
                      (soal.pilihan_jawaban?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-orange-500 font-bold min-w-0">
                          <GitMerge size={12} className="shrink-0" />
                          <span className="truncate max-w-[160px] sm:max-w-xs font-mono">
                            {renderPasanganLabel(soal)}
                          </span>
                        </div>
                      )
                    ) : (
                      // Non-menjodohkan: tampil jawaban benar seperti semula
                      soal.pilihan_jawaban?.some(p => p.is_true) && (
                        <div className="flex items-center gap-1 text-[11px] text-green-600 font-bold min-w-0">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="truncate max-w-[120px] sm:max-w-xs">
                            {renderJawabanBenarLabel(soal)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12 -z-10 text-navy">
                <BookOpen size={100} />
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Layers size={40} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-400">Soal tidak ditemukan</h3>
              <p className="text-sm text-slate-300">Coba ganti filter atau kata kunci pencarian.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}