import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  BarChart3, 
  Edit, 
  Trash2, 
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
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';

interface Ujian {
  id: number;
  judul_ujian: string;
  guru_id: number;
  kelas: string;
  tahun_ajar: string;
  tipe_ujian: string;
  semester: string;
  kode_ujian: string | null;
  durasi_menit: number;
  tanggal_ujian: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: 'draft' | 'published' | 'ongoing' | 'finished';
}

const generateExamCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const now = new Date();
const padTwo = (n: number) => String(n).padStart(2, '0');
const currentTime = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`;
const oneHourLater = `${padTwo((now.getHours() + 1) % 24)}:${padTwo(now.getMinutes())}`;

const initialExamState = {
  judul_ujian: '',
  kode_ujian: '',
  durasi_menit: '60',
  kelas: '',
  tahun_ajar: `${now.getFullYear()}/${now.getFullYear() + 1}`,
  tipe_ujian: 'harian',      // ← lowercase, sesuai enum backend
  semester: 'ganjil',         // ← lowercase, sesuai enum backend
  tanggal_ujian: now.toISOString().slice(0, 10),
  waktu_mulai: currentTime,
  waktu_selesai: oneHourLater,
  status: 'draft' as Ujian['status'],
};

const statusConfig: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-slate-50 text-slate-500 border-slate-200' },
  published: { label: 'Published', className: 'bg-blue-50 text-blue-600 border-blue-100' },
  ongoing:   { label: 'Ongoing',   className: 'bg-amber-50 text-amber-600 border-amber-100' },
  finished:  { label: 'Finished',  className: 'bg-green-50 text-green-700 border-green-100' },
};

export default function DashboardGuru() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<Ujian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalExam, setOriginalExam] = useState<Ujian | null>(null);
  const [newExam, setNewExam] = useState(initialExamState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/ujian');
      const raw = res.data?.data;
      const data = Array.isArray(raw) ? raw : raw?.data ?? [];
      setExams(data);
    } catch (err) {
      console.error('Gagal fetch ujian:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (showModal && !editingId) {
      setNewExam(prev => ({ ...prev, kode_ujian: generateExamCode() }));
    }
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsSubmitting(true);

      const payload: any = {
        judul_ujian: newExam.judul_ujian,
        durasi_menit: Number(newExam.durasi_menit),
        kelas: newExam.kelas,
        tahun_ajar: newExam.tahun_ajar,
        tipe_ujian: newExam.tipe_ujian.toLowerCase(),   // pastikan lowercase
        semester: newExam.semester.toLowerCase(),         // pastikan lowercase
        tanggal_ujian: newExam.tanggal_ujian,
        waktu_mulai: newExam.waktu_mulai.length === 5
          ? newExam.waktu_mulai + ':00'
          : newExam.waktu_mulai,
        waktu_selesai: newExam.waktu_selesai.length === 5
          ? newExam.waktu_selesai + ':00'
          : newExam.waktu_selesai,
      };

      if (editingId) {
        // Status dikirim as-is (sudah lowercase dari state)
        payload.status = newExam.status;

        // Kode ujian hanya dikirim kalau berubah
        if (newExam.kode_ujian !== (originalExam?.kode_ujian ?? '')) {
          payload.kode_ujian = newExam.kode_ujian;
        }

        await api.put(`/ujian/${editingId}`, payload);
        alert('✅ Ujian berhasil diperbarui!');
      } else {
        payload.kode_ujian = newExam.kode_ujian;
        await api.post('/ujian', payload);
        alert('✅ Ujian berhasil dibuat!');
      }

      setShowModal(false);
      setEditingId(null);
      setOriginalExam(null);
      setNewExam(initialExamState);
      fetchExams();
    } catch (err: any) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors
        || 'Gagal menyimpan ujian';
      alert('❌ ' + (typeof msg === 'object' ? JSON.stringify(msg) : msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (ujian: Ujian) => {
    setOriginalExam(ujian);
    setEditingId(ujian.id);
    setNewExam({
      judul_ujian: ujian.judul_ujian,
      kode_ujian: ujian.kode_ujian || '',
      durasi_menit: String(ujian.durasi_menit),
      kelas: ujian.kelas,
      tahun_ajar: ujian.tahun_ajar,
      tipe_ujian: ujian.tipe_ujian.toLowerCase(),    // ← normalize pas load edit
      semester: ujian.semester.toLowerCase(),          // ← normalize pas load edit
      tanggal_ujian: ujian.tanggal_ujian?.slice(0, 10) || '',
      waktu_mulai: ujian.waktu_mulai?.slice(0, 5) || '',
      waktu_selesai: ujian.waktu_selesai?.slice(0, 5) || '',
      status: ujian.status,                            // sudah lowercase dari enum
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus sesi ujian ini secara permanen?')) return;
    try {
      await api.delete(`/ujian/${id}`);
      fetchExams();
      alert('🗑️ Ujian berhasil dihapus!');
    } catch (err) {
      alert('❌ Gagal menghapus ujian');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setOriginalExam(null);
    setNewExam(initialExamState);
  };

  return (
    <div className="space-y-6">

      {/* Modal Tambah/Edit Ujian */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
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
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Judul Ujian */}
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

                {/* Kode & Durasi */}
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

                {/* Kelas & Tahun Ajar */}
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
                      <CalendarDays size={12} /> Tahun Ajar
                    </label>
                    <input 
                      required
                      placeholder="2024/2025"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.tahun_ajar}
                      onChange={e => setNewExam({...newExam, tahun_ajar: e.target.value})}
                    />
                  </div>
                </div>

                {/* Tipe & Semester */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Activity size={12} /> Tipe Ujian
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.tipe_ujian}
                      onChange={e => setNewExam({...newExam, tipe_ujian: e.target.value})}
                    >
                      {/* value lowercase sesuai enum backend */}
                      <option value="harian">Harian</option>
                      <option value="sts">STS</option>
                      <option value="uts">UTS</option>
                      <option value="uas">UAS</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <RefreshCcw size={12} /> Semester
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.semester}
                      onChange={e => setNewExam({...newExam, semester: e.target.value})}
                    >
                      {/* value lowercase sesuai enum backend */}
                      <option value="ganjil">Ganjil</option>
                      <option value="genap">Genap</option>
                    </select>
                  </div>
                </div>

                {/* Status — hanya muncul saat EDIT */}
                {editingId && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={12} /> Status Ujian
                    </label>
                    <select 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.status}
                      onChange={e => setNewExam({...newExam, status: e.target.value as Ujian['status']})}
                    >
                      {/* value lowercase sesuai enum database */}
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="finished">Finished</option>
                    </select>
                  </motion.div>
                )}

                {/* Tanggal Ujian */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarDays size={12} /> Tanggal Ujian
                  </label>
                  <input 
                    type="date"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-[10px] font-bold"
                    value={newExam.tanggal_ujian}
                    onChange={e => setNewExam({...newExam, tanggal_ujian: e.target.value})}
                  />
                </div>

                {/* Waktu Mulai & Selesai */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Waktu Mulai
                    </label>
                    <input 
                      type="time"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.waktu_mulai}
                      onChange={e => setNewExam({...newExam, waktu_mulai: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Waktu Selesai
                    </label>
                    <input 
                      type="time"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newExam.waktu_selesai}
                      onChange={e => setNewExam({...newExam, waktu_selesai: e.target.value})}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-3 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded border border-slate-200"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-navy text-white font-black text-[10px] uppercase tracking-widest rounded shadow-xl shadow-navy/20 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Ujian'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft',     value: exams.filter(e => e.status === 'draft').length,     icon: FileText,  color: 'bg-slate-500' },
          { label: 'Published', value: exams.filter(e => e.status === 'published').length, icon: Calendar,  color: 'bg-blue-600' },
          { label: 'Ongoing',   value: exams.filter(e => e.status === 'ongoing').length,   icon: Activity,  color: 'bg-amber-500' },
          { label: 'Finished',  value: exams.filter(e => e.status === 'finished').length,  icon: BarChart3, color: 'bg-exam-success' },
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

      {/* Table */}
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
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat data ujian...</p>
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 text-left uppercase tracking-widest">
                  <th className="px-8 py-4">Judul & Kode</th>
                  <th className="px-8 py-4">Kelas</th>
                  <th className="px-8 py-4">Tipe & SMT</th>
                  <th className="px-8 py-4">Durasi</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence initial={false}>
                  {exams.length > 0 ? exams.map((ujian) => {
                    const status = statusConfig[ujian.status] ?? { label: ujian.status, className: 'bg-slate-50 text-slate-500 border-slate-200' };
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
                          <p className="text-sm font-bold text-navy uppercase tracking-tight">{ujian.judul_ujian}</p>
                          <p className="text-[10px] font-mono font-bold text-light-blue leading-none">{ujian.kode_ujian || '-'}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">{ujian.tahun_ajar}</p>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5 text-navy">
                            <Layers size={12} className="text-light-blue" />
                            <span className="text-xs font-black uppercase">{ujian.kelas}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-slate-600 uppercase tracking-tighter">{ujian.tipe_ujian}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{ujian.semester}</p>
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
                            status.className
                          )}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => navigate(`/guru/bank-soal?ujianId=${ujian.id}`)}
                              className="p-2 text-slate-400 hover:text-light-blue hover:bg-slate-100 rounded transition-colors"
                              title="Bank Soal"
                            >
                              <BookOpen size={16} />
                            </button>
                            <button 
                              onClick={() => handleEdit(ujian)}
                              className="p-2 text-slate-400 hover:text-light-blue hover:bg-slate-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(ujian.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">Belum ada ujian</p>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">
            Record: {exams.length} items
          </p>
          <button className="text-navy font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:underline">
            <FileSpreadsheet size={14} />
            Export data
          </button>
        </div>
      </div>
    </div>
  );
}