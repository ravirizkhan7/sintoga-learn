import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert,
  GraduationCap,
  Filter,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  SearchX,
  KeyRound,
  CheckCircle2,
  Download,
  FileUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import api from '../../lib/axios';
import { useAuth } from '@/src/App';

const ITEMS_PER_PAGE = 5;

export default function KelolaUser() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [jurusans, setJurusans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);

      const [resUsers, resJurusans] = await Promise.all([
        api.get('/user'),
        api.get('/jurusan')
      ]);

      console.log('response users:', resUsers.data);
      console.log('response jurusans:', resJurusans.data);

      // Handle Laravel pagination: response.data.data bisa berupa object pagination { data: [...] }
      // atau langsung array, tergantung response-nya
      const usersRaw = resUsers.data?.data;
      const usersData = Array.isArray(usersRaw) ? usersRaw : usersRaw?.data ?? [];

      const jurusansRaw = resJurusans.data?.data;
      const jurusansData = Array.isArray(jurusansRaw) ? jurusansRaw : jurusansRaw?.data ?? [];

      setUsers(usersData);
      setJurusans(jurusansData);
    } catch (err: any) {
      console.error("Gagal ambil data:", err);
      setFetchError(err.response?.data?.message || "Gagal mengambil data dari server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { 
        nama: 'Contoh siswa', 
        email: 'asep@siswa.com', 
        role: 'siswa', 
        nisn: '22334455', 
        'kode jurusan': 'RPL' 
      },
      { 
        nama: 'contoh guru', 
        email: 'siti@guru.com', 
        role: 'guru', 
        nisn: '', 
        'kode jurusan': '' 
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_user_sintoga.xlsx');
  };

const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append('file', file);  // key 'file' sesuai permintaan backend

    await api.post('/user/bulk-store', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    alert(`Berhasil mengimpor user.`);
    fetchData();
  } catch (err: any) {
    alert(err.response?.data?.message || 'Format file salah atau server error');
  }

  e.target.value = '';
};

  useEffect(() => {
    fetchData();
  }, []); 

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const handleDelete = async (user: any) => {
    try {
      await api.delete(`/user/${user.id}`);
      setDeletingUser(null);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus user");
    }
  };

  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    role: 'siswa',
    nisn: '',
    jurusan_id: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        nama: formData.nama,
        email: formData.email,
        role: formData.role,
        password: `123456`,
        password_confirmation: `123456`,
      };

      // Hanya kirim nisn & jurusan_id kalau role siswa
      if (formData.role === 'siswa') {
        payload.nisn = formData.nisn;
        payload.jurusan_id = formData.jurusan_id;
      }

      await api.post('/user', payload);
      setIsRegisterModalOpen(false);
      setFormData({ nama: '', email: '', role: 'siswa', nisn: '', jurusan_id: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal registrasi user");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        nama: editingUser.nama,
        email: editingUser.email,
        role: editingUser.role,
      };

      if (editingUser.role === 'siswa') {
        payload.nisn = editingUser.nisn || null;
        payload.jurusan_id = editingUser.jurusan_id || null;
      }

      await api.put(`/user/${editingUser.id}`, payload);
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal update user");
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      await api.get(`/user/${userId}/reset-password`);
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        setResettingUser(null);
      }, 2000);
    } catch (err) {
      alert("Gagal reset password");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const availableRoles = user.role === 'superadmin'
    ? ['all', 'admin', 'guru', 'siswa']
    : ['all', 'guru', 'siswa'];
  const actionRoles = user.role === 'superadmin'
    ? ['admin', 'guru', 'siswa']
    : ['guru', 'siswa'];
  // ─── Loading State ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
          Memuat data pengguna...
        </p>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-xs font-black uppercase tracking-widest">{fetchError}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2"
        >
          <RefreshCcw size={14} />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Manajemen Pengguna</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Otorisasi & Kontrol akses sistem</p>
        </motion.div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleDownloadTemplate}
            className="bg-white border border-exam-border text-slate-600 px-4 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-sm active:scale-95"
          >
            <Download size={16} />
            Template
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-exam-border text-slate-600 px-4 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-sm active:scale-95"
          >
            <FileUp size={16} />
            Import User
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-navy text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-navy/90 transition shadow-lg shadow-navy/20 active:scale-95"
          >
            <UserPlus size={16} />
            Registrasi User
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="CARI NAMA / EMAIL / ROLE..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded border border-exam-border outline-none focus:border-light-blue transition text-xs font-bold uppercase tracking-widest shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "px-4 py-2.5 rounded text-[10px] font-black uppercase flex items-center gap-2 transition-all border shadow-sm",
                isFilterOpen ? "bg-navy text-white border-navy" : "bg-white border-exam-border text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter size={14} />
              Privilege: {roleFilter}
            </button>
            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded border border-exam-border shadow-xl z-20 py-1"
                  >
                    {availableRoles.map((role) => (
                      <button 
                        key={role}
                        onClick={() => {
                          setRoleFilter(role);
                          setIsFilterOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors",
                          roleFilter === role ? "bg-light-blue text-white" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="overflow-x-auto grow">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100 italic">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identitas User</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Privilege Level</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Credential Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence initial={false} mode="wait">
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((u) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -10 }}
                      key={u.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-9 h-9 text-white rounded flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110",
                            u.role === 'admin' ? 'bg-indigo-600' : u.role === 'guru' ? 'bg-light-blue' : 'bg-navy'
                          )}>
                            {u.nama?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-navy truncate max-w-[200px]">{u.nama}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border",
                          u.role === 'admin' ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 
                          u.role === 'guru' ? 'text-light-blue bg-blue-50 border-blue-100' : 
                          'text-navy bg-slate-50 border-slate-200'
                        )}>
                          {u.role === 'admin' ? <ShieldCheck size={10} /> : u.role === 'guru' ? <Users size={10} /> : <GraduationCap size={10} />}
                          {u.role}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-exam-success animate-pulse" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secure</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setResettingUser(u)}
                            title="Reset Password"
                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                          >
                            <KeyRound size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => setDeletingUser(u)}
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
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                        <SearchX size={48} />
                        <div className="space-y-1">
                          <p className="text-sm font-black text-navy uppercase tracking-widest italic">Data Tidak Ditemukan</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {searchTerm ? `Pencarian "${searchTerm}"` : "Filter terpilih"} tidak menghasilkan data
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
            Showing <span className="text-navy">{paginatedUsers.length}</span> of <span className="text-navy">{filteredUsers.length}</span> Users
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

      {/* Register Modal */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsRegisterModalOpen(false)} 
              className="absolute inset-0 bg-navy/60 backdrop-blur-sm" 
            />

            {/* Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="bg-white rounded border-t-8 border-navy w-full max-w-md shadow-2xl relative overflow-visible max-h-[90vh] flex flex-col"
            >

              {/* Header */}
              <div className="p-6 border-b border-slate-100 italic sticky top-0 bg-white z-10">
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">
                  Registrasi User Baru
                </h3>
              </div>

              {/* Form */}
              <form 
                onSubmit={handleRegister} 
                className="p-6 space-y-4 overflow-y-auto"
              >

                {/* Nama */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Lengkap
                  </label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue"
                    value={formData.nama} 
                    onChange={e => setFormData({...formData, nama: e.target.value})} 
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Email Address
                  </label>
                  <input 
                    required 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue"
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Privilege Level
                  </label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue cursor-pointer appearance-none"
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    {actionRoles.map(role => (
                      <option key={role} value={role}>{role.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* SISWA */}
                {formData.role === 'siswa' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-4"
                  >

                    {/* Jurusan */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Pilih Jurusan
                      </label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue cursor-pointer appearance-none"
                        value={formData.jurusan_id} 
                        onChange={e => setFormData({...formData, jurusan_id: e.target.value})}
                      >
                        <option value="">-- Pilih Jurusan --</option>
                        {jurusans.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.kode_jurusan} - {j.nama_jurusan}
                          </option>
                        ))}
                      </select>

                      {jurusans.length === 0 && (
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                          Belum ada data jurusan.
                        </p>
                      )}
                    </div>

                    {/* NISN */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        NISN
                      </label>
                      <input 
                        required 
                        type="text" 
                        inputMode="numeric"
                        placeholder="Contoh: 004123456"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue"
                        value={formData.nisn || ''} 
                        onChange={e => setFormData({...formData, nisn: e.target.value})} 
                      />
                    </div>

                  </motion.div>
                )}

                {/* Button */}
                <div className="pt-4 flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsRegisterModalOpen(false)} 
                    className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded"
                  >
                    Batal
                  </button>

                  <button 
                    type="submit" 
                    className="flex-[2] py-3 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-navy/20 active:scale-95"
                  >
                    Register User
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setEditingUser(null)} 
              className="absolute inset-0 bg-navy/60 backdrop-blur-sm" 
            />

            {/* Modal */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="bg-white rounded border-t-8 border-light-blue w-full max-w-md shadow-2xl relative overflow-visible max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 italic sticky top-0 bg-white z-10">
                <h3 className="text-sm font-black text-navy uppercase tracking-widest">
                  Edit Otoritas User
                </h3>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto">

                {/* Nama */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Lengkap
                  </label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue"
                    value={editingUser.nama} 
                    onChange={e => setEditingUser({...editingUser, nama: e.target.value})} 
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Email Address
                  </label>
                  <input 
                    required 
                    type="email" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue"
                    value={editingUser.email} 
                    onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Privilege Level
                  </label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue cursor-pointer appearance-none"
                    value={editingUser.role} 
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    {actionRoles.map(role => (
                      <option key={role} value={role}>{role.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Conditional SISWA fields */}
                {editingUser.role === 'siswa' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="space-y-4"
                  >
                    {/* Jurusan */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Pilih Jurusan
                      </label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue cursor-pointer appearance-none"
                        value={editingUser.jurusan_id || ''} 
                        onChange={e => setEditingUser({...editingUser, jurusan_id: e.target.value})}
                      >
                        <option value="">-- Pilih Jurusan --</option>
                        {jurusans.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.kode_jurusan} - {j.nama_jurusan}
                          </option>
                        ))}
                      </select>
                      {jurusans.length === 0 && (
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                          Belum ada data jurusan.
                        </p>
                      )}
                    </div>

                    {/* NISN */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        NISN
                      </label>
                      <input 
                        required 
                        type="text" 
                        inputMode="numeric"
                        placeholder="Contoh: 004123456"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-sm text-navy outline-none focus:border-light-blue"
                        value={editingUser.nisn || ''} 
                        onChange={e => setEditingUser({...editingUser, nisn: e.target.value})} 
                      />
                    </div>
                  </motion.div>
                )}

                {/* Buttons */}
                <div className="pt-4 flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)} 
                    className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-3 bg-light-blue text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-light-blue/20 active:scale-95"
                  >
                    Update User
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingUser(null)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded border-b-8 border-red-500 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-black text-navy uppercase italic tracking-tighter mb-2">Hapus Pengguna</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight leading-relaxed">
                  Apakah Anda yakin ingin menghapus <span className="text-navy">{deletingUser.nama}</span>? Aksi ini akan memutuskan akses user ke sistem secara permanen.
                </p>
              </div>
              <div className="flex border-t border-slate-100">
                <button onClick={() => setDeletingUser(null)} className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 border-r border-slate-100">Batal</button>
                <button onClick={() => handleDelete(deletingUser)} className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition shadow-inner">Hapus User</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resettingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !resetSuccess && setResettingUser(null)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded border-b-8 border-amber-500 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="p-8 text-center">
                <AnimatePresence mode="wait">
                  {!resetSuccess ? (
                    <motion.div 
                      key="confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <KeyRound size={32} />
                      </div>
                      <h3 className="text-xl font-black text-navy uppercase italic tracking-tighter mb-2">Reset Password</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight leading-relaxed">
                        Reset password untuk <span className="text-navy">{resettingUser.nama}</span>?<br />
                        Password akan dikembalikan ke format default:<br />
                        <span className="text-amber-600 font-bold">123456</span>
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-4"
                    >
                      <div className="w-16 h-16 bg-exam-success text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-exam-success/20">
                        <CheckCircle2 size={32} />
                      </div>
                      <h3 className="text-xl font-black text-navy uppercase italic tracking-tighter mb-2">SUCCESS!</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password berhasil direset</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {!resetSuccess && (
                <div className="flex border-t border-slate-100">
                  <button onClick={() => setResettingUser(null)} className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 border-r border-slate-100">Batal</button>
                  <button onClick={() => handleResetPassword(resettingUser.id)} className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 transition shadow-inner">Reset Sekarang</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}