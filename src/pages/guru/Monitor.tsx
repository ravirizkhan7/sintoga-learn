import { useState } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  RefreshCcw, 
  CheckCircle2, 
  Clock, 
  Award,
  Filter
} from 'lucide-react';
import { mockUjianSiswa, mockUsers } from '../../lib/mockData';
import { cn } from '../../lib/utils';

export default function MonitorGuru() {
  const [searchTerm, setSearchTerm] = useState('');

  const monitorData = mockUjianSiswa.map(us => {
    const student = mockUsers.find(u => u.id === us.id_siswa);
    return {
      ...us,
      nama_siswa: student?.nama_lengkap || 'Unknown',
      nisn: student?.nisn || '-'
    };
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pengerjaan': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'dikirim': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'dinilai': return 'text-green-600 bg-green-50 border-green-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pengerjaan': return <Clock size={10} />;
      case 'dikirim': return <CheckCircle2 size={10} />;
      case 'dinilai': return <Award size={10} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Monitoring Real-Time</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Pengawasan aktivitas ujian digital</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none border border-exam-border bg-white p-2.5 rounded hover:bg-slate-50 transition shadow-sm">
            <RefreshCcw size={16} className="text-navy" />
          </button>
          <button className="flex-1 md:flex-none bg-exam-success text-white px-6 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-exam-success/90 transition shadow-lg shadow-exam-success/20">
            <Download size={16} />
            Export data
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-exam-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="CARI NAMA / NISN..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded border border-exam-border outline-none focus:border-light-blue transition text-xs font-bold uppercase tracking-widest"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2.5 bg-white border border-exam-border rounded text-[10px] font-black uppercase text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition">
            <Filter size={14} />
            Status: ALL
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entitas Siswa</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Sesi</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Skoring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monitorData.map((data) => (
                <tr key={data.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-navy text-white rounded flex items-center justify-center font-black text-xs">
                        {data.nama_siswa[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-navy truncate max-w-[200px]">{data.nama_siswa}</p>
                        <p className="text-[10px] font-mono font-bold text-light-blue">{data.nisn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                      getStatusColor(data.status)
                    )}>
                      {getStatusIcon(data.status)}
                      {data.status}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">{new Date(data.waktu_mulai).toLocaleTimeString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(data.waktu_mulai).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {data.status === 'dinilai' ? (
                      <span className="text-xl font-black text-navy italic tracking-tighter">{data.nilai_akhir}</span>
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 italic uppercase">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
