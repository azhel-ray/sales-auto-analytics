# Sales Auto Analytics

## Cara Menjalankan

### 1. Database (PostgreSQL — Vercel tidak mendukung MySQL)
```bash
# Pastikan PostgreSQL running (Laragon / standalone / Neon)
# Buat database terlebih dahulu, lalu isi DATABASE_URL di backend/.env
# Contoh (psql):
createdb sales_auto_analytics
```

### 2. Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js        # Seed data awal
npm run dev                # Jalankan (port 5001)
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # Jalankan (port 5173)
```

### 4. Akses
- **Browser:** http://localhost:5173
- **Owner:** owner@geprek.com / admin123
- **Kasir:** kasir@geprek.com / admin123

### 5. ngrok (untuk akses publik)
```bash
ngrok http 5173            # Frontend
ngrok http 5001            # Backend API
```

## Struktur Proyek
```
Sales Auto Analytics/
├── backend/
│   ├── prisma/schema.prisma   # Model database
│   ├── src/
│   │   ├── index.js           # Entry point Express
│   │   ├── routes/            # Route handlers
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # JWT auth
│   │   └── utils/             # Calculator, StockManager
│   └── uploads/               # File storage lokal
├── frontend/
│   └── src/
│       ├── pages/             # 14 halaman aplikasi
│       ├── components/        # Layout, Charts
│       └── api/axios.js       # HTTP client
└── AGENTS.md
```

## Fitur Utama
- **Dashboard** — Grafik penjualan, profit, produk terlaris, jam sibuk
- **Input Penjualan** — Pilih produk, cari member, apply voucher, auto kalkulasi
- **Otomatisasi Stok** — BOM system: stok bahan baku berkurang otomatis saat transaksi
- **CRM Member** — Daftar member, poin balance, redeem voucher
- **Voucher Reward** — 100pts→5%, 200pts→10%, 350pts→15%, 500pts→Gratis Ayam
- **Minyak = Expense** — Minyak dicatat sebagai pengeluaran, bukan stok
- **Profit & Loss** — Auto kalkulasi real-time
- **Export Report** — PDF & Excel
- **Produk + Resep** — Owner bisa tambah produk baru dengan resep bahan baku

## API Endpoints
| Method | Endpoint | Auth |
|---|---|---|
| POST | /api/auth/login | - |
| GET | /api/dashboard/summary | JWT |
| GET/POST | /api/products | JWT |
| GET/POST | /api/ingredients | JWT |
| POST | /api/transactions | JWT |
| GET/POST | /api/members | JWT |
| POST | /api/members/:id/redeem | JWT |
| GET/POST | /api/expenses | JWT |
| GET | /api/reports/export/pdf | JWT |
| GET | /api/reports/export/excel | JWT |
