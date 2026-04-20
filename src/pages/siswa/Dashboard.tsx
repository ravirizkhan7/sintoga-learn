import { useState } from 'react';
import { Search, Play, Clock, FileText, CheckCircle, AlertCircle, X, ShieldAlert, BadgeCheck } from 'lucide-react';
import { mockDaftarUjian } from '../../lib/mockData';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { DaftarUjian } from '../../types';

export default function DashboardSiswa() {
  const [examCode, setExamCode] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<DaftarUjian | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleEnterExam = () => {
    const found = mockDaftarUjian.find(u => u.kode_ujian.toUpperCase() === examCode.toUpperCase());
    
    if (found) {
      if (found.status_aktif) {
        setSelectedExam(found);
        setShowConfirmModal(true);
        setErrorStatus(null);
      } else {
        setErrorStatus("Ujian ini sedang tidak aktif.");
        setTimeout(() => setErrorStatus(null), 3000);
      }
    } else {
      setErrorStatus("Kode ujian tidak valid.");
      setTimeout(() => setErrorStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section / Portal Card */}
      <div className="bg-navy rounded-lg p-8 text-white relative overflow-hidden shadow-xl border-b-8 border-light-blue">
        <div className="absolute top-0 right-0 w-64 h-64 bg-light-blue/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
        <div className="relative z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded border border-white/20 mb-4 animate-pulse">
            <ShieldAlert size={14} className="text-light-blue" />
            <span className="text-[9px] font-black uppercase tracking-widest">Sistem Ujian Terintegrasi v2.0</span>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter mb-2 uppercase leading-none">Portal Akses Ujian</h1>
          <p className="text-blue-100/70 text-xs font-bold uppercase tracking-widest max-w-md mx-auto lg:mx-0">Otorisasi pengerjaan soal dimulai dengan validasi kode yang diberikan oleh pengawas.</p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto lg:mx-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="INPUT KODE DISINI..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 border-2 border-white/20 rounded-lg backdrop-blur-md outline-none focus:bg-white/20 focus:border-light-blue transition-all placeholder:text-white/30 font-black uppercase text-base tracking-widest shadow-inner"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
              />
            </div>
            <button 
              onClick={handleEnterExam}
              className="w-full sm:w-auto px-10 py-4 bg-light-blue hover:bg-white hover:text-navy text-white font-black rounded-lg text-sm uppercase tracking-tighter transition-all active:scale-95 shadow-xl shadow-light-blue/20"
            >
              MASUK PANEL
            </button>
          </div>

          <AnimatePresence>
            {errorStatus && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 inline-flex items-center gap-2 text-red-400 font-bold uppercase text-[10px] tracking-widest"
              >
                <AlertCircle size={14} />
                {errorStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-lg p-8 border border-exam-border shadow-sm">
        <div className="flex items-center gap-2 mb-8">
          <BadgeCheck className="text-light-blue" size={20} />
          <h2 className="text-xs font-black text-navy uppercase tracking-[0.3em]">
            Prosedur Standar Ujian Digital
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div className="space-y-3 relative">
            <span className="text-4xl font-black text-slate-50 absolute -top-4 -left-2 z-0">01</span>
            <div className="relative z-10">
              <h4 className="font-black text-xs text-navy uppercase tracking-tight mb-2">Persiapan Sesi</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">Masukkan kode unik ujian yang telah divalidasi oleh proktor atau pengawas ruangan pada panel di atas.</p>
            </div>
          </div>
          <div className="space-y-3 relative">
            <span className="text-4xl font-black text-slate-50 absolute -top-4 -left-2 z-0">02</span>
            <div className="relative z-10">
              <h4 className="font-black text-xs text-navy uppercase tracking-tight mb-2">Monitoring Ketat</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase italic">Dilarang berpindah tab atau menutup browser. Sistem akan mendeteksi aktivitas mencurigakan secara otomatis.</p>
            </div>
          </div>
          <div className="space-y-3 relative">
            <span className="text-4xl font-black text-slate-50 absolute -top-4 -left-2 z-0">03</span>
            <div className="relative z-10">
              <h4 className="font-black text-xs text-navy uppercase tracking-tight mb-2">Finalisasi Data</h4>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase">Pastikan semua jawaban terisi sebelum klik tombol selesai. Data yang terkirim tidak dapat dianulir kembali.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && selectedExam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-xl border border-exam-border shadow-2xl w-full max-w-lg relative z-[110] overflow-hidden"
            >
              <div className="bg-navy p-6 border-b-4 border-light-blue text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-light-blue px-2 py-0.5 bg-light-blue/10 rounded">KONFIRMASI INTEGRITAS</span>
                  <button onClick={() => setShowConfirmModal(false)} className="text-white/50 hover:text-white transition">
                    <X size={20} />
                  </button>
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                  {selectedExam.judul_ujian}
                </h3>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">DURASI</p>
                    <p className="text-sm font-black text-navy">{selectedExam.durasi_menit} MENIT</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TIPE UJIAN</p>
                    <p className="text-sm font-black text-navy uppercase">{selectedExam.tipe_ujian}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-navy uppercase tracking-widest border-b border-slate-100 pb-2">Aturan & Protokol Ujian</h4>
                  <ul className="space-y-3">
                    {[
                      "Dilarang keras memberikan atau menerima bantuan dalam bentuk apapun (Mencontek).",
                      "Sistem mendeteksi jika anda berpindah tab, membuka window baru, atau minimize browser.",
                      "Jika terdeteksi meninggalkan halaman pengerjaan, ujian akan otomatis dianggap SELESAI.",
                      "Menutup aplikasi secara paksa akan langsung mengirimkan state jawaban terakhir.",
                      "Gunakan koneksi internet yang stabil untuk mencegah data loss saat pengiriman."
                    ].map((rule, idx) => (
                      <li key={idx} className="flex gap-3 text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0 mt-1" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-lg border border-slate-200 transition-all"
                  >
                    KEMBALI
                  </button>
                  <button 
                    onClick={() => navigate(`/siswa/ujian/${selectedExam.id}`)}
                    className="flex-[2] py-4 bg-navy text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-xl shadow-navy/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={14} className="fill-current" />
                    MULAI SESI UJIAN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
