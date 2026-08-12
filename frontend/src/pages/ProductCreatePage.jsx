import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState({
    name: '', price: '', modalPrice: '', category: '', points: '0',
  });
  const [recipe, setRecipe] = useState([{ ingredientId: '', qty: '', unit: '' }]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/ingredients').then(({ data }) => setIngredients(data)).catch(console.error);
    api.get('/master/product-categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const addRecipeRow = () => setRecipe([...recipe, { ingredientId: '', qty: '', unit: '' }]);

  const removeRecipeRow = (idx) => {
    if (recipe.length <= 1) return;
    setRecipe(recipe.filter((_, i) => i !== idx));
  };

  const updateRecipe = (idx, field, value) => {
    const newRecipe = [...recipe];
    newRecipe[idx][field] = value;
    if (field === 'ingredientId') {
      const ing = ingredients.find((i) => i.id === parseInt(value));
      if (ing) newRecipe[idx].unit = ing.unit;
    }
    setRecipe(newRecipe);
  };

  const priceError = form.price && form.modalPrice && parseFloat(form.price) <= parseFloat(form.modalPrice);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (priceError) {
      toast.error('Harga jual harus lebih besar dari harga modal');
      return;
    }
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        modalPrice: parseFloat(form.modalPrice),
        points: parseInt(form.points),
        ingredients: recipe.filter((r) => r.ingredientId && r.qty).map((r) => ({
          ingredientId: parseInt(r.ingredientId),
          qty: parseFloat(r.qty),
          unit: r.unit,
        })),
      };
      await api.post('/products', payload);
      toast.success('Produk berhasil ditambahkan!');
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambah produk');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">➕ Tambah Produk Baru</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual (Rp)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none ${priceError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} />
            {priceError && <p className="text-xs text-red-600 mt-1">Harga jual harus lebih besar dari harga modal</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Modal (Rp)</label>
            <input type="number" min="0" value={form.modalPrice} onChange={(e) => setForm({ ...form, modalPrice: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
              <option value="">Pilih kategori</option>
              {categories.filter(c => c.isActive).map(c => (
                <option key={c.id} value={c.name.toLowerCase()}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poin per Item</label>
            <input type="number" min="0" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Resep Bahan Baku</label>
            <button type="button" onClick={addRecipeRow} className="text-sm text-red-600 hover:text-red-800">+ Tambah Bahan</button>
          </div>
          <div className="space-y-2">
            {recipe.map((r, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <select value={r.ingredientId} onChange={(e) => updateRecipe(idx, 'ingredientId', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="">Pilih bahan...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
                <input type="number" min="0" value={r.qty} onChange={(e) => updateRecipe(idx, 'qty', e.target.value)} placeholder="Jumlah" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                <input type="text" value={r.unit} readOnly placeholder="Unit" className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
                {recipe.length > 1 && (
                  <button type="button" onClick={() => removeRecipeRow(idx)} className="px-3 py-2 text-red-500 hover:text-red-700 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition">Simpan Produk</button>
          <button type="button" onClick={() => navigate('/products')} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Batal</button>
        </div>
      </form>
    </div>
  );
}
