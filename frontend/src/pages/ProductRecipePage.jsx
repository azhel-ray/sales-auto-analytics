import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProductRecipePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [recipe, setRecipe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`),
      api.get('/ingredients'),
    ]).then(([p, ing]) => {
      setProduct(p.data);
      setIngredients(ing.data);
      if (p.data.ingredients?.length > 0) {
        setRecipe(p.data.ingredients.map((pi) => ({
          ingredientId: pi.ingredientId,
          qty: pi.qty.toString(),
          unit: pi.unit,
        })));
      } else {
        setRecipe([{ ingredientId: '', qty: '', unit: '' }]);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const addRow = () => setRecipe([...recipe, { ingredientId: '', qty: '', unit: '' }]);

  const removeRow = (idx) => {
    if (recipe.length <= 1) return;
    setRecipe(recipe.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    const newRecipe = [...recipe];
    newRecipe[idx][field] = value;
    if (field === 'ingredientId') {
      const ing = ingredients.find((i) => i.id === parseInt(value));
      if (ing) newRecipe[idx].unit = ing.unit;
    }
    setRecipe(newRecipe);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/products/${id}/ingredients`, {
        ingredients: recipe.filter((r) => r.ingredientId && r.qty).map((r) => ({
          ingredientId: parseInt(r.ingredientId),
          qty: parseFloat(r.qty),
          unit: r.unit,
        })),
      });
      toast.success('Resep berhasil diperbarui!');
      navigate('/products');
    } catch {
      toast.error('Gagal memperbarui resep');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
  if (!product) return <p className="text-gray-500">Produk tidak ditemukan</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">📝 Resep: {product.name}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Atur bahan baku yang dibutuhkan untuk produk ini</p>
          <button type="button" onClick={addRow} className="text-sm text-red-600 hover:text-red-800">+ Tambah Bahan</button>
        </div>

        <div className="space-y-2">
          {recipe.map((r, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <select value={r.ingredientId} onChange={(e) => updateRow(idx, 'ingredientId', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none">
                <option value="">Pilih bahan...</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name} (stok: {ing.stock} {ing.unit})</option>
                ))}
              </select>
              <input type="number" min="0" value={r.qty} onChange={(e) => updateRow(idx, 'qty', e.target.value)} placeholder="Jumlah" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none" />
              <input type="text" value={r.unit} readOnly placeholder="Unit" className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" />
              {recipe.length > 1 && (
                <button type="button" onClick={() => removeRow(idx)} className="px-3 py-2 text-red-500 hover:text-red-700 text-sm">✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition">Simpan Resep</button>
          <button type="button" onClick={() => navigate('/products')} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Batal</button>
        </div>
      </form>
    </div>
  );
}
