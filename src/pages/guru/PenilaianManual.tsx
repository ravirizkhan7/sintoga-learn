import React, { useState } from 'react';
import { 
  FileCheck, 
  User, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Save, 
  BookOpen,
  Check,
  X,
  Send
} from 'lucide-react';
import { 
  mockJawabanSiswa, 
  mockBankSoal, 
  mockUjianSiswa, 
  mockDaftarUjian, 
  mockUsers 
} from '../../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { JawabanSiswa } from '../../types';
import { useAuth } from '../../App';
import { useGlobalState } from '../../context/GlobalStateContext';

export default function PenilaianManual() {
  const { user } = useAuth();
  const { studentAnswers, updateGrade } = useGlobalState();
  const [selectedUjianId, setSelectedUjianId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState<Record<number, number>>({});

  // Get teacher's exams
  const teacherExamIds = mockDaftarUjian
    .filter(u => user?.role === 'admin' || u.id_guru === user?.id)
    .map(u => u.id);

  // Filter exams that have pending grades and belong to teacher
  const examsWithPending = mockDaftarUjian.filter(ujian => {
    const isTeacherExam = teacherExamIds.includes(ujian.id);
    return isTeacherExam && studentAnswers.some(ans => {
      const isPending = ans.skor === undefined;
      const soal = mockBankSoal.find(s => s.id === ans.id_soal);
      const belongsToUjian = soal?.id_ujian === ujian.id;
      return isPending && belongsToUjian && (soal?.tipe_soal === 'isian' || soal?.tipe_soal === 'essay');
    });
  });

  // Get pending answers for selected exam and filtered by search
  const pendingAnswers = studentAnswers.filter(ans => {
    const isPending = ans.skor === undefined;
    const soal = mockBankSoal.find(s => s.id === ans.id_soal);
    if (!soal || !teacherExamIds.includes(soal.id_ujian)) return false;

    const belongsToSelected = !selectedUjianId || soal?.id_ujian === selectedUjianId;
    
    // Search filter
    const ujianSiswa = mockUjianSiswa.find(us => us.id === ans.id_ujian_siswa);
    const siswa = mockUsers.find(u => u.id === ujianSiswa?.id_siswa);
    const matchesSearch = !searchQuery || 
      siswa?.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      soal?.teks_soal.toLowerCase().includes(searchQuery.toLowerCase());

    return isPending && belongsToSelected && matchesSearch && (soal?.tipe_soal === 'isian' || soal?.tipe_soal === 'essay');
  });

  // Group answers by question ID
  const groupedByQuestion = pendingAnswers.reduce((acc, ans) => {
    if (!acc[ans.id_soal]) acc[ans.id_soal] = [];
    acc[ans.id_soal].push(ans);
    return acc;
  }, {} as Record<number, JawabanSiswa[]>);

  const handleGrade = (ansId: number, skor: number) => {
    updateGrade(ansId, skor);
    setScores(prev => {
      const next = { ...prev };
      delete next[ansId];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded border border-exam-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter flex items-center gap-2">
              <FileCheck className="text-light-blue" /> Penilaian Manual
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Koreksi jawaban isian dan essay siswa</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue transition"
              value={selectedUjianId || ''}
              onChange={(e) => setSelectedUjianId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Semua Ujian</option>
              {examsWithPending.map(u => (
                <option key={u.id} value={u.id}>{u.judul_ujian}</option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                placeholder="CARI SISWA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue transition w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {Object.keys(groupedByQuestion).length > 0 ? (
            Object.entries(groupedByQuestion).map(([soalId, studentAnswers], idx) => {
              const answers = studentAnswers as JawabanSiswa[];
              const soal = mockBankSoal.find(s => s.id === Number(soalId));
              const ujian = mockDaftarUjian.find(u => u.id === soal?.id_ujian);

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
                        <span className="text-[10px] font-black uppercase tracking-widest text-light-blue">Instruksi Soal</span>
                      </div>
                      <span className="bg-white/10 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-white/10">
                        {soal?.tipe_soal}
                      </span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{soal?.teks_soal}</p>
                    {soal?.jalur_gambar && (
                      <img 
                        src={soal.jalur_gambar} 
                        alt="Lampiran" 
                        className="mt-4 max-h-40 rounded border border-white/20" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-white/5 pt-3">
                      <span>Ujian: <span className="text-white italic">{ujian?.judul_ujian}</span></span>
                      <span className="mx-1">•</span>
                      <span>Total Menunggu: <span className="text-white">{answers.length} Siswa</span></span>
                    </div>
                  </div>
                  
                  {/* Students Answers List */}
                  <div className={cn(
                    soal?.tipe_soal === 'isian' 
                      ? "p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 bg-slate-50/50" 
                      : "divide-y divide-slate-100"
                  )}>
                    {answers.map((ans) => {
                      const ujianSiswa = mockUjianSiswa.find(us => us.id === ans.id_ujian_siswa);
                      const siswa = mockUsers.find(u => u.id === ujianSiswa?.id_siswa);

                      if (soal?.tipe_soal === 'isian') {
                        return (
                          <div 
                            key={ans.id} 
                            className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-light-blue transition-all"
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="min-w-0">
                                <p className="text-[10px] font-black text-navy uppercase truncate" title={siswa?.nama_lengkap}>
                                  {siswa?.nama_lengkap}
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {ujianSiswa?.waktu_selesai ? new Date(ujianSiswa.waktu_selesai).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
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
                              <button 
                                onClick={() => handleGrade(ans.id, 0)}
                                className="flex-1 py-1.5 flex items-center justify-center bg-red-50 text-red-500 rounded border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                              >
                                <X size={14} />
                              </button>
                              <button 
                                onClick={() => handleGrade(ans.id, 100)}
                                className="flex-1 py-1.5 flex items-center justify-center bg-green-50 text-green-500 rounded border border-green-100 hover:bg-green-500 hover:text-white transition-all active:scale-95"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={ans.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50 transition-colors">
                          <div className="md:w-1/4 shrink-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <User size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-navy uppercase truncate">{siswa?.nama_lengkap}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">DIKIRIM: {ujianSiswa?.waktu_selesai ? new Date(ujianSiswa.waktu_selesai).toLocaleTimeString() : '-'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className={cn(
                              "p-3 rounded border font-bold text-xs italic leading-relaxed bg-light-blue/5 border-light-blue/10"
                            )}>
                              {ans.jawaban_teks || <span className="text-slate-300 uppercase italic tracking-widest text-[9px]">( Tidak Ada Jawaban )</span>}
                            </div>
                          </div>

                          <div className="md:w-1/4 shrink-0 flex justify-end">
                            <div className="flex items-center gap-1.5 w-full max-w-[140px]">
                              <input 
                                type="number"
                                placeholder="SKOR..."
                                value={scores[ans.id] ?? ''}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-black outline-none focus:border-light-blue"
                                onChange={(e) => setScores({ ...scores, [ans.id]: Number(e.target.value) })}
                              />
                              <button 
                                onClick={() => scores[ans.id] !== undefined && handleGrade(ans.id, scores[ans.id])}
                                disabled={scores[ans.id] === undefined}
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
                <h3 className="text-sm font-black text-navy uppercase tracking-widest italic">Semua Terkoreksi</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Tidak ada jawaban yang menunggu penilaian manual saat ini.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
