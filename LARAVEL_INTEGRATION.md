# Panduan Integrasi Frontend React dengan Backend Laravel 12

Panduan ini diperbarui untuk **Laravel 12** dan menjelaskan bagaimana cara menyambungkan frontend **SINTOGA LEARN** serta cara mengamankan route agar tidak bisa diakses tanpa login.

## 1. Konfigurasi Backend (Laravel 12)

Di Laravel 12, konfigurasi CORS tetap dikelola melalui middleware. Pastikan file `bootstrap/app.php` atau konfigurasi CORS Anda mengizinkan origin dari frontend.

### A. Aktifkan CORS di API
Pastikan URL frontend Anda terdaftar di environment variable `.env` Laravel:
```env
FRONTEND_URL=http://localhost:3000
```

### B. Laravel Sanctum (Auth)
Gunakan Laravel Sanctum untuk token-based auth. Saat login berhasil, kirimkan `plainTextToken` ke frontend.

---

## 2. Gatekeeper: Melindungi URL (Redirect ke Login)

Agar user tidak bisa "nembak" URL seperti `/siswa` tanpa login, kita menggunakan **Protected Route** di React.

### Implementasi di `src/App.tsx`
Di project ini, logika tersebut sudah diimplementasikan di dalam `App.tsx` melalui komponen `ProtectedRoute`.

```typescript
// Cuplikan Logika di App.tsx
const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) => {
  const { user } = useAuth();

  // JIKA USER TIDAK ADA (BELUM LOGIN)
  if (!user) {
    // Otomatis redirect ke halaman login
    return <Navigate to="/login" replace />;
  }

  // JIKA ROLE TIDAK SESUAI
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
};
```

Setiap route yang ingin dilindungi dibungkus oleh komponen ini:
```tsx
<Route 
  path="/siswa" 
  element={
    <ProtectedRoute allowedRoles={['siswa']}>
      <DashboardSiswa />
    </ProtectedRoute>
  } 
/>
```

---

## 3. Persistent Login (Agar Tidak Logout Saat Refresh)

Agar user tidak diminta login ulang setiap kali refresh halaman, Anda perlu menyimpan status login di `localStorage`.

### Update Fungsi Login di `src/App.tsx`
Ubah fungsi login agar menyimpan data user ke browser:

```typescript
const login = (userData: User, token: string) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
  setUser(userData);
};

// Gunakan useEffect untuk check saat pertama kali aplikasi dimuat
useEffect(() => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    setUser(JSON.parse(savedUser));
  }
}, []);
```

---

## 4. Konfigurasi Axios untuk Laravel 12

Buat folder `src/lib` dan file `axios.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Interceptor untuk menyisipkan Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 5. Alur Integrasi Ujian

Saat siswa menyelesaikan ujian di `RuangUjian.tsx`, ganti simulasi `setTimeout` dengan hit ke Laravel:

```typescript
const handleFinish = async () => {
  setIsSubmitting(true);
  try {
    const response = await api.post('/exam/submit', {
      ujian_id: id,
      jawaban: jawaban,
      skor_objektif: tempScore
    });
    
    if (response.data.status === 'success') {
      setIsFinished(true);
    }
  } catch (error) {
    alert("Gagal mengirim jawaban ke server!");
  } finally {
    setIsSubmitting(false);
  }
};
```

*Dokumen ini diperbarui untuk standar keamanan SMK Sintoga Learn.*
