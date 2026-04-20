import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Download, 
  FileText, 
  Table as TableIcon,
  Filter,
  User,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  mockDaftarUjian, 
  mockUjianSiswa, 
  mockUsers, 
  mockJurusan 
} from '../../lib/mockData';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';

export default function RekapHistori() {
  const { user } = useAuth();
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique classes and intake years (angkatan) from mock data
  const classes = Array.from(new Set(mockDaftarUjian.map(u => u.kelas))).sort();
  const years = Array.from(new Set(mockDaftarUjian.map(u => u.tahun_ajaran))).sort().reverse();

  // Filter history logic
  const filteredHistory = mockUjianSiswa.filter(us => {
    const ujian = mockDaftarUjian.find(u => u.id === us.id_ujian);
    const siswa = mockUsers.find(s => s.id === us.id_siswa);
    
    if (!ujian || !siswa) return false;

    // Teacher can only see their exams, Admin sees all
    const isOwner = user?.role === 'admin' || ujian.id_guru === user?.id;
    if (!isOwner) return false;

    const matchKelas = !filterKelas || ujian.kelas === filterKelas;
    const matchJurusan = !filterJurusan || ujian.jurusan_id === Number(filterJurusan);
    const matchAngkatan = !filterAngkatan || ujian.tahun_ajaran === filterAngkatan;
    const matchSearch = !searchQuery || 
      siswa.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ujian.judul_ujian.toLowerCase().includes(searchQuery.toLowerCase());

    return matchKelas && matchJurusan && matchAngkatan && matchSearch && us.status === 'dinilai';
  });

  const handleExport = (type: 'pdf' | 'excel') => {
    alert(`Mengekspor rekap dalam format ${type.toUpperCase()}...\n\nFitur ini akan mengunduh file rekap berdasarkan filter:\nKelas: ${filterKelas || 'Semua'}\nJurusan: ${filterJurusan || 'Semua'}\nAngkatan: ${filterAngkatan || 'Semua'}`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Filters */}
      <div className="bg-white p-6 rounded border border-exam-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter flex items-center gap-2">
              <History className="text-light-blue" /> Rekap Histori Ujian
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Laporan rekapitulasi nilai dan riwayat pengerjaan siswa</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              <FileText size={14} /> Export PDF
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded text-[10px] font-black uppercase tracking-widest border border-green-100 hover:bg-green-600 hover:text-white transition-all active:scale-95 shadow-sm"
            >
              <TableIcon size={14} /> Export Excel
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded border border-slate-100">
          {/* Kelas Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Layers size={10} /> Filter Kelas
            </label>
            <select 
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-navy outline-none focus:border-light-blue transition"
            >
              <option value="">Semua Kelas</option>
              {classes.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Jurusan Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Layers size={10} /> Filter Jurusan
            </label>
            <select 
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-navy outline-none focus:border-light-blue transition"
            >
              <option value="">Semua Jurusan</option>
              {mockJurusan.map(j => <option key={j.id} value={j.id}>{j.nama_jurusan}</option>)}
            </select>
          </div>

          {/* Angkatan Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Calendar size={10} /> Angkatan / TA
            </label>
            <select 
              value={filterAngkatan}
              onChange={(e) => setFilterAngkatan(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-navy outline-none focus:border-light-blue transition"
            >
              <option value="">Semua Tahun</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Search Query */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Search size={10} /> Cari Nama / Ujian
            </label>
            <input 
              placeholder="Searching..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-navy outline-none focus:border-light-blue transition placeholder:italic"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden">
        <div className="p-4 bg-navy flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-light-blue" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Data Rekap Sesuai Filter</h3>
          </div>
          <span className="text-[9px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded border border-white/5 uppercase">
            Total Record: {filteredHistory.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-exam-border">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Informasi Ujian</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statistik Waktu</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai Akhir</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((hist, idx) => {
                  const ujian = mockDaftarUjian.find(u => u.id === hist.id_ujian);
                  const siswa = mockUsers.find(s => s.id === hist.id_siswa);
                  const jurusan = mockJurusan.find(j => j.id === ujian?.jurusan_id);

                  return (
                    <motion.tr 
                      key={hist.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 group-hover:bg-light-blue group-hover:text-white transition-all">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-navy uppercase truncate leading-none">{siswa?.nama_lengkap}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">NISN: {siswa?.nisn || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-navy">{ujian?.judul_ujian}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black bg-navy/5 text-navy px-1.5 rounded uppercase tracking-tighter">{ujian?.kelas} {jurusan?.kode_jurusan}</span>
                            <span className="text-[8px] font-black bg-light-blue/10 text-light-blue px-1.5 rounded uppercase tracking-tighter">{ujian?.tipe_ujian}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 font-bold uppercase">Selesai: {hist.waktu_selesai ? new Date(hist.waktu_selesai).toLocaleDateString() : '-'}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{hist.waktu_selesai ? new Date(hist.waktu_selesai).toLocaleTimeString() : '-'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={cn(
                            "text-base font-black italic tracking-tighter",
                            (hist.nilai_akhir || 0) >= 75 ? "text-green-600" : "text-red-500"
                          )}>
                            {hist.nilai_akhir || 0}
                          </span>
                          <div className="w-8 h-0.5 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000",
                                (hist.nilai_akhir || 0) >= 75 ? "bg-green-500" : "bg-red-500"
                              )}
                              style={{ width: `${hist.nilai_akhir || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-navy hover:text-white rounded transition-all text-slate-400 active:scale-90">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-20">
                      <History size={48} />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Historical Data Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
