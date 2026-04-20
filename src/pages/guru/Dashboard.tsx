import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Users, 
  BarChart3, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  FileSpreadsheet,
  Clock,
  RefreshCcw,
  Layers,
  FileText,
  CalendarDays,
  Hash,
  Activity,
  BookOpen
} from 'lucide-react';
import { mockDaftarUjian, mockJurusan } from '../../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import { DaftarUjian } from '../../types';

import { useNavigate } from 'react-router-dom';

export default function DashboardGuru() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<DaftarUjian[]>(mockDaftarUjian);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const generateExamCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like 0, O, 1, I
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const initialExamState = {
    judul_ujian: '',
    kode_ujian: '',
    durasi_menit: '60',
    kelas: '',
    jurusan_id: '',
    tahun_ajaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    tipe_ujian: 'Harian' as const,
    semester: '1', // 1 for Ganjil, 0 for Genap
    waktu_mulai: new Date().toISOString().slice(0, 16),
    waktu_selesai: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    status_aktif: true
  };

  const [newExam, setNewExam] = useState(initialExamState);

  // Generate code when modal opens for NEW exam
  React.useEffect(() => {
    if (showModal && !editingId && !newExam.kode_ujian) {
      setNewExam(prev => ({ ...prev, kode_ujian: generateExamCode() }));
    }
  }, [showModal, editingId]);

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (editingId) {
      setExams(prev => prev.map(ex => ex.id === editingId ? {
        ...ex,
        judul_ujian: newExam.judul_ujian,
        kode_ujian: newExam.kode_ujian,
        durasi_menit: Number(newExam.durasi_menit),
        kelas: newExam.kelas,
        jurusan_id: Number(newExam.jurusan_id),
        tahun_ajaran: newExam.tahun_ajaran,
        tipe_ujian: newExam.tipe_ujian as any,
        semester: newExam.semester === '1',
        status_aktif: newExam.status_aktif,
        waktu_mulai: newExam.waktu_mulai,
        waktu_selesai: newExam.waktu_selesai,
      } : ex));
    } else {
      const id = exams.length > 0 ? Math.max(...exams.map(ex => ex.id)) + 1 : 1;
      
      const exam: DaftarUjian = {
        id,
        id_guru: user.id,
        judul_ujian: newExam.judul_ujian,
        kode_ujian: newExam.kode_ujian,
        durasi_menit: Number(newExam.durasi_menit),
        kelas: newExam.kelas,
        jurusan_id: Number(newExam.jurusan_id),
        tahun_ajaran: newExam.tahun_ajaran,
        tipe_ujian: newExam.tipe_ujian as any,
        semester: newExam.semester === '1',
        status_aktif: newExam.status_aktif,
        waktu_mulai: newExam.waktu_mulai,
        waktu_selesai: newExam.waktu_selesai,
      };
      
      setExams([exam, ...exams]);
    }
    
    setShowModal(false);
    setEditingId(null);
    setNewExam(initialExamState);
  };

  const handleEdit = (ujian: DaftarUjian) => {
    setEditingId(ujian.id);
    setNewExam({
      judul_ujian: ujian.judul_ujian,
      kode_ujian: ujian.kode_ujian,
      durasi_menit: String(ujian.durasi_menit),
      kelas: ujian.kelas,
      jurusan_id: String(ujian.jurusan_id),
      tahun_ajaran: ujian.tahun_ajaran,
      tipe_ujian: ujian.tipe_ujian,
      semester: ujian.semester ? '1' : '0',
      waktu_mulai: new Date(ujian.waktu_mulai).toISOString().slice(0, 16),
      waktu_selesai: new Date(ujian.waktu_selesai).toISOString().slice(0, 16),
      status_aktif: ujian.status_aktif
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Hapus sesi ujian ini secara permanen?')) {
      setExams(exams.filter(e => e.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded border border-exam-border shadow-2xl w-full max-w-md relative z-[110] overflow-hidden"
            >
              <div className="bg-navy p-6 border-b-4 border-light-blue">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">
                  {editingId ? 'Edit Konfigurasi Ujian' : 'Konfigurasi Ujian Baru'}
                </h3>
              </div>
              <form onSubmit={handleAddExam} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText size={12} /> Judul Ujian
                  </label>
                  <input 
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold uppercase"
                    placeholder="CONTOH: ULANGAN HARIAN JARINGAN"
                    value={newExam.judul_ujian}
                    onChange={e => setNewExam({...newExam, judul_ujian: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Hash size={12} /> Kode Ujian
                    </label>
                    <div className="relative">
                      <input 
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-black uppercase pr-10"
                        placeholder="EXAM-001"
                        value={newExam.kode_ujian}
                        onChange={e => setNewExam({...newExam, kode_ujian: e.target.value})}
                      />
                      <button 
                        type="button"
                        onClick={() => setNewExam(prev => ({ ...prev, kode_ujian: generateExamCode() }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-light-blue transition"
                        title="Generate Kode Baru"
                      >
                        <RefreshCcw size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Durasi (Menit)
                    </label>
                    <input 
                      type="number"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.durasi_menit}
                      onChange={e => setNewExam({...newExam, durasi_menit: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Layers size={12} /> Kelas
                    </label>
                    <input 
                      required
                      placeholder="XII RPL 1"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold uppercase"
                      value={newExam.kelas}
                      onChange={e => setNewExam({...newExam, kelas: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen size={12} /> Jurusan
                    </label>
                    <select 
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.jurusan_id}
                      onChange={e => setNewExam({...newExam, jurusan_id: e.target.value})}
                    >
                      <option value="">Pilih Jurusan</option>
                      {mockJurusan.map(j => (
                        <option key={j.id} value={j.id}>{j.kode_jurusan} - {j.nama_jurusan}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CalendarDays size={12} /> Tahun Ajaran
                    </label>
                    <input 
                      required
                      placeholder="2023/2024"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.tahun_ajaran}
                      onChange={e => setNewExam({...newExam, tahun_ajaran: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={12} /> Tipe Ujian
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.tipe_ujian}
                      onChange={e => setNewExam({...newExam, tipe_ujian: e.target.value as any})}
                    >
                      <option value="Harian">Harian</option>
                      <option value="STS">STS</option>
                      <option value="UTS">UTS</option>
                      <option value="UAS">UAS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <RefreshCcw size={12} /> Semester
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.semester}
                      onChange={e => setNewExam({...newExam, semester: e.target.value})}
                    >
                      <option value="1">Ganjil</option>
                      <option value="0">Genap</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={12} /> Status Aktif
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.status_aktif ? '1' : '0'}
                      onChange={e => setNewExam({...newExam, status_aktif: e.target.value === '1'})}
                    >
                      <option value="1">Aktif</option>
                      <option value="0">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      Mulai
                    </label>
                    <input 
                      type="datetime-local"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-[10px] font-bold"
                      value={newExam.waktu_mulai}
                      onChange={e => setNewExam({...newExam, waktu_mulai: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      Selesai
                    </label>
                    <input 
                      type="datetime-local"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-[10px] font-bold"
                      value={newExam.waktu_selesai}
                      onChange={e => setNewExam({...newExam, waktu_selesai: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                      setNewExam(initialExamState);
                    }}
                    className="flex-1 py-3 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded border border-slate-200"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-navy text-white font-black text-[10px] uppercase tracking-widest rounded shadow-xl shadow-navy/20 active:scale-95"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Simpan Ujian'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ujian Aktif', value: exams.filter(e => e.status_aktif).length, icon: Calendar, color: 'bg-blue-600' },
          { label: 'Total Siswa', value: '1,240', icon: Users, color: 'bg-navy' },
          { label: 'Rata-rata Nilai', value: '84.2', icon: BarChart3, color: 'bg-exam-success' },
          { label: 'Bank Soal', value: '450', icon: BarChart3, color: 'bg-light-blue' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={i} 
            className="bg-white p-5 rounded border border-exam-border flex items-center gap-4 shadow-sm"
          >
            <div className={cn("w-10 h-10 rounded flex items-center justify-center text-white", stat.color)}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-xl font-black text-navy italic tracking-tighter">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main List Column */}
      <div className="bg-white rounded border border-exam-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter">Kelola Daftar Ujian</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manajemen sesi pengerjaan siswa</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto bg-navy text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-navy/90 transition shadow-lg shadow-navy/20"
          >
            <Plus size={16} />
            Buat Ujian
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 text-left uppercase tracking-widest">
                <th className="px-8 py-4">Judul & Kode</th>
                <th className="px-8 py-4">KLS & Jurusan</th>
                <th className="px-8 py-4">Tipe & SMT</th>
                <th className="px-8 py-4">Durasi</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence initial={false}>
                {exams.map((ujian) => {
                  const jurusanData = mockJurusan.find(j => j.id === ujian.jurusan_id);
                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      key={ujian.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div>
                          <p className="text-sm font-bold text-navy uppercase tracking-tight">{ujian.judul_ujian}</p>
                          <p className="text-[10px] font-mono font-bold text-light-blue leading-none">{ujian.kode_ujian}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">{ujian.tahun_ajaran}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-navy">
                            <Layers size={12} className="text-light-blue" />
                            <span className="text-xs font-black uppercase">{ujian.kelas}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                            {jurusanData?.kode_jurusan || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-slate-600 uppercase tracking-tighter">{ujian.tipe_ujian}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{ujian.semester ? 'Ganjil' : 'Genap'}</p>
                      </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1 text-[10px] font-black text-slate-600 uppercase">
                        <Clock size={12} className="text-slate-400" />
                        {ujian.durasi_menit}m
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                        ujian.status_aktif ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                      )}>
                        {ujian.status_aktif ? 'Aktif' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => navigate(`/guru/bank-soal?ujianId=${ujian.id}`)}
                          className="p-2 text-slate-400 hover:text-light-blue hover:bg-slate-100 rounded transition-colors tooltip" title="Bank Soal"
                        >
                          <BookOpen size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(ujian)}
                          className="p-2 text-slate-400 hover:text-light-blue hover:bg-slate-100 rounded transition-colors tooltip" title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(ujian.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors tooltip" title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Record: {exams.length} items</p>
          <button className="text-navy font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:underline">
            <FileSpreadsheet size={14} />
            Export data
          </button>
        </div>
      </div>
    </div>
  );
}
