import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [tab, setTab] = useState('stock');
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockModal, setRestockModal] = useState(null);
  const [qty, setQty] = useState('');

  const [mutations, setMutations] = useState([]);
  const [mutFilterIng, setMutFilterIng] = useState('');
  const [mutStartDate, setMutStartDate] = useState('');
  const [mutEndDate, setMutEndDate] = useState('');
  const [loadingMut, setLoadingMut] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/ingredients');
      setIngredients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMutations = async () => {
    setLoadingMut(true);
    try {
      let url = '/inventory/ingredient-mutations?';
      if (mutFilterIng) url += `ingredientId=${mutFilterIng}&`;
      if (mutStartDate && mutEndDate) url += `startDate=${encodeURIComponent(mutStartDate)}&endDate=${encodeURIComponent(mutEndDate)}`;
      const { data } = await api.get(url);
      setMutations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMut(false);
    }
  };

  useEffect(() => {
    if (tab === 'mutations') fetchMutations();
  }, [tab]);

  const handleRestock = async () => {
    if (!qty || parseFloat(qty) <= 0) return toast.error('Masukkan jumlah');
    try {
      await api.post(`/ingredients/${restockModal.id}/restock`, { qty: parseFloat(qty), note: 'Restock manual' });
      toast.success(`Stok ${restockModal.name} ditambahkan ${qty} ${restockModal.unit}`);
      setRestockModal(null);
      setQty('');
      fetchData();
    } catch {
      toast.error('Gagal restock');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">📦 Inventaris Stok</h1>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setTab('stock')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === 'stock' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>📦 Stok</button>
        <button onClick={() => setTab('mutations')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === 'mutations' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>📜 Riwayat</button>
      </div>

      {tab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Bahan</th>
                  <th className="text-center px-4 py-3 font-medium">Satuan</th>
                  <th className="text-right px-4 py-3 font-medium">Stok Saat Ini</th>
                  <th className="text-right px-4 py-3 font-medium">Min. Stok</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ingredients.map((ing) => {
                  const isLow = ing.stock <= ing.minStock;
                  const isCritical = ing.stock === 0;
                  return (
                    <tr key={ing.id} className={`hover:bg-gray-50 ${isCritical ? 'bg-red-50' : isLow ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{ing.unit}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isCritical ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-900'}`}>{ing.stock}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{ing.minStock}</td>
                      <td className="px-4 py-3 text-center">
                        {isCritical ? <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs">Habis</span>
                        : isLow ? <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Menipis</span>
                        : <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Aman</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setRestockModal(ing)} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs">Restock</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'mutations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bahan</label>
              <select value={mutFilterIng} onChange={(e) => setMutFilterIng(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none">
                <option value="">Semua</option>
                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dari</label>
              <input type="date" value={mutStartDate} onChange={(e) => setMutStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sampai</label>
              <input type="date" value={mutEndDate} onChange={(e) => setMutEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <button onClick={fetchMutations} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Filter</button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium">Bahan</th>
                    <th className="text-center px-4 py-3 font-medium">Tipe</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-left px-4 py-3 font-medium">Referensi</th>
                    <th className="text-left px-4 py-3 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mutations.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(m.createdAt).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.ingredient?.name || '−'}</td>
                      <td className="px-4 py-3 text-center">
                        {m.type === 'IN'
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">IN</span>
                          : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">OUT</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{m.qty} {m.ingredient?.unit || ''}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.reference || '−'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.note || '−'}</td>
                    </tr>
                  ))}
                  {mutations.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Belum ada mutasi</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {restockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRestockModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">Restock: {restockModal.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Stok saat ini: <strong>{restockModal.stock}</strong> {restockModal.unit}</p>
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={`Jumlah (${restockModal.unit})`} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" autoFocus />
            <div className="flex gap-2">
              <button onClick={handleRestock} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              <button onClick={() => setRestockModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
