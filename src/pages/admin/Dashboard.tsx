import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Map, 
  Settings, 
  ShieldCheck, 
  Activity,
  UserPlus,
  Database,
  BarChart2,
  CheckCircle2,
  RefreshCcw,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const stats = [
    { label: 'Total Pengguna', value: '1,560', icon: Users, color: 'bg-navy' },
    { label: 'Sesi Aktif', value: '42', icon: Activity, color: 'bg-exam-success' },
    { label: 'Database Size', value: '128MB', icon: Database, color: 'bg-light-blue' },
    { label: 'Sistem Terlindungi', value: '100%', icon: ShieldCheck, color: 'bg-indigo-600' },
  ];

  const handleAction = (label: string) => {
    if (label === 'Tambah User') {
      navigate('/admin/users');
      return;
    }
    if (label === 'Jurusan') {
      navigate('/admin/jurusan');
      return;
    }
    if (label === 'Siswa') {
      navigate('/admin/siswa');
      return;
    }
    
    setActiveAction(label);
    setTimeout(() => setActiveAction(null), 2000);
  };

  const quickActions = [
    { label: 'Tambah User', icon: UserPlus, desc: 'Registrasi manual user baru', color: 'text-light-blue' },
    { label: 'Jurusan', icon: Map, desc: 'Atur mapping program studi', color: 'text-indigo-500' },
    { label: 'Siswa', icon: GraduationCap, desc: 'Manajemen data akademik', color: 'text-emerald-500' },
    { label: 'Backup Data', icon: Database, desc: 'Ekspor database sistem', color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white p-5 rounded border border-exam-border shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
              <p className="text-xl font-black text-navy italic tracking-tighter">{stat.value}</p>
            </div>
            <div className={cn("w-10 h-10 rounded flex items-center justify-center text-white shadow-lg", stat.color)}>
              <stat.icon size={20} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-navy uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-light-blue" /> System Live Monitor
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-exam-success animate-pulse" />
              <span className="text-[9px] font-black text-exam-success uppercase tracking-widest">Running</span>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-slate-300 relative">
             <motion.div 
               animate={{ 
                 scale: [1, 1.05, 1],
                 opacity: [0.3, 0.5, 0.3]
               }}
               transition={{ duration: 4, repeat: Infinity }}
             >
               <BarChart2 size={120} strokeWidth={1} />
             </motion.div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Real-time Stream: Active</p>
          </div>
        </div>

        <div className="bg-white rounded border border-exam-border shadow-sm flex flex-col relative overflow-hidden">
          <div className="p-4 bg-slate-50/30 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Quick Management</h3>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-px bg-slate-100 grow">
            {quickActions.map((btn, i) => (
              <button 
                key={i} 
                onClick={() => handleAction(btn.label)}
                className="bg-white p-6 hover:bg-slate-50 transition-all flex flex-col items-center text-center group relative overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/[0.02] transition-colors" />
                <btn.icon size={24} className={cn("transition-all mb-4 group-hover:-translate-y-1", btn.color)} />
                <span className="text-[10px] font-black text-navy uppercase tracking-widest mb-1 relative z-10">{btn.label}</span>
                <span className="text-[9px] text-slate-400 font-bold leading-tight relative z-10">{btn.desc}</span>
              </button>
            ))}
          </div>

          {/* Action Feedback Overlay */}
          <AnimatePresence>
            {activeAction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-navy/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white p-6 text-center"
              >
                 <motion.div
                   initial={{ scale: 0.5, rotate: -10 }}
                   animate={{ scale: 1, rotate: 0 }}
                   className="mb-4"
                 >
                   <CheckCircle2 size={48} className="text-light-blue" />
                 </motion.div>
                 <h4 className="text-sm font-black uppercase tracking-widest mb-2 italic tracking-tighter">{activeAction} SUCCESS</h4>
                 <p className="text-[10px] text-blue-100/60 font-medium uppercase tracking-widest">Proses eksekusi latar belakang selesai</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
