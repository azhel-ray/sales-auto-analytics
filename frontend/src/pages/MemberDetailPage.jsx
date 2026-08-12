import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = async () => {
    try {
      const { data } = await api.get(`/members/${id}`);
      setMember(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMember(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;
  if (!member) return <p className="text-gray-500">Member tidak ditemukan</p>;

  const earnedPoints = member.pointHistories?.filter((h) => h.type === 'EARNED').reduce((s, h) => s + h.points, 0) || 0;
  const redeemedPoints = member.pointHistories?.filter((h) => h.type === 'REDEEMED').reduce((s, h) => s + Math.abs(h.points), 0) || 0;

  const formatPoints = (amount) => (amount > 0 ? '+' : '') + amount;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/members')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">← Kembali ke Member</button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-2xl">👤</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
              <p className="text-sm text-gray-500">📞 {member.phone}</p>
              {member.email && <p className="text-sm text-gray-500">✉️ {member.email}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-orange-600">{Math.floor(member.points)}</p>
              <p className="text-xs text-gray-500">Poin Balance</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-600">{member._count?.transactions || 0}</p>
              <p className="text-xs text-gray-500">Transaksi</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-lg font-bold text-green-600">{earnedPoints}</p>
              <p className="text-xs text-gray-500">Poin Diperoleh</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-lg font-bold text-red-600">{redeemedPoints}</p>
              <p className="text-xs text-gray-500">Poin Ditukar</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-700">💡 Tukar poin tersedia saat melakukan pembayaran di halaman <strong>Input Penjualan</strong>. Poin akan otomatis berkurang saat diskon dipilih.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎟️ Voucher Aktif</h2>
          {member.vouchers?.filter((v) => !v.isUsed).length > 0 ? (
            <div className="space-y-2">
              {member.vouchers.filter((v) => !v.isUsed).map((v) => (
                <div key={v.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-sm text-gray-900">{v.discountPct ? `Diskon ${v.discountPct}%` : v.freeItem}</p>
                  <p className="text-xs text-gray-500">{v.code}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Belum ada voucher aktif</p>
          )}

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">📜 Riwayat Poin</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {member.pointHistories?.slice(0, 30).map((h) => (
              <div key={h.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 text-sm">
                <div>
                  <span className={h.type === 'EARNED' ? 'text-green-700' : 'text-red-700'}>
                    {h.type === 'EARNED' ? '✅' : '🔴'} {h.description}
                  </span>
                </div>
                <span className={`font-medium ${h.type === 'EARNED' ? 'text-green-600' : 'text-red-600'}`}>{formatPoints(h.points)}</span>
              </div>
            ))}
            {(!member.pointHistories || member.pointHistories.length === 0) && <p className="text-sm text-gray-400">Belum ada riwayat</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
