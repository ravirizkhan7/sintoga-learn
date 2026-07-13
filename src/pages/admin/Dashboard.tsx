import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  Activity,
  UserPlus,
  Database,
  BarChart2,
  CheckCircle2,
  History,
  Layers,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/axios';

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUser: 0,
    totalGuru: 0,
    totalSiswa: 0,
    totalAdmin: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const res = await api.get('/user');
      const raw = res.data?.data;
      const users: any[] = Array.isArray(raw) ? raw : raw?.data ?? [];

      setStats({
        totalUser: users.length,
        totalGuru: users.filter(u => u.role === 'guru').length,
        totalSiswa: users.filter(u => u.role === 'siswa').length,
        totalAdmin: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      });
    } catch (err) {
      console.error('Gagal fetch stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Pengguna', value: isLoadingStats ? '...' : stats.totalUser.toLocaleString(), icon: Users, color: 'bg-navy' },
    { label: 'Total Guru', value: isLoadingStats ? '...' : stats.totalGuru.toLocaleString(), icon: Activity, color: 'bg-light-blue' },
    { label: 'Total Siswa', value: isLoadingStats ? '...' : stats.totalSiswa.toLocaleString(), icon: Users, color: 'bg-exam-success' },
    { label: 'Total Admin', value: isLoadingStats ? '...' : stats.totalAdmin.toLocaleString(), icon: Users, color: 'bg-indigo-600' },
  ];

  const quickActions = [
    { 
      label: 'Kelola User', 
      icon: UserPlus, 
      desc: 'Registrasi & manajemen user', 
      color: 'text-light-blue',
      path: '/admin/users'
    },
    { 
      label: 'Jurusan', 
      icon: Layers, 
      desc: 'Atur mapping program studi', 
      color: 'text-indigo-500',
      path: '/admin/jurusan'
    },
    // { 
    //   label: 'Rekap Histori', 
    //   icon: History, 
    //   desc: 'Lihat rekap hasil ujian', 
    //   color: 'text-emerald-500',
    //   path: '/admin/rekap'
    // },
    { 
      label: 'Konfigurasi', 
      icon: Settings, 
      desc: 'Parameter keamanan sistem', 
      color: 'text-amber-500',
      path: '/admin/konfigurasi'
    },
  ];

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            key={i} 
            className="bg-white p-5 rounded border border-exam-border shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
              <p className={cn(
                "text-xl font-black text-navy italic tracking-tighter",
                isLoadingStats && "animate-pulse text-slate-300"
              )}>
                {stat.value}
              </p>
            </div>
            <div className={cn("w-10 h-10 rounded flex items-center justify-center text-white shadow-lg", stat.color)}>
              <stat.icon size={20} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* System Monitor */}
        <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-navy uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-light-blue" /> System Live Monitor
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchStats}
                disabled={isLoadingStats}
                className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCcw size={12} className={cn(isLoadingStats && "animate-spin")} />
              </button>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-exam-success animate-pulse" />
                <span className="text-[9px] font-black text-exam-success uppercase tracking-widest">Running</span>
              </div>
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

            {/* Mini stats row */}
            <div className="mt-6 grid grid-cols-3 gap-4 w-full">
              {[
                { label: 'Guru', value: stats.totalGuru, color: 'text-light-blue' },
                { label: 'Siswa', value: stats.totalSiswa, color: 'text-exam-success' },
                { label: 'Admin', value: stats.totalAdmin, color: 'text-indigo-500' },
              ].map((s, i) => (
                <div key={i} className="text-center p-3 bg-slate-50 rounded border border-slate-100">
                  <p className={cn("text-lg font-black italic tracking-tighter", isLoadingStats ? "text-slate-200 animate-pulse" : s.color)}>
                    {isLoadingStats ? '...' : s.value}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Management */}
        <div className="bg-white rounded border border-exam-border shadow-sm flex flex-col relative overflow-hidden">
          <div className="p-4 bg-slate-50/30 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Quick Management</h3>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-px bg-slate-100 grow">
            {quickActions.map((btn, i) => (
              <button 
                key={i} 
                onClick={() => navigate(btn.path)}
                className="bg-white p-6 hover:bg-slate-50 transition-all flex flex-col items-center text-center group relative overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/[0.02] transition-colors" />
                <btn.icon size={24} className={cn("transition-all mb-4 group-hover:-translate-y-1", btn.color)} />
                <span className="text-[10px] font-black text-navy uppercase tracking-widest mb-1 relative z-10">{btn.label}</span>
                <span className="text-[9px] text-slate-400 font-bold leading-tight relative z-10">{btn.desc}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}