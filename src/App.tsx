/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Role } from './types';
import { mockUsers } from './lib/mockData';
import Login from './pages/Login';
import DashboardSiswa from './pages/siswa/Dashboard';
import RuangUjian from './pages/siswa/RuangUjian';
import HistoriSiswa from './pages/siswa/Histori';
import DashboardGuru from './pages/guru/Dashboard';
import BankSoalGuru from './pages/guru/BankSoal';
import MonitorGuru from './pages/guru/Monitor';
import PenilaianManualGuru from './pages/guru/PenilaianManual';
import RekapHistoriGuru from './pages/guru/RekapHistori';
import DashboardAdmin from './pages/admin/Dashboard';
import KelolaUser from './pages/admin/KelolaUser';
import KelolaSiswa from './pages/admin/KelolaSiswa';
import KelolaJurusan from './pages/admin/KelolaJurusan';
import KonfigurasiAdmin from './pages/admin/Konfigurasi';
import SidebarLayout from './components/SidebarLayout';
import { GlobalStateProvider } from './context/GlobalStateContext';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, pass: string) => {
    // Dummy check based on provided logic
    const foundUser = mockUsers.find(u => u.email === email);
    if (!foundUser) return false;

    // Check pass
    const expectedPass = foundUser.role + '1234';
    if (pass === expectedPass) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    return <SidebarLayout>{children}</SidebarLayout>;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardAdmin /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><KelolaUser /></ProtectedRoute>} />
            <Route path="/admin/siswa" element={<ProtectedRoute allowedRoles={['admin']}><KelolaSiswa /></ProtectedRoute>} />
            <Route path="/admin/jurusan" element={<ProtectedRoute allowedRoles={['admin']}><KelolaJurusan /></ProtectedRoute>} />
            <Route path="/admin/rekap" element={<ProtectedRoute allowedRoles={['admin']}><RekapHistoriGuru /></ProtectedRoute>} />
            <Route path="/admin/konfigurasi" element={<ProtectedRoute allowedRoles={['admin']}><KonfigurasiAdmin /></ProtectedRoute>} />

            <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} replace />} />
          </Routes>
        </BrowserRouter>
      </GlobalStateProvider>
    </AuthContext.Provider>
  );
}
