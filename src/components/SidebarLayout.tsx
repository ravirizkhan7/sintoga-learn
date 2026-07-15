import React, { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  LayoutDashboard, 
  User as UserIcon, 
  BookOpen, 
  LogOut, 
  Menu, 
  X, 
  Settings, 
  Users, 
  Monitor,
  GraduationCap,
  ShieldAlert,
  Layers,
  ChevronDown,
  FileCheck,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useGlobalState } from '../context/GlobalStateContext';
import api from '../lib/axios';

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const { user, logout } = useAuth();
  const { studentAnswers } = useGlobalState();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [isBankSoalOpen, setIsBankSoalOpen] = useState(false);
  const [bankSoalSearch, setBankSoalSearch] = useState('');
  const [teacherExams, setTeacherExams] = useState<any[]>([]);

  const [editProfileData, setEditProfileData] = useState({
    nama: user?.nama || '',
    email: user?.email || '',
    password: '',
    password_confirmation: '',
  });
  const [editProfileLoading, setEditProfileLoading] = useState(false);

  useEffect(() => {
    if (!isBankSoalOpen) setBankSoalSearch('');
  }, [isBankSoalOpen]);

  useEffect(() => {
    if (user?.role === 'guru') {
      api.get('/ujian')
        .then(res => {
          const raw = res.data?.data;
          const data = Array.isArray(raw) ? raw : raw?.data ?? [];
          setTeacherExams(data);
        })
        .catch(err => console.error('Gagal fetch ujian guru:', err));
    }
  }, [user]);

  if (!user) return null;

  const handleEditProfile = async () => {
    try {
      setEditProfileLoading(true);

      const payload: any = {
        nama: editProfileData.nama,
      };

      if (editProfileData.email !== user.email) {
        payload.email = editProfileData.email;
      }

      if (editProfileData.password) {
        if (editProfileData.password !== editProfileData.password_confirmation) {
          alert('Konfirmasi password tidak cocok!');
          return;
        }
        payload.password = editProfileData.password;
        payload.password_confirmation = editProfileData.password_confirmation;
      }

      await api.put('/auth/me/edit', payload);
      alert('Profil berhasil diperbarui.');
      setShowEditProfileModal(false);
      setEditProfileData(prev => ({ ...prev, password: '', password_confirmation: '' }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal update profil');
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login', { replace: true });
  };

  const menuItems = {
    siswa: [
      { path: '/siswa', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/siswa/histori', icon: History, label: 'Histori Ujian' },
    ],
    guru: [
      { path: '/guru', icon: LayoutDashboard, label: 'Dashboard' },
      { 
        path: '/guru/bank-soal', 
        icon: BookOpen, 
        label: 'Bank Soal',
        isDropdown: true,
        children: teacherExams.map(exam => ({
          path: `/guru/bank-soal?ujianId=${exam.id}`,
          label: exam.judul_ujian
        }))
      },
      { path: '/guru/penilaian', icon: FileCheck, label: 'Penilaian Manual' },
      { path: '/guru/monitor', icon: Monitor, label: 'Monitoring' },
      { path: '/guru/rekap', icon: History, label: 'Rekap Histori' },
    ],
    admin: [
      { path: '/admin', icon: LayoutDashboard, label: 'Sistem' },
      { path: '/admin/users', icon: Users, label: 'Kelola User' },
      { path: '/admin/jurusan', icon: Layers, label: 'Manajemen Jurusan' },
      { path: '/admin/rekap', icon: History, label: 'Rekap Histori' },
      { path: '/admin/konfigurasi', icon: Settings, label: 'Konfigurasi' },
    ],
  };

  const currentMenu = (user.role === 'superadmin')
    ? menuItems.admin
    : (menuItems[user.role as keyof typeof menuItems] ?? []);

  const isExamPage = location.pathname.startsWith('/siswa/ujian/');

  if (isExamPage) {
    return (
      <div className="min-h-screen bg-exam-bg">
        <main className="w-full h-full min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-exam-bg">
      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-navy/80 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-navy text-white transition-all duration-300 flex flex-col fixed inset-y-0 left-0 z-[70] shadow-xl lg:z-50",
          isSidebarOpen ? "w-64" : "w-20",
          "lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-[60px] flex items-center justify-between px-6 border-b border-white/10">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "lg:hidden")}>
            <GraduationCap className="text-light-blue" />
            <span className="font-extrabold text-lg tracking-widest uppercase">SINTOGA</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="hidden lg:block p-1 hover:bg-white/10 rounded transition-colors"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={22} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {currentMenu.map((item: any) => (
            <div key={item.path}>
              {item.isDropdown ? (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (!isSidebarOpen) setIsSidebarOpen(true);
                      setIsBankSoalOpen(!isBankSoalOpen);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded transition-all group",
                      location.pathname.startsWith(item.path) 
                        ? "bg-light-blue/20 text-white" 
                        : "hover:bg-white/5 text-slate-300 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={20} className={cn(!isSidebarOpen && "lg:mx-auto")} />
                      <span className={cn("font-semibold text-sm transition-all", !isSidebarOpen && "lg:hidden lg:opacity-0")}>
                        {item.label}
                      </span>
                    </div>
                    {isSidebarOpen && (
                      <ChevronDown 
                        size={14} 
                        className={cn("transition-transform", isBankSoalOpen && "rotate-180")} 
                      />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {isBankSoalOpen && isSidebarOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/10 rounded-lg mx-2"
                      >
                        {teacherExams.length === 0 ? (
                          <p className="px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Belum ada judul soal
                          </p>
                        ) : (
                          <>
                            {/* Search box */}
                            <div className="px-3 pt-2 pb-1">
                              <input
                                type="text"
                                value={bankSoalSearch}
                                onChange={e => setBankSoalSearch(e.target.value)}
                                placeholder="Cari ujian..."
                                className="w-full px-3 py-1.5 bg-white/10 border border-white/10 rounded text-[10px] font-bold text-white placeholder-slate-500 outline-none focus:border-light-blue/50 transition-all"
                              />
                            </div>

                            {/* List dengan max-height + scroll tanpa scrollbar */}
                            <div className="overflow-y-auto max-h-[160px] pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                              {(() => {
                                const filtered = teacherExams.filter(exam =>
                                  exam.judul_ujian.toLowerCase().includes(bankSoalSearch.toLowerCase())
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <p className="px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                      Judul tidak ada
                                    </p>
                                  );
                                }

                                return filtered.map((exam: any) => {
                                  const childPath = `/guru/bank-soal?ujianId=${exam.id}`;
                                  return (
                                    <Link
                                      key={exam.id}
                                      to={childPath}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className={cn(
                                        "flex items-center gap-3 px-8 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                        (location.pathname + location.search) === childPath
                                          ? "text-light-blue"
                                          : "text-slate-400 hover:text-white"
                                      )}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                      <span className="truncate">{exam.judul_ujian}</span>
                                    </Link>
                                  );
                                });
                              })()}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-2.5 rounded transition-all group",
                    location.pathname === item.path 
                      ? "bg-light-blue text-white shadow-lg shadow-light-blue/20" 
                      : "hover:bg-white/5 text-slate-300 hover:text-white"
                  )}
                >
                  <item.icon size={20} className={cn(!isSidebarOpen && "lg:mx-auto")} />
                  <span className={cn("font-semibold text-sm transition-all", !isSidebarOpen && "lg:hidden lg:opacity-0")}>
                    {item.label}
                  </span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={cn("px-4 py-2", !isSidebarOpen && "lg:hidden")}>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Username</p>
            <p className="text-xs font-black truncate uppercase italic tracking-tighter text-white">{user.nama}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-exam-success shadow-[0_0_8px_rgba(40,167,69,0.5)]" />
              <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest leading-none">Status: Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0 w-full",
        "lg:ml-20",
        isSidebarOpen && "lg:ml-64"
      )}>
        <header className="h-[60px] bg-white border-b-4 border-light-blue flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-navy hover:bg-slate-100 rounded"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-sm lg:text-lg font-extrabold text-navy uppercase tracking-tight truncate max-w-[150px] lg:max-w-none">
              {location.pathname.split('/').pop() || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3 lg:gap-4 relative">
            <div className="text-right border-r pr-3 lg:pr-4 border-exam-border hidden sm:block">
              <p className="text-xs lg:text-sm font-bold text-exam-text leading-tight">{user.nama}</p>
              <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{user.role}</p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "w-8 h-8 lg:w-9 lg:h-9 rounded flex items-center justify-center border transition-all",
                isProfileOpen ? "bg-navy border-navy text-white shadow-lg" : "bg-exam-bg border-exam-border text-slate-400 hover:border-light-blue"
              )}
            >
              <UserIcon size={18} />
            </motion.button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-[120%] w-56 bg-white rounded border border-exam-border shadow-2xl z-20 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Account</p>
                      <p className="text-xs font-black text-navy truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setIsProfileOpen(false); setShowProfileModal(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-50 hover:text-navy rounded transition-all active:scale-95"
                      >
                        <UserIcon size={14} className="text-light-blue" /> Profil Saya
                      </button>
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          setEditProfileData({ nama: user.nama, email: user.email, password: '', password_confirmation: '' });
                          setShowEditProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-50 hover:text-navy rounded transition-all active:scale-95"
                      >
                        <Settings size={14} className="text-light-blue" /> Edit Profile
                      </button>
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50/20">
                      <button 
                        onClick={() => { setIsProfileOpen(false); setShowLogoutModal(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-tight text-red-500 hover:bg-red-50 rounded transition-all active:scale-95"
                      >
                        <LogOut size={14} /> Keluar Sistem
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Logout Modal */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogoutModal(false)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white rounded border border-exam-border w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col">
                <div className="bg-navy p-6 flex items-center justify-center text-red-400 border-b-4 border-red-500">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <ShieldAlert size={48} />
                  </motion.div>
                </div>
                <div className="p-8 text-center space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-navy uppercase italic tracking-tighter">Terminasi Sesi</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Security Protocol Required</p>
                  </div>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                    Anda sedang mencoba keluar dari enkripsi sistem <span className="text-navy">Sintoga Learn</span>. Semua sesi aktif akan ditutup secara permanen. Lanjutkan?
                  </p>
                </div>
                <div className="flex border-t border-slate-100 bg-slate-50/50">
                  <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white transition-colors border-r border-slate-100 active:bg-slate-100">Batal Eksekusi</button>
                  <button onClick={handleLogout} className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all shadow-inner active:scale-95">Ya, Logout</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Modal */}
        <AnimatePresence>
          {showProfileModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileModal(false)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded border border-exam-border w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="bg-navy p-6 flex flex-col items-center border-b-4 border-light-blue text-white">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-4">
                    <UserIcon size={40} className="text-light-blue" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter">{user.nama}</h3>
                  <div className="px-3 py-1 bg-light-blue/20 rounded text-[9px] font-black tracking-widest uppercase mt-2">IDENTITAS: {user.role}</div>
                </div>
                <div className="p-8 space-y-6">
                  {[
                    { label: 'EMAIL ADDRESS', value: user.email },
                    { label: 'SYSTEM UID', value: `STG-USR-${user.id.toString().padStart(4, '0')}` },
                    { label: 'ACCESS PERMISSION', value: (user.role === 'admin' || user.role === 'superadmin') ? 'MASTER_ACCESS' : 'STANDARD_ACCESS' }
                  ].map((field, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[9px] font-black text-slate-400 tracking-widest">{field.label}</span>
                      <span className="text-[11px] font-bold text-navy truncate ml-4 italic">{field.value}</span>
                    </div>
                  ))}
                  <button onClick={() => setShowProfileModal(false)} className="w-full py-4 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xl shadow-navy/20 active:scale-95 transition-all">TUTUP PROTOKOL</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditProfileModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !editProfileLoading && setShowEditProfileModal(false)} className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="bg-white rounded-xl border border-exam-border w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 italic">
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest">Update Enkripsi Profil</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Security ID Manager</p>
                </div>
                <div className="p-8 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                    <input type="text" value={editProfileData.nama} onChange={e => setEditProfileData({...editProfileData, nama: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-navy outline-none focus:border-light-blue shadow-inner transition-all focus:ring-4 focus:ring-light-blue/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input type="email" value={editProfileData.email} onChange={e => setEditProfileData({...editProfileData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-navy outline-none focus:border-light-blue shadow-inner transition-all focus:ring-4 focus:ring-light-blue/10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru <span className="normal-case text-slate-300 font-bold">(opsional)</span></label>
                    <input type="password" placeholder="Kosongkan jika tidak ingin ganti" value={editProfileData.password} onChange={e => setEditProfileData({...editProfileData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-navy outline-none focus:border-light-blue shadow-inner transition-all focus:ring-4 focus:ring-light-blue/10" />
                  </div>
                  <AnimatePresence>
                    {editProfileData.password && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password</label>
                        <input 
                          type="password" 
                          placeholder="Ulangi password baru" 
                          value={editProfileData.password_confirmation} 
                          onChange={e => setEditProfileData({...editProfileData, password_confirmation: e.target.value})} 
                          className={cn(
                            "w-full px-4 py-3 bg-slate-50 border rounded-lg font-bold text-xs text-navy outline-none shadow-inner transition-all focus:ring-4",
                            editProfileData.password_confirmation && editProfileData.password !== editProfileData.password_confirmation
                              ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                              : "border-slate-200 focus:border-light-blue focus:ring-light-blue/10"
                          )} 
                        />
                        {editProfileData.password_confirmation && editProfileData.password !== editProfileData.password_confirmation && (
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">Password tidak cocok</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="pt-6 flex gap-3">
                    <button onClick={() => setShowEditProfileModal(false)} disabled={editProfileLoading} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition-colors rounded-lg border border-slate-100 disabled:opacity-50">Batalkan</button>
                    <button 
                      onClick={handleEditProfile} 
                      disabled={editProfileLoading || (!!editProfileData.password && editProfileData.password !== editProfileData.password_confirmation)} 
                      className="flex-[2] py-4 bg-light-blue text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-light-blue/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      {editProfileLoading ? 'Menyimpan...' : 'Submit Update'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="p-4 lg:p-6 bg-white border-t border-exam-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 uppercase font-black tracking-tight shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-exam-success shadow-[0_0_8px_rgba(40,167,69,0.5)]" />
            <span>System Status: Online</span>
          </div>
          <div className="italic text-navy/40">Sintoga Learn v1.0</div>
        </div>
      </main>
    </div>
  );
}