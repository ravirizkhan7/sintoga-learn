import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  HelpCircle,
  Hash,
  BookOpen,
  ChevronLeft,
  Settings,
  Save,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  RefreshCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PilihanJawaban {
  id?: number;
  teks_pilihan: string;
  teks_pasangan: string;
  is_true: boolean;
  persentase_nilai: number;
}

interface PilihanInternal extends PilihanJawaban {
  _id: number;
  _file?: File | null;
}

interface Soal {
  id: number;
  id_ujian: number;
  tipe_soal: string;
  teks_soal: string;
  path_gambar: string | null;
  pilihan_jawaban: PilihanJawaban[];
}

interface PengaturanUjian {
  id: number;
  ujian_id: number;
  bobot_objektif: number;
  bobot_ganda_kompleks: number;
  bobot_menjodohkan: number;
  bobot_isian: number;
  bobot_essay: number;
}

interface UjianInfo {
  id: number;
  judul_ujian: string;
  kode_ujian: string | null;
  kelas: string;
}

interface NewSoalState {
  tipe_soal: string;
  teks_soal: string;
  gambarFile: File | null;
  gambarPreview: string;
  pilihan: PilihanInternal[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makePilihan = (overrides: Partial<PilihanInternal> = {}): PilihanInternal => ({
  _id: Date.now() + Math.random(),
  teks_pilihan: '',
  teks_pasangan: '',
  is_true: false,
  persentase_nilai: 0,
  ...overrides,
});

const getInitialSoalState = (): NewSoalState => ({
  tipe_soal: 'objektif',
  teks_soal: '',
  gambarFile: null,
  gambarPreview: '',
  pilihan: [makePilihan({ is_true: true, persentase_nilai: 100 })],
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function BankSoalGuru() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlExamId = searchParams.get('ujianId');
  const ujianId = urlExamId ? Number(urlExamId) : null;

  const [activeTab, setActiveTab] = useState<'soal' | 'pengaturan'>('soal');
  const [ujianInfo, setUjianInfo] = useState<UjianInfo | null>(null);
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanUjian | null>(null);
  const [isLoadingSoal, setIsLoadingSoal] = useState(true);
  const [isLoadingPengaturan, setIsLoadingPengaturan] = useState(true);
  const [isSavingPengaturan, setIsSavingPengaturan] = useState(false);
  const [isSubmittingSoal, setIsSubmittingSoal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSoalModal, setShowSoalModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newSoal, setNewSoal] = useState<NewSoalState>(getInitialSoalState);

  const [bobotForm, setBobotForm] = useState({
    bobot_objektif: 0,
    bobot_ganda_kompleks: 0,
    bobot_menjodohkan: 0,
    bobot_isian: 0,
    bobot_essay: 0,
  });

  // ─── Data Fetching ─────────────────────────────────────────────

  const fetchSoal = async () => {
    if (!ujianId) return;
    try {
      setIsLoadingSoal(true);
      const res = await api.get(`ujian/${ujianId}/soal`);
      const raw = res.data?.data;
      const data = Array.isArray(raw) ? raw : raw?.data ?? [];
      setSoalList(data);
    } catch (err) {
      console.error('Gagal fetch soal:', err);
    } finally {
      setIsLoadingSoal(false);
    }
  };

  const fetchUjianInfo = async () => {
    if (!ujianId) return;
    try {
      const res = await api.get(`ujian/${ujianId}`);
      setUjianInfo(res.data?.data ?? res.data);
    } catch (err) {
      console.error('Gagal fetch ujian info:', err);
    }
  };

  const fetchPengaturan = async () => {
    if (!ujianId) return;
    try {
      setIsLoadingPengaturan(true);
      const res = await api.get(`ujian/${ujianId}/pengaturan`);
      const data = res.data?.data ?? res.data;
      setPengaturan(data);
      setBobotForm({
        bobot_objektif: data.bobot_objektif ?? 0,
        bobot_ganda_kompleks: data.bobot_ganda_kompleks ?? 0,
        bobot_menjodohkan: data.bobot_menjodohkan ?? 0,
        bobot_isian: data.bobot_isian ?? 0,
        bobot_essay: data.bobot_essay ?? 0,
      });
    } catch (err) {
      console.error('Gagal fetch pengaturan:', err);
    } finally {
      setIsLoadingPengaturan(false);
    }
  };

  useEffect(() => {
    if (!ujianId) {
      navigate('/guru');
      return;
    }
    fetchUjianInfo();
    fetchSoal();
    fetchPengaturan();
  }, [ujianId]);

  useEffect(() => {
    return () => {
      if (newSoal.gambarPreview) URL.revokeObjectURL(newSoal.gambarPreview);
    };
  }, [newSoal.gambarPreview]);

  // ─── Modal Helpers ─────────────────────────────────────────────

  const openModal = () => {
    setNewSoal(getInitialSoalState());
    setShowSoalModal(true);
  };

  const closeModal = () => {
    if (newSoal.gambarPreview) URL.revokeObjectURL(newSoal.gambarPreview);
    setShowSoalModal(false);
    setNewSoal(getInitialSoalState());
  };

  // ─── Pilihan Jawaban Handlers ──────────────────────────────────

  const handleAddOption = () => {
    setNewSoal(prev => ({
      ...prev,
      pilihan: [...prev.pilihan, makePilihan()],
    }));
  };

  const handleRemoveOption = (_id: number) => {
    if (newSoal.pilihan.length <= 1) return;
    setNewSoal(prev => ({
      ...prev,
      pilihan: prev.pilihan.filter(p => p._id !== _id),
    }));
  };

  const handleToggleCorrect = (_id: number) => {
    setNewSoal(prev => {
      if (prev.tipe_soal === 'objektif') {
        return {
          ...prev,
          pilihan: prev.pilihan.map(p => ({
            ...p,
            is_true: p._id === _id,
            persentase_nilai: p._id === _id ? 100 : 0,
          })),
        };
      } else {
        const toggled = prev.pilihan.map(p =>
          p._id === _id ? { ...p, is_true: !p.is_true } : p
        );
        const jumlahBenar = toggled.filter(p => p.is_true).length;
        const perItem = jumlahBenar > 0 ? Math.floor(100 / jumlahBenar) : 0;
        return {
          ...prev,
          pilihan: toggled.map(p => ({
            ...p,
            persentase_nilai: p.is_true ? perItem : 0,
          })),
        };
      }
    });
  };

  const handleUpdateOption = (_id: number, field: keyof PilihanInternal, value: string | number | boolean) => {
    setNewSoal(prev => ({
      ...prev,
      pilihan: prev.pilihan.map(p => p._id === _id ? { ...p, [field]: value } : p),
    }));
  };

  // ─── Gambar Handler ────────────────────────────────────────────

  const handleGambarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newSoal.gambarPreview) URL.revokeObjectURL(newSoal.gambarPreview);
    setNewSoal(prev => ({
      ...prev,
      gambarFile: file,
      gambarPreview: URL.createObjectURL(file),
    }));
  };

  const handleRemoveGambar = () => {
    if (newSoal.gambarPreview) URL.revokeObjectURL(newSoal.gambarPreview);
    setNewSoal(prev => ({ ...prev, gambarFile: null, gambarPreview: '' }));
  };

  // ─── Submit Soal Baru ──────────────────────────────────────────

  const handleSubmitSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ujianId) return;

    try {
      setIsSubmittingSoal(true);

      if (newSoal.gambarFile) {
        const form = new FormData();
        form.append('ujian_id', String(ujianId)); // ← tambah ini
        form.append('teks_soal', newSoal.teks_soal);
        form.append('tipe_soal', newSoal.tipe_soal);
        form.append('gambar', newSoal.gambarFile);

        const pilihanPayload = newSoal.pilihan.map(({ _id, _file, ...rest }) => rest);
        form.append('pilihan_jawaban', JSON.stringify(pilihanPayload));

        await api.post(`ujian/${ujianId}/soal`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        const payload = {
          ujian_id: ujianId, // ← tambah ini
          teks_soal: newSoal.teks_soal,
          tipe_soal: newSoal.tipe_soal,
          path_gambar: null,
          pilihan_jawaban: newSoal.pilihan.map(({ _id, _file, ...rest }) => rest),
        };
        await api.post(`ujian/${ujianId}/soal`, payload);
      }

      closeModal();
      fetchSoal();
      alert('Soal berhasil disimpan');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan soal');
    } finally {
      setIsSubmittingSoal(false);
    }
  };

  // ─── Delete Soal ───────────────────────────────────────────────

  const handleDeleteSoal = async (soalId: number) => {
    if (!ujianId || !window.confirm('Hapus soal ini?')) return;
    try {
      setDeletingId(soalId);
      await api.delete(`ujian/${ujianId}/soal/${soalId}`);
      fetchSoal();
      alert('Soal berhasil dihapus');
    } catch (err: any) {
      console.error('Error delete soal:', err);
      alert(err.response?.data?.message || 'Gagal menghapus soal');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Simpan Pengaturan Bobot ───────────────────────────────────

  const handleSavePengaturan = async () => {
    if (!ujianId) return;
    try {
      setIsSavingPengaturan(true);
      await api.put(`ujian/${ujianId}/pengaturan`, bobotForm);
      fetchPengaturan();
      alert('Konfigurasi bobot berhasil disimpan');
    } catch (err: any) {
      console.error('Error save pengaturan:', err);
      alert(err.response?.data?.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setIsSavingPengaturan(false);
    }
  };

  // ─── Computed ─────────────────────────────────────────────────

  const filteredSoal = soalList.filter(s => {
    const matchesSearch = s.teks_soal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || s.tipe_soal === filterType;
    return matchesSearch && matchesType;
  });

  const totalBobot = Object.values(bobotForm).reduce((a, b) => a + b, 0);

  const getTipeColor = (type: string) => {
    switch (type) {
      case 'objektif': return 'bg-blue-100 text-blue-700';
      case 'ganda_kompleks': return 'bg-purple-100 text-purple-700';
      case 'menjodohkan': return 'bg-orange-100 text-orange-700';
      case 'isian': return 'bg-green-100 text-green-700';
      case 'essay': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getBobotForTipe = (tipe: string) => {
    const map: Record<string, keyof typeof bobotForm> = {
      objektif: 'bobot_objektif',
      ganda_kompleks: 'bobot_ganda_kompleks',
      menjodohkan: 'bobot_menjodohkan',
      isian: 'bobot_isian',
      essay: 'bobot_essay',
    };
    return bobotForm[map[tipe]] ?? 0;
  };

  const showPilihan = !['essay', 'isian'].includes(newSoal.tipe_soal);

  if (!ujianId) return null;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/guru')}
            className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-navy transition mb-2"
          >
            <ChevronLeft size={14} /> Kembali ke Dashboard
          </button>
          <h1 className="text-3xl font-black text-navy uppercase italic tracking-tighter">
            {ujianInfo?.judul_ujian || 'Bank Soal'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Sesi: {ujianInfo?.kode_ujian || '-'} • {ujianInfo?.kelas || '-'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('soal')}
            className={cn(
              'px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all',
              activeTab === 'soal'
                ? 'bg-navy text-white shadow-xl shadow-navy/20'
                : 'bg-white text-slate-500 border border-slate-200',
            )}
          >
            <BookOpen size={18} /> Daftar Soal
          </button>
          <button
            onClick={() => setActiveTab('pengaturan')}
            className={cn(
              'px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all',
              activeTab === 'pengaturan'
                ? 'bg-navy text-white shadow-xl shadow-navy/20'
                : 'bg-white text-slate-500 border border-slate-200',
            )}
          >
            <Settings size={18} /> Pengaturan Bobot
          </button>
        </div>
      </div>

      {/* ─── TAB SOAL ─────────────────────────────────────────── */}
      {activeTab === 'soal' ? (
        <>
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari teks soal..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-transparent focus:border-light-blue transition outline-none text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 flex-1 md:flex-none">
                <Filter className="text-slate-400" size={18} />
                <select
                  className="bg-slate-50 border border-transparent rounded-xl px-4 py-3 text-sm outline-none focus:border-light-blue transition font-bold"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">Semua Tipe</option>
                  <option value="objektif">Objektif</option>
                  <option value="ganda_kompleks">Ganda Kompleks</option>
                  <option value="menjodohkan">Menjodohkan</option>
                  <option value="isian">Isian</option>
                  <option value="essay">Essay</option>
                </select>
              </div>
              <button
                onClick={openModal}
                className="bg-light-blue text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-light-blue/90 transition shadow-lg shadow-light-blue/20"
              >
                <Plus size={18} /> Tambah Soal
              </button>
            </div>
          </div>

          {/* List Soal */}
          {isLoadingSoal ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat soal...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredSoal.map((soal) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={soal.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-light-blue hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', getTipeColor(soal.tipe_soal))}>
                        {soal.tipe_soal.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300 font-mono text-xs font-bold">#{soal.id}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeleteSoal(soal.id)}
                        disabled={deletingId === soal.id}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors disabled:opacity-50"
                      >
                        {deletingId === soal.id
                          ? <RefreshCcw size={18} className="animate-spin" />
                          : <Trash2 size={18} />
                        }
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {soal.path_gambar && (
                      <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img src={soal.path_gambar} alt="Soal" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-bold text-navy mb-4 leading-relaxed line-clamp-2">
                        {soal.teks_soal}
                      </p>
                      <div className="flex flex-wrap items-center gap-6">
                        {soal.pilihan_jawaban?.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-tight">
                            <Layers size={14} className="text-light-blue" />
                            {soal.pilihan_jawaban.length} Pilihan Jawaban
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-tight">
                          <HelpCircle size={14} className="text-slate-300" />
                          Bobot: {getBobotForTipe(soal.tipe_soal)} poin
                        </div>
                        {soal.pilihan_jawaban?.some(p => p.is_true) && (
                          <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold uppercase tracking-tight">
                            <CheckCircle2 size={14} />
                            {soal.pilihan_jawaban.filter(p => p.is_true).map(p => p.teks_pilihan).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12 -z-10 text-navy">
                    <BookOpen size={120} />
                  </div>
                </motion.div>
              ))}

              {filteredSoal.length === 0 && (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                  <Layers size={48} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-xl font-bold text-slate-400">Soal tidak ditemukan</h3>
                  <p className="text-sm text-slate-300">Coba ganti filter atau kata kunci pencarian.</p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* ─── TAB PENGATURAN BOBOT ────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
        >
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-black text-navy uppercase italic tracking-tighter">Konfigurasi Bobot Nilai</h2>
            <p className="text-sm text-slate-400 font-medium">Tentukan bobot poin untuk setiap tipe soal. Total harus 100.</p>
          </div>

          {isLoadingPengaturan ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Memuat konfigurasi...</p>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {([
                  { key: 'bobot_objektif', label: 'Pilihan Ganda (Objektif)' },
                  { key: 'bobot_ganda_kompleks', label: 'Ganda Kompleks' },
                  { key: 'bobot_menjodohkan', label: 'Menjodohkan' },
                  { key: 'bobot_isian', label: 'Isian Singkat' },
                  { key: 'bobot_essay', label: 'Uraian (Essay)' },
                ] as { key: keyof typeof bobotForm; label: string }[]).map((item) => (
                  <div key={item.key} className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Bobot {item.label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-light-blue focus:bg-white transition-all text-xl font-black text-navy"
                        value={bobotForm[item.key] === 0 ? '' : bobotForm[item.key]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value;
                          setBobotForm(prev => ({
                            ...prev,
                            [item.key]: val === '' ? 0 : Math.min(100, parseInt(val, 10) || 0),
                          }));
                        }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 uppercase italic">
                        Poin
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Validasi total bobot */}
              <AnimatePresence>
                {totalBobot !== 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={cn(
                      'flex items-center gap-3 px-5 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest',
                      totalBobot > 100
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-amber-50 border-amber-200 text-amber-600',
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full shrink-0', totalBobot > 100 ? 'bg-red-500' : 'bg-amber-500')} />
                    {totalBobot > 100
                      ? `Total bobot melebihi 100 — saat ini ${totalBobot} poin. Kurangi bobot yang ada.`
                      : `Total bobot kurang dari 100 — saat ini ${totalBobot} poin. Sisa ${100 - totalBobot} poin belum dialokasikan.`
                    }
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                    totalBobot === 100 ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400',
                  )}>
                    <Hash size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-navy uppercase tracking-tight leading-none mb-1">Total Bobot Dasar</p>
                    <p className={cn(
                      'text-[10px] font-bold uppercase tracking-widest',
                      totalBobot === 100 ? 'text-green-600' : 'text-slate-400',
                    )}>
                      {totalBobot} / 100 Poin
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSavePengaturan}
                  disabled={isSavingPengaturan || totalBobot !== 100}
                  className="bg-navy text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-navy/90 transition shadow-2xl shadow-navy/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPengaturan ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSavingPengaturan ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── MODAL TAMBAH SOAL ────────────────────────────────── */}
      <AnimatePresence>
        {showSoalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl border border-exam-border shadow-2xl w-full max-w-2xl relative z-[110] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-navy p-6 border-b-4 border-light-blue shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Entri Soal Baru</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sesuaikan tipe dan kunci jawaban</p>
                </div>
                <button onClick={closeModal} className="p-2 text-white/50 hover:text-white transition">
                  <ChevronLeft className="rotate-90" />
                </button>
              </div>

              <form onSubmit={handleSubmitSoal} className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Tipe Soal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen size={12} /> Tipe Soal
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-light-blue transition text-xs font-bold"
                    value={newSoal.tipe_soal}
                    onChange={(e) => {
                      setNewSoal(prev => ({
                        ...getInitialSoalState(),
                        teks_soal: prev.teks_soal,
                        gambarFile: prev.gambarFile,
                        gambarPreview: prev.gambarPreview,
                        tipe_soal: e.target.value,
                      }));
                    }}
                  >
                    <option value="objektif">Objektif (Pilihan Ganda)</option>
                    <option value="ganda_kompleks">Ganda Kompleks (Banyak Jawaban)</option>
                    <option value="menjodohkan">Menjodohkan (Matching Pairs)</option>
                    <option value="isian">Isian Singkat</option>
                    <option value="essay">Uraian / Essay</option>
                  </select>
                </div>

                {/* Konten Soal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konten Soal</label>
                  <textarea
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-light-blue transition text-sm font-bold min-h-[100px]"
                    placeholder="Masukkan pertanyaan di sini..."
                    value={newSoal.teks_soal}
                    onChange={(e) => setNewSoal(prev => ({ ...prev, teks_soal: e.target.value }))}
                  />
                </div>

                {/* Gambar Opsional */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <ImageIcon size={12} /> Gambar (Opsional)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      id="gambar-upload"
                      className="hidden"
                      onChange={handleGambarChange}
                    />
                    <label
                      htmlFor="gambar-upload"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-pointer hover:border-light-blue transition truncate"
                    >
                      {newSoal.gambarFile ? newSoal.gambarFile.name : 'Klik untuk pilih file gambar...'}
                    </label>
                    {newSoal.gambarFile && (
                      <button
                        type="button"
                        onClick={handleRemoveGambar}
                        className="bg-red-50 text-red-500 px-3 py-3 rounded-xl border border-red-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  {newSoal.gambarPreview && (
                    <img
                      src={newSoal.gambarPreview}
                      alt="Preview"
                      className="mt-2 h-24 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                </div>

                {/* Pilihan Jawaban */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-navy uppercase tracking-widest">
                      {newSoal.tipe_soal === 'menjodohkan' ? 'Manajemen Pasangan & Pengecoh' :
                       newSoal.tipe_soal === 'essay' ? 'Rubrik / Jawaban Sampel' :
                       newSoal.tipe_soal === 'isian' ? 'Kunci Jawaban Singkat' :
                       'Pengaturan Jawaban'}
                    </label>
                    {showPilihan && (
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="text-[10px] font-black text-light-blue uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> Tambah {newSoal.tipe_soal === 'menjodohkan' ? 'Pasangan' : 'Opsi'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 pb-4">
                    {/* Essay */}
                    {newSoal.tipe_soal === 'essay' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <textarea
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue min-h-[80px]"
                          placeholder="Masukkan rubrik penilaian atau kunci uraian..."
                          value={newSoal.pilihan[0]?.teks_pilihan ?? ''}
                          onChange={(e) => handleUpdateOption(newSoal.pilihan[0]._id, 'teks_pilihan', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Isian */}
                    {newSoal.tipe_soal === 'isian' && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <input
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                          placeholder="Masukkan kunci jawaban singkat..."
                          value={newSoal.pilihan[0]?.teks_pilihan ?? ''}
                          onChange={(e) => handleUpdateOption(newSoal.pilihan[0]._id, 'teks_pilihan', e.target.value)}
                        />
                      </div>
                    )}

                    {/* Objektif / Ganda Kompleks / Menjodohkan */}
                    {showPilihan && newSoal.pilihan.map((p, idx) => (
                      <div key={p._id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          {newSoal.tipe_soal !== 'menjodohkan' && (
                            <button
                              type="button"
                              onClick={() => handleToggleCorrect(p._id)}
                              className={cn(
                                'w-8 h-8 rounded-full border flex items-center justify-center transition-all shrink-0',
                                p.is_true
                                  ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-200'
                                  : 'bg-white border-slate-200 text-slate-300 hover:border-green-300',
                              )}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}

                          <div className="flex-1 space-y-3">
                            {newSoal.tipe_soal === 'menjodohkan' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Item {String.fromCharCode(65 + idx)}</p>
                                  <input
                                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                    placeholder="Input item..."
                                    value={p.teks_pilihan}
                                    onChange={(e) => handleUpdateOption(p._id, 'teks_pilihan', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pasangan {String.fromCharCode(65 + idx)}</p>
                                  <input
                                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                    placeholder="Masukkan teks pasangan..."
                                    value={p.teks_pasangan}
                                    onChange={(e) => handleUpdateOption(p._id, 'teks_pasangan', e.target.value)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <input
                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                placeholder={`Teks Pilihan ${String.fromCharCode(65 + idx)}...`}
                                value={p.teks_pilihan}
                                onChange={(e) => handleUpdateOption(p._id, 'teks_pilihan', e.target.value)}
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {newSoal.tipe_soal !== 'menjodohkan' && (
                              <div className="hidden sm:block">
                                <p className="text-[8px] font-black text-slate-300 uppercase italic text-right mb-0.5">Skor %</p>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="w-14 p-1.5 bg-white border border-slate-200 rounded text-[10px] font-black text-center"
                                  value={p.persentase_nilai}
                                  onChange={(e) => handleUpdateOption(p._id, 'persentase_nilai', Number(e.target.value))}
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(p._id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-4 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-slate-200 active:scale-95 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSoal}
                    className="flex-1 py-4 bg-navy text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-navy/20 active:scale-95 transition disabled:opacity-50"
                  >
                    {isSubmittingSoal
                      ? <span className="flex items-center justify-center gap-2"><RefreshCcw size={14} className="animate-spin" /> Menyimpan...</span>
                      : 'Simpan Soal'
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}