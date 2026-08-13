# Sales Auto Analytics

Aplikasi Point of Sale (POS) dan laporan otomatis untuk UMKM Ayam Geprek. Dibangun dengan React + Vite (frontend) dan Express.js + Prisma + MySQL (backend).

## Fitur

| Fitur | Deskripsi |
|---|---|
| **Dashboard** | Grafik penjualan, profit, produk terlaris, jam sibuk real-time |
| **Input Penjualan** | Pilih produk, cari member, tukar poin, auto kalkulasi + PPN |
| **Manajemen Stok Produk** | Stok produk jadi (hasil produksi) berkurang otomatis saat transaksi |
| **Manajemen Stok Bahan** | BOM system: stok bahan baku berkurang otomatis saat produksi |
| **CRM Member** | Daftar member, poin otomatis, riwayat poin |
| **Voucher Reward** | Reward tier: 100pts→5%, 200pts→10%, 350pts→15%, 500pts→Gratis Ayam |
| **Produksi** | Produksi produk jadi dari bahan baku, otomatis kurangi stok bahan |
| **Profit & Loss** | Auto kalkulasi laba/rugi real-time (revenue sudah tidak termasuk PPN) |
| **Laporan** | Export PDF & Excel dengan detail transaksi + mutasi bahan + produksi |
| **Manajemen Pengeluaran** | Catat pengeluaran (minyak, gas, dll), approval owner |
| **Role Based** | Owner (full akses) dan Kasir (terbatas) |
| **Refund / Void** | Void transaksi, stok kembali otomatis (24h) |
| **Master Data DB-driven** | Kategori, satuan, metode bayar, setting toko disimpan di database |
| **Audit Log** | Catat semua aktivitas penting |

## Alur Data

### Transaksi Penjualan
```
Input Produk → Pilih Member (opsional) → Tukar Poin (opsional) → Bayar
  ↓
Backend: simpan Transaction + TransactionItem
  ↓
Stok Produk: decrement qty terjual (field `stock` di Product)
  ↓
Member: poin bertambah (jika member)
  ↓
Voucher Reward: auto-issued jika memenuhi threshold poin
  ↓
Receipt: tampil di layar → cetak via hidden iframe (mobile-friendly)
```

### Produksi (Produk Jadi)
```
Pilih Produk → Masukkan Jumlah → Cek BOM (bahan cukup?)
  ↓
Backend: kurangi stok setiap Ingredient sesuai BOM
  ↓
Backend: tambah stok Product sesuai qty produksi
  ↓
Buat Production record + InventoryMutation (OUT) + ProductMutation (IN)
```

### Void / Refund
```
Klik void di Riwayat Transaksi → isi alasan
  ↓
Backend: ubah status Transaction jadi VOID
  ↓
Stok Produk: increment qty (kembalikan)
  ↓
Member: poin dikembalikan (jika ada)
  ↓
Batasan: Kasir hanya bisa void transaksi hari yang sama. Owner bisa void kapan saja (dalam 24 jam).
```

### Profit & Loss (Perhitungan)
```
Revenue   = Σ(finalAmount - taxAmount)          ← PPN tidak dianggap revenue
COGS      = Σ(modalPrice × qty) per item        ← modalPrice dari Product
Expenses  = Σ(amount) dari Expense (APPROVED)
TotalCost = COGS + Expenses                      ← voucherCogs TIDAK double-count (sudah dalam COGS)
Profit    = Revenue - TotalCost
```

### Master Data (DB-driven)
Semua data referensi kini disimpan di database, bukan hardcoded:
- Produk: kategori dari tabel `ProductCategory` — API: `GET /api/master/product-categories`
- Pengeluaran: kategori dari tabel `ExpenseCategory` — API: `GET /api/master/expense-categories`
- Bahan Baku: satuan dari tabel `IngredientUnit` — API: `GET /api/master/ingredient-units`
- Pembayaran: metode dari tabel `PaymentMethod` — API: `GET /api/master/payment-methods`
- Setting: tax rate & store name dari tabel `AppSetting` — API: `GET /api/settings`

## Struktur Proyek

```
Sales Auto Analytics/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Model database (19 tabel)
│   ├── src/
│   │   ├── index.js            # Entry point Express
│   │   ├── config/database.js  # Koneksi Prisma
│   │   ├── routes/             # Route handlers (12 router)
│   │   ├── controllers/        # Business logic (12 controller)
│   │   ├── middleware/auth.js  # JWT authentication
│   │   └── utils/
│   │       ├── calculator.js   # Profit/Loss calculation
│   │       └── stockManager.js # Stock deduction, production
│   └── uploads/                # File storage lokal
├── frontend/
│   └── src/
│       ├── pages/              # 14 halaman aplikasi
│       ├── components/         # Layout, Charts (Recharts)
│       └── api/axios.js        # HTTP client (Axios)
└── AGENTS.md
```

## Persyaratan

- Node.js 18+
- MySQL 8+ (via Laragon / XAMPP / standalone)
- npm atau yarn

## Instalasi & Menjalankan

### 1. Database

```bash
# PostgreSQL (dev lokal). Vercel tidak mendukung MySQL.
createdb sales_auto_analytics
# isi backend/.env → DATABASE_URL="postgresql://user:password@localhost:5432/sales_auto_analytics"
```

### 2. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js
npm run dev
```

Server berjalan di `http://localhost:5001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Server berjalan di `http://localhost:5173`.

### 4. Login

| Role | Email | Password |
|---|---|---|
| Owner | owner@geprek.com | admin123 |
| Kasir | kasir@geprek.com | admin123 |

## API Endpoints

### Auth
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/login` | - | Login |
| POST | `/api/auth/register` | Owner | Register akun kasir baru |
| GET | `/api/auth/users` | Owner | Daftar semua user |
| PUT | `/api/auth/users/:id` | Owner | Edit user |
| DELETE | `/api/auth/users/:id` | Owner | Hapus user |

### Dashboard
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/dashboard/summary` | JWT | Ringkasan (omzet, profit, transaksi hari ini) |
| GET | `/api/dashboard/sales-chart` | JWT | Grafik penjualan (7 hari / bulan) |
| GET | `/api/dashboard/top-products` | JWT | Produk terlaris |
| GET | `/api/dashboard/peak-hours` | JWT | Jam sibuk |
| GET | `/api/dashboard/member-summary` | JWT | Ringkasan member |
| GET | `/api/dashboard/profit-chart` | JWT | Data profit/loss (6 bulan) |

### Produk & Bahan
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET/POST | `/api/products` | JWT | List / tambah produk |
| GET/PUT | `/api/products/:id` | JWT | Detail / edit produk |
| PUT | `/api/products/:id/ingredients` | Owner | Update resep (BOM) |
| POST | `/api/products/:id/produce` | Owner | Produksi produk dari bahan baku |
| GET/POST | `/api/ingredients` | JWT | List / tambah bahan baku |
| GET/PUT | `/api/ingredients/:id` | JWT | Detail / edit bahan |
| POST | `/api/ingredients/:id/restock` | Owner | Restock stok bahan |

### Transaksi
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET/POST | `/api/transactions` | JWT | List / buat transaksi |
| POST | `/api/transactions/:id/void` | JWT | Void/refund transaksi |

### Member
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET/POST | `/api/members` | JWT | List / tambah member |
| GET/PUT | `/api/members/:id` | JWT | Detail / edit member |

### Pengeluaran
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/expenses` | JWT | Tambah pengeluaran |
| GET | `/api/expenses` | JWT | List pengeluaran (dengan filter) |
| POST | `/api/expenses/:id/approve` | Owner | Approve pengeluaran |
| POST | `/api/expenses/:id/reject` | Owner | Tolak pengeluaran |

### Inventory & Produksi
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/inventory/ingredient-mutations` | Owner | Mutasi stok bahan (IN/OUT) |
| GET | `/api/inventory/productions` | Owner | Riwayat produksi |

### Laporan
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/reports/export/pdf` | Owner | Export PDF (P&L + transaksi + mutasi) |
| GET | `/api/reports/export/excel` | Owner | Export Excel |

### Master Data & Settings
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/master/:type` | JWT | Master data (product-categories, expense-categories, ingredient-units, payment-methods) |
| GET | `/api/settings` | JWT | App settings (tax_rate, store_name) |

### Audit
| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/api/audit` | Owner | Semua aktivitas user |

## Panduan Penggunaan

### Owner

1. **Dashboard** — Ringkasan penjualan, profit, produk terlaris, jam sibuk, tren 6 bulan
2. **Input Penjualan** — Input transaksi; cari member via nomor HP; tukar poin member (voucher reward)
3. **Riwayat Transaksi** — Lihat semua transaksi, cetak struk ulang, void/refund transaksi
4. **Data Master → Member** — Tambah/edit/hapus member; lihat poin & riwayat poin
5. **Data Master → Akun Kasir** — Tambah/edit/hapus akun kasir
6. **Data Master → Produk** — Tambah produk (nama, harga, modal, kategori, poin); atur resep BOM (bahan + qty)
7. **Data Master → Bahan Baku** — Tambah/edit bahan baku (nama, satuan, stok awal, min stok)
8. **Data Master → Voucher Reward** — Atur reward tier (nama, diskon%, free item, poin)
9. **Inventory → Stok Bahan** — Monitor stok bahan; restock bahan; lihat mutasi IN/OUT
10. **Inventory → Produksi** — Produksi produk jadi dari bahan baku (otomatis cek kecukupan stok)
11. **Keuangan → Pengeluaran** — Catat pengeluaran baru; approve/tolak pengeluaran (yang dibuat kasir)
12. **Keuangan → Profit & Loss** — Laba/rugi bulan ini (revenue, COGS, expenses, profit)
13. **Keuangan → Laporan** — Export PDF/Excel P&L + transaksi + mutasi bahan + produksi
14. **Audit Log** — Lihat semua aktivitas (login, transaksi, produksi, dll)

### Kasir

1. **Dashboard** — Lihat ringkasan (read-only)
2. **Input Penjualan** — Input transaksi penjualan (produk, member, voucher, bayar)
3. **Riwayat Transaksi** — Lihat transaksi hari ini; void transaksi hari yang sama
4. **Data Master → Member** — Lihat & tambah member baru
5. **Keuangan → Pengeluaran** — Catat pengeluaran (pending owner approval)

### Catatan Penggunaan

- **Cetak Struk:** Setelah transaksi berhasil, klik tombol Cetak. Menggunakan hidden iframe (didukung semua browser mobile).
- **PPN:** Centang "PPN 11%" sebelum bayar jika ingin menambahkan pajak. PPN tidak masuk perhitungan revenue (passthrough).
- **Void:** Kasir hanya bisa void transaksi hari yang sama. Owner bisa void transaksi kapan saja (max 24 jam).
- **Produksi:** Hanya produk yang memiliki resep (BOM) bisa diproduksi. Stok bahan akan diperiksa otomatis.

## Aturan Bisnis

### Stok & Inventory
- **Stok Produk (Product.stock):** Berkurang saat transaksi, bertambah saat produksi.
- **Stok Bahan (Ingredient.stock):** Berkurang saat produksi (sesuai BOM), bertambah saat restock.
- **BOM System:** Setiap produk punya resep yang mendefinisikan bahan + qty yang dibutuhkan.
- **Peringatan:** Jika stok produk menipis (≤3) atau stok bahan di bawah minStock, sistem akan memberi peringatan.

### Voucher & Poin
- Poin member bertambah otomatis setiap transaksi (dari field `points` di Product).
- Poin bisa ditukarkan saat transaksi: pilih reward tier di halaman Input Penjualan.
- **Free Item Voucher:** Jika reward memiliki `freeItem` (misal "Ayam Kecil"), produk tersebut HARUS ada di keranjang agar diskon berlaku. Jika produk free item tidak ada di cart, diskon tidak diberikan.
- **Diskon % vs Free Item:** `freeItem` selalu diprioritaskan. Jika reward punya `freeItem`, diskon % diabaikan.

### Profit & Loss
- **Revenue:** Tidak termasuk PPN (`finalAmount - taxAmount`). PPN adalah passthrough tax.
- **COGS:** Dihitung dari `modalPrice × qty` per item. Sudah termasuk biaya voucher gratis (tidak double-count).
- **Expenses:** Hanya expense yang statusnya `APPROVED` yang masuk hitungan.
- **Voided Transactions:** Tidak masuk perhitungan omzet dashboard.

### Void / Refund
- Void transaksi mengembalikan stok produk.
- Void mengurangi poin member (poin yang didapat dari transaksi tersebut dihapus).
- Void menggunakan `$transaction` Prisma agar atomic (semua perubahan rollback jika gagal).
- Batasan 24 jam: backend return error jika void dilakukan >24 jam setelah transaksi.

### Master Data
- Semua data referensi (kategori produk, kategori expense, satuan bahan, metode bayar, setting toko) disimpan di database.
- Perubahan kategori/satuan/metode bayar harus dilakukan langsung di database (belum ada UI).

## Teknologi

- **Frontend:** React 19, Vite, Tailwind CSS 4, Recharts, Axios, React Router, react-hot-toast
- **Backend:** Express.js, Prisma ORM 6, JWT (jsonwebtoken), bcryptjs, helmet, express-rate-limit
- **Database:** MySQL 8+ (dev lokal) / **PostgreSQL** (deploy Vercel)
- **Laporan:** PDFKit (pdfmake), ExcelJS
- **Cetak:** Hidden iframe (mobile-friendly, no popup)

