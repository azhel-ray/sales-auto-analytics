import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', modalPrice: '', category: 'ayam', points: '0' });

  useEffect(() => {
    fetchProducts();
    api.get('/master/product-categories').then(({data}) => setCategories(data)).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus produk "${name}"? Produk akan dinonaktifkan.`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Produk berhasil dinonaktifkan');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus produk');
    }
  };

  const openEdit = (p) => {
    setEditForm({ name: p.name, price: String(p.price), modalPrice: String(p.modalPrice || 0), category: p.category, points: String(p.points || 0) });
    setEditModal(p);
  };

  const editPriceError = editForm.price && editForm.modalPrice && parseFloat(editForm.price) <= parseFloat(editForm.modalPrice);

  const handleEdit = async (e) => {
    e.preventDefault();
    if (editPriceError) {
      toast.error('Harga jual harus lebih besar dari harga modal');
      return;
    }
    try {
      await api.put(`/products/${editModal.id}`, { ...editForm, price: parseFloat(editForm.price), modalPrice: parseFloat(editForm.modalPrice), points: parseInt(editForm.points) });
      toast.success('Produk diperbarui');
      setEditModal(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui produk');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">🍗 Produk</h1>
        <Link to="/products/create" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">+ Tambah Produk</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{p.category}</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">Rp {p.price.toLocaleString('id-ID')}</span>
                <p className="text-xs text-gray-400">Modal: Rp {p.modalPrice?.toLocaleString('id-ID') || 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-600">+{p.points} poin</span>
              <div className="flex gap-2">
                <Link to={`/products/${p.id}/recipe`} className="text-blue-600 hover:text-blue-800 text-xs">Resep</Link>
                <span className="text-gray-300">|</span>
                <button onClick={() => openEdit(p)} className="text-gray-600 hover:text-gray-800 text-xs">Edit</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => handleDelete(p.id, p.name)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Produk: {editModal.name}</h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required placeholder="Nama produk" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input type="number" min="0" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required placeholder="Harga jual" className={`w-full px-4 py-2 border rounded-lg ${editPriceError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
                  {editPriceError && <p className="text-xs text-red-600 mt-1">Harga jual harus &gt; harga modal</p>}
                </div>
                <input type="number" min="0" value={editForm.modalPrice} onChange={(e) => setEditForm({ ...editForm, modalPrice: e.target.value })} placeholder="Harga modal" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                <option value="">Pilih kategori</option>
                {categories.filter(c => c.isActive).map(c => (
                  <option key={c.id} value={c.name.toLowerCase()}>{c.name}</option>
                ))}
              </select>
              <input type="number" min="0" value={editForm.points} onChange={(e) => setEditForm({ ...editForm, points: e.target.value })} placeholder="Poin per item" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Simpan</button>
                <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
