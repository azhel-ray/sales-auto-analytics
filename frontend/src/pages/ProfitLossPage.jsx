import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function ProfitLossPage() {
  const [profitData, setProfitData] = useState(null);
  const [prevProfitData, setPrevProfitData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPL = async () => {
      try {
        const { data } = await api.get('/dashboard/profit-chart?months=2');
        setProfitData(data[1] || null);
        setPrevProfitData(data[0] || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPL();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  const revenue = profitData?.totalRevenue || 0;
  const totalTax = profitData?.totalTax || 0;
  const cogs = profitData?.totalCogs || 0;
  const voucherCogs = profitData?.totalVoucherCogs || 0;
  const expenses = profitData?.totalExpenses || 0;
  const totalCost = profitData?.totalCost || 0;
  const profit = profitData?.profit || 0;
  const profitPct = profitData?.profitPercentage || 0;
  const txCount = profitData?.transactionCount || 0;
  const curMonth = profitData?.month || 'Bulan ini';

  const prevProfit = prevProfitData?.profit || 0;
  const profitChange = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : profit > 0 ? 100 : profit < 0 ? -100 : 0;

  const getRecommendation = () => {
    if (profit >= 0 && profitChange >= 0) return 'Profit naik ' + profitChange.toFixed(1) + '% dibanding bulan lalu, pertahankan! 📈';
    if (profit >= 0 && profitChange < 0) return 'Profit turun ' + Math.abs(profitChange).toFixed(1) + '% dibanding bulan lalu, evaluasi biaya! 📉';
    if (profit < 0 && profitChange >= 0) return 'Perbaikan! Rugi berkurang ' + profitChange.toFixed(1) + '% dari bulan lalu 👍';
    return 'Rugi meningkat ' + Math.abs(profitChange).toFixed(1) + '% dari bulan lalu, lakukan evaluasi! 🚨';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">📈 Profit & Loss — {curMonth}</h1>

      <div className={`p-4 rounded-xl border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <p className="text-sm font-medium">{getRecommendation()}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm border border-gray-100">
          <p className="text-[10px] md:text-sm text-gray-500 mb-1">Pendapatan</p>
          <p className="text-sm md:text-3xl font-bold text-green-600">Rp {revenue.toLocaleString('id-ID')}</p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">{txCount} transaksi</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm border border-gray-100">
          <p className="text-[10px] md:text-sm text-gray-500 mb-1">COGS</p>
          <p className="text-sm md:text-3xl font-bold text-orange-600">Rp {cogs.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm border border-gray-100">
          <p className="text-[10px] md:text-sm text-gray-500 mb-1">Biaya</p>
          <p className="text-sm md:text-3xl font-bold text-red-600">Rp {expenses.toLocaleString('id-ID')}</p>
        </div>
        <div className={`bg-white rounded-xl p-3 md:p-6 shadow-sm border ${profit >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <p className="text-[10px] md:text-sm text-gray-500 mb-1">{profit >= 0 ? 'Laba Bersih' : 'Rugi'}</p>
          <p className={`text-sm md:text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] md:text-xs mt-0.5 md:mt-1">
            <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>{profitPct}%</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {prevProfitData && <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Bulan lalu ({prevProfitData.month})</p>
          <p className={`text-lg font-bold ${prevProfitData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {prevProfitData.profit >= 0 ? '+' : ''}Rp {prevProfitData.profit.toLocaleString('id-ID')}
          </p>
        </div>}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Bulan ini ({curMonth})</p>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
          </p>
        </div>
        <div className={`bg-white rounded-xl p-4 shadow-sm border ${profitChange >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Perubahan</p>
          <p className={`text-lg font-bold ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {profitChange >= 0 ? '▲' : '▼'} {Math.abs(profitChange).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Perhitungan</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Pendapatan (Omzet, sblm PPN)</span>
            <span className="font-semibold text-green-600">+ Rp {revenue.toLocaleString('id-ID')}</span>
          </div>
          {totalTax > 0 && <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 ml-4">↳ PPN 11%</span>
            <span className="font-semibold text-gray-500">Rp {totalTax.toLocaleString('id-ID')}</span>
          </div>}
          <div className="border-t border-gray-100" />
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Harga Pokok Penjualan (COGS)</span>
            <span className="font-semibold text-orange-600">− Rp {cogs.toLocaleString('id-ID')}</span>
          </div>
          {voucherCogs > 0 && <div className="flex justify-between items-center py-2 text-xs text-gray-400">
            <span className="ml-4">↳ Termasuk Rp {voucherCogs.toLocaleString('id-ID')} dari Voucher Gratis</span>
            <span>(sudah dalam COGS)</span>
          </div>}
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Biaya Operasional</span>
            <span className="font-semibold text-red-600">− Rp {expenses.toLocaleString('id-ID')}</span>
          </div>
          <div className="border-t border-gray-200 border-dashed" />
          <div className="flex justify-between items-center py-2 text-lg">
            <span className="font-bold text-gray-900">Profit / Loss</span>
            <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profit >= 0 ? '+' : ''}Rp {profit.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-500">Margin Profit</span>
            <span className={`text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitPct}%</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-500">Status</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {profit >= 0 ? '✅ UNTUNG' : '❌ RUGI'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
