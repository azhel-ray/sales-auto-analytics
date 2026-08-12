import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProductionPage() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tab, setTab] = useState('produce');

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/inventory/productions');
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    api.get('/products').then(({ data }) => {
      setProducts(data.filter(p => p.ingredients?.length > 0));
    }).finally(() => setLoading(false));
    fetchHistory();
  }, []);

  const selected = products.find(p => p.id === parseInt(selectedId));

  useEffect(() => {
    if (selected && qty > 0) {
      const bom = selected.ingredients.map(pi => ({
        name: pi.ingredient.name,
        stock: pi.ingredient.stock,
        needed: pi.qty * qty,
        unit: pi.unit,
        enough: pi.ingredient.stock >= pi.qty * qty,
      }));
      setPreview(bom);
    } else {
      setPreview(null);
    }
  }, [selected, qty]);

  const handleProduce = async () => {
    if (!selectedId || !qty || qty <= 0) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/products/${selectedId}/produce`, { qty, note });
      setQty(1);
      setNote('');
      toast.success(data.message);
      const updated = await api.get('/products');
      setProducts(updated.data.filter(p => p.ingredients?.length > 0));
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal produksi';
      const details = err.response?.data?.details;
      if (details) {
        details.forEach(d => toast.error(`${d.name}: stok ${d.stock}, butuh ${d.needed}`));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  const allEnough = preview?.every(b => b.enough);

  const negativeIngredients = products.flatMap(p =>
    p.ingredients.filter(i => i.ingredient.stock < 0).map(i => i.ingredient)
  );
  const uniqueNegatives = [...new Map(negativeIngredients.map(i => [i.id, i])).values()];

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">🏭 Produksi</h1>

      {uniqueNegatives.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800">
            ⛔ Bahan baku minus: {uniqueNegatives.map(i => `${i.name} (${i.stock} ${i.unit})`).join(', ')}
            {' — '}
            <Link to="/ingredients" className="underline font-medium hover:text-red-900">Atur stok →</Link>
          </p>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setTab('produce')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === 'produce' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>🏭 Produksi</button>
        <button onClick={() => setTab('history')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === 'history' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>📜 Riwayat</button>
      </div>

      {tab === 'produce' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Produk</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
                <option value="">-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Produksi</label>
              <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: produksi pagi" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>

          {preview && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Bahan Baku yang Dibutuhkan</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Bahan</th>
                    <th className="text-right px-4 py-2 font-medium">Stok</th>
                    <th className="text-right px-4 py-2 font-medium">Butuh</th>
                    <th className="text-center px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((b, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-gray-900">{b.name}</td>
                      <td className="text-right px-4 py-2 text-gray-600">{b.stock} {b.unit}</td>
                      <td className="text-right px-4 py-2 font-medium">{b.needed} {b.unit}</td>
                      <td className="text-center px-4 py-2">
                        {b.enough
                          ? <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">Cukup</span>
                          : <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-medium">Kurang</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleProduce}
            disabled={!selectedId || !allEnough || submitting}
            className={`w-full py-3 rounded-lg font-medium text-white transition ${!selectedId || !allEnough || submitting ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {submitting ? 'Memproses...' : allEnough ? `Produksi ${qty} ${selected?.name || ''}` : 'Cek stok bahan baku'}
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium">Produk</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 font-medium">Oleh</th>
                  <th className="text-left px-4 py-3 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingHistory ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada riwayat produksi</td></tr>
                ) : history.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(h.createdAt).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{h.product?.name || '−'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{h.qty}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.user?.name || '−'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.note || '−'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
