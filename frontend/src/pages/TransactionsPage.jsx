import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payMethods, setPayMethods] = useState([]);
  const [storeName, setStoreName] = useState('Geprek Bensu');

  useEffect(() => {
    api.get('/master/payment-methods').then(({ data }) => setPayMethods(data)).catch(() => {});
    api.get('/settings').then(({ data }) => setStoreName(data.store_name || 'Geprek Bensu')).catch(() => {});
  }, []);

  useEffect(() => { fetchTransactions(); }, [selectedMonth]);

  const fetchTransactions = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      const { data } = await api.get(`/transactions?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const handleVoid = async () => {
    if (!refundModal || !refundReason.trim()) return;
    setRefunding(true);
    try {
      const { data } = await api.post(`/transactions/${refundModal.id}/void`, { reason: refundReason });
      toast.success('Transaksi berhasil di-refund');
      setRefundModal(null);
      setRefundReason('');
      fetchTransactions();
      if (data.transaction) {
        setTimeout(() => printRefundReceipt(data.transaction), 500);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal void');
    } finally {
      setRefunding(false);
    }
  };

  const isOver1Day = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff > 24 * 60 * 60 * 1000;
  };

  const filtered = transactions.filter((t) =>
    t.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.member?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getPayMethodName = (code) => payMethods.find(p => p.code === code)?.name || code;

  const printFromIframe = (title, html) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  const printRefundReceipt = (t) => {
    const itemsHtml = (t.items || []).map((item) =>
      `<tr><td style="padding:3px 0">${item.product?.name || 'Produk'}</td><td style="text-align:center;padding:3px 0">${item.qty}</td><td style="text-align:right;padding:3px 0">Rp ${item.price.toLocaleString('id-ID')}</td></tr>`
    ).join('');
    const discountLabel = t.discountPct > 0 ? `Diskon ${t.discountPct}%` : t.discountAmount > 0 ? 'Gratis 1 Ayam' : null;
    const payMethod = getPayMethodName(t.paymentMethod);
    const voidDate = t.voidedAt ? new Date(t.voidedAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');

    printFromIframe('Refund ' + t.invoiceNumber, `
      <html><head><title>Refund ${t.invoiceNumber}</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { margin: 0; padding: 12px; font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; color: #666; border-bottom: 1px solid #ccc; padding: 4px 0; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3) { text-align: right; }
        .header { text-align: center; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-bottom: 10px; }
        .header h1 { margin: 0; font-size: 16px; color: #dc2626; }
        .header h2 { margin: 4px 0 0; font-size: 14px; }
        .header p { margin: 2px 0; font-size: 10px; color: #666; }
        .summary { border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; font-size: 12px; }
        .summary > div { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-weight: bold; font-size: 14px; border-top: 2px solid #666; padding-top: 4px; margin-top: 4px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ccc; }
        .refund-note { text-align: center; color: #dc2626; font-weight: bold; margin: 6px 0; }
      </style>
      </head><body>
        <div class="header">
          <h1>★ REFUND ★</h1>
          <h2>${storeName}</h2>
          <p>Tgl Refund: ${voidDate}</p>
          <p>Invoice: ${t.invoiceNumber}</p>
          <p>Kasir: ${t.user?.name || '-'} (${t.user?.role || '-'})</p>
          ${t.member ? '<p>Member: ' + t.member.name + '</p>' : ''}
          ${t.voidReason ? '<p>Alasan: ' + t.voidReason + '</p>' : ''}
        </div>
        <div class="refund-note">Barang Dikembalikan</div>
        <table>
          <thead><tr><th>Menu</th><th>Qty</th><th>Harga</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary">
          <div><span>Subtotal</span><span>Rp ${t.totalAmount.toLocaleString('id-ID')}</span></div>
          ${discountLabel ? '<div style="display:flex;justify-content:space-between;color:#15803d"><span>' + discountLabel + '</span><span>−Rp ' + t.discountAmount.toLocaleString('id-ID') + '</span></div>' : ''}
          <div class="total"><span>Total Refund</span><span>Rp ${t.finalAmount.toLocaleString('id-ID')}</span></div>
          <div class="payment"><span>Pembayaran</span><span>${payMethod}</span></div>
          ${t.member && t.pointsEarned > 0 ? '<div style="display:flex;justify-content:space-between;font-size:10px;color:#dc2626"><span>Poin dikembalikan</span><span>-' + t.pointsEarned + '</span></div>' : ''}
        </div>
        <div class="footer"><p>Terima kasih</p></div>
        <script>window.onload=function(){window.onafterprint=function(){window.close()};window.print();setTimeout(function(){window.close()},1e3)};<\/script>
      </body></html>
    `);
  };

  const printReceipt = (t) => {
    const itemsHtml = (t.items || []).map((item) =>
      `<tr><td style="padding:3px 0">${item.product?.name || 'Produk'}</td><td style="text-align:center;padding:3px 0">${item.qty}</td><td style="text-align:right;padding:3px 0">Rp ${item.price.toLocaleString('id-ID')}</td></tr>`
    ).join('');
    const discountLabel = t.discountPct > 0 ? `Diskon ${t.discountPct}%` : t.discountAmount > 0 ? 'Gratis 1 Ayam' : null;
    const payMethod = getPayMethodName(t.paymentMethod);

    printFromIframe('Struk ' + t.invoiceNumber, `
      <html><head><title>Struk ${t.invoiceNumber}</title>
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { margin: 0; padding: 12px; font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; color: #666; border-bottom: 1px solid #ccc; padding: 4px 0; }
        th:nth-child(2) { text-align: center; }
        th:nth-child(3) { text-align: right; }
        .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
        .header h2 { margin: 0; font-size: 14px; }
        .header p { margin: 2px 0; font-size: 10px; color: #666; }
        .summary { border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; font-size: 12px; }
        .summary > div { display: flex; justify-content: space-between; margin: 2px 0; }
        .total { font-weight: bold; font-size: 14px; border-top: 2px solid #666; padding-top: 4px; margin-top: 4px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ccc; }
        .payment { font-size: 10px; color: #666; }
      </style>
      </head><body>
        <div class="header">
          <h2>${storeName}</h2>
          <p>${new Date(t.createdAt).toLocaleString('id-ID')}</p>
          <p>${t.invoiceNumber}</p>
          <p>Kasir: ${t.user?.name || '-'}</p>
          ${t.member ? '<p>Member: ' + t.member.name + '</p>' : ''}
        </div>
        <table>
          <thead><tr><th>Menu</th><th>Qty</th><th>Harga</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="summary">
          <div><span>Subtotal</span><span>Rp ${t.totalAmount.toLocaleString('id-ID')}</span></div>
          ${discountLabel ? '<div style="display:flex;justify-content:space-between;color:#15803d"><span>' + discountLabel + '</span><span>−Rp ' + t.discountAmount.toLocaleString('id-ID') + '</span></div>' : ''}
          <div class="total"><span>Total (${(t.items || []).reduce((s, i) => s + i.qty, 0)} item)</span><span>Rp ${t.finalAmount.toLocaleString('id-ID')}</span></div>
          <div class="payment"><span>Pembayaran</span><span>${payMethod}</span></div>
          ${t.member && t.pointsEarned > 0 ? '<div style="display:flex;justify-content:space-between;font-size:10px;color:#2563eb"><span>Poin didapat</span><span>+' + t.pointsEarned + '</span></div>' : ''}
        </div>
        <div class="footer"><p>Terima kasih atas kunjungan Anda</p></div>
        <script>window.onload=function(){window.onafterprint=function(){window.close()};window.print();setTimeout(function(){window.close()},1e3)};<\/script>
      </body></html>
    `);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <><div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">📋 Riwayat Transaksi</h1>
        <button onClick={fetchTransactions} className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs md:text-sm">🔄 Refresh</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-gray-100 flex flex-col md:flex-row gap-2 md:gap-3">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari invoice atau member..." className="w-full md:flex-1 px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
        </div>
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Member</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Kasir</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Diskon</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">PPN</th>
                <th className="text-right px-4 py-3 font-medium">Final</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Poin</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tanggal</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const isVoided = t.status === 'VOIDED';
                return (
                <tr key={t.id} className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{t.member?.name || '−'}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{t.user?.name || '−'}</td>
                  <td className="px-4 py-3 text-right">Rp {t.totalAmount.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-green-600 hidden md:table-cell">{t.discountAmount > 0 ? `−Rp ${t.discountAmount.toLocaleString('id-ID')}` : '−'}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">{t.taxAmount > 0 ? `Rp ${t.taxAmount.toLocaleString('id-ID')}` : '−'}</td>
                  <td className="px-4 py-3 text-right font-semibold">Rp {t.finalAmount.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {t.pointsEarned > 0 ? <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">+{t.pointsEarned}</span> : '−'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{new Date(t.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-center">
                    {isVoided
                      ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs" title={t.voidReason || ''}>VOID</span>
                      : <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Aktif</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isVoided ? (
                      <button onClick={() => printRefundReceipt(t)} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium" title="Cetak struk refund">🧾 Refund</button>
                    ) : (
                      <>
                        <button onClick={() => printReceipt(t)} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium mr-2" title="Cetak struk">🖨️</button>
                        {isOver1Day(t.createdAt) ? (
                          <span className="text-gray-300 text-xs cursor-not-allowed" title="Refund hanya bisa dilakukan dalam 1x24 jam">Refund</span>
                        ) : (
                          <button onClick={() => { setRefundModal(t); setRefundReason(''); }} className="px-3 py-2 text-sm text-gray-500 hover:text-red-700 font-medium">Refund</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )})}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Belum ada transaksi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {refundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !refunding && setRefundModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Refund Transaksi</h3>
              <p className="text-red-100 text-sm mt-1">{refundModal.invoiceNumber}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Refund</label>
                <textarea
                  autoFocus
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Masukkan alasan refund..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none h-24 text-sm"
                />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                ⚠️ Stok produk akan dikembalikan. Poin member (jika ada) akan dikurangkan.
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setRefundModal(null); setRefundReason(''); }}
                disabled={refunding}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleVoid}
                disabled={refunding || !refundReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {refunding ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Memproses...</>
                ) : 'Konfirmasi Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
