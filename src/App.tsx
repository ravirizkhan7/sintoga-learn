/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Role } from './types';
import Login from './pages/Login';
import DashboardSiswa from './pages/siswa/Dashboard';
import RuangUjian from './pages/siswa/RuangUjian';
import HistoriSiswa from './pages/siswa/Histori';
import DashboardGuru from './pages/guru/Dashboard';
import BankSoalGuru from './pages/guru/BankSoal/index';
import MonitorGuru from './pages/guru/Monitor';
import PenilaianManualGuru from './pages/guru/PenilaianManual';
import RekapHistoriGuru from './pages/guru/RekapHistori';
import DashboardAdmin from './pages/admin/Dashboard';
import KelolaUser from './pages/admin/KelolaUser';
import KelolaJurusan from './pages/admin/KelolaJurusan';
import KonfigurasiAdmin from './pages/admin/Konfigurasi';
import SidebarLayout from './components/SidebarLayout';
import { GlobalStateProvider } from './context/GlobalStateContext';
import api from './lib/axios';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Helper: normalize raw user dari backend supaya field 'nama' selalu ada
const normalizeUser = (raw: any): User | null => {
  if (!raw) return null;
  return {
    ...raw,
    nama: raw.nama ?? raw.nama_lengkap ?? raw.name ?? 'Unknown',
  };
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser || savedUser === 'undefined' || savedUser === 'null') return null;
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        const raw = data.data.user ?? data.data ?? data.user ?? null;
        const userData = normalizeUser(raw);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });

    const token = data.data.token ?? data.token;
    const raw = data.data.user ?? data.data ?? data.user;
    const userData = normalizeUser(raw);

    if (!token || !userData) {
      throw new Error('Response login tidak valid, cek struktur API backend');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading...</p>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={user.role === 'superadmin' ? '/admin' : `/${user.role}`} replace />;
    }

    return <SidebarLayout>{children}</SidebarLayout>;
  };

  const ADMIN: Role[] = ['admin', 'superadmin'];

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      <GlobalStateProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Siswa Routes */}
            <Route path="/siswa" element={<ProtectedRoute allowedRoles={['siswa']}><DashboardSiswa /></ProtectedRoute>} />
            <Route path="/siswa/histori" element={<ProtectedRoute allowedRoles={['siswa']}><HistoriSiswa /></ProtectedRoute>} />
            <Route path="/siswa/ujian/:id" element={<ProtectedRoute allowedRoles={['siswa']}><RuangUjian /></ProtectedRoute>} />

            {/* Guru Routes */}
            <Route path="/guru" element={<ProtectedRoute allowedRoles={['guru']}><DashboardGuru /></ProtectedRoute>} />
            <Route path="/guru/bank-soal" element={<ProtectedRoute allowedRoles={['guru']}><BankSoalGuru /></ProtectedRoute>} />
            <Route path="/guru/monitor" element={<ProtectedRoute allowedRoles={['guru']}><MonitorGuru /></ProtectedRoute>} />
            <Route path="/guru/penilaian" element={<ProtectedRoute allowedRoles={['guru']}><PenilaianManualGuru /></ProtectedRoute>} />
            <Route path="/guru/rekap" element={<ProtectedRoute allowedRoles={['guru']}><RekapHistoriGuru /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={ADMIN}><DashboardAdmin /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={ADMIN}><KelolaUser /></ProtectedRoute>} />
            <Route path="/admin/jurusan" element={<ProtectedRoute allowedRoles={ADMIN}><KelolaJurusan /></ProtectedRoute>} />
            <Route path="/admin/rekap" element={<ProtectedRoute allowedRoles={ADMIN}><RekapHistoriGuru /></ProtectedRoute>} />
            <Route path="/admin/konfigurasi" element={<ProtectedRoute allowedRoles={ADMIN}><KonfigurasiAdmin /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to={user ? (user.role === 'superadmin' ? '/admin' : `/${user.role}`) : "/login"} replace />} />
          </Routes>
        </BrowserRouter>
      </GlobalStateProvider>
    </AuthContext.Provider>
  );
}