import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit').then(({ data }) => setLogs(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">📋 Audit Log</h1>
        <button onClick={() => api.get('/audit').then(({ data }) => setLogs(data))} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">🔄 Refresh</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Waktu</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Aksi</th>
                <th className="text-left px-4 py-3 font-medium">Entitas</th>
                <th className="text-left px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.user?.name} <span className="text-xs text-gray-400">({log.user?.role})</span></td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === 'VOID' ? 'bg-red-100 text-red-700' :
                      log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                      log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.entity} #{log.entityId}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs">
                    {log.details ? (
                      <div className="space-y-0.5">
                        {Object.entries(log.details).map(([key, val]) => (
                          <div key={key} className="flex gap-1">
                            <span className="text-gray-400 font-medium">{key}:</span>
                            <span className="text-gray-600 truncate">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    ) : '−'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada aktivitas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}