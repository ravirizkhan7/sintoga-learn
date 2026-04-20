import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  SearchX
} from 'lucide-react';
import { mockJurusan } from '../../lib/mockData';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const ITEMS_PER_PAGE = 5;

export default function KelolaJurusan() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jurusan, setJurusan] = useState(mockJurusan);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJurusan, setEditingJurusan] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const [formData, setFormData] = useState({
    nama_jurusan: '',
    kode_jurusan: ''
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newJurusan = {
      id: Date.now(),
      ...formData
    };
    setJurusan([...jurusan, newJurusan]);
    setIsModalOpen(false);
    setFormData({ nama_jurusan: '', kode_jurusan: '' });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setJurusan(jurusan.map(j => j.id === editingJurusan.id ? editingJurusan : j));
    setEditingJurusan(null);
  };

  const handleDelete = (id: number) => {
    setJurusan(jurusan.filter(j => j.id !== id));
  };

  const filteredJurusan = jurusan.filter(j => 
    j.nama_jurusan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.kode_jurusan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredJurusan.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedJurusan = filteredJurusan.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Manajemen Jurusan</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Data Kompetensi Keahlian</p>
        </motion.div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-navy text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-navy/90 transition shadow-lg shadow-navy/20 active:scale-95"
        >
          <Plus size={16} />
          Tambah Jurusan
        </button>
      </div>

      <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="CARI NAMA / KODE JURUSAN..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded border border-exam-border outline-none focus:border-light-blue transition text-xs font-bold uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto grow">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100 italic">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Jurusan</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence initial={false} mode="wait">
                {paginatedJurusan.length > 0 ? (
                  paginatedJurusan.map((j) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      key={j.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="px-3 py-1 bg-navy text-white text-[10px] font-black rounded w-fit uppercase tracking-tighter">
                          {j.kode_jurusan}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-navy">
                             <BookOpen size={16} />
                          </div>
                          <span className="text-sm font-bold text-navy uppercase tracking-tight italic">{j.nama_jurusan}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setEditingJurusan(j)}
                            className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(j.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={3} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                        <SearchX size={48} />
                        <div className="space-y-1">
                          <p className="text-sm font-black text-navy uppercase tracking-widest italic">Data Tidak Ditemukan</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {searchTerm ? `Pencarian "${searchTerm}"` : "Daftar jurusan"} tidak menghasilkan data
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
            Showing <span className="text-navy">{paginatedJurusan.length}</span> of <span className="text-navy">{filteredJurusan.length}</span> Jurusan
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

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded border-t-8 border-navy w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="p-6 border-b border-slate-100 italic">
                 <h3 className="text-sm font-black text-navy uppercase tracking-widest">Input Jurusan Baru</h3>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Jurusan (e.g., RPL)</label>
                  <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" value={formData.kode_jurusan} onChange={e => setFormData({...formData, kode_jurusan: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap Jurusan</label>
                  <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" value={formData.nama_jurusan} onChange={e => setFormData({...formData, nama_jurusan: e.target.value})} />
                </div>
                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded">Batal</button>
                  <button type="submit" className="flex-2 py-3 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-navy/20 active:scale-95">Simpan Jurusan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingJurusan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingJurusan(null)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded border-t-8 border-light-blue w-full max-w-md shadow-2xl relative overflow-hidden">
              <div className="p-6 border-b border-slate-100 italic">
                 <h3 className="text-sm font-black text-navy uppercase tracking-widest">Update Data Jurusan</h3>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Jurusan</label>
                  <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" value={editingJurusan.kode_jurusan} onChange={e => setEditingJurusan({...editingJurusan, kode_jurusan: e.target.value.toUpperCase()})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Jurusan</label>
                  <input required type="text" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue" value={editingJurusan.nama_jurusan} onChange={e => setEditingJurusan({...editingJurusan, nama_jurusan: e.target.value})} />
                </div>
                <div className="pt-4 flex gap-2">
                  <button type="button" onClick={() => setEditingJurusan(null)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded">Batal</button>
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
