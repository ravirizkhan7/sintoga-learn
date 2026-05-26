import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Search,
  RefreshCcw,
  AlertCircle,
  X,
  User,
  CheckCircle2,
  Clock,
  Award,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────

interface UjianOption {
  id: number;
  judul_ujian: string;
  kode_ujian: string | null;
  kelas: string;
  tipe_ujian: string;
  pending_count?: number;
}

interface SiswaUjian {
  id: number;
  id_ujian: number;
  id_siswa: number;
  status: 'pengerjaan' | 'dikirim' | 'dinilai' | string;
  waktu_mulai: string;
  waktu_selesai?: string | null;
  nilai_akhir?: number | null;
  siswa?: { id: number; nama: string };
}

// ─── Helpers ──────────────────────────────────────────────────

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pengerjaan': return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'dikirim':    return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'dinilai':    return 'text-green-600 bg-green-50 border-green-100';
    default:           return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pengerjaan': return <Clock size={10} />;
    case 'dikirim':    return <CheckCircle2 size={10} />;
    case 'dinilai':    return <Award size={10} />;
    default:           return null;
  }
};

const fmtTime = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

const fmtDate = (ts?: string | null) =>
  ts ? new Date(ts).toLocaleDateString() : '-';

// ─── Component ────────────────────────────────────────────────

export default function MonitorGuru() {
  const [ujians, setUjians] = useState<UjianOption[]>([]);
  const [selectedUjianId, setSelectedUjianId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [siswaList, setSiswaList] = useState<SiswaUjian[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch daftar ujian ────────────────────────────────────
  const fetchUjians = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/ujian');
      const raw = res.data?.data;
      const all: UjianOption[] = Array.isArray(raw) ? raw : raw?.data ?? [];
      setUjians(all);
      if (all.length > 0 && !selectedUjianId) {
        setSelectedUjianId(all[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengambil data ujian');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Fetch peserta ujian (pakai endpoint /manual) ──────────
  const fetchSiswaUjian = async (ujian: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/ujian/${ujian}/hasil`);
      const raw = res.data?.data;
      const data: SiswaUjian[] = Array.isArray(raw) ? raw : raw?.data ?? [];
      setSiswaList(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengambil data peserta');
      setSiswaList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUjians(); }, []);
  useEffect(() => { if (selectedUjianId) fetchSiswaUjian(selectedUjianId); }, [selectedUjianId]);

  // ─── Reset sesi siswa ──────────────────────────────────────
  const handleReset = async (siswaUjianId: number) => {
    if (!confirm('Reset sesi ujian siswa ini?')) return;
    try {
      setIsResetting(siswaUjianId);
      await api.delete(`/ujian/${siswaUjianId}/reset`);
      if (selectedUjianId) await fetchSiswaUjian(selectedUjianId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mereset sesi siswa');
    } finally {
      setIsResetting(null);
    }
  };

  // ─── Filter ────────────────────────────────────────────────
  const filtered = siswaList.filter(s => {
    if (!searchQuery) return true;
    const nama = s.siswa?.nama || '';
    return nama.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ─── Group by status ───────────────────────────────────────
  const grouped = filtered.reduce((acc, s) => {
    const key = s.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, SiswaUjian[]>);

  const statusOrder = ['pengerjaan', 'dikirim', 'dinilai'];
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => statusOrder.indexOf(a) - statusOrder.indexOf(b)
  );

  return (
    <div className="space-y-6">
      {/* ── Header & Filter ── */}
      <div className="bg-white p-6 rounded border border-exam-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter flex items-center gap-2">
              <Monitor className="text-light-blue" /> Monitoring Real-Time
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Pengawasan aktivitas ujian digital
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue transition"
              value={selectedUjianId || ''}
              onChange={e => setSelectedUjianId(e.target.value ? Number(e.target.value) : null)}
              disabled={isLoading}
            >
              <option value="">Pilih Ujian...</option>
              {ujians.map(u => (
                <option key={u.id} value={u.id}>{u.judul_ujian}</option>
              ))}
            </select>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="CARI SISWA..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase tracking-widest outline-none focus:border-light-blue transition w-full"
              />
            </div>

            <button
              onClick={() => selectedUjianId && fetchSiswaUjian(selectedUjianId)}
              disabled={isLoading || !selectedUjianId}
              className="p-2 bg-navy text-white rounded hover:bg-light-blue transition disabled:opacity-50"
            >
              <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Alert ── */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-12 rounded border border-exam-border flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <RefreshCcw size={32} className="text-slate-300 animate-spin" />
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  Memuat data peserta...
                </p>
              </div>
            </motion.div>

          ) : sortedGroups.length > 0 ? (
            sortedGroups.map(([status, siswaGroup], idx) => (
              <motion.div
                key={status}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
              >
                {/* Group Header */}
                <div className="p-5 bg-navy border-b border-white/10 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-light-blue">{getStatusIcon(status)}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-light-blue">
                        Status: {status}
                      </span>
                    </div>
                    <span className="bg-white/10 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-white/10">
                      {siswaGroup.length} Siswa
                    </span>
                  </div>
                </div>

                {/* Siswa Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 bg-slate-50/50">
                  {siswaGroup.map(s => (
                    <div
                      key={s.id}
                      className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-light-blue transition-all"
                    >
                      {/* Siswa Info */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-navy uppercase truncate">
                            {s.siswa?.nama || `Siswa #${s.id_siswa}`}
                          </p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">
                            Mulai: {fmtTime(s.waktu_mulai)}
                          </p>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 shrink-0">
                          <User size={10} />
                        </div>
                      </div>

                      {/* Status & Nilai */}
                      <div className="flex-1 flex flex-col gap-1.5 py-1">
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border self-start",
                          getStatusStyle(s.status)
                        )}>
                          {getStatusIcon(s.status)}
                          {s.status}
                        </div>

                        {s.status === 'dinilai' && s.nilai_akhir != null ? (
                          <p className="text-xl font-black text-navy italic tracking-tighter text-center">
                            {s.nilai_akhir}
                          </p>
                        ) : (
                          <p className="text-[9px] font-black text-slate-300 italic uppercase text-center">
                            {s.status === 'dinilai' ? '—' : 'Pending'}
                          </p>
                        )}

                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter text-center">
                          {fmtDate(s.waktu_mulai)}
                        </p>
                      </div>

                      {/* Tombol Reset */}
                      <div className="pt-1">
                        <button
                          onClick={() => handleReset(s.id)}
                          disabled={isResetting === s.id}
                          className="w-full py-1.5 flex items-center justify-center gap-1.5 bg-red-50 text-red-500 rounded border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 text-[9px] font-black uppercase tracking-widest"
                        >
                          <Trash2 size={12} className={isResetting === s.id ? 'animate-spin' : ''} />
                          Reset Sesi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))

          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white p-12 rounded border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-sm font-black text-navy uppercase tracking-widest italic">
                  Tidak Ada Peserta
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  Belum ada siswa yang mengikuti ujian ini.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}