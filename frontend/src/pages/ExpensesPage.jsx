import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0] });
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => { fetchExpenses(); }, [selectedMonth]);
  useEffect(() => {
    api.get('/master/expense-categories').then(({data}) => setCategories(data)).catch(() => {});
  }, []);

  const fetchExpenses = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      const { data } = await api.get(`/expenses?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
      toast.success('Pengeluaran dicatat');
      setShowForm(false);
      setForm({ description: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch {
      toast.error('Gagal');
    }
  };

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isOwner = user.role === 'OWNER';

  const approvedTotals = expenses.filter(e => e.status === 'APPROVED');
  const total = approvedTotals.reduce((s, e) => s + e.amount, 0);

  const handleApprove = async (id) => {
    try {
      await api.post(`/expenses/${id}/approve`);
      toast.success('Pengeluaran disetujui');
      fetchExpenses();
    } catch { toast.error('Gagal approve'); }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/expenses/${id}/reject`);
      toast.success('Pengeluaran ditolak');
      fetchExpenses();
    } catch { toast.error('Gagal reject'); }
  };

  const statusBadge = (status) => {
    if (status === 'APPROVED') return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">Disetujui</span>;
    if (status === 'REJECTED') return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">Ditolak</span>;
    return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium">Pending</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">💸 Pengeluaran</h1>
        <div className="flex items-center gap-2 md:gap-3">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
          <button onClick={() => setShowForm(true)} className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs md:text-sm whitespace-nowrap">+ Catat</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">
            Total Pengeluaran (Disetujui) — {new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xl font-bold text-gray-900">Rp {total.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Catat Pengeluaran</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Deskripsi (contoh: Minyak goreng 2L)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="Jumlah (Rp)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Pilih kategori</option>
                {categories.filter(c => c.isActive).map(c => (
                  <option key={c.id} value={c.name.toLowerCase().replace(/ /g,'_')}>{c.name}</option>
                ))}
              </select>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg">Simpan</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg">Batal</button>
              </div>
              {!isOwner && <p className="text-xs text-yellow-600 text-center">Pengeluaran akan masuk sebagai PENDING dan perlu disetujui Owner</p>}
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Deskripsi</th>
                <th className="text-center px-4 py-3 font-medium">Kategori</th>
                <th className="text-right px-4 py-3 font-medium">Jumlah</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Dibuat</th>
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                {isOwner && <th className="text-center px-4 py-3 font-medium">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id} className={`hover:bg-gray-50 ${e.status === 'REJECTED' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.description}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{e.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">−Rp {e.amount.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(e.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.user?.name || '−'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.date).toLocaleDateString('id-ID')}</td>
                  {isOwner && (
                    <td className="px-4 py-3 text-center">
                      {e.status === 'PENDING' && <>
                        <button onClick={() => handleApprove(e.id)} className="px-3 py-2 text-sm text-green-600 hover:text-green-800 font-medium mr-2 rounded-lg">✓ Setujui</button>
                        <button onClick={() => handleReject(e.id)} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium rounded-lg">✕ Tolak</button>
                      </>}
                    </td>
                  )}
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={isOwner ? 7 : 6} className="px-4 py-8 text-center text-gray-400">Belum ada pengeluaran</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {!isOwner && expenses.filter(e => e.status === 'PENDING').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm text-yellow-800">
            ⏳ {expenses.filter(e => e.status === 'PENDING').length} pengeluaran menunggu persetujuan Owner
          </p>
        </div>
      )}
    </div>
  );
}
