import { useState, useEffect } from 'react';
import api from '../../../lib/axios';
import {
  BankSoal, PengaturanUjian, DaftarUjian,
  NewSoalState, BobotForm, PilihanInternal
} from '../../../types';

export const makePilihan = (overrides: Partial<PilihanInternal> = {}): PilihanInternal => ({
  _id: Date.now() + Math.random(),
  teks_pilihan: '',
  teks_pasangan: '',
  is_true: false,
  persentase_nilai: 0,
  ...overrides,
});

export const getInitialSoalState = (): NewSoalState => ({
  tipe_soal: 'objektif',
  teks_soal: '',
  gambarFile: null,
  gambarPreview: '',
  gambarHapus: false, 
  pilihan: [makePilihan({ is_true: true, persentase_nilai: 100 })],
});

export const BASE_STORAGE_URL = 'http://web-ujian-production.up.railway.app/storage/';

const soalToFormState = (soal: BankSoal): NewSoalState => ({
  tipe_soal: soal.tipe_soal,
  teks_soal: soal.teks_soal,
  gambarFile: null,
  gambarPreview: soal.path_gambar ? `${BASE_STORAGE_URL}${soal.path_gambar}` : '',
  gambarHapus: false,
  pilihan: (soal.pilihan_jawaban ?? []).map(p => makePilihan({
    teks_pilihan: p.teks_pilihan,
    teks_pasangan: p.teks_pasangan,
    is_true: p.is_true,
    persentase_nilai: p.persentase_nilai,
  })),
});

// ─── Helper: convert File → base64 string ────────────────────
// const fileToBase64 = (file: File): Promise<string> =>
//   new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = () => resolve(reader.result as string);
//     reader.onerror = reject;
//     reader.readAsDataURL(file);
//   });

export function useBankSoal(ujianId: number | null) {
  // ← DIHAPUS: useNavigate dan navigate('/guru')
  // Ini penyebab bug navigasi — saat klik menu lain, BankSoalGuru unmount,
  // ujianId jadi null, useEffect jalan, navigate('/guru') dipanggil → redirect paksa

  const [ujianInfo, setUjianInfo] = useState<DaftarUjian | null>(null);
  const [soalList, setSoalList] = useState<BankSoal[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanUjian | null>(null);
  const [isLoadingSoal, setIsLoadingSoal] = useState(true);
  const [isLoadingPengaturan, setIsLoadingPengaturan] = useState(true);
  const [isSavingPengaturan, setIsSavingPengaturan] = useState(false);
  const [isSubmittingSoal, setIsSubmittingSoal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showSoalModal, setShowSoalModal] = useState(false);
  const [editingSoalId, setEditingSoalId] = useState<number | null>(null);
  const [newSoal, setNewSoal] = useState<NewSoalState>(getInitialSoalState);
  const [bobotForm, setBobotForm] = useState<BobotForm>({
    bobot_objektif: 0,
    bobot_ganda_kompleks: 0,
    bobot_menjodohkan: 0,
    bobot_isian: 0,
    bobot_essay: 0,
  });

  // ─── Fetchers ────────────────────────────────────────────────

  const fetchSoal = async () => {
    if (!ujianId) return;
    try {
      setIsLoadingSoal(true);
      const res = await api.get(`ujian/${ujianId}/soal`);
      const raw = res.data?.data;
      setSoalList(Array.isArray(raw) ? raw : raw?.data ?? []);
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
    if (!ujianId) return; // ← FIX: cukup return, jangan navigate('/guru')
    fetchUjianInfo();
    fetchSoal();
    fetchPengaturan();
  }, [ujianId]);

  // ─── Modal ───────────────────────────────────────────────────

  const openModal = () => {
    setEditingSoalId(null);
    setNewSoal(getInitialSoalState());
    setShowSoalModal(true);
  };

  const openEditModal = (soal: BankSoal) => {
    setEditingSoalId(soal.id);
    setNewSoal(soalToFormState(soal));
    setShowSoalModal(true);
  };

  const closeModal = () => {
    if (newSoal.gambarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(newSoal.gambarPreview);
    }
    setShowSoalModal(false);
    setEditingSoalId(null);
    setNewSoal(getInitialSoalState());
  };

  // ─── Pilihan Handlers ────────────────────────────────────────

  const handleAddOption = () => {
    setNewSoal(prev => ({ ...prev, pilihan: [...prev.pilihan, makePilihan()] }));
  };

  const handleRemoveOption = (_id: number) => {
    if (newSoal.pilihan.length <= 1) return;
    setNewSoal(prev => ({ ...prev, pilihan: prev.pilihan.filter(p => p._id !== _id) }));
  };

  const handleToggleCorrect = (_id: number) => {
    setNewSoal(prev => {
      if (prev.tipe_soal === 'objektif') {
        return {
          ...prev,
          pilihan: prev.pilihan.map(p => ({
            ...p, is_true: p._id === _id, persentase_nilai: p._id === _id ? 100 : 0,
          })),
        };
      }
      const toggled = prev.pilihan.map(p => p._id === _id ? { ...p, is_true: !p.is_true } : p);
      const benar = toggled.filter(p => p.is_true).length;
      const perItem = benar > 0 ? Math.floor(100 / benar) : 0;
      return { ...prev, pilihan: toggled.map(p => ({ ...p, persentase_nilai: p.is_true ? perItem : 0 })) };
    });
  };

  const handleUpdateOption = (_id: number, field: keyof PilihanInternal, value: string | number | boolean) => {
    setNewSoal(prev => ({
      ...prev,
      pilihan: prev.pilihan.map(p => p._id === _id ? { ...p, [field]: value } : p),
    }));
  };

  // ─── Helper: Kompresi gambar pakai canvas ─────────────────────
  const compressImage = (file: File, maxSizeMB = 2): Promise<File> => {
    return new Promise((resolve) => {
      const maxBytes = maxSizeMB * 1024 * 1024;

      // Kalau udah di bawah limit, langsung return
      if (file.size <= maxBytes) {
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Hitung rasio kompresi berdasarkan ukuran file
        const ratio = Math.sqrt(maxBytes / file.size);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        // Coba quality dari 0.9 turun sampai ukuran cukup kecil
        const tryCompress = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }

              if (blob.size <= maxBytes || quality <= 0.1) {
                const compressed = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressed);
              } else {
                tryCompress(Math.max(quality - 0.1, 0.1));
              }
            },
            'image/jpeg',
            quality,
          );
        };

        tryCompress(0.9);
      };

      img.src = url;
    });
  };

  // ─── Gambar Handlers ─────────────────────────────────────────

  const handleGambarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (newSoal.gambarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(newSoal.gambarPreview);
    }

    // Kompresi otomatis kalau > 2 MB
    const compressed = await compressImage(file, 2);

    setNewSoal(prev => ({
      ...prev,
      gambarFile: compressed,
      gambarPreview: URL.createObjectURL(compressed),
    }));
};

  const handleRemoveGambar = () => {
    if (newSoal.gambarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(newSoal.gambarPreview);
    }
    setNewSoal(prev => ({ 
      ...prev, 
      gambarFile: null, 
      gambarPreview: '',
      gambarHapus: true,
    }));
  };

  // ─── Submit (Create / Update) ────────────────────────────────
  const handleSubmitSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ujianId) return;

    try {
      setIsSubmittingSoal(true);

      const pilihanPayload = newSoal.pilihan.map(({ _id, ...rest }) => rest);
      const isEdit = editingSoalId !== null;
      const url = isEdit
        ? `ujian/${ujianId}/soal/${editingSoalId}`
        : `ujian/${ujianId}/soal`;

      const form = new FormData();
      form.append('teks_soal', newSoal.teks_soal);
      form.append('tipe_soal', newSoal.tipe_soal);

      if (newSoal.gambarFile) {
        form.append('path_gambar', newSoal.gambarFile);
      } else if (newSoal.gambarHapus) {
        form.append('path_gambar', '');
      }

      pilihanPayload.forEach((p, i) => {
        form.append(`pilihan_jawaban[${i}][teks_pilihan]`, p.teks_pilihan ?? '');
        form.append(`pilihan_jawaban[${i}][teks_pasangan]`, p.teks_pasangan ?? '');
        form.append(`pilihan_jawaban[${i}][is_true]`, p.is_true ? '1' : '0');
        form.append(`pilihan_jawaban[${i}][persentase_nilai]`, String(p.persentase_nilai));
      });

      if (isEdit) {
        form.append('_method', 'PUT');
      }

      await api.post(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      closeModal();
      fetchSoal();
      alert(isEdit ? 'Soal berhasil diperbarui' : 'Soal berhasil disimpan');
    } catch (err: any) {
      console.error('Error submit soal:', err);
      const errMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join('\n')
        : err.response?.data?.message || `Gagal ${editingSoalId ? 'mengubah' : 'menyimpan'} soal`;
      alert('❌ ' + errMsg);
    } finally {
      setIsSubmittingSoal(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────

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

  // ─── Pengaturan Bobot ────────────────────────────────────────

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

  const totalBobot = Object.values(bobotForm).reduce((a, b) => a + b, 0);

  return {
    ujianInfo, soalList, pengaturan,
    isLoadingSoal, isLoadingPengaturan, isSavingPengaturan, isSubmittingSoal,
    deletingId, showSoalModal, editingSoalId,
    newSoal, setNewSoal, bobotForm, setBobotForm, totalBobot,
    openModal, openEditModal, closeModal,
    handleAddOption, handleRemoveOption, handleToggleCorrect, handleUpdateOption,
    handleGambarChange, handleRemoveGambar,
    handleSubmitSoal, handleDeleteSoal, handleSavePengaturan,
  };
}