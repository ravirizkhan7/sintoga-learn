import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Layers, 
  HelpCircle,
  Hash,
  BookOpen,
  ChevronLeft,
  Settings,
  Save,
  Trash2,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { mockBankSoal, mockPilihanJawaban, mockDaftarUjian, mockPengaturanUjianData } from '../../lib/mockData';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BankSoal, PilihanJawaban, PengaturanUjian } from '../../types';

import { useNavigate, useSearchParams } from 'react-router-dom';

export default function BankSoalGuru() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlExamId = searchParams.get('ujianId');
  
  const [activeTab, setActiveTab] = useState<'soal' | 'pengaturan'>('soal');
  const [selectedExamId, setSelectedExamId] = useState<number>(urlExamId ? Number(urlExamId) : 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSoalModal, setShowSoalModal] = useState(false);

  // Sync with URL params if they change
  React.useEffect(() => {
    if (urlExamId) {
      setSelectedExamId(Number(urlExamId));
    }
  }, [urlExamId]);

  // New Question State
  const [newSoal, setNewSoal] = useState({
    id_ujian: selectedExamId,
    tipe_soal: 'objektif' as any,
    teks_soal: '',
    jalur_gambar: '',
    pilihan: [
      { id: Date.now(), teks_pilihan: '', teks_pasangan: '', is_benar: true, persentase_nilai: 100 }
    ]
  });

  // Sync id_ujian when selectedExamId changes
  React.useEffect(() => {
    setNewSoal(prev => ({ ...prev, id_ujian: selectedExamId }));
  }, [selectedExamId]);

  const handleAddOption = () => {
    setNewSoal(prev => ({
      ...prev,
      pilihan: [...prev.pilihan, { id: Date.now(), teks_pilihan: '', teks_pasangan: '', is_benar: false, persentase_nilai: 0 }]
    }));
  };

  const handleRemoveOption = (id: number) => {
    if (newSoal.pilihan.length <= 1) return;
    setNewSoal(prev => ({
      ...prev,
      pilihan: prev.pilihan.filter(p => p.id !== id)
    }));
  };

  const handleToggleCorrect = (id: number) => {
    setNewSoal(prev => {
      if (prev.tipe_soal === 'objektif') {
        // Only one correct for objective
        return {
          ...prev,
          pilihan: prev.pilihan.map(p => ({ ...p, is_benar: p.id === id, persentase_nilai: p.id === id ? 100 : 0 }))
        };
      } else {
        // Multiple can be correct for other types
        return {
          ...prev,
          pilihan: prev.pilihan.map(p => p.id === id ? { ...p, is_benar: !p.is_benar, persentase_nilai: !p.is_benar ? 100 : 0 } : p)
        };
      }
    });
  };

  const handleUpdateOption = (id: number, field: string, value: any) => {
    setNewSoal(prev => ({
      ...prev,
      pilihan: prev.pilihan.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleUpdateOptionText = (id: number, text: string) => {
    handleUpdateOption(id, 'teks_pilihan', text);
  };
  
  // State for weights
  const [weights, setWeights] = useState<PengaturanUjian>(
    mockPengaturanUjianData.find(p => p.id_ujian === selectedExamId) || {
      id: 0,
      id_ujian: selectedExamId,
      bobot_objektif: 0,
      bobot_ganda_kompleks: 0,
      bobot_menjodohkan: 0,
      bobot_isian: 0,
      bobot_essay: 0
    }
  );

  // Sync weights when selectedExamId changes
  React.useEffect(() => {
    const newWeights = mockPengaturanUjianData.find(p => p.id_ujian === selectedExamId);
    if (newWeights) {
      setWeights(newWeights);
    } else {
      setWeights({
        id: 0,
        id_ujian: selectedExamId,
        bobot_objektif: 0,
        bobot_ganda_kompleks: 0,
        bobot_menjodohkan: 0,
        bobot_isian: 0,
        bobot_essay: 0
      });
    }
  }, [selectedExamId]);

  const filteredSoal = mockBankSoal.filter(s => {
    const matchesExam = s.id_ujian === selectedExamId;
    const matchesSearch = s.teks_soal.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || s.tipe_soal === filterType;
    return matchesExam && matchesSearch && matchesType;
  });

  const getTipeColor = (type: string) => {
    switch(type) {
      case 'objektif': return 'bg-blue-100 text-blue-700';
      case 'ganda_kompleks': return 'bg-purple-100 text-purple-700';
      case 'menjodohkan': return 'bg-orange-100 text-orange-700';
      case 'isian': return 'bg-green-100 text-green-700';
      case 'essay': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const selectedExam = mockDaftarUjian.find(e => e.id === selectedExamId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/guru')}
            className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-navy transition mb-2"
          >
            <ChevronLeft size={14} /> Kembali ke Dashboard
          </button>
          <h1 className="text-3xl font-black text-navy uppercase italic tracking-tighter">
            {selectedExam?.judul_ujian || 'Bank Soal'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">Sesi: {selectedExam?.kode_ujian} • {selectedExam?.kelas}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('soal')}
            className={cn(
              "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
              activeTab === 'soal' ? "bg-navy text-white shadow-xl shadow-navy/20" : "bg-white text-slate-500 border border-slate-200"
            )}
          >
            <BookOpen size={18} /> Daftar Soal
          </button>
          <button 
            onClick={() => setActiveTab('pengaturan')}
            className={cn(
              "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
              activeTab === 'pengaturan' ? "bg-navy text-white shadow-xl shadow-navy/20" : "bg-white text-slate-500 border border-slate-200"
            )}
          >
            <Settings size={18} /> Pengaturan Bobot
          </button>
        </div>
      </div>

      {activeTab === 'soal' ? (
        <>
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
                onClick={() => setShowSoalModal(true)}
                className="bg-light-blue text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-light-blue/90 transition shadow-lg shadow-light-blue/20"
              >
                <Plus size={18} /> Tambah Soal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredSoal.map((soal) => {
              const pilihan = mockPilihanJawaban.filter(p => p.id_soal === soal.id);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={soal.id} 
                  className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-light-blue hover:shadow-xl hover:shadow-slate-100 transition-all group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        getTipeColor(soal.tipe_soal)
                      )}>
                        {soal.tipe_soal.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300 font-mono text-xs font-bold">#{soal.id}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-light-blue rounded-full transition-colors">
                        <Settings size={18} />
                      </button>
                      <button className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {soal.jalur_gambar && (
                      <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img src={soal.jalur_gambar} alt="Soal" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-bold text-navy mb-4 leading-relaxed line-clamp-2">
                        {soal.teks_soal}
                      </p>

                      <div className="flex flex-wrap items-center gap-6">
                        {pilihan.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-tight">
                            <Layers size={14} className="text-light-blue" />
                            {pilihan.length} Pilihan Jawaban
                          </div>
                        )}
                        {soal.tipe_soal === 'menjodohkan' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-tight">
                            <Hash size={14} className="text-orange-500" />
                            {pilihan.length} Pasangan
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-tight">
                          <HelpCircle size={14} className="text-slate-300" />
                          Bobot Terapan: {weights[`bobot_${soal.tipe_soal}` as keyof PengaturanUjian] || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -right-4 opacity-[0.03] rotate-12 -z-10 text-navy">
                    <BookOpen size={120} />
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {filteredSoal.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Layers size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400">Soal tidak ditemukan</h3>
              <p className="text-sm text-slate-300">Coba ganti filter atau kata kunci pencarian kamu.</p>
            </div>
          )}
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
        >
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xl font-black text-navy uppercase italic tracking-tighter">Konfigurasi Bobot Nilai</h2>
            <p className="text-sm text-slate-400 font-medium">Tentukan bobot poin untuk setiap tipe soal dalam ujian ini.</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { key: 'bobot_objektif', label: 'Pilihan Ganda (Objektif)', color: 'blue' },
                { key: 'bobot_ganda_kompleks', label: 'Ganda Kompleks', color: 'purple' },
                { key: 'bobot_menjodohkan', label: 'Menjodohkan', color: 'orange' },
                { key: 'bobot_isian', label: 'Isian Singkat', color: 'green' },
                { key: 'bobot_essay', label: 'Uraian (Essay)', color: 'red' },
              ].map((item) => (
                <div key={item.key} className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Bobot {item.label}
                  </label>
                  <div className="relative group">
                    <input 
                      type="number"
                      className="w-full pl-6 pr-14 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-light-blue focus:bg-white transition-all text-xl font-black text-navy"
                      value={weights[item.key as keyof PengaturanUjian]}
                      onChange={(e) => setWeights({...weights, [item.key]: Number(e.target.value)})}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 uppercase italic">
                      Poin
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-none">
                    *Diakumulasikan per butir soal
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Hash size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-navy uppercase tracking-tight leading-none mb-1">Total Bobot Dasar</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {weights.bobot_objektif + weights.bobot_ganda_kompleks + weights.bobot_menjodohkan + weights.bobot_isian + weights.bobot_essay} Poin Terdaftar
                  </p>
                </div>
              </div>
              <button className="bg-navy text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-navy/90 transition shadow-2xl shadow-navy/20 active:scale-95">
                <Save size={18} /> Simpan Konfigurasi
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Soal Management Modal */}
      <AnimatePresence>
        {showSoalModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSoalModal(false)}
              className="absolute inset-0 bg-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl border border-exam-border shadow-2xl w-full max-w-2xl relative z-[110] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-navy p-6 border-b-4 border-light-blue shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Entri Soal Baru</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sesuaikan tipe dan kunci jawaban</p>
                </div>
                <button 
                  onClick={() => setShowSoalModal(false)}
                  className="p-2 text-white/50 hover:text-white transition"
                >
                  <ChevronLeft className="rotate-90" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen size={12} /> Tipe Soal
                    </label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-light-blue transition text-xs font-bold"
                      value={newSoal.tipe_soal}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        // Reset defaults when type changes
                        setNewSoal({ 
                          ...newSoal, 
                          tipe_soal: newType,
                          pilihan: newType === 'essay' ? 
                            [{ id: Date.now(), teks_pilihan: '', teks_pasangan: '', is_benar: true, persentase_nilai: 100 }] : 
                            newSoal.pilihan 
                        });
                      }}
                    >
                      <option value="objektif">Objektif (Pilihan Ganda)</option>
                      <option value="ganda_kompleks">Ganda Kompleks (Banyak Jawaban)</option>
                      <option value="menjodohkan">Menjodohkan (Matching Pairs)</option>
                      <option value="isian">Isian Singkat</option>
                      <option value="essay">Uraian / Essay</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Konten Soal</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-light-blue transition text-sm font-bold min-h-[100px]"
                      placeholder="Masukkan pertanyaan di sini..."
                      value={newSoal.teks_soal}
                      onChange={(e) => setNewSoal({...newSoal, teks_soal: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon size={12} /> Jalur Gambar
                    </label>
                    <div className="flex gap-2">
                       <input 
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="image-upload"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewSoal({...newSoal, jalur_gambar: `/uploads/${file.name}`});
                          }
                        }}
                      />
                      <label 
                        htmlFor="image-upload"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-pointer hover:border-light-blue transition truncate"
                      >
                        {newSoal.jalur_gambar || 'Klik untuk pilih file gambar...'}
                      </label>
                      {newSoal.jalur_gambar && (
                        <button 
                          onClick={() => setNewSoal({...newSoal, jalur_gambar: ''})}
                          className="bg-red-50 text-red-500 px-3 rounded-xl border border-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-navy uppercase tracking-widest">
                        {newSoal.tipe_soal === 'menjodohkan' ? 'Manajemen Pasangan & Pengecoh' : 
                         newSoal.tipe_soal === 'essay' ? 'Rubrik / Jawaban Sampel' : 
                         newSoal.tipe_soal === 'isian' ? 'Kunci Jawaban Singkat' :
                         'Pengaturan Jawaban'}
                      </label>
                      {newSoal.tipe_soal === 'menjodohkan' && (
                        <p className="text-[8px] text-slate-400 font-bold uppercase italic">
                          *Kosongkan "Item" untuk membuat pasangan pengecoh (distractor)
                        </p>
                      )}
                    </div>
                    {newSoal.tipe_soal !== 'essay' && newSoal.tipe_soal !== 'isian' && (
                      <button 
                        onClick={handleAddOption}
                        className="text-[10px] font-black text-light-blue uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> Tambah {newSoal.tipe_soal === 'menjodohkan' ? 'Pasangan' : 'Opsi'}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3 pb-4">
                    {newSoal.pilihan.map((p, idx) => (
                      <div key={p.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                        <div className="flex items-center gap-3">
                          {newSoal.tipe_soal !== 'menjodohkan' && newSoal.tipe_soal !== 'essay' && newSoal.tipe_soal !== 'isian' && (
                            <button 
                              onClick={() => handleToggleCorrect(p.id)}
                              className={cn(
                                "w-8 h-8 rounded-full border flex items-center justify-center transition-all shrink-0",
                                p.is_benar ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200" : "bg-white border-slate-200 text-slate-300 hover:border-green-300"
                              )}
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          
                          <div className="flex-1 space-y-3">
                            {newSoal.tipe_soal === 'menjodohkan' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Item {String.fromCharCode(65 + idx)}</p>
                                    {!p.teks_pilihan && (
                                      <span className="text-[7px] bg-red-100 text-red-600 px-1 font-black rounded uppercase tracking-tighter">Pengecoh</span>
                                    )}
                                  </div>
                                  <input 
                                    className={cn(
                                      "w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue transition-all",
                                      !p.teks_pilihan && "bg-red-50/50 border-red-100"
                                    )}
                                    placeholder="Input item... (kosong jika pengecoh)"
                                    value={p.teks_pilihan}
                                    onChange={(e) => handleUpdateOptionText(p.id, e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pasangan {String.fromCharCode(65 + idx)}</p>
                                  <input 
                                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                    placeholder="Masukkan teks pasangan..."
                                    value={p.teks_pasangan || ''}
                                    onChange={(e) => handleUpdateOption(p.id, 'teks_pasangan', e.target.value)}
                                  />
                                </div>
                              </div>
                            ) : newSoal.tipe_soal === 'essay' ? (
                              <textarea 
                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue min-h-[80px]"
                                placeholder="Masukkan rubrik penilaian atau kunci uraian..."
                                value={p.teks_pilihan}
                                onChange={(e) => handleUpdateOptionText(p.id, e.target.value)}
                              />
                            ) : (
                              <input 
                                className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-navy outline-none focus:border-light-blue"
                                placeholder={newSoal.tipe_soal === 'isian' ? 'Masukkan kunci jawaban singkat...' : `Teks Pilihan ${String.fromCharCode(65 + idx)}...`}
                                value={p.teks_pilihan}
                                onChange={(e) => handleUpdateOptionText(p.id, e.target.value)}
                              />
                            )}
                          </div>

                          {newSoal.tipe_soal !== 'essay' && newSoal.tipe_soal !== 'isian' && (
                            <div className="flex items-center gap-2">
                              <div className="hidden sm:block">
                                <p className="text-[8px] font-black text-slate-300 uppercase italic text-right mb-0.5">Skor %</p>
                                <input 
                                  type="number" 
                                  className="w-12 p-1.5 bg-white border border-slate-200 rounded text-[10px] font-black text-center"
                                  value={p.persentase_nilai}
                                  onChange={(e) => handleUpdateOption(p.id, 'persentase_nilai', Number(e.target.value))}
                                />
                              </div>
                              <button 
                                onClick={() => handleRemoveOption(p.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                <button 
                  onClick={() => setShowSoalModal(false)}
                  className="flex-1 py-4 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-slate-200 active:scale-95 transition"
                >
                  Batal
                </button>
                <button 
                  className="flex-1 py-4 bg-navy text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-navy/20 active:scale-95 transition"
                >
                  Simpan Soal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
