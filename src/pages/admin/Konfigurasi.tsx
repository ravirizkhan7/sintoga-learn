import { useState, useEffect } from 'react';
import { 
  Globe, 
  RefreshCcw, 
  Edit2,
  Check,
  X,
  Settings2,
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

// ============================================================
// Komponen Card: Device Registration Status
// ============================================================

interface DeviceRegistrationCardProps {
  className?: string;
}

function DeviceRegistrationCard({ className }: DeviceRegistrationCardProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Deteksi localStorage saat komponen mount
  useEffect(() => {
    const storedId = localStorage.getItem('id_pc_lab');
    setDeviceId(storedId);
    setIsLoading(false);
  }, []);

  const handleRegister = () => {
    const input = prompt('Masukkan nomor PC laboratorium (contoh: LAB-01):');
    
    if (input !== null) {
      const cleanedInput = input.trim().toUpperCase();
      
      if (!cleanedInput) {
        alert('Nomor PC tidak boleh kosong');
        return;
      }

      setIsRegistering(true);

      // ENDPOINT: POST /perangkat
      api.post('/perangkat', { nama_pc: cleanedInput })
        .then((res) => {
          console.log('✅ Device registered:', res.data);
          // Simpan ke localStorage
          localStorage.setItem('id_pc_lab', cleanedInput);
          setDeviceId(cleanedInput);
          alert(`Perangkat berhasil didaftarkan dengan ID: ${cleanedInput}`);
        })
        .catch((err) => {
          console.error('❌ Error registering device:', err);
          alert(err.response?.data?.message || 'Gagal mendaftarkan perangkat');
        })
        .finally(() => {
          setIsRegistering(false);
        });
    }
  };

  const handleReset = () => {
    const confirm = window.confirm(
      `Anda yakin ingin menghapus identitas perangkat (${deviceId})?\n\nTindakan ini tidak dapat dibatalkan.`
    );
    
    if (confirm) {
      localStorage.removeItem('id_pc_lab');
      setDeviceId(null);
      alert('Identitas perangkat telah dihapus. Silahkan daftarkan ulang.');
    }
  };

  if (isLoading) {
    return null;
  }

  const isRegistered = deviceId !== null && deviceId.trim() !== '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded border shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'p-4 border-b flex items-center gap-2',
        isRegistered 
          ? 'bg-green-50/30 border-green-100' 
          : 'bg-red-50/30 border-red-100'
      )}>
        <Globe size={14} className={isRegistered ? 'text-green-600' : 'text-red-600'} />
        <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">
          Status Identitas Perangkat
        </h3>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px] gap-4">
        {isRegistered ? (
          <>
            {/* Status Terdaftar */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-green-100">
                <Check size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-black text-green-600 uppercase tracking-wider">
                  Perangkat Terdaftar ✓
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Komputer ini diizinkan untuk ujian
                </p>
              </div>
              <div className="mt-2 px-4 py-2 bg-green-50 border border-green-200 rounded">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                  ID Perangkat: <span className="font-mono text-sm">{deviceId}</span>
                </p>
              </div>
            </div>

            {/* Tombol Reset */}
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded transition-colors flex items-center gap-2"
            >
              <RefreshCcw size={12} /> Hapus & Reset Perangkat
            </button>
          </>
        ) : (
          <>
            {/* Status Belum Terdaftar */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 rounded-full bg-red-100">
                <X size={24} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-black text-red-600 uppercase tracking-wider">
                  Perangkat Belum Terdaftar
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Komputer ini masih belum didaftarkan untuk ujian
                </p>
              </div>
            </div>

            {/* Tombol Daftar */}
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isRegistering ? (
                <>
                  <RefreshCcw size={12} className="animate-spin" /> Mendaftarkan...
                </>
              ) : (
                <>
                  <Edit2 size={12} /> Daftarkan Perangkat Ini
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/30">
        <p className="text-[9px] text-slate-400 font-medium italic text-center">
          {isRegistered 
            ? '💡 Klik tombol di atas jika ingin mengubah atau menghapus identitas perangkat'
            : '💡 Daftarkan perangkat ini terlebih dahulu sebelum memulai ujian'
          }
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================
// Komponen Utama: Konfigurasi
// ============================================================

export default function Konfigurasi() {
  const [settings, setSettings] = useState<PengaturanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PengaturanItem>>({});

  // ═══════════════════════════════════════════════════════════════════════
  // FETCH: Ambil pengaturan dari backend
  // ENDPOINT: GET /pengaturan
  // ═══════════════════════════════════════════════════════════════════════
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await api.get('/pengaturan');
      const raw = res.data?.data;
      
      console.log('📍 Response dari API /pengaturan:', res.data);
      console.log('📊 Settings Array:', raw);

      if (Array.isArray(raw)) {
        setSettings(raw);
        console.log(`✅ Loaded ${raw.length} settings`);
      } else {
        console.warn('⚠️ Response data bukan array');
        setSettings([]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching settings:', err);
      setFetchError(err.response?.data?.message || 'Gagal mengambil konfigurasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // EDIT: Mulai edit field
  // ═══════════════════════════════════════════════════════════════════════
  const startEdit = (item: PengaturanItem) => {
    setEditingId(item.id);
    setEditForm({ key: item.key, value: item.value, keterangan: item.keterangan });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SAVE: Simpan perubahan field
  // ENDPOINT: PUT /pengaturan
  // Request Format:
  // {
  //   "pengaturan": [
  //     { "key": "latitude", "value": "-6.2088" },
  //     { "key": "longitude", "value": "106.8456" }
  //   ]
  // }
  // ═══════════════════════════════════════════════════════════════════════
  const saveEdit = async (item: PengaturanItem) => {
    const trimmedValue = editForm.value?.trim();
    
    if (!trimmedValue) {
      alert('Value tidak boleh kosong');
      return;
    }

    try {
      setIsSaving(true);

      // Kirim semua pengaturan, update hanya yang sedang diedit
      const payload = {
        pengaturan: settings.map(s => ({
          key: s.key,
          value: s.id === item.id ? trimmedValue : s.value,
        }))
      };

      console.log('📤 Sending payload:', payload);

      const response = await api.put('/pengaturan', payload);
      
      console.log('✅ Response dari PUT:', response.data);

      setEditingId(null);
      setEditForm({});
      
      // Re-fetch untuk pastikan UI konsisten
      await fetchSettings();
      alert('Pengaturan berhasil disimpan');
    } catch (err: any) {
      console.error('❌ Error saving settings:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-navy uppercase italic tracking-tighter">Konfigurasi Sistem</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Parameter keamanan & Jaringan infrastruktur</p>
      </motion.div>

      {/* ========== SECTION 1: KONFIGURASI PENGATURAN ========== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded border border-exam-border shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex items-center gap-2">
          <Globe size={14} className="text-light-blue" />
          <h3 className="text-[10px] font-black text-navy uppercase tracking-widest">Konfigurasi Sistem (Latitude, Longitude, & Lainnya)</h3>
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
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Key</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Value</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-[35%]">Keterangan</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-[20%]">Aksi</th>
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
                    {/* Key — read-only */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-black text-light-blue uppercase">{item.key}</span>
                    </td>

                    {/* Value — editable */}
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          type="text"
                          placeholder="Masukkan value baru"
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
                      <span className="text-xs text-slate-500 font-medium">{item.keterangan || '-'}</span>
                    </td>

                    {/* Aksi */}
                    <td className="px-6 py-4 text-right">
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

      {/* ========== SECTION 2: STATUS IDENTITAS PERANGKAT ========== */}
      <DeviceRegistrationCard />
    </div>
  );
}