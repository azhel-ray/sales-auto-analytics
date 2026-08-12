import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [memberPhone, setMemberPhone] = useState('');
  const [member, setMember] = useState(null);
  const [discountTiers, setDiscountTiers] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [applyTax, setApplyTax] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [settings, setSettings] = useState({ tax_rate: '11', store_name: 'Geprek Bensu' });
  const [payMethods, setPayMethods] = useState([]);

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data)).catch(console.error);
    api.get('/voucher-rewards').then(({ data }) => setDiscountTiers(data)).catch(console.error);
    api.get('/settings').then(({ data }) => setSettings(data)).catch(console.error);
    api.get('/master/payment-methods').then(({ data }) => setPayMethods(data)).catch(console.error);
  }, []);

  const taxRate = parseInt(settings.tax_rate) || 11;
  const storeName = settings.store_name || 'Geprek Bensu';

  const searchMember = async () => {
    if (!memberPhone) return;
    setSearchLoading(true);
    try {
      const { data } = await api.get(`/members/search?phone=${memberPhone}`);
      setMember(data);
    } catch {
      toast.error('Member tidak ditemukan');
      setMember(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const addToCart = (product) => {
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      setCart(cart.map((c) => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, category: product.category, qty: 1 }]);
    }
  };

  const updateQty = (productId, delta) => {
    setCart(cart.map((c) => {
      if (c.productId !== productId) return c;
      const newQty = c.qty + delta;
      return newQty <= 0 ? null : { ...c, qty: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((c) => c.productId !== productId));
  };

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const discountPct = selectedDiscount?.discountPct || 0;
  const freeProduct = selectedDiscount?.freeItem ? cart.find(c => selectedDiscount.freeItem === c.name) : null;
  const discountAmount = discountPct > 0 && !selectedDiscount?.freeItem ? (total * discountPct) / 100 : freeProduct ? freeProduct.price : 0;
  const taxPct = applyTax ? taxRate : 0;
  const taxAmount = (total - discountAmount) * taxPct / 100;
  const finalTotal = total - discountAmount + taxAmount;

  const handlePrintReceipt = () => {
    const itemsHtml = receipt.items.map((item) =>
      `<tr><td style="padding:2px 0">${item.name}</td><td style="text-align:center;padding:2px 0">${item.qty}</td><td style="text-align:right;padding:2px 0">Rp ${item.price.toLocaleString('id-ID')}</td></tr>`
    ).join('');
    const totalQty = receipt.items.reduce((s, i) => s + i.qty, 0);
    const discountHtml = receipt.discountLabel
      ? `<div style="display:flex;justify-content:space-between;color:#15803d"><span>${receipt.discountLabel}</span><span>−Rp ${receipt.discountAmount.toLocaleString('id-ID')}</span></div>`
      : '';
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);
    const printWin = iframe.contentWindow;
    printWin.document.write(`
      <html><head><title>Struk Pembayaran</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { margin: 0; padding: 12px; font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; color: #666; border-bottom: 1px solid #ccc; padding: 4px 0; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3) { text-align: right; }
        .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 12px; margin-bottom: 12px; }
        .header h2 { margin: 0; font-size: 14px; }
        .header p { margin: 2px 0; font-size: 10px; color: #666; }
        .summary { border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; font-size: 12px; }
        .summary > div { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-weight: bold; font-size: 14px; border-top: 2px solid #666; padding-top: 4px; margin-top: 4px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; padding-top: 12px; border-top: 1px solid #ccc; }
        .payment { font-size: 10px; color: #666; }
      </style>
      </head><body>
        <div class="header">
          <h2>${storeName}</h2>
          <p>${receipt.date}</p>
          <p>Kasir: ${receipt.cashier}</p>
          ${receipt.memberName ? `<p>Member: ${receipt.memberName}</p>` : ''}
        </div>
        <table>
          <thead><tr><th>Menu</th><th>Qty</th><th>Harga</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary">
          <div><span>Subtotal</span><span>Rp ${receipt.subtotal.toLocaleString('id-ID')}</span></div>
          ${discountHtml}
          <div class="total"><span>Total (${totalQty} item)</span><span>Rp ${Math.round(receipt.finalTotal).toLocaleString('id-ID')}</span></div>
          <div class="payment"><span>Pembayaran</span><span>${receipt.paymentMethod}</span></div>
        </div>
        <div class="footer"><p>Terima kasih atas kunjungan Anda</p></div>
        <script>window.onload=function(){window.onafterprint=function(){window.close()};window.print();setTimeout(function(){window.close()},1e3)};<\/script>
      </body></html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return toast.error('Pilih produk terlebih dahulu');
    setLoading(true);
    try {
      const payload = {
        items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
        paymentMethod,
        ...(applyTax && { taxPct: taxRate }),
        ...(member && { memberId: member.id }),
        ...(selectedDiscount && {
          pointsToRedeem: selectedDiscount.pointsCost,
          redeemDiscountType: selectedDiscount.name,
        }),
      };
      const { data } = await api.post('/transactions', payload);
      setReceipt({
        transactionId: data.id,
        date: new Date().toLocaleString('id-ID'),
        cashier: JSON.parse(sessionStorage.getItem('user') || '{}')?.name || 'Kasir',
        items: cart.map(c => ({ name: c.name, price: c.price, qty: c.qty, subtotal: c.price * c.qty })),
        subtotal: total,
        discountLabel: selectedDiscount
          ? selectedDiscount.freeItem
            ? selectedDiscount.name
            : `Diskon ${data.discountPct}%`
          : null,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount || 0,
        finalTotal: data.finalAmount,
        paymentMethod: payMethods.find(p => p.code === paymentMethod)?.name || paymentMethod,
        pointsEarned: data.pointsEarned,
        pointsRedeemed: data.pointsRedeemed,
        memberName: member?.name || null,
      });
      const msg = [`Transaksi berhasil!`];
      if (data.pointsEarned > 0) msg.push(`+${data.pointsEarned} poin`);
      if (data.pointsRedeemed > 0) msg.push(`-${data.pointsRedeemed} poin (diskon)`);
      toast.success(msg.join(' '));
      if (data.stockWarnings?.length > 0) {
        data.stockWarnings.forEach(w => toast(w, { icon: '⚠️', style: { background: '#fef3c7', color: '#92400e' } }));
      }
      setCart([]);
      setSelectedDiscount(null);
      if (member) searchMember();
    } catch (err) {
      const msg = err.response?.data?.error || 'Transaksi gagal';
      const details = err.response?.data?.details;
      if (details) {
        details.forEach((d) => toast.error(d.message || `Stok ${d.ingredientName || d.name} tidak cukup (kurang ${d.shortage || d.needed - d.stock})`));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const groupedProducts = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4 md:space-y-6 print:hidden">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">💰 Input Penjualan</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cari Member</h2>
            <div className="flex gap-2">
              <input type="text" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="Nomor HP member..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
              <button onClick={searchMember} disabled={searchLoading} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50">
                {searchLoading ? '...' : 'Cari'}
              </button>
              {member && <button onClick={() => { setMember(null); setMemberPhone(''); setSelectedDiscount(null); }} className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Hapus</button>}
            </div>
            {member && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-green-800">{member.name} - 📞 {member.phone}</p>
                <p className="text-sm text-green-600">Poin: {Math.floor(member.points)} | Total Transaksi: {member._count?.transactions || 0}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pilih Produk</h2>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-4">
            {Object.entries(groupedProducts).map(([category, prods]) => (
              <div key={category} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {prods.map((p) => (
                    <button key={p.id} onClick={() => addToCart(p)} className="p-3 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg text-left transition relative">
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500">Rp {p.price.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-orange-500">+{p.points} poin</p>
                      {p.ingredients?.length > 0 && (
                        <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${p.stock > 0 ? (p.stock <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700') : 'bg-red-100 text-red-700'}`}>
                          {p.stock > 0 ? `${p.stock}` : 'Habis'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🛒 Keranjang</h2>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada item</p>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">Rp {c.price.toLocaleString('id-ID')} × {c.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(c.productId, -1)} className="w-7 h-7 bg-gray-200 rounded-full text-sm hover:bg-gray-300">−</button>
                      <span className="w-6 text-center text-sm font-medium">{c.qty}</span>
                      <button onClick={() => updateQty(c.productId, 1)} className="w-7 h-7 bg-gray-200 rounded-full text-sm hover:bg-gray-300">+</button>
                      <button onClick={() => removeFromCart(c.productId)} className="ml-1 text-red-500 hover:text-red-700 text-sm">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr className="my-3" />

            {member && discountTiers.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2">🎫 Tukar Poin (Saat Pembayaran)</h3>
                <p className="text-xs text-gray-500 mb-2">Poin saat ini: <strong className="text-orange-600">{Math.floor(member.points)}</strong></p>
                <div className="space-y-1">
                  {discountTiers.filter(r => r.isActive).map((t) => {
                    const canAfford = member.points >= t.pointsCost;
                    const isSelected = selectedDiscount?.name === t.name;
                    return (
                      <button key={t.id || t.name} onClick={() => setSelectedDiscount(isSelected ? null : t)} disabled={!canAfford} className={`w-full text-left p-2 rounded-lg text-sm border transition ${isSelected ? 'border-red-500 bg-red-50' : canAfford ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                        <div className="flex justify-between items-center">
                          <span className={canAfford ? 'text-gray-900' : 'text-gray-400'}>{t.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${canAfford ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{canAfford ? `${t.pointsCost} poin` : `${t.pointsCost - member.points} poin lagi`}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rp {total.toLocaleString('id-ID')}</span></div>
              {discountPct > 0 && <div className="flex justify-between text-green-600"><span>Diskon {discountPct}%</span><span>−Rp {discountAmount.toLocaleString('id-ID')}</span></div>}
              {selectedDiscount?.freeItem && <div className="flex justify-between text-green-600"><span>{selectedDiscount.name}</span><span>−Rp {discountAmount.toLocaleString('id-ID')}</span></div>}
              {selectedDiscount && <div className="flex justify-between text-orange-600 text-xs"><span>Poin dipakai</span><span>−{selectedDiscount.pointsCost} poin</span></div>}
              {applyTax && <div className="flex justify-between text-gray-500 text-xs"><span>PPN 11%</span><span>+Rp {Math.round(taxAmount).toLocaleString('id-ID')}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t"><span>Total</span><span>Rp {Math.round(finalTotal).toLocaleString('id-ID')}</span></div>
            </div>

            <div className="mt-4">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3">
                {payMethods.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.code}>{p.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 mb-3 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} className="accent-red-600" />
                PPN {taxRate}% {applyTax && <span className="text-red-600">(+Rp {Math.round(taxAmount).toLocaleString('id-ID')})</span>}
              </label>
              <button onClick={handleSubmit} disabled={loading || cart.length === 0} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50">
                {loading ? 'Memproses...' : '💰 Bayar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setReceipt(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-y-auto max-h-[90vh]">
            <div className="p-6">
              <div className="text-center border-b border-gray-300 pb-3 mb-3">
                <h2 className="text-lg font-bold">{storeName}</h2>
                <p className="text-sm text-gray-500">{receipt.date}</p>
                <p className="text-xs text-gray-400">Kasir: {receipt.cashier}</p>
                {receipt.memberName && <p className="text-xs text-gray-400">Member: {receipt.memberName}</p>}
              </div>

              <table className="w-full mb-3">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-300">
                    <th className="text-left py-1">Menu</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-1">{item.name}</td>
                      <td className="text-center py-1">{item.qty}</td>
                      <td className="text-right py-1">Rp {item.price.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-sm border-t border-gray-300 pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>Rp {receipt.subtotal.toLocaleString('id-ID')}</span></div>
                {receipt.discountLabel && (
                  <div className="flex justify-between text-green-700"><span>{receipt.discountLabel}</span><span>−Rp {receipt.discountAmount.toLocaleString('id-ID')}</span></div>
                )}
                {receipt.taxAmount > 0 && <div className="flex justify-between text-xs text-gray-500"><span>PPN 11%</span><span>Rp {Math.round(receipt.taxAmount).toLocaleString('id-ID')}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-400"><span>Total ({receipt.items.reduce((s, i) => s + i.qty, 0)} item)</span><span>Rp {Math.round(receipt.finalTotal).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-xs text-gray-500"><span>Pembayaran</span><span>{receipt.paymentMethod}</span></div>
              </div>

              <div className="text-center text-xs text-gray-400 mt-4 pt-3 border-t border-gray-300">
                <p>Terima kasih atas kunjungan Anda</p>
              </div>
            </div>

            <div className="flex gap-2 p-4 pt-0">
              <button onClick={handlePrintReceipt} className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition">🖨️ Cetak</button>
              <button onClick={() => setReceipt(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
