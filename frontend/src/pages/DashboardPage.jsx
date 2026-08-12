import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ icon, label, value, color, growth, growthLabel }) {
  return (
    <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] md:text-sm text-gray-500 truncate">{label}</p>
          <p className="text-sm md:text-2xl font-bold text-gray-900 mt-0.5 md:mt-1 truncate">{value}</p>
          {growth !== undefined && (
            <p className={`text-[10px] md:text-xs mt-0.5 md:mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}% dari {growthLabel || 'kemarin'}
            </p>
          )}
        </div>
        <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-base md:text-2xl flex-shrink-0 ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [profitChart, setProfitChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [memberSummary, setMemberSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let interval;
    const fetchData = async () => {
      try {
        let summaryUrl = `/dashboard/summary?period=${period}`;
        if (period === 'custom') {
          summaryUrl += `&startDate=${customStart}&endDate=${customEnd}`;
        }
        const [s, sc, pc, tp, ph, ms] = await Promise.all([
          api.get(summaryUrl),
          api.get('/dashboard/sales-chart?days=7'),
          api.get('/dashboard/profit-chart?months=6'),
          api.get('/dashboard/top-products?limit=5'),
          api.get('/dashboard/peak-hours'),
          api.get('/dashboard/member-summary'),
        ]);
        setSummary(s.data);
        setSalesChart(sc.data);
        setProfitChart(pc.data);
        setTopProducts(tp.data);
        setPeakHours(ph.data);
        setMemberSummary(ms.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [period, customStart, customEnd]);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isOwner = user.role === 'OWNER';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2">
        {[
          { label: 'Harian', value: 'daily' },
          { label: 'Bulanan', value: 'monthly' },
          { label: 'Tahunan', value: 'yearly' },
          { label: 'Kustom', value: 'custom' },
        ].map((p) => (
          <button key={p.value} onClick={() => setPeriod(p.value)} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${period === p.value ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.label}</button>
        ))}
        {period === 'custom' && <>
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-red-500 outline-none" />
          <span className="self-center text-gray-500 text-xs md:text-sm">s/d</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-red-500 outline-none" />
        </>}
      </div>

      {isOwner && (summary?.negativeStockIngredients?.length > 0 || summary?.outOfStockProducts?.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-red-800">⛔ Perhatian — Data Perlu Ditindaklanjuti</h3>
          {summary?.negativeStockIngredients?.length > 0 && (
            <p className="text-sm text-red-700">
              🥩 Bahan baku minus: {summary.negativeStockIngredients.map(i => `${i.name} (${i.stock} ${i.unit})`).join(', ')}
              {' — '}
              <Link to="/ingredients" className="underline font-medium hover:text-red-900">Atur stok →</Link>
            </p>
          )}
          {summary?.outOfStockProducts?.length > 0 && (
            <p className="text-sm text-red-700">
              🍗 Produk habis: {summary.outOfStockProducts.map(p => p.name).join(', ')}
              {' — '}
              <Link to="/production" className="underline font-medium hover:text-red-900">Produksi sekarang →</Link>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon="💰" label={`Omzet ${summary?.currentPeriodLabel || 'Hari Ini'}`} value={`Rp ${(summary?.todayRevenue || 0).toLocaleString('id-ID')}`} color="bg-green-50" growth={(() => { const y = summary?.yesterdayRevenue || 0; const t = summary?.todayRevenue || 0; return y > 0 ? ((t - y) / y) * 100 : t > 0 ? 100 : 0; })()} growthLabel={summary?.prevPeriodLabel} />
        <StatCard icon="🛒" label={`Transaksi ${summary?.currentPeriodLabel || 'Hari Ini'}`} value={summary?.todayTransactionCount || 0} color="bg-blue-50" growth={(() => { const y = summary?.yesterdayTransactionCount || 0; const t = summary?.todayTransactionCount || 0; return y > 0 ? ((t - y) / y) * 100 : t > 0 ? 100 : 0; })()} growthLabel={summary?.prevPeriodLabel} />
        <StatCard icon="👥" label="Total Member" value={summary?.totalMembers || 0} color="bg-purple-50" />
        <StatCard icon="⚠️" label="Stok Menipis" value={summary?.lowStockCount || 0} color="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">📈 Penjualan 7 Hari Terakhir</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} />
              <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">📊 Profit per Bulan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={profitChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `Rp ${v.toLocaleString('id-ID')}`} />
              <Bar dataKey="profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">🏆 Produk Terlaris</h2>
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 w-6">#{i + 1}</span>
                  <span className="text-sm text-gray-700">{item.product?.name || 'Unknown'}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.totalSold} terjual</span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-gray-400">Belum ada data</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">🕐 Jam Sibuk</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}:00`} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} transaksi`, 'Jumlah']} />
              <Area type="monotone" dataKey="count" stroke="#f97316" fill="#fed7aa" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">👥 Top Member</h2>
          <div className="space-y-3">
            {memberSummary?.topMembers?.slice(0, 5).map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 w-6">#{i + 1}</span>
                  <span className="text-sm text-gray-700">{m.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{m.totalPoints} poin</span>
              </div>
            ))}
            {(!memberSummary?.topMembers || memberSummary.topMembers.length === 0) && <p className="text-sm text-gray-400">Belum ada member</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
