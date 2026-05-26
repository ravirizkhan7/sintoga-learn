# Panduan Integrasi Frontend React dengan Backend Laravel

Panduan ini menjelaskan langkah-langkah untuk menyambungkan aplikasi frontend **SINTOGA LEARN** (React + Vite) ke API yang dibangun menggunakan **Laravel**.

## 1. Konfigurasi Environment Variables

Buka file `.env` di root project frontend Anda (buat jika belum ada) dan tambahkan URL API Laravel Anda:

```env
VITE_API_URL=http://localhost:8000/api
```

Pastikan semua variabel yang ingin diakses di frontend menggunakan prefix `VITE_`.

---

## 2. Instalasi Axios (Direkomendasikan)

Gunakan Axios untuk menangani HTTP requests karena lebih mudah dalam menangani interceptors dan error handling.

**Command:**
```bash
npm install axios
```

---

## 3. Membuat Axios Instance

Buat file baru, misalnya `src/lib/axios.ts`, untuk mengkonfigurasi baseURL dan headers secara global:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Tambahkan interceptor untuk menyisipkan Token JWT/Sanctum
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

## 4. Contoh Implementasi Fetch Data

Contoh mengganti `mockData` dengan data asli dari Laravel pada halaman `Dashboard`:

```typescript
import { useEffect, useState } from 'react';
import api from '../lib/axios';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await api.get('/exams');
        setExams(response.data);
      } catch (error) {
        console.error('Gagal mengambil data ujian:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  if (loading) return <p>Loading...</p>;

  // ... render exams
}
```

---

## 5. Setting di Sisi Laravel (Backend)

Ada dua hal krusial yang harus diatur di Laravel:

### A. Konfigurasi CORS
Pastikan API Laravel mengizinkan request dari URL frontend Anda.
Di Laravel 11, CORS biasanya diatur di `config/cors.php` atau melalui middleware.

```php
// config/cors.php
'allowed_origins' => ['http://localhost:3000'], // URL Vite Anda
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

### B. Response Format
Direkomendasikan menggunakan format JSON yang konsisten agar mudah dipetakan ke `types.ts` di frontend:

```php
// Laravel Controller
public function index() {
    $exams = Exam::all();
    return response()->json([
        'status' => 'success',
        'data' => $exams
    ]);
}
```

---

## 6. Tips Integrasi Lainnya

1. **Authentication**: Gunakan **Laravel Sanctum** untuk sistem login yang aman (cookie-based atau token-based).
2. **File Upload**: Gunakan `FormData` jika mengirimkan gambar (misal pofile picture) dari React ke API Laravel.
3. **Pusher/WebSockets**: Jika ingin fitur Real-time (seperti monitoring ujian), gunakan **Pusher** di Laravel dan **Laravel Echo** di React.

---

*Dokumen ini dibuat secara otomatis untuk membantu proses pengembangan SMK Sintoga Learn.*

# Panduan Integrasi Frontend React dengan Backend Laravel 12 (Hybrid Mode)

Panduan ini diperbarui untuk **Laravel 12** dengan konsep **Hybrid Mode**: Web bisa dibuka di mana saja (Publik), tapi **Ujian** hanya bisa diakses via Jaringan Sekolah (IP Lokal/Sekolah).

---

## 1. Konsep Hybrid Mode
Aplikasi Anda akan berjalan secara publik untuk fitur umum (Dashboard, Histori, Login), namun akan melakukan "Geofencing" berdasarkan IP Address hanya ketika siswa mencoba masuk ke Ruang Ujian.

---

## 2. Langkah-Langkah Implementasi Backend (Laravel 12)

### Step 1: Middleware Check IP
Buat middleware baru di Laravel untuk memvalidasi apakah IP pengakses sesuai dengan IP Sekolah yang terdaftar di database.

```php
// app/Http/Middleware/EnsureSchoolNetwork.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Setting;

class EnsureSchoolNetwork {
    public function handle(Request $request, Closure $next) {
        // Ambil IP Sekolah yang disetting di menu Konfigurasi Admin
        $schoolIp = Setting::where('key', 'ip_gateway_sekolah')->value('value');

        // Jika IP tidak cocok dan bukan 'allow all' (*)
        if ($schoolIp !== '*' && $request->ip() !== $schoolIp) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ujian hanya bisa diakses menggunakan jaringan WiFi Sekolah!'
            ], 403);
        }

        return $next($request);
    }
}
```

### Step 2: Daftarkan Route Secara Selektif
Terapkan middleware di atas **hanya** pada route yang berhubungan dengan akses ujian.

```php
// routes/api.php

// Route Umum (Bisa diakses dari mana saja)
Route::middleware('auth:sanctum')->group(function() {
    Route::get('/user/dashboard', [DashboardController::class, 'index']);
    Route::get('/user/history', [HistoryController::class, 'index']);
});

// Route Ujian (Hanya bisa diakses dari IP Sekolah - Hybrid Mode)
Route::middleware(['auth:sanctum', 'ensure.school.network'])->group(function() {
    Route::get('/ujian/{id}/start', [ExamController::class, 'start']);
    Route::post('/ujian/submit', [ExamController::class, 'submit']);
});
```

---

## 3. Langkah-Langkah Implementasi Frontend (React)

Anda tidak perlu merubah struktur file besar-besaran. Ikuti perubahan logika berikut:

### Step 1: Validasi Sebelum Masuk Ruang Ujian
Di file `src/pages/siswa/Dashboard.tsx`, sebelum fungsi `navigate` dieksekusi pada tombol "MULAI SESI UJIAN", panggil API pengecekan IP.

**Logic yang perlu Anda rubah di `Dashboard.tsx`:**
```typescript
const handleStartExam = async (examId) => {
  setIsLoading(true);
  try {
    // Panggil API Laravel yang diproteksi Middleware 'EnsureSchoolNetwork'
    await api.get(`/ujian/${examId}/check-access`);
    
    // Jika berhasil (200 OK), baru arahkan ke Ruang Ujian
    navigate(`/siswa/ujian/${examId}`);
  } catch (error) {
    // Jika 403 Forbidden, tampilkan pesan error jaringan
    if (error.response?.status === 403) {
      alert("Akses Ditolak: Anda tidak berada dalam jaringan WiFi Sekolah.");
    }
  } finally {
    setIsLoading(false);
  }
};
```

---

## 4. Lokasi File Terkait IP di Frontend (Untuk Referensi)

Berikut adalah file-file yang sudah memiliki struktur data IP, namun saat ini masih menggunakan Mock Data. Anda bisa merubahnya nanti jika sudah menyambungkan API:

- **`src/pages/admin/Konfigurasi.tsx`**: Halaman tempat Admin memasukkan/mengedit IP Gateway Sekolah.
- **`src/lib/mockData.ts`**: Tempat penyimpanan sementara variabel `ip_gateway_sekolah`.
- **`src/types.ts`**: Definisi tipe data untuk `Konfigurasi` sistem.

---

## 5. Ringkasan Strategi Hybrid
1. **Public Routes**: Login, Dashboard, Rekap Nilai (Tanpa Filter IP).
2. **Private Routes**: Load Soal, Submit Jawaban (Dengan Filter IP di Laravel).
3. **Admin Control**: IP dapat dirubah secara dinamis melalui menu Konfigurasi di Dashboard Admin.

*Dokumen ini dirancang untuk membantu transisi SMK Sintoga Learn menjadi platform Hybrid Digital.*
