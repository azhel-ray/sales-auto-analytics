import { useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('daily');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleExportPdf = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/export/pdf?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${startDate}-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF berhasil di-download');
    } catch {
      toast.error('Gagal export PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/export/excel?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${startDate}-${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel berhasil di-download');
    } catch {
      toast.error('Gagal export Excel');
    } finally {
      setLoading(false);
    }
  };

  const setQuickPeriod = (type) => {
    const end = new Date();
    let start = new Date();
    switch (type) {
      case 'daily':
        setPeriod('daily');
        setStartDate(end.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        setPeriod('weekly');
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        setPeriod('monthly');
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        break;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">📄 Laporan</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Periode Cepat</h2>
          <div className="flex gap-2">
            {[
              { label: 'Harian', value: 'daily' },
              { label: 'Mingguan', value: 'weekly' },
              { label: 'Bulanan', value: 'monthly' },
            ].map((p) => (
              <button key={p.value} onClick={() => setQuickPeriod(p.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${period === p.value ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Atur Tanggal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tanggal Mulai</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tanggal Akhir</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={handleExportPdf} disabled={loading} className="py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? 'Memproses...' : '📄 Export PDF'}
          </button>
          <button onClick={handleExportExcel} disabled={loading} className="py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? 'Memproses...' : '📊 Export Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
