import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function VoucherRewardsPage() {
  const [rewards, setRewards] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', discountPct: '', pointsCost: '', freeItem: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchRewards(); }, []);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data)).catch(() => {});
  }, []);

  const fetchRewards = async () => {
    try {
      const { data } = await api.get('/voucher-rewards');
      setRewards(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', discountPct: '', pointsCost: '', freeItem: '' });
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, discountPct: r.discountPct ?? '', pointsCost: r.pointsCost, freeItem: r.freeItem ?? '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.pointsCost) return toast.error('Nama dan biaya poin wajib diisi');
    try {
      const payload = { name: form.name, discountPct: form.discountPct ? parseFloat(form.discountPct) : null, pointsCost: parseFloat(form.pointsCost), freeItem: form.freeItem || null };
      if (editing) {
        await api.put(`/voucher-rewards/${editing.id}`, payload);
        toast.success('Voucher reward diperbarui');
      } else {
        await api.post('/voucher-rewards', payload);
        toast.success('Voucher reward ditambahkan');
      }
      setShowForm(false);
      fetchRewards();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const handleToggle = async (r) => {
    if (r.isActive) {
      await api.delete(`/voucher-rewards/${r.id}`);
      toast.success('Voucher reward dinonaktifkan');
    } else {
      await api.put(`/voucher-rewards/${r.id}`, { isActive: true });
      toast.success('Voucher reward diaktifkan');
    }
    fetchRewards();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/voucher-rewards/${deleteTarget.id}/hard`);
      toast.success(`"${deleteTarget.name}" dihapus permanen`);
      setDeleteTarget(null);
      fetchRewards();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">🎁 Voucher Rewards</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">+ Tambah Reward</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((r) => (
          <div key={r.id} className={`bg-white rounded-xl p-5 shadow-sm border ${r.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{r.name}</h3>
                <p className="text-sm text-gray-500">{r.pointsCost} poin</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-blue-600 text-sm">✏️</button>
                <button onClick={() => setDeleteTarget(r)} className="text-gray-400 hover:text-red-600 text-sm">🗑️</button>
                <button onClick={() => handleToggle(r)} className={`text-sm ${r.isActive ? 'text-gray-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}>{r.isActive ? '🚫' : '✅'}</button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {r.discountPct ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Diskon {r.discountPct}%</span>
              ) : r.freeItem ? (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">Gratis {r.freeItem}</span>
              ) : null}
              {!r.isActive && <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">Nonaktif</span>}
            </div>
          </div>
        ))}
        {rewards.length === 0 && <p className="text-gray-400 col-span-2 text-center py-8">Belum ada voucher reward</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !showForm && setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">{editing ? 'Edit Reward' : 'Tambah Reward'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Voucher *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Diskon 5%" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diskon (%)</label>
                  <input type="number" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} placeholder="10" min="0" max="100" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Poin *</label>
                  <input type="number" value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: e.target.value })} placeholder="100" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gratis Item <span className="text-gray-400 font-normal">(opsional)</span></label>
                <select value={form.freeItem} onChange={(e) => setForm({ ...form, freeItem: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white">
                  <option value="">— Tidak ada —</option>
                  {products.filter(p => p.isActive).map((p) => (
                    <option key={p.id} value={p.name}>{p.name} (Rp {p.price.toLocaleString('id-ID')})</option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                💡 Pilih <b>Diskon (%)</b> untuk diskon persentase, atau pilih <b>Gratis Item</b> untuk voucher gratis produk.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Hapus Reward</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                Yakin ingin menghapus <strong className="text-gray-900">"{deleteTarget.name}"</strong> secara permanen?
              </p>
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-3">
                ⚠️ Tindakan ini tidak bisa dibatalkan. Semua data voucher yang menggunakan reward ini mungkin akan kehilangan referensi.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
