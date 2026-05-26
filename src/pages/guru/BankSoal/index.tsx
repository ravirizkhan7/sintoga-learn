import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Settings, ChevronLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useBankSoal, getInitialSoalState } from './useBankSoal';
import SoalList from './SoalList';
import SoalModal from './SoalModal';
import PengaturanBobot from './PengaturanBobot';

export default function BankSoalGuru() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ujianId = searchParams.get('ujianId') ? Number(searchParams.get('ujianId')) : null;
  const [activeTab, setActiveTab] = useState<'soal' | 'pengaturan'>('soal');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const hook = useBankSoal(ujianId);

  if (!ujianId) return null;

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
            {hook.ujianInfo?.judul_ujian || 'Bank Soal'}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Sesi: {hook.ujianInfo?.kode_ujian || '-'} • {hook.ujianInfo?.kelas || '-'}
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

      {/* Tab Content */}
      {activeTab === 'soal' ? (
        <SoalList
          soalList={hook.soalList}
          isLoadingSoal={hook.isLoadingSoal}
          deletingId={hook.deletingId}
          searchTerm={searchTerm}
          filterType={filterType}
          bobotForm={hook.bobotForm}
          onSearchChange={setSearchTerm}
          onFilterChange={setFilterType}
          onDelete={hook.handleDeleteSoal}
          onEdit={hook.openEditModal}
          onOpenModal={hook.openModal}
        />
      ) : (
        <PengaturanBobot
          bobotForm={hook.bobotForm}
          setBobotForm={hook.setBobotForm}
          totalBobot={hook.totalBobot}
          isLoadingPengaturan={hook.isLoadingPengaturan}
          isSavingPengaturan={hook.isSavingPengaturan}
          onSave={hook.handleSavePengaturan}
        />
      )}

      {/* Modal — render di luar tab supaya selalu mounted */}
      <SoalModal
        showSoalModal={hook.showSoalModal}
        editingSoalId={hook.editingSoalId}
        newSoal={hook.newSoal}
        setNewSoal={hook.setNewSoal}
        isSubmittingSoal={hook.isSubmittingSoal}
        getInitialSoalState={getInitialSoalState}
        onClose={hook.closeModal}
        onSubmit={hook.handleSubmitSoal}
        onAddOption={hook.handleAddOption}
        onRemoveOption={hook.handleRemoveOption}
        onToggleCorrect={hook.handleToggleCorrect}
        onUpdateOption={hook.handleUpdateOption}
        onGambarChange={hook.handleGambarChange}
        onRemoveGambar={hook.handleRemoveGambar}
      />
    </div>
  );
}