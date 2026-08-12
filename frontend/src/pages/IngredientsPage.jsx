import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'gram', stock: '0', minStock: '0' });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', unit: 'gram', minStock: '0' });
  const [units, setUnits] = useState([]);

  useEffect(() => {
    fetchIngredients();
    api.get('/master/ingredient-units').then(({data}) => setUnits(data)).catch(() => {});
  }, []);

  const fetchIngredients = async () => {
    try {
      const { data } = await api.get('/ingredients');
      setIngredients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ingredients', form);
      toast.success('Bahan baku ditambahkan');
      setShowForm(false);
      setForm({ name: '', unit: 'gram', stock: '0', minStock: '0' });
      fetchIngredients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus bahan baku "${name}"? Semua resep yang menggunakan bahan ini akan ikut terhapus.`)) return;
    try {
      await api.delete(`/ingredients/${id}`);
      toast.success('Bahan baku berhasil dihapus');
      fetchIngredients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus bahan baku');
    }
  };

  const openEdit = (ing) => {
    setEditForm({ name: ing.name, unit: ing.unit, minStock: String(ing.minStock) });
    setEditModal(ing);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/ingredients/${editModal.id}`, { ...editForm, minStock: parseFloat(editForm.minStock) });
      toast.success('Bahan baku diperbarui');
      setEditModal(null);
      fetchIngredients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui bahan baku');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">🥩 Bahan Baku</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">+ Tambah Bahan</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Tambah Bahan Baku</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nama bahan" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Pilih satuan</option>
                {units.filter(u => u.isActive).map(u => (
                  <option key={u.id} value={u.name.toLowerCase()}>{u.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
<input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stok awal" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <input type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} placeholder="Min. stok" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg">Simpan</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Bahan: {editModal.name}</h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required placeholder="Nama bahan" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <select value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Pilih satuan</option>
                {units.filter(u => u.isActive).map(u => (
                  <option key={u.id} value={u.name.toLowerCase()}>{u.name}</option>
                ))}
              </select>
              <input type="number" min="0" value={editForm.minStock} onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })} placeholder="Min. stok" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Simpan</button>
                <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-center px-4 py-3 font-medium">Satuan</th>
                <th className="text-right px-4 py-3 font-medium">Stok</th>
                <th className="text-right px-4 py-3 font-medium">Min. Stok</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingredients.map((ing) => {
                const isLow = ing.stock <= ing.minStock;
                return (
                  <tr key={ing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{ing.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{ing.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold">{ing.stock}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{ing.minStock}</td>
                    <td className="px-4 py-3 text-center">
                      {isLow ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Menipis</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Aman</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(ing)} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium mr-3 rounded-lg">Edit</button>
                      <button onClick={() => handleDelete(ing.id, ing.name)} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium rounded-lg">Hapus</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
