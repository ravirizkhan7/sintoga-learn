import React, { useState } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { LogIn, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const success = await login(email, password); 
      
      if (success) {
        setError('Login berhasil! Mengarahkan...'); 
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      if (err.response) {
        const message = err.response.data.message || 'Email atau password salah';
        setError(message);
      } else if (err.request) {
        setError('Gagal terhubung ke server. Cek koneksi lu, Bro!');
      } else {
        setError('Terjadi kesalahan sistem');
      }
      console.error('Login Error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden border-b-8 border-light-blue"
      >
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-navy text-white rounded flex items-center justify-center mb-4 transition-transform hover:rotate-3 shadow-lg shadow-navy/20">
              <GraduationCap size={40} />
            </div>
            <h1 className="text-3xl font-black text-navy italic tracking-tighter uppercase">Sintoga Learn</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2">Pusat Ujian Digital Terpadu</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue focus:bg-white transition text-sm font-bold"
                placeholder="CONTOH@GMAIL.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded outline-none focus:border-light-blue focus:bg-white transition text-sm font-bold"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-600 text-[10px] font-black uppercase italic animate-pulse">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-navy hover:bg-navy/90 text-white font-black py-4 rounded flex items-center justify-center gap-3 transition shadow-xl shadow-navy/20 uppercase text-xs tracking-[0.2em]"
            >
              <LogIn size={18} />
              Akses Sistem
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
