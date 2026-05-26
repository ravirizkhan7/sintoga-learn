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

export default function Konfigurasi() {
  const [settings, setSettings] = useState<PengaturanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PengaturanItem>>({});

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

  useEffect(() => {
    fetchSettings();
  }, []);

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
    </div>
  );
}