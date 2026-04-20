import { useState } from 'react';
import { 
  Globe, 
  MapPin, 
  RefreshCcw, 
  Lock, 
  Save, 
  ShieldCheck, 
  Server,
  Zap,
  AlertTriangle,
  Settings2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Konfigurasi() {
  const [ipGateway, setIpGateway] = useState('192.168.1.1');
  const [lockLocation, setLockLocation] = useState(true);

  const [isRunning, setIsRunning] = useState(false);

  const runMaintenance = (type: string) => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      alert(`Berhasil: ${type} telah diselesaikan.`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Konfigurasi Sistem</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Parameter keamanan & Jaringan infrastruktur</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
          >
            <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2">
              <Globe size={14} className="text-light-blue" />
              <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Network Gateway Control</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">IP Gateway Address</label>
                  <input 
                    type="text" 
                    value={ipGateway}
                    onChange={(e) => setIpGateway(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue transition text-sm font-bold font-mono shadow-inner" 
                  />
                  <p className="text-[9px] text-slate-400 font-medium italic">Batasi akses ujian hanya dari IP tertentu.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Subnet Mask</label>
                  <input type="text" value="255.255.255.0" disabled className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded outline-none text-sm font-bold font-mono text-slate-300 cursor-not-allowed" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-light-blue text-white rounded flex items-center justify-center shadow-lg shadow-light-blue/20">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-navy uppercase tracking-widest">Enforce Geographical Lock</h4>
                    <p className="text-[9px] text-slate-400 font-bold italic">Gunakan Geolocation API untuk validasi lokasi fisik siswa.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLockLocation(!lockLocation)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative shadow-inner",
                    lockLocation ? 'bg-exam-success' : 'bg-slate-300'
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    lockLocation ? 'right-1' : 'left-1'
                  )} />
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
          >
            <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2">
              <RefreshCcw size={14} className="text-light-blue" />
              <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Database Maintenance</h3>
            </div>
            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                disabled={isRunning}
                onClick={() => runMaintenance('Cleanup Logs')}
                className="flex items-center justify-center gap-3 py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-light-blue hover:text-light-blue transition group disabled:opacity-50"
              >
                {isRunning ? <RefreshCcw size={18} className="animate-spin" /> : <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                Cleanup Logs
              </button>
              <button 
                disabled={isRunning}
                onClick={() => runMaintenance('Reset Semester')}
                className="flex items-center justify-center gap-3 py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition group disabled:opacity-50"
              >
                {isRunning ? <RefreshCcw size={18} className="animate-spin" /> : <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                Reset Semester
              </button>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-navy rounded-lg p-6 text-white shadow-xl shadow-navy/20 border-b-4 border-light-blue"
          >
            <Lock size={32} className="mb-4 text-light-blue" />
            <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2">System Authority</h3>
            <p className="text-[10px] text-blue-100/50 font-bold uppercase tracking-widest mb-6 leading-relaxed">
              Semua perubahan parameter keamanan akan dicatat ke dalam audit log sistem secara permanen.
            </p>
            <button className="w-full bg-light-blue hover:bg-light-blue/90 text-white font-black py-4 rounded text-[10px] uppercase tracking-[0.2em] transition flex items-center justify-center gap-2 active:scale-95">
              <Save size={16} />
              Commit Changes
            </button>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded border border-exam-border shadow-sm p-6 text-center"
          >
            <ShieldCheck size={40} className="mx-auto text-exam-success mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Health Score</p>
            <h4 className="text-3xl font-black text-navy italic tracking-tighter">99.8 / 100</h4>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
