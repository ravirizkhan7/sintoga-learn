import React, { useState } from 'react';
import { Plus, BookOpen, ChevronLeft, Trash2, Image as ImageIcon, CheckCircle2, RefreshCcw, Pencil, ZoomIn, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { NewSoalState, PilihanInternal } from '../../../types';

interface Props {
  showSoalModal: boolean;
  editingSoalId: number | null;
  newSoal: NewSoalState;
  setNewSoal: (s: NewSoalState) => void;
  isSubmittingSoal: boolean;
  getInitialSoalState: () => NewSoalState;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onAddOption: () => void;
  onRemoveOption: (_id: number) => void;
  onToggleCorrect: (_id: number) => void;
  onUpdateOption: (_id: number, field: keyof PilihanInternal, value: string | number | boolean) => void;
  onGambarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveGambar: () => void;
}

// Placeholder icon kalau tidak ada gambar atau gambar rusak
const PLACEHOLDER_URL = 'https://media.istockphoto.com/id/1399859917/id/vektor/tidak-ada-simbol-vektor-gambar-ikon-yang-tersedia-hilang-tidak-ada-galeri-untuk-placeholder.jpg?s=1024x1024&w=is&k=20&c=ylJK4NimiisMDYbB6jUnLmo-xLkdThDySrBBsXsqXcM=';

export default function SoalModal({
  showSoalModal, editingSoalId,
  newSoal, setNewSoal, isSubmittingSoal, getInitialSoalState,
  onClose, onSubmit, onAddOption, onRemoveOption, onToggleCorrect, onUpdateOption,
  onGambarChange, onRemoveGambar,
}: Props) {
  const isEdit = editingSoalId !== null;
  const showPilihan = !['essay', 'isian'].includes(newSoal.tipe_soal);
  const hasGambar = !!newSoal.gambarPreview;

  const [showLightbox, setShowLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset imgError kalau gambar berubah
  React.useEffect(() => {
    setImgError(false);
  }, [newSoal.gambarPreview]);

  return (
    <>
      <AnimatePresence>
        {showSoalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl border border-exam-border shadow-2xl w-full max-w-2xl relative z-[110] overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className={cn(
                'px-5 py-4 border-b-4 shrink-0 flex items-center justify-between',
                isEdit
                  ? 'bg-gradient-to-r from-blue-700 to-blue-600 border-blue-400'
                  : 'bg-navy border-light-blue',
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                    isEdit ? 'bg-blue-500/40' : 'bg-white/10',
                  )}>
                    {isEdit
                      ? <Pencil size={15} className="text-white" />
                      : <BookOpen size={15} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white uppercase italic tracking-tighter truncate">
                      {isEdit ? `Edit Soal #${editingSoalId}` : 'Entri Soal Baru'}
                    </h3>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                      {isEdit ? 'Ubah konten dan jawaban soal' : 'Sesuaikan tipe dan kunci jawaban'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-white/50 hover:text-white transition rounded-lg hover:bg-white/10 shrink-0"
                >
                  <ChevronLeft className="rotate-90" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5">

                {/* Tipe Soal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen size={11} /> Tipe Soal
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-light-blue transition text-xs font-bold"
                    value={newSoal.tipe_soal}
                    onChange={(e) => setNewSoal({
                      ...getInitialSoalState(),
                      teks_soal: newSoal.teks_soal,
                      gambarFile: newSoal.gambarFile,
                      gambarPreview: newSoal.gambarPreview,
                      tipe_soal: e.target.value as NewSoalState['tipe_soal'],
                    })}
                  >
                    <option value="objektif">Objektif (Pilihan Ganda)</option>
                    <option value="ganda_kompleks">Ganda Kompleks (Banyak Jawaban)</option>
                    <option value="menjodohkan">Menjodohkan (Matching Pairs)</option>
                    <option value="isian">Isian Singkat</option>
                    <option value="essay">Uraian / Essay</option>
                  </select>
                </div>

                {/* Konten Soal */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konten Soal</label>
                  <textarea
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-light-blue transition text-sm font-bold min-h-[90px]"
                    placeholder="Masukkan pertanyaan di sini..."
                    value={newSoal.teks_soal}
                    onChange={(e) => setNewSoal({ ...newSoal, teks_soal: e.target.value })}
                  />
                </div>

                {/* ── Gambar ─────────────────────────────────────── */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ImageIcon size={11} /> Gambar (Opsional)
                  </label>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">

                    {/* Thumbnail — selalu tampil */}
                    <button
                      type="button"
                      onClick={() => hasGambar && !imgError ? setShowLightbox(true) : undefined}
                      className={cn(
                        'relative shrink-0 w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center',
                        hasGambar && !imgError ? 'cursor-pointer group/thumb' : 'cursor-default',
                      )}
                      title={hasGambar && !imgError ? 'Klik untuk lihat full' : 'Belum ada gambar'}
                    >
                      {hasGambar && !imgError ? (
                        <>
                          <img
                            src={newSoal.gambarPreview}
                            alt="Preview"
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover group-hover/thumb:brightness-75 transition-all"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                            <ZoomIn size={18} className="text-white drop-shadow" />
                          </div>
                          {!newSoal.gambarFile && isEdit && (
                            <span className="absolute -top-1.5 -left-1.5 bg-amber-400 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md shadow">
                              Lama
                            </span>
                          )}
                        </>
                      ) : (
                        // Placeholder — tidak ada gambar atau error
                        <img
                          src={PLACEHOLDER_URL}
                          alt="no image"
                          className="w-8 h-8 opacity-30"
                        />
                      )}
                    </button>

                    {/* Info + tombol aksi */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-[11px] font-black text-navy truncate">
                        {newSoal.gambarFile
                          ? newSoal.gambarFile.name
                          : hasGambar && !imgError
                            ? 'Gambar terpasang dari server'
                            : imgError
                              ? 'Gambar tidak dapat dimuat'
                              : 'Belum ada gambar'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {newSoal.gambarFile
                          ? `${(newSoal.gambarFile.size / 1024).toFixed(1)} KB`
                          : hasGambar && !imgError
                            ? 'Klik thumbnail untuk preview penuh'
                            : 'Klik Tambah untuk upload gambar'}
                      </p>

                      {/* Input file hidden */}
                      <input
                        type="file"
                        accept="image/*"
                        id="gambar-upload"
                        className="hidden"
                        onChange={onGambarChange}
                      />

                      <div className="flex gap-2 pt-0.5">
                        {hasGambar && !imgError ? (
                          // Ada gambar valid → Ganti + Hapus
                          <>
                            <label
                              htmlFor="gambar-upload"
                              className="cursor-pointer px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 hover:border-light-blue hover:text-light-blue transition uppercase tracking-widest"
                            >
                              Ganti
                            </label>
                            <button
                              type="button"
                              onClick={onRemoveGambar}
                              className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-[10px] font-black text-red-500 hover:bg-red-100 transition uppercase tracking-widest"
                            >
                              Hapus
                            </button>
                          </>
                        ) : (
                          // Tidak ada gambar atau gambar error → Tambah saja
                          <label
                            htmlFor="gambar-upload"
                            className="cursor-pointer px-3 py-1.5 bg-light-blue/10 border border-light-blue/20 rounded-lg text-[10px] font-black text-light-blue hover:bg-light-blue/20 transition uppercase tracking-widest"
                          >
                            + Tambah
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Pilihan Jawaban ────────────────────────────── */}
                <div className="pt-5 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-navy uppercase tracking-widest">
                      {newSoal.tipe_soal === 'menjodohkan' ? 'Manajemen Pasangan & Pengecoh' :
                       newSoal.tipe_soal === 'essay' ? 'Rubrik / Jawaban Sampel' :
                       newSoal.tipe_soal === 'isian' ? 'Kunci Jawaban Singkat' : 'Pengaturan Jawaban'}
                    </label>
                    {showPilihan && (
                      <button
                        type="button"
                        onClick={onAddOption}
                        className="text-[10px] font-black text-light-blue uppercase tracking-widest flex items-center gap-1 hover:underline shrink-0"
                      >
                        <Plus size={11} /> Tambah {newSoal.tipe_soal === 'menjodohkan' ? 'Pasangan' : 'Opsi'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Essay */}
                    {newSoal.tipe_soal === 'essay' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <textarea
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue min-h-[80px]"
                          placeholder="Masukkan rubrik penilaian atau kunci uraian..."
                          value={newSoal.pilihan[0]?.teks_pilihan ?? ''}
                          onChange={(e) => onUpdateOption(newSoal.pilihan[0]._id, 'teks_pilihan', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Isian */}
                    {newSoal.tipe_soal === 'isian' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <input
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                          placeholder="Masukkan kunci jawaban singkat..."
                          value={newSoal.pilihan[0]?.teks_pilihan ?? ''}
                          onChange={(e) => onUpdateOption(newSoal.pilihan[0]._id, 'teks_pilihan', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Objektif / Ganda Kompleks / Menjodohkan */}
                    {showPilihan && newSoal.pilihan.map((p, idx) => (
                      <div key={p._id} className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-start gap-2 sm:gap-3">

                          {/* Toggle benar — tidak untuk menjodohkan */}
                          {newSoal.tipe_soal !== 'menjodohkan' && (
                            <button
                              type="button"
                              onClick={() => onToggleCorrect(p._id)}
                              className={cn(
                                'w-8 h-8 rounded-full border flex items-center justify-center transition-all shrink-0 mt-0.5',
                                p.is_true
                                  ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
                                  : 'bg-white border-slate-200 text-slate-300 hover:border-green-300',
                              )}
                            >
                              <CheckCircle2 size={17} />
                            </button>
                          )}

                          {/* Input teks pilihan */}
                          <div className="flex-1 min-w-0">
                            {newSoal.tipe_soal === 'menjodohkan' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Item {String.fromCharCode(65 + idx)}
                                  </p>
                                  <input
                                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                    placeholder="Input item..."
                                    value={p.teks_pilihan}
                                    onChange={(e) => onUpdateOption(p._id, 'teks_pilihan', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                    Pasangan {String.fromCharCode(65 + idx)}
                                  </p>
                                  <input
                                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                    placeholder="Masukkan teks pasangan..."
                                    value={p.teks_pasangan}
                                    onChange={(e) => onUpdateOption(p._id, 'teks_pasangan', e.target.value)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <input
                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                placeholder={`Teks Pilihan ${String.fromCharCode(65 + idx)}...`}
                                value={p.teks_pilihan}
                                onChange={(e) => onUpdateOption(p._id, 'teks_pilihan', e.target.value)}
                              />
                            )}

                            {newSoal.tipe_soal !== 'menjodohkan' && (
                              <div className="flex items-center gap-2 mt-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                  Skor %
                                </p>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black text-center outline-none focus:border-light-blue transition"
                                  value={p.persentase_nilai}
                                  onChange={(e) => onUpdateOption(p._id, 'persentase_nilai', Number(e.target.value))}
                                />
                              </div>
                            )}
                          </div>

                          {/* Tombol hapus opsi */}
                          <button
                            type="button"
                            onClick={() => onRemoveOption(p._id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition shrink-0 mt-0.5"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2 pb-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3.5 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-slate-200 active:scale-95 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSoal}
                    className={cn(
                      'flex-1 py-3.5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition disabled:opacity-50',
                      isEdit
                        ? 'bg-blue-600 shadow-xl shadow-blue-600/20 hover:bg-blue-700'
                        : 'bg-navy shadow-xl shadow-navy/20 hover:bg-navy/90',
                    )}
                  >
                    {isSubmittingSoal ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCcw size={13} className="animate-spin" />
                        Menyimpan...
                      </span>
                    ) : (
                      isEdit ? 'Simpan Perubahan' : 'Simpan Soal'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Lightbox Preview Gambar ──────────────────────────────── */}
      <AnimatePresence>
        {showLightbox && hasGambar && !imgError && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLightbox(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative z-[210] max-w-3xl w-full flex flex-col items-center gap-3"
            >
              <button
                onClick={() => setShowLightbox(false)}
                className="self-end p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition mb-1"
              >
                <X size={18} />
              </button>
              <img
                src={newSoal.gambarPreview}
                alt="Preview full"
                className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
              />
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest">
                {newSoal.gambarFile ? newSoal.gambarFile.name : 'Gambar soal existing'}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}