import React, { ReactNode, useState, useRef } from 'react';
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
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { cn } from '../lib/utils';
import { mockDaftarUjian, mockBankSoal } from '../lib/mockData';
import { useGlobalState } from '../context/GlobalStateContext';
import { getCroppedImg, compressImage } from '../lib/imageUtils';

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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Image Cropping
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSaveCrop = async () => {
    if (!tempImage || !croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      
      // 1. Get Cropped Image
      const croppedImageBlob = await getCroppedImg(tempImage, croppedAreaPixels);
      if (!croppedImageBlob) return;

      // 2. Automatically Compress to <= 1MB
      const compressedBlob = await compressImage(croppedImageBlob);
      
      // 3. Convert back to Data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setIsCropping(false);
        setIsProcessing(false);
        setTempImage(null);
      };
      reader.readAsDataURL(compressedBlob as Blob);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login', { replace: true });
  };

  const teacherExams = mockDaftarUjian.filter(e => e.id_guru === user.id);

  // Count pending assessments (isian/essay without skor) for active teacher/admin
  const pendingGradesCount = studentAnswers.filter(ans => {
    const soal = mockBankSoal.find(s => s.id === ans.id_soal);
    if (!soal) return false;
    const ujian = mockDaftarUjian.find(u => u.id === soal.id_ujian);
    
    // Check if exam belongs to current teacher OR if user is admin
    const isAuthorized = user.role === 'admin' || ujian?.id_guru === user.id;
    
    return isAuthorized && (soal?.tipe_soal === 'isian' || soal?.tipe_soal === 'essay') && ans.skor === undefined;
  }).length;

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
      { path: '/guru/penilaian', icon: FileCheck, label: 'Penilaian Manual', badge: pendingGradesCount },
      { path: '/guru/monitor', icon: Monitor, label: 'Monitoring' },
      { path: '/guru/rekap', icon: History, label: 'Rekap Histori' },
    ],
    admin: [
      { path: '/admin', icon: LayoutDashboard, label: 'Sistem' },
      { path: '/admin/users', icon: Users, label: 'Kelola User' },
      { path: '/admin/siswa', icon: GraduationCap, label: 'Manajemen Siswa' },
      { path: '/admin/jurusan', icon: Layers, label: 'Manajemen Jurusan' },
      { path: '/admin/rekap', icon: History, label: 'Rekap Histori' },
      { path: '/admin/konfigurasi', icon: Settings, label: 'Konfigurasi' },
    ],
  };

  const currentMenu = menuItems[user.role];
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
                        {item.children.map((child: any) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-4 px-8 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                              location.search === child.path.split('?')[1] || (location.pathname + location.search) === child.path
                                ? "text-light-blue" 
                                : "text-slate-400 hover:text-white"
                            )}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {child.label}
                          </Link>
                        ))}
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
                  {item.badge > 0 && isSidebarOpen && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-red-500/20">
                      {item.badge}
                    </span>
                  )}
                  {item.badge > 0 && !isSidebarOpen && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-navy" />
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={cn("px-4 py-2", !isSidebarOpen && "lg:hidden")}>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Auth Terminal</p>
            <p className="text-xs font-black truncate uppercase italic tracking-tighter text-white">{user.nama_lengkap}</p>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-exam-success shadow-[0_0_8px_rgba(40,167,69,0.5)]" />
               <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest leading-none">Status: Encrypted</p>
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
              <p className="text-xs lg:text-sm font-bold text-exam-text leading-tight">{user.nama_lengkap}</p>
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

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsProfileOpen(false)}
                  />
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
                        onClick={() => {
                          setIsProfileOpen(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-50 hover:text-navy rounded transition-all active:scale-95"
                      >
                        <UserIcon size={14} className="text-light-blue" /> Profil Saya
                      </button>
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          setShowEditProfileModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[10px] font-black uppercase tracking-tight text-slate-600 hover:bg-slate-50 hover:text-navy rounded transition-all active:scale-95"
                      >
                        <Settings size={14} className="text-light-blue" /> Edit Profile
                      </button>
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50/20">
                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          setShowLogoutModal(true);
                        }}
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

        {/* Modal Overlay Base */}
        <AnimatePresence>
          {(showLogoutModal || showProfileModal || showEditProfileModal) && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-navy/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-8"
            />
          )}
        </AnimatePresence>

        
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

        {/* Improved Logout Modal */}
        <AnimatePresence>
          {showLogoutModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded border border-exam-border w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col"
              >
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
                    Anda sedang mencoba keluar dari enkripsi sistem <span className="text-navy">Sintoga Learn</span>. 
                    Semua sesi aktif akan ditutup secara permanen. Lanjutkan?
                  </p>
                </div>
                <div className="flex border-t border-slate-100 bg-slate-50/50">
                  <button 
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white transition-colors border-r border-slate-100 active:bg-slate-100"
                  >
                    Batal Eksekusi
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all shadow-inner active:scale-95"
                  >
                    Ya, Logout
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Details Modal */}
        <AnimatePresence>
          {showProfileModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded border border-exam-border w-full max-w-md shadow-2xl relative overflow-hidden"
              >
                <div className="bg-navy p-6 flex flex-col items-center border-b-4 border-light-blue text-white">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 mb-4">
                    <UserIcon size={40} className="text-light-blue" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter">{user.nama_lengkap}</h3>
                  <div className="px-3 py-1 bg-light-blue/20 rounded text-[9px] font-black tracking-widest uppercase mt-2">
                    IDENTITAS: {user.role}
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  {[
                    { label: 'EMAIL ADDRESS', value: user.email },
                    { label: 'SYSTEM UID', value: `STG-USR-${user.id.toString().padStart(4, '0')}` },
                    { label: 'ACCESS PERMISSION', value: user.role === 'admin' ? 'MASTER_ACCESS' : 'STANDARD_ACCESS' }
                  ].map((field, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[9px] font-black text-slate-400 tracking-widest">{field.label}</span>
                      <span className="text-[11px] font-bold text-navy truncate ml-4 italic">{field.value}</span>
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowProfileModal(false)}
                    className="w-full py-4 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xl shadow-navy/20 active:scale-95 transition-all"
                  >
                    TUTUP PROTOKOL
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditProfileModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded border border-exam-border w-full max-w-md shadow-2xl relative overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 italic">
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest">Update Enkripsi Profil</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Security ID Manager</p>
                </div>
                <div className="p-8 space-y-5">
                  {/* Photo Profile Section */}
                  <div className="flex flex-col items-center justify-center space-y-3 mb-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden transition-all group-hover:border-light-blue group-hover:bg-light-blue/5">
                        {profileImage ? (
                          <img src={profileImage} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-400 group-hover:text-light-blue">
                             <Camera size={24} />
                             <span className="text-[8px] font-black uppercase mt-1">GANTI FOTO</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-light-blue text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-110 transition-transform">
                        <Camera size={14} />
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Klik kotak untuk upload foto (PNG/JPG)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name Access</label>
                    <input type="text" defaultValue={user.nama_lengkap} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Email Entry</label>
                    <input type="email" defaultValue={user.email} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue shadow-inner" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Override Password</label>
                    <input type="password" placeholder="••••••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded font-bold text-xs text-navy outline-none focus:border-light-blue shadow-inner" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setShowEditProfileModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded border border-slate-100">Batalkan</button>
                    <button onClick={() => {
                       alert('Otoritas Profil Berhasil Diperbarui.');
                       setShowEditProfileModal(false);
                    }} className="flex-2 py-4 bg-light-blue text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xl shadow-light-blue/20 active:scale-95 transition-all">Submit Update</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Image Cropper Modal - Higher Z-index to be on TOP of Edit Profile */}
        <AnimatePresence>
          {isCropping && (
            <>
              {/* Higher Z-index backdrop for cropper */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 lg:p-8"
              />
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded border border-exam-border w-full max-w-lg shadow-2xl relative overflow-hidden"
                >
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-navy uppercase tracking-widest italic">Sesuaikan Foto</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Atur posisi dan zoom foto profil anda</p>
                    </div>
                    <button onClick={() => setIsCropping(false)} className="p-2 text-slate-400 hover:text-navy transition">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="relative w-full h-[350px] bg-slate-900 border-y border-slate-200">
                    {tempImage && (
                      <Cropper
                        image={tempImage}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        cropShape="rect"
                        showGrid={true}
                      />
                    )}
                  </div>

                  <div className="p-6 bg-white space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom Level</span>
                        <span className="text-[10px] font-black text-navy uppercase tracking-widest">{Math.round(zoom * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-light-blue"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsCropping(false)}
                        className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400 hover:bg-slate-50 transition rounded border border-slate-100"
                      >
                        Batalkan
                      </button>
                      <button 
                        disabled={isProcessing}
                        onClick={handleSaveCrop}
                        className="flex-2 py-3 bg-light-blue text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xl shadow-light-blue/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            MEMPROSES...
                          </>
                        ) : (
                          'TERAPKAN & SIMPAN'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        <div className="p-4 lg:p-6 bg-white border-t border-exam-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 uppercase font-black tracking-tight shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-exam-success shadow-[0_0_8px_rgba(40,167,69,0.5)]" />
             <span>System Status: Online / 192.168.1.1</span>
          </div>
          <div className="italic text-navy/40">Sintoga Learn v1.2.5-stable • SMK SINTOGA DIGITAL</div>
        </div>
      </main>
    </div>
  );
}
