import { useState } from 'react';
import { 
  History, 
  ChevronDown, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  User as UserIcon,
  BookOpen,
  ArrowLeft,
  Award
} from 'lucide-react';
import { 
  mockDaftarUjian, 
  mockUjianSiswa, 
  mockUsers, 
  mockJurusan, 
  mockBankSoal, 
  mockJawabanSiswa,
  mockPilihanJawaban
} from '../../lib/mockData';
import { useAuth } from '../../App';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useGlobalState } from '../../context/GlobalStateContext';

type TipeUjian = 'Semua' | 'STS' | 'UTS' | 'UAS' | 'Harian';

export default function HistoriSiswa() {
  const { user } = useAuth();
  const { studentAnswers } = useGlobalState();
  const [filterType, setFilterType] = useState<TipeUjian>('Semua');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  if (!user) return null;

  // Filter exams that the student has completed
  const studentExams = mockUjianSiswa.filter(us => us.id_siswa === user.id);
  
  const examHistory = studentExams.map(us => {
    const ujian = mockDaftarUjian.find(u => u.id === us.id_ujian);
    const guru = mockUsers.find(u => u.id === ujian?.id_guru);
    const jurusan = mockJurusan.find(j => j.id === ujian?.jurusan_id);
    
    // Calculate Score (Simple logic for demo)
    // In a real app, this would be computed by the backend
    const score = us.nilai_akhir || 0;

    return {
      usId: us.id,
      ujianId: ujian?.id,
      judul: ujian?.judul_ujian || 'Unknown Exam',
      tipe: ujian?.tipe_ujian || 'Harian',
      guru: guru?.nama_lengkap || 'Unknown Teacher',
      kelas: ujian?.kelas || '-',
      jurusan: jurusan?.nama_jurusan || '-',
      angkatan: ujian?.tahun_ajaran || '-',
      nilai: score
    };
  }).filter(item => filterType === 'Semua' || item.tipe === filterType);

  if (selectedExamId) {
    const usEntry = mockUjianSiswa.find(us => us.id === selectedExamId);
    const ujian = mockDaftarUjian.find(u => u.id === usEntry?.id_ujian);
    const soalList = mockBankSoal.filter(s => s.id_ujian === ujian?.id);
    
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedExamId(null)}
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-navy transition tracking-widest"
        >
          <ArrowLeft size={16} /> Kembali ke List Histori
        </button>

        <div className="bg-navy rounded-lg p-8 text-white relative overflow-hidden shadow-xl border-b-8 border-light-blue">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded border border-white/20 mb-4">
              <History size={14} className="text-light-blue" />
              <span className="text-[9px] font-black uppercase tracking-widest">Detail Hasil Ujian</span>
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter mb-2 uppercase">{ujian?.judul_ujian}</h1>
            <p className="text-blue-100/70 text-[10px] font-black uppercase tracking-widest">{ujian?.tipe_ujian} • {ujian?.tahun_ajaran}</p>
          </div>
          <div className="absolute top-1/2 right-12 -translate-y-1/2 text-right hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-light-blue mb-0">SKOR AKHIR</p>
            <h2 className="text-7xl font-black italic tracking-tighter leading-none">{usEntry?.nilai_akhir || 0}</h2>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-black text-navy uppercase tracking-[0.3em] mb-6">Review Soal & Jawaban</h2>
          {soalList.map((soal, idx) => {
            const userAns = studentAnswers.find(ans => ans.id_ujian_siswa === usEntry?.id && ans.id_soal === soal.id);
            const isCorrect = (userAns?.skor || 0) > 0;
            const choices = mockPilihanJawaban.filter(p => p.id_soal === soal.id);

            return (
              <div key={soal.id} className="bg-white border border-exam-border rounded-lg overflow-hidden shadow-sm">
                <div className={cn(
                  "px-6 py-3 flex items-center justify-between border-b",
                  isCorrect ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}>
                  <span className="text-[10px] font-black text-navy uppercase">Soal No. {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <div className="flex items-center gap-1.5 text-exam-success">
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
                      SKOR: {userAns?.skor || 0}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm font-bold text-navy mb-6 leading-relaxed">{soal.teks_soal}</p>
                  
                  <div className="space-y-2">
                    {soal.tipe_soal === 'objektif' && choices.map(p => {
                      const isSelected = userAns?.id_pilihan_terpilih?.includes(p.id);
                      return (
                        <div 
                          key={p.id} 
                          className={cn(
                            "flex items-center gap-3 p-3 rounded text-[11px] font-bold border transition-all",
                            p.apakah_benar ? "bg-green-50 border-green-200 text-green-700" : 
                            isSelected ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-100 text-slate-500"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[9px] border",
                            p.apakah_benar ? "bg-green-600 border-green-600 text-white" : 
                            isSelected ? "bg-red-600 border-red-600 text-white" : "bg-white border-slate-200"
                          )}>
                            {isSelected && !p.apakah_benar ? <XCircle size={10} /> : p.apakah_benar ? <CheckCircle2 size={10} /> : null}
                          </div>
                          {p.teks_pilihan}
                          {p.apakah_benar && <span className="ml-auto text-[8px] font-black uppercase bg-green-200/50 px-1.5 py-0.5 rounded">Kunci Jawaban</span>}
                        </div>
                      );
                    })}

                    {(soal.tipe_soal === 'isian' || soal.tipe_soal === 'essay') && (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Jawaban Kamu:</p>
                          <p className="text-xs font-bold text-navy italic">"{userAns?.jawaban_teks || 'Tidak menjawab'}"</p>
                        </div>
                        {userAns?.komentar_guru && (
                          <div className="p-4 bg-light-blue/5 rounded border border-light-blue/10">
                            <p className="text-[9px] font-black text-light-blue uppercase tracking-widest mb-2">Feedback Guru:</p>
                            <p className="text-xs font-bold text-navy italic">{userAns.komentar_guru}</p>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase text-navy">Histori Hasil Ujian</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lacak kemajuan belajar dan evaluasi hasil latihanmu</p>
        </div>

        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as TipeUjian)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-exam-border rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue cursor-pointer appearance-none shadow-sm"
          >
            <option value="Semua">TIPE: SEMUA UJIAN</option>
            <option value="Harian">TIPE: HARIAN</option>
            <option value="STS">TIPE: STS</option>
            <option value="UTS">TIPE: UTS</option>
            <option value="UAS">TIPE: UAS</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>
      </div>

      {examHistory.length === 0 ? (
        <div className="bg-white rounded-lg p-20 border border-exam-border text-center">
          <History size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Belum ada histori ujian tersedia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examHistory.map((item) => (
            <motion.div
              key={item.usId}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedExamId(item.usId)}
              className="bg-white rounded-lg border border-exam-border overflow-hidden shadow-sm hover:shadow-xl hover:border-light-blue transition-all cursor-pointer group"
            >
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="px-2 py-0.5 bg-navy text-white text-[8px] font-black uppercase tracking-widest rounded w-fit">
                    {item.tipe}
                  </span>
                  <h3 className="text-sm font-black text-navy uppercase tracking-tighter leading-tight group-hover:text-light-blue transition-colors mt-2">
                    {item.judul}
                  </h3>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">NILAI AKHIR</p>
                  <h4 className="text-4xl font-black italic tracking-tighter text-navy group-hover:scale-110 transition-transform origin-right">
                    {item.nilai}
                  </h4>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">GURU PENGAMPU</span>
                    <span className="text-[10px] font-bold text-navy truncate">{item.guru}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">KODE AKSES</span>
                    <span className="text-[10px] font-bold text-navy">{item.usId.toString().padStart(6, '0')}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.kelas} • {item.jurusan}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{item.angkatan}</span>
                  </div>
                  <div className="p-2 bg-light-blue/10 text-light-blue rounded group-hover:bg-light-blue group-hover:text-white transition-all shadow-lg shadow-light-blue/10">
                    <BookOpen size={16} />
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
