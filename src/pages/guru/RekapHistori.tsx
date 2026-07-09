import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  FileText, 
  Table as TableIcon,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  Clock,
  BookOpen,
  Users,
  RefreshCcw,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../../lib/utils';
import { useAuth } from '../../App';
import api from '../../lib/axios';

interface Ujian {
  id: number;
  judul_ujian: string;
  guru_id: number;
  kelas: string;
  tahun_ajar: string;
  tipe_ujian: string;
  semester: string;
  kode_ujian: string | null;
  durasi_menit: number;
  tanggal_ujian: string;
  waktu_mulai: string;
  waktu_selesai: string;
  status: string;
}

// ─── Sesuai response GET /ujian/{ujian}/hasil ─────────────────
interface Statistik {
  rata_rata: number;
  nilai_tertinggi: string;
  nilai_terendah: string;
  total_siswa: string;
  sudah_dinilai: string;
  belum_dinilai: string;
}

interface SiswaUjianHasil {
  siswa: string | { id: number; nama: string; email?: string; role?: string; nisn?: string; [key: string]: any };
  status: string;
  waktu_mulai: string | null;
  waktu_selesai: string | null;
  nilai_akhir: string | null;
  breakdown: any[];
}

interface HasilUjianResponse {
  ujian: {
    id: number;
    judul_ujian: string;
    tipe_ujian: string;
    tanggal_ujian: string;
  };
  statistik: Statistik;
  siswa_ujian: SiswaUjianHasil[];
}

// ─── Helper: ambil nama siswa dari string atau object ─────────
const getNamaSiswa = (siswa: SiswaUjianHasil['siswa']): string => {
  if (!siswa) return '-';
  if (typeof siswa === 'string') return siswa;
  return siswa.nama || siswa.email || `Siswa #${siswa.id}` || '-';
};

export default function RekapHistori() {
  const { user } = useAuth();

  const [ujians, setUjians] = useState<Ujian[]>([]);
  const [isLoadingUjian, setIsLoadingUjian] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedUjian, setSelectedUjian] = useState<Ujian | null>(null);
  const [hasilData, setHasilData] = useState<HasilUjianResponse | null>(null);
  const [isLoadingHasil, setIsLoadingHasil] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);

  const [filterTahunAjar, setFilterTahunAjar] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const fetchUjians = async () => {
    try {
      setIsLoadingUjian(true);
      setFetchError(null);
      const res = await api.get('/ujian');
      const raw = res.data?.data;
      const data: Ujian[] = Array.isArray(raw) ? raw : raw?.data ?? [];
      setUjians(data);
    } catch (err: any) {
      setFetchError(err.response?.data?.message || 'Gagal mengambil data ujian');
    } finally {
      setIsLoadingUjian(false);
    }
  };

  // GET /ujian/{ujian}/hasil — {ujian} = ujian.id (bukan siswa_ujian.id)
  const fetchHasilUjian = async (ujianId: number) => {
    try {
      setIsLoadingHasil(true);
      setHasilData(null);

      const res = await api.get(`/ujian/${ujianId}/hasil`);
      const raw = res.data?.data;

      if (!raw || !raw.ujian) {
        throw new Error('Response structure tidak sesuai');
      }

      setHasilData(raw);
    } catch (err: any) {
      console.error('❌ Error detail:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        fullError: err.response?.data,
      });

      const errorMsg =
        err.response?.status === 404
          ? 'Ujian tidak ditemukan'
          : err.response?.status === 401
          ? 'Anda tidak terautentikasi'
          : err.response?.status === 403
          ? 'Anda tidak punya akses ke ujian ini'
          : err.response?.data?.message || 'Gagal mengambil data hasil ujian';

      alert(errorMsg);
    } finally {
      setIsLoadingHasil(false);
    }
  };

  useEffect(() => {
    fetchUjians();
  }, []);

  const handleSelectUjian = (ujian: Ujian) => {
    setSelectedUjian(ujian);
    fetchHasilUjian(ujian.id);
  };

  const handleBack = () => {
    setSelectedUjian(null);
    setHasilData(null);
  };

  // ─── Export PDF & Excel ─────────────────────────────────────
  const buildExportRows = () => {
    const siswaList = hasilData?.siswa_ujian ?? [];
    return siswaList.map((s, idx) => ({
      No: idx + 1,
      'Nama Siswa': getNamaSiswa(s.siswa),
      'Waktu Mulai': s.waktu_mulai ? new Date(s.waktu_mulai).toLocaleString('id-ID') : '-',
      'Waktu Selesai': s.waktu_selesai ? new Date(s.waktu_selesai).toLocaleString('id-ID') : '-',
      Status: s.status,
      'Nilai Akhir': s.nilai_akhir ?? '-',
    }));
  };

  const buildFileName = () => {
    const raw = `Rekap_${selectedUjian?.judul_ujian || 'Ujian'}_${selectedUjian?.kelas || ''}`;
    return raw.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_');
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!selectedUjian || !hasilData) {
      alert('Data hasil ujian belum siap, coba beberapa saat lagi.');
      return;
    }

    const rows = buildExportRows();
    if (rows.length === 0) {
      alert('Belum ada data siswa untuk diekspor.');
      return;
    }

    try {
      setIsExporting(type);
      const fileName = buildFileName();

      if (type === 'excel') {
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 5 },
          { wch: 30 },
          { wch: 20 },
          { wch: 20 },
          { wch: 14 },
          { wch: 12 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else {
        const doc = new jsPDF();

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rekap Nilai: ${selectedUjian.judul_ujian}`, 14, 16);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${selectedUjian.kelas}  •  ${selectedUjian.kode_ujian || '-'}  •  ${selectedUjian.tahun_ajar}`,
          14,
          23
        );

        let statsY = 30;
        if (hasilData.statistik) {
          const st = hasilData.statistik;
          doc.text(
            `Rata-rata: ${st.rata_rata}    Tertinggi: ${st.nilai_tertinggi}    Terendah: ${st.nilai_terendah}    ` +
              `Total Siswa: ${st.total_siswa}    Sudah Dinilai: ${st.sudah_dinilai}    Belum Dinilai: ${st.belum_dinilai}`,
            14,
            statsY
          );
          statsY += 6;
        }

        autoTable(doc, {
          startY: statsY + 4,
          head: [['No', 'Nama Siswa', 'Waktu Mulai', 'Waktu Selesai', 'Status', 'Nilai Akhir']],
          body: rows.map(r => [
            r.No,
            r['Nama Siswa'],
            r['Waktu Mulai'],
            r['Waktu Selesai'],
            r.Status,
            r['Nilai Akhir'],
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        doc.save(`${fileName}.pdf`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal mengekspor data. Silakan coba lagi.');
    } finally {
      setIsExporting(null);
    }
  };

  const tahunAjarOptions = Array.from(new Set(ujians.map(u => u.tahun_ajar))).sort().reverse();

  const filteredUjians = ujians.filter(ujian => {
    const matchTahun = !filterTahunAjar || ujian.tahun_ajar === filterTahunAjar;
    const matchSearch =
      !searchQuery ||
      ujian.judul_ujian.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ujian.kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ujian.kode_ujian || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchTahun && matchSearch;
  });

  // ─── Detail View ──────────────────────────────────────────────
  if (selectedUjian) {
    const statistik = hasilData?.statistik;
    const siswaList = hasilData?.siswa_ujian ?? [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header Detail */}
        <div className="bg-white p-6 rounded border border-exam-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 bg-slate-50 text-slate-400 hover:text-navy hover:bg-slate-100 rounded border border-slate-200 transition-all active:scale-95"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <div>
              <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter flex items-center gap-2">
                <History className="text-light-blue" /> Rekap: {selectedUjian.judul_ujian}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {selectedUjian.kelas} • {selectedUjian.kode_ujian || '-'} • {selectedUjian.tahun_ajar}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isLoadingHasil || isExporting !== null}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={14} /> {isExporting === 'pdf' ? 'Memproses...' : 'PDF'}
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={isLoadingHasil || isExporting !== null}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded text-[10px] font-black uppercase tracking-widest border border-green-100 hover:bg-green-600 hover:text-white transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <TableIcon size={14} /> {isExporting === 'excel' ? 'Memproses...' : 'EXCEL'}
            </button>
          </div>
        </div>

        {isLoadingHasil ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
              Memuat data hasil...
            </p>
          </div>
        ) : (
          <>
            {/* Statistik Cards */}
            {statistik && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Rata-rata', value: statistik.rata_rata, icon: TrendingUp, color: 'text-light-blue', bg: 'bg-blue-50' },
                  { label: 'Tertinggi', value: statistik.nilai_tertinggi, icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Terendah', value: statistik.nilai_terendah, icon: Award, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: 'Total Siswa', value: statistik.total_siswa, icon: Users, color: 'text-navy', bg: 'bg-slate-50' },
                  { label: 'Sudah Dinilai', value: statistik.sudah_dinilai, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Belum Dinilai', value: statistik.belum_dinilai, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded border border-exam-border p-4 shadow-sm">
                    <div className={cn('w-8 h-8 rounded flex items-center justify-center mb-2', s.bg)}>
                      <s.icon size={14} className={s.color} />
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className={cn('text-xl font-black italic tracking-tighter', s.color)}>{s.value ?? '-'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabel Siswa */}
            <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden">
              <div className="p-4 bg-navy flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-light-blue" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Daftar Nilai Siswa</h3>
                </div>
                <span className="text-[9px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded border border-white/5 uppercase">
                  Total: {siswaList.length} Siswa
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-exam-border">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Mulai</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Waktu Selesai</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {siswaList.length > 0 ? (
                      siswaList.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-[11px] font-bold text-navy">
                          <td className="px-6 py-4 uppercase">{getNamaSiswa(s.siswa)}</td>
                          <td className="px-6 py-4 text-slate-400">
                            {s.waktu_mulai ? new Date(s.waktu_mulai).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {s.waktu_selesai ? new Date(s.waktu_selesai).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={cn(
                                'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded',
                                s.status === 'dinilai'
                                  ? 'bg-green-50 text-green-600'
                                  : s.status === 'selesai'
                                  ? 'bg-blue-50 text-light-blue'
                                  : 'bg-amber-50 text-amber-500',
                              )}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={cn(
                                'px-3 py-1 rounded text-xs font-black italic border',
                                Number(s.nilai_akhir) >= 75
                                  ? 'bg-green-50 text-green-600 border-green-100'
                                  : s.nilai_akhir
                                  ? 'bg-red-50 text-red-500 border-red-100'
                                  : 'bg-slate-50 text-slate-400 border-slate-100',
                              )}
                            >
                              {s.nilai_akhir ?? '-'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-20 text-center text-slate-400 italic text-[10px] uppercase tracking-widest opacity-40"
                        >
                          Belum ada siswa yang mengerjakan ujian ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  // ─── List View ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded border border-exam-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-black text-navy uppercase italic tracking-tighter flex items-center gap-2">
              <History className="text-light-blue" /> Rekap Histori Ujian
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Pilih mata ujian untuk melihat detail rekapitulasi nilai
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-100">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Calendar size={10} /> Tahun Ajar
            </label>
            <select
              value={filterTahunAjar}
              onChange={e => setFilterTahunAjar(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-navy outline-none focus:border-light-blue transition"
            >
              <option value="">Semua Tahun</option>
              {tahunAjarOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
              <Search size={10} /> Cari Judul / Kelas / Kode
            </label>
            <div className="relative">
              <input
                placeholder="Searching by Info Ujian..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-navy outline-none focus:border-light-blue transition placeholder:italic"
              />
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden">
        <div className="p-4 bg-navy flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-light-blue" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Daftar Sesi Ujian</h3>
          </div>
          <span className="text-[9px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded border border-white/5 uppercase">
            Total Record: {filteredUjians.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {isLoadingUjian ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">
                Memuat data ujian...
              </p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <p className="text-red-400 text-xs font-black uppercase tracking-widest">{fetchError}</p>
              <button
                onClick={fetchUjians}
                className="px-4 py-2 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2"
              >
                <RefreshCcw size={14} /> Coba Lagi
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-exam-border">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Judul & Kode</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipe Ujian</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Durasi</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUjians.length > 0 ? (
                  filteredUjians.map((ujian, idx) => (
                    <motion.tr
                      key={ujian.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-navy uppercase tracking-tight leading-none mb-1">
                          {ujian.judul_ujian}
                        </p>
                        <p className="text-[10px] font-mono font-bold text-light-blue leading-none tracking-widest">
                          {ujian.kode_ujian || '-'}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">{ujian.tahun_ajar}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 text-navy">
                          <Layers size={12} className="text-slate-300" />
                          <span className="text-xs font-black uppercase">{ujian.kelas}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">{ujian.semester}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {ujian.tipe_ujian}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-navy uppercase">
                          <Clock size={12} className="text-slate-400" />
                          {ujian.durasi_menit} Menit
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => handleSelectUjian(ujian)}
                          className="inline-flex items-center gap-2 px-6 py-2 bg-navy text-white rounded font-black text-[9px] uppercase tracking-widest shadow-lg shadow-navy/20 hover:bg-light-blue transition-all active:scale-95"
                        >
                          <Eye size={12} />
                          Lihat
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <History size={48} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Exams Found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}