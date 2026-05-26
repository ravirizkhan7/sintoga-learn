import React from 'react';
import { Save, RefreshCcw, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { BobotForm } from '../../../types';

interface Props {
  bobotForm: BobotForm;
  setBobotForm: (v: BobotForm) => void;
  totalBobot: number;
  isLoadingPengaturan: boolean;
  isSavingPengaturan: boolean;
  onSave: () => void;
}

const BOBOT_ITEMS: { key: keyof BobotForm; label: string }[] = [
  { key: 'bobot_objektif', label: 'Pilihan Ganda (Objektif)' },
  { key: 'bobot_ganda_kompleks', label: 'Ganda Kompleks' },
  { key: 'bobot_menjodohkan', label: 'Menjodohkan' },
  { key: 'bobot_isian', label: 'Isian Singkat' },
  { key: 'bobot_essay', label: 'Uraian (Essay)' },
];

export default function PengaturanBobot({ bobotForm, setBobotForm, totalBobot, isLoadingPengaturan, isSavingPengaturan, onSave }: Props) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-black text-navy uppercase italic tracking-tighter">Konfigurasi Bobot Nilai</h2>
        <p className="text-sm text-slate-400 font-medium">Tentukan bobot poin untuk setiap tipe soal. Total harus 100.</p>
      </div>

      {isLoadingPengaturan ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat konfigurasi...</p>
        </div>
      ) : (
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BOBOT_ITEMS.map((item) => (
              <div key={item.key} className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Bobot {item.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-full pl-6 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-light-blue focus:bg-white transition-all text-xl font-black text-navy"
                    value={bobotForm[item.key] === 0 ? '' : bobotForm[item.key]}
                    placeholder="0"
                    onChange={(e) => {
                      const val = e.target.value;
                      setBobotForm({
                        ...bobotForm,
                        [item.key]: val === '' ? 0 : Math.min(100, parseInt(val, 10) || 0),
                      });
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 uppercase italic">
                    Poin
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {totalBobot !== 100 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  'flex items-center gap-3 px-5 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest',
                  totalBobot > 100 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600',
                )}
              >
                <div className={cn('w-2 h-2 rounded-full shrink-0', totalBobot > 100 ? 'bg-red-500' : 'bg-amber-500')} />
                {totalBobot > 100
                  ? `Total bobot melebihi 100 — saat ini ${totalBobot} poin. Kurangi bobot yang ada.`
                  : `Total bobot kurang dari 100 — saat ini ${totalBobot} poin. Sisa ${100 - totalBobot} poin belum dialokasikan.`}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-colors', totalBobot === 100 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400')}>
                <Hash size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-navy uppercase tracking-tight leading-none mb-1">Total Bobot Dasar</p>
                <p className={cn('text-[10px] font-bold uppercase tracking-widest', totalBobot === 100 ? 'text-green-600' : 'text-slate-400')}>
                  {totalBobot} / 100 Poin
                </p>
              </div>
            </div>
            <button
              onClick={onSave}
              disabled={isSavingPengaturan || totalBobot !== 100}
              className="bg-navy text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-navy/90 transition shadow-2xl shadow-navy/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingPengaturan ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
              {isSavingPengaturan ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}