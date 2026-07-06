import { useState, useEffect } from 'react';
import { 
  Globe, 
  RefreshCcw, 
  Edit2,
  Check,
  X,
  Settings2,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  PlusCircle,
  Loader2,
  Table2,
  KeyRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../lib/axios';

interface PengaturanItem {
  id: number;
  key: string;
  value: string;
  keterangan: string;
}

interface PerangkatItem {
  id: number;
  nama_pc: string;
  created_at: string;
  updated_at: string;
}

// Key yang dipakai untuk menyimpan id perangkat di localStorage browser ini
const DEVICE_STORAGE_KEY = 'device_id';

type DeviceStatus = 'checking' | 'not_registered' | 'registered' | 'orphaned';
type DeviceCardTab = 'akses' | 'tabel';

const formatDate = (iso?: string) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export default function Konfigurasi() {
  const [settings, setSettings] = useState<PengaturanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PengaturanItem>>({});

  // ==== State untuk tab "Akses" (identitas perangkat browser ini) ====
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('checking');
  const [deviceData, setDeviceData] = useState<PerangkatItem | null>(null);
  const [namaPc, setNamaPc] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeletingDevice, setIsDeletingDevice] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // ==== State untuk card Identitas Perangkat: switch tab Akses / Tabel ====
  const [deviceCardTab, setDeviceCardTab] = useState<DeviceCardTab>('akses');

  // ==== State untuk tab "Tabel" (semua perangkat terdaftar di database) ====
  const [allDevices, setAllDevices] = useState<PerangkatItem[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [devicesFetchError, setDevicesFetchError] = useState<string | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [editDeviceForm, setEditDeviceForm] = useState<Partial<PerangkatItem>>({});
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [deletingDeviceId, setDeletingDeviceId] = useState<number | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await api.get('/pengaturan');
      const raw = res.data?.data;
      setSettings(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      setFetchError(err.response?.data?.message || 'Gagal mengambil konfigurasi');
    } finally {
      setIsLoading(false);
    }
  };

  // Ambil SEMUA perangkat yang terdaftar di database.
  // PENTING: response GET /perangkat itu di-paginate oleh Laravel, jadi bentuknya:
  // { message, data: { current_page, data: [...array device di sini...], total, ... } }
  // Array device nya ada di res.data.data.data, BUKAN res.data.data langsung.
  const fetchAllDevicesList = async (): Promise<PerangkatItem[]> => {
    const res = await api.get('/perangkat', { params: { per_page: 9999 } });
    const list: PerangkatItem[] = Array.isArray(res.data?.data?.data) ? res.data.data.data : [];
    return list;
  };

  // Cek status pendaftaran perangkat browser ini: cocokkan id di localStorage
  // dengan daftar id yang benar-benar ada di database.
  const checkDevice = async () => {
    setDeviceStatus('checking');
    setDeviceError(null);

    const localId = localStorage.getItem(DEVICE_STORAGE_KEY);

    // 1) Kalau di localStorage sama sekali tidak ada id → belum pernah didaftarkan
    if (!localId) {
      setDeviceStatus('not_registered');
      setDeviceData(null);
      return;
    }

    try {
      const list = await fetchAllDevicesList();

      // 2) Boolean check: apakah id di localStorage ADA di dalam daftar device di database?
      const matchedDevice = list.find(d => String(d.id) === String(localId)) ?? null;

      if (matchedDevice) {
        // ID di localStorage DAN di database SAMA → terhubung / tersimpan
        setDeviceData(matchedDevice);
        setDeviceStatus('registered');
      } else {
        // ID ada di localStorage TAPI tidak ada/tidak cocok di database → terputus sepihak
        console.warn('[checkDevice] localId tidak ditemukan di daftar perangkat database:', {
          localId,
          totalDiDatabase: list.length,
        });
        setDeviceData(null);
        setDeviceStatus('orphaned');
      }
    } catch (err: any) {
      console.error('[checkDevice] Gagal fetch /perangkat', {
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
        data: err.response?.data,
      });

      // Error network/500/CORS dsb — JANGAN diasumsikan datanya hilang.
      setDeviceData(null);
      setDeviceStatus('orphaned');
      setDeviceError(
        `Gagal memverifikasi ke server (${err.response?.status || 'network error'}). ` +
        `Cek koneksi/endpoint, bukan berarti data sudah terhapus.`
      );
    }
  };

  // Ambil daftar semua perangkat untuk ditampilkan di tab "Tabel"
  const fetchDevicesTable = async () => {
    try {
      setIsLoadingDevices(true);
      setDevicesFetchError(null);
      const list = await fetchAllDevicesList();
      setAllDevices(list);
    } catch (err: any) {
      console.error('[fetchDevicesTable] Gagal fetch /perangkat', err);
      setDevicesFetchError(err.response?.data?.message || 'Gagal mengambil daftar perangkat');
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    checkDevice();
  }, []);

  // Muat data tabel setiap kali user pindah ke tab "Tabel"
  useEffect(() => {
    if (deviceCardTab === 'tabel') {
      fetchDevicesTable();
    }
  }, [deviceCardTab]);

  const startEdit = (item: PengaturanItem) => {
    setEditingId(item.id);
    setEditForm({ key: item.key, value: item.value, keterangan: item.keterangan });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (item: PengaturanItem) => {
    if (!editForm.value?.trim()) {
      alert('Value tidak boleh kosong');
      return;
    }
    try {
      setIsSaving(true);

      // ← Sesuai backend: kirim semua pengaturan yang ada,
      // update hanya yang sedang diedit, sisanya pakai nilai lama
      const payload = {
        pengaturan: settings.map(s => ({
          key: s.key,
          value: s.id === item.id ? editForm.value!.trim() : s.value,
        }))
      };

      await api.put('/pengaturan', payload);
      setEditingId(null);
      setEditForm({});
      fetchSettings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  // Daftarkan perangkat baru: POST ke /perangkat, lalu simpan id hasil respons ke localStorage
  const registerDevice = async () => {
    if (!namaPc.trim()) {
      alert('Nama PC tidak boleh kosong');
      return;
    }
    try {
      setIsRegistering(true);
      setDeviceError(null);

      const res = await api.post('/perangkat', { nama_pc: namaPc.trim() });
      const data: PerangkatItem | undefined = res.data?.data;

      if (data?.id != null) {
        localStorage.setItem(DEVICE_STORAGE_KEY, String(data.id));
        setDeviceData(data);
        setDeviceStatus('registered');
        setNamaPc('');
      } else {
        setDeviceError('Respons server tidak sesuai, coba lagi');
      }
    } catch (err: any) {
      setDeviceError(err.response?.data?.message || 'Gagal mendaftarkan perangkat');
    } finally {
      setIsRegistering(false);
    }
  };

  // [Tab AKSES] Hapus perangkat browser ini: hapus di database SEKALIGUS hapus id di localStorage
  const deleteDevice = async () => {
    const localId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!localId) return;

    if (!confirm('Hapus pendaftaran perangkat ini? Perangkat perlu didaftarkan ulang untuk bisa mengakses ujian.')) {
      return;
    }

    try {
      setIsDeletingDevice(true);
      setDeviceError(null);

      try {
        // 1) Hapus dari database
        const delRes = await api.delete(`/perangkat/${localId}`);
        console.log('[deleteDevice] Respons DELETE /perangkat/' + localId, delRes.data);
      } catch (err: any) {
        console.error('[deleteDevice] DELETE /perangkat/' + localId + ' gagal', {
          status: err.response?.status,
          message: err.response?.data?.message || err.message,
        });
        // Kalau memang sudah tidak ada di database (404), abaikan saja dan lanjut bersihkan localStorage
        if (err.response?.status !== 404) {
          throw err;
        }
      }

      // 2) Hapus dari localStorage
      localStorage.removeItem(DEVICE_STORAGE_KEY);
      setDeviceData(null);
      setDeviceStatus('not_registered');

      // Sinkronkan tabel juga kalau sedang/pernah dibuka
      fetchDevicesTable();
    } catch (err: any) {
      setDeviceError(err.response?.data?.message || 'Gagal menghapus perangkat');
    } finally {
      setIsDeletingDevice(false);
    }
  };

  // [Tab TABEL] Mulai edit nama_pc langsung di baris tabel
  const startEditDevice = (item: PerangkatItem) => {
    setEditingDeviceId(item.id);
    setEditDeviceForm({ nama_pc: item.nama_pc });
  };

  const cancelEditDevice = () => {
    setEditingDeviceId(null);
    setEditDeviceForm({});
  };

  // [Tab TABEL] Simpan perubahan nama_pc lewat PUT /perangkat/{id}
  const saveEditDevice = async (item: PerangkatItem) => {
    if (!editDeviceForm.nama_pc?.trim()) {
      alert('Nama PC tidak boleh kosong');
      return;
    }
    try {
      setIsSavingDevice(true);
      const res = await api.put(`/perangkat/${item.id}`, { nama_pc: editDeviceForm.nama_pc.trim() });
      const updated: PerangkatItem | undefined = res.data?.data;

      setAllDevices(prev => prev.map(d => (d.id === item.id ? (updated ?? { ...d, nama_pc: editDeviceForm.nama_pc!.trim() }) : d)));

      // Kalau device yang diedit adalah device browser ini juga, sinkronkan tampilan di tab Akses
      const localId = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (localId && String(localId) === String(item.id)) {
        setDeviceData(updated ?? { ...item, nama_pc: editDeviceForm.nama_pc!.trim() });
      }

      setEditingDeviceId(null);
      setEditDeviceForm({});
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan nama PC');
    } finally {
      setIsSavingDevice(false);
    }
  };

  // [Tab TABEL] Hapus perangkat dari DATABASE SAJA (localStorage browser manapun tidak disentuh)
  const deleteDeviceFromTable = async (item: PerangkatItem) => {
    if (!confirm(`Hapus data perangkat "${item.nama_pc}" (ID ${item.id}) dari database? Ini hanya menghapus data di database, bukan sesi lokal perangkat manapun.`)) {
      return;
    }
    try {
      setDeletingDeviceId(item.id);
      const delRes = await api.delete(`/perangkat/${item.id}`);
      console.log('[deleteDeviceFromTable] Respons DELETE /perangkat/' + item.id, delRes.data);

      setAllDevices(prev => prev.filter(d => d.id !== item.id));

      // Kalau yang dihapus ternyata device browser ini sendiri, refresh status Akses
      // (localStorage TIDAK dihapus di sini, sesuai aturan: tabel hanya untuk database)
      const localId = localStorage.getItem(DEVICE_STORAGE_KEY);
      if (localId && String(localId) === String(item.id)) {
        checkDevice();
      }
    } catch (err: any) {
      console.error('[deleteDeviceFromTable] DELETE /perangkat/' + item.id + ' gagal', {
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
      });
      alert(
        err.response?.data?.message ||
        'Gagal menghapus perangkat dari database. Cek console untuk detail — kemungkinan endpoint DELETE di backend bermasalah.'
      );
      // Refresh ulang list biar konsisten dengan database (jaga-jaga row ternyata masih ada / tidak jadi terhapus)
      fetchDevicesTable();
    } finally {
      setDeletingDeviceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Konfigurasi Sistem</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Parameter keamanan & Jaringan infrastruktur</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2">
          <Globe size={14} className="text-light-blue" />
          <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Network Gateway Control</h3>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat konfigurasi...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-red-400 text-xs font-black uppercase tracking-widest">{fetchError}</p>
              <button
                onClick={fetchSettings}
                className="px-4 py-2 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2"
              >
                <RefreshCcw size={12} /> Coba Lagi
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Key</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[30%]">Value</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Keterangan</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-[100px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {settings.length > 0 ? settings.map((item) => (
                  <motion.tr
                    key={item.id}
                    layout
                    className={cn(
                      'transition-colors',
                      editingId === item.id ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'
                    )}
                  >
                    {/* Key — tidak bisa diubah, read-only */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-black text-light-blue">{item.key}</span>
                    </td>

                    {/* Value — bisa diedit */}
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          type="text"
                          placeholder="Contoh: 192.168.1.1"
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded text-xs font-mono font-bold text-navy outline-none focus:ring-2 focus:ring-amber-200"
                          value={editForm.value ?? ''}
                          onChange={e => setEditForm({ ...editForm, value: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(item)}
                          onKeyUp={e => e.key === 'Escape' && cancelEdit()}
                        />
                      ) : (
                        <span className="text-xs font-bold text-navy font-mono">{item.value}</span>
                      )}
                    </td>

                    {/* Keterangan — read-only */}
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400 font-medium italic">{item.keterangan || '-'}</span>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => saveEdit(item)}
                            disabled={isSaving}
                            className="p-1.5 bg-exam-success text-white rounded hover:bg-exam-success/90 transition disabled:opacity-50"
                            title="Simpan (Enter)"
                          >
                            {isSaving
                              ? <RefreshCcw size={13} className="animate-spin" />
                              : <Check size={13} />
                            }
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition"
                            title="Batal (Esc)"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                          title="Edit value"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-25">
                        <Settings2 size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Belum ada konfigurasi</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!isLoading && !fetchError && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Total: <span className="text-navy">{settings.length}</span> konfigurasi
            </p>
            <button
              onClick={fetchSettings}
              className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-navy uppercase tracking-widest transition"
            >
              <RefreshCcw size={10} /> Refresh
            </button>
          </div>
        )}
      </motion.div>

      {/* ==== Card Identitas Perangkat: 2 tab, Akses & Tabel ==== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
      >
        {/* Header + tab switcher */}
        <div className="px-4 pt-4 bg-slate-50/30 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={14} className="text-light-blue" />
            <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Identitas Perangkat</h3>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDeviceCardTab('akses')}
              className={cn(
                'flex items-center gap-1.5 pb-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors',
                deviceCardTab === 'akses'
                  ? 'border-light-blue text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-500'
              )}
            >
              <KeyRound size={12} /> Akses
            </button>
            <button
              onClick={() => setDeviceCardTab('tabel')}
              className={cn(
                'flex items-center gap-1.5 pb-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors',
                deviceCardTab === 'tabel'
                  ? 'border-light-blue text-navy'
                  : 'border-transparent text-slate-400 hover:text-slate-500'
              )}
            >
              <Table2 size={12} /> Tabel
            </button>
          </div>
        </div>

        {/* ===== TAB: AKSES (identitas perangkat browser ini) ===== */}
        {deviceCardTab === 'akses' && (
          <>
            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Sedang mengecek status */}
                {deviceStatus === 'checking' && (
                  <motion.div
                    key="checking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-3 py-10"
                  >
                    <Loader2 size={28} className="text-slate-300 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                      Memeriksa status perangkat...
                    </p>
                  </motion.div>
                )}

                {/* Belum terdaftar sama sekali */}
                {deviceStatus === 'not_registered' && (
                  <motion.div
                    key="not_registered"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 py-6 text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center">
                      <Monitor size={24} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-navy uppercase tracking-widest">Perangkat Belum Terdaftar</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Daftarkan PC ini agar dapat digunakan untuk ujian</p>
                    </div>

                    <div className="w-full max-w-xs flex flex-col gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Nama PC, contoh: LAB1-PC-05"
                        value={namaPc}
                        onChange={e => setNamaPc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && registerDevice()}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-navy outline-none focus:ring-2 focus:ring-light-blue/30 focus:border-light-blue text-center"
                      />
                      <button
                        onClick={registerDevice}
                        disabled={isRegistering}
                        className="w-full px-4 py-2.5 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center justify-center gap-2 hover:bg-navy/90 transition disabled:opacity-50"
                      >
                        {isRegistering
                          ? <RefreshCcw size={13} className="animate-spin" />
                          : <PlusCircle size={13} />
                        }
                        Daftarkan Perangkat
                      </button>
                    </div>

                    {deviceError && (
                      <p className="text-[10px] text-red-400 font-bold">{deviceError}</p>
                    )}
                  </motion.div>
                )}

                {/* Sudah terdaftar dan cocok dengan database */}
                {deviceStatus === 'registered' && deviceData && (
                  <motion.div
                    key="registered"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 py-6 text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-exam-success/10 flex items-center justify-center">
                      <ShieldCheck size={24} className="text-exam-success" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-navy uppercase tracking-widest">Perangkat Sudah Terdaftar</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">{deviceData.nama_pc}</p>
                    </div>

                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Device ID Key</p>
                      <p className="text-sm font-mono font-black text-light-blue">{deviceData.id}</p>
                    </div>

                    <button
                      onClick={deleteDevice}
                      disabled={isDeletingDevice}
                      className="px-4 py-2.5 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded flex items-center justify-center gap-2 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {isDeletingDevice
                        ? <RefreshCcw size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                      Hapus Pendaftaran
                    </button>
                    <p className="text-[9px] text-slate-300 font-bold -mt-2">Menghapus data di database & sesi lokal browser ini</p>

                    {deviceError && (
                      <p className="text-[10px] text-red-400 font-bold">{deviceError}</p>
                    )}
                  </motion.div>
                )}

                {/* Id ada di localStorage tapi tidak ditemukan/cocok di database */}
                {deviceStatus === 'orphaned' && (
                  <motion.div
                    key="orphaned"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 py-6 text-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                      <ShieldAlert size={24} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-navy uppercase tracking-widest">ID Perangkat Tidak Tersimpan</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 max-w-xs">
                        ID perangkat sudah ada di browser ini, tetapi tidak tersimpan atau sudah terhapus dari database
                      </p>
                    </div>

                    <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Device ID Key (Lokal)</p>
                      <p className="text-sm font-mono font-black text-amber-500">
                        {localStorage.getItem(DEVICE_STORAGE_KEY)}
                      </p>
                    </div>

                    <button
                      onClick={deleteDevice}
                      disabled={isDeletingDevice}
                      className="px-4 py-2.5 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded flex items-center justify-center gap-2 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {isDeletingDevice
                        ? <RefreshCcw size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                      Hapus ID Lokal
                    </button>

                    {deviceError && (
                      <p className="text-[10px] text-red-400 font-bold">{deviceError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {deviceStatus !== 'checking' && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-end">
                <button
                  onClick={checkDevice}
                  className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-navy uppercase tracking-widest transition"
                >
                  <RefreshCcw size={10} /> Cek Ulang Status
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== TAB: TABEL (semua perangkat yang terdaftar di database) ===== */}
        {deviceCardTab === 'tabel' && (
          <>
            <div className="overflow-x-auto">
              {isLoadingDevices ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat daftar perangkat...</p>
                </div>
              ) : devicesFetchError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <p className="text-red-400 text-xs font-black uppercase tracking-widest">{devicesFetchError}</p>
                  <button
                    onClick={fetchDevicesTable}
                    className="px-4 py-2 bg-navy text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-2"
                  >
                    <RefreshCcw size={12} /> Coba Lagi
                  </button>
                </div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-left">
                      <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[10%]">ID</th>
                      <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[30%]">Nama PC</th>
                      <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dibuat</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-[100px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allDevices.length > 0 ? allDevices.map((item) => (
                      <motion.tr
                        key={item.id}
                        layout
                        className={cn(
                          'transition-colors',
                          editingDeviceId === item.id ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'
                        )}
                      >
                        <td className="px-6 py-4">
                          <span className="text-xs font-mono font-black text-light-blue">{item.id}</span>
                        </td>

                        <td className="px-4 py-3">
                          {editingDeviceId === item.id ? (
                            <input
                              autoFocus
                              type="text"
                              className="w-full px-3 py-2 bg-white border border-amber-300 rounded text-xs font-mono font-bold text-navy outline-none focus:ring-2 focus:ring-amber-200"
                              value={editDeviceForm.nama_pc ?? ''}
                              onChange={e => setEditDeviceForm({ ...editDeviceForm, nama_pc: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && saveEditDevice(item)}
                              onKeyUp={e => e.key === 'Escape' && cancelEditDevice()}
                            />
                          ) : (
                            <span className="text-xs font-bold text-navy font-mono">{item.nama_pc}</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-400 font-medium italic">{formatDate(item.created_at)}</span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {editingDeviceId === item.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => saveEditDevice(item)}
                                disabled={isSavingDevice}
                                className="p-1.5 bg-exam-success text-white rounded hover:bg-exam-success/90 transition disabled:opacity-50"
                                title="Simpan (Enter)"
                              >
                                {isSavingDevice
                                  ? <RefreshCcw size={13} className="animate-spin" />
                                  : <Check size={13} />
                                }
                              </button>
                              <button
                                onClick={cancelEditDevice}
                                className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition"
                                title="Batal (Esc)"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditDevice(item)}
                                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                                title="Edit nama PC"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => deleteDeviceFromTable(item)}
                                disabled={deletingDeviceId === item.id}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Hapus dari database"
                              >
                                {deletingDeviceId === item.id
                                  ? <RefreshCcw size={14} className="animate-spin" />
                                  : <Trash2 size={14} />
                                }
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-25">
                            <Table2 size={48} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada perangkat terdaftar</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {!isLoadingDevices && !devicesFetchError && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Total: <span className="text-navy">{allDevices.length}</span> perangkat
                </p>
                <button
                  onClick={fetchDevicesTable}
                  className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-navy uppercase tracking-widest transition"
                >
                  <RefreshCcw size={10} /> Refresh
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}