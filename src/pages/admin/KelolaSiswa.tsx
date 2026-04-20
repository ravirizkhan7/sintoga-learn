import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  UserCheck,
  Calendar,
  Layers,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  SearchX
} from 'lucide-react';
import { mockUsers, mockJurusan } from '../../lib/mockData';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';

const ITEMS_PER_PAGE = 5;

export default function KelolaSiswa() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const [formData, setFormData] = useState({
    userId: '',
    nisn: '',
    id_jurusan: '',
    tahun_masuk: new Date().getFullYear().toString()
  });

  const handleAddSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = users.map(u => {
      if (u.id === Number(formData.userId)) {
        return {
          ...u,
          nisn: formData.nisn,
          id_jurusan: Number(formData.id_jurusan),
          tahun_masuk: formData.tahun_masuk
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    setIsModalOpen(false);
    setFormData({ userId: '', nisn: '', id_jurusan: '', tahun_masuk: new Date().getFullYear().toString() });
  };

  const handleUpdateSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiswa) return;
    setUsers(users.map(u => u.id === editingSiswa.id ? editingSiswa : u));
    setEditingSiswa(null);
  };

  const handleDeleteSiswa = (id: number) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        const { nisn, id_jurusan, tahun_masuk, ...rest } = u;
        return rest as User;
      }
      return u;
    }));
  };

  // Only show users with role 'siswa' who have academic data (registered students)
  const registeredStudents = users.filter(u => u.role === 'siswa' && u.nisn);

  const filteredStudents = registeredStudents.filter(u => 
    u.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nisn?.includes(searchTerm)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Candidates: users with role 'siswa' who don't have academic data yet
  const candidates = users.filter(u => u.role === 'siswa' && !u.nisn);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Manajemen Siswa</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Registrasi Akademik Peserta Didik</p>
        </motion.div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-navy text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-navy/90 transition shadow-lg shadow-navy/20 active:scale-95"
        >
          <Plus size={16} />
          Registrasi Akademik
        </button>
      </div>

      <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="CARI NAMA ATAU NISN..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded border border-exam-border outline-none focus:border-light-blue transition text-xs font-bold uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto grow">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100 italic">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NISN / ID</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurusan</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thn. Masuk</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence initial={false} mode="wait">
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((s) => {
                    const jurusanData = mockJurusan.find(j => j.id === s.id_jurusan);
                    return (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -10 }}
                        key={s.id} 
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                               {s.nama_lengkap[0]}
                            </div>
                            <div>
                              <p className="text-xs font-black text-navy uppercase">{s.nama_lengkap}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-navy">
                              <Fingerprint size={12} className="text-light-blue" />
                              <span className="text-[11px] font-black tracking-widest">{s.nisn}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">System ID: {s.id}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded border border-slate-200 text-[9px] font-black uppercase text-navy">
                             <Layers size={10} className="text-light-blue" />
                             {jurusanData?.kode_jurusan || 'N/A'}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-[11px] font-black text-slate-500 italic">
                          {s.tahun_masuk || '2024'}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => setEditingSiswa(s)}
                              className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSiswa(s.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                        <SearchX size={48} />
                        <div className="space-y-1">
                          <p className="text-sm font-black text-navy uppercase tracking-widest italic">Data Tidak Ditemukan</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {searchTerm ? `Pencarian "${searchTerm}"` : "Daftar siswa"} tidak menghasilkan data
                          </p>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing <span className="text-navy">{paginatedStudents.length}</span> of <span className="text-navy">{filteredStudents.length}</span> Students
          </p>
          
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mr-4">
              Page <span className="text-navy">{currentPage}</span> of <span className="text-navy">{totalPages || 1}</span>
            </p>
            
            <div className="flex bg-white border border-exam-border rounded overflow-hidden shadow-sm">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2.5 text-slate-400 hover:text-navy hover:bg-slate-50 transition border-r border-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2.5 text-slate-400 hover:text-navy hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Registrasi Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded border-t-8 border-navy w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="p-6 border-b border-slate-100 italic">
                 <h3 className="text-sm font-black text-navy uppercase tracking-widest">Form Registrasi Siswa</h3>
              </div>
              <form onSubmit={handleAddSiswa} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih User Account</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue"
                    value={formData.userId}
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                  >
                    <option value="">Pilih User (Unitialized SISWA)</option>
                    {candidates.map(u => (
                      <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NISN</label>
                    <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" value={formData.nisn} onChange={e => setFormData({...formData, nisn: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Masuk</label>
                    <input 
                      required 
                      type="number" 
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" 
                      value={formData.tahun_masuk} 
                      onChange={e => setFormData({...formData, tahun_masuk: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurusan & Kompetensi</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue"
                    value={formData.id_jurusan}
                    onChange={e => setFormData({...formData, id_jurusan: e.target.value})}
                  >
                    <option value="">Pilih Jurusan</option>
                    {mockJurusan.map(j => (
                      <option key={j.id} value={j.id}>{j.kode_jurusan} - {j.nama_jurusan}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded">Batal</button>
                  <button type="submit" className="flex-2 py-3 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-navy/20 active:scale-95">Aktifkan Siswa</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSiswa && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingSiswa(null)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded border-t-8 border-light-blue w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="p-6 border-b border-slate-100 italic">
                 <h3 className="text-sm font-black text-navy uppercase tracking-widest">Update Data Akademik</h3>
              </div>
              <form onSubmit={handleUpdateSiswa} className="p-6 space-y-4">
                <div className="space-y-1 opacity-60">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Account (Read Only)</label>
                  <input readOnly type="text" className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded font-bold text-xs text-navy outline-none" value={editingSiswa.nama_lengkap} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NISN</label>
                    <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" value={editingSiswa.nisn} onChange={e => setEditingSiswa({...editingSiswa, nisn: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Masuk</label>
                    <input 
                      required 
                      type="number" 
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" 
                      value={editingSiswa.tahun_masuk} 
                      onChange={e => setEditingSiswa({...editingSiswa, tahun_masuk: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jurusan & Kompetensi</label>
                  <select 
                    required 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue"
                    value={editingSiswa.id_jurusan}
                    onChange={e => setEditingSiswa({...editingSiswa, id_jurusan: Number(e.target.value)})}
                  >
                    {mockJurusan.map(j => (
                      <option key={j.id} value={j.id}>{j.kode_jurusan} - {j.nama_jurusan}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setEditingSiswa(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded">Batal</button>
                  <button type="submit" className="flex-2 py-3 bg-light-blue text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-light-blue/20 active:scale-95">Update Data</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
