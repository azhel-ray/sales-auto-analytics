import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const notifMap = {
  '/transactions': 'transactionsToday',
  '/members': 'newMembersToday',
  '/expenses': 'expensesToday',
  '/inventory': 'lowStockCount',
  '/ingredients': 'lowStockCount',
  '/audit': 'auditLogsToday',
};

const standaloneItems = [
  { path: '/', label: 'Dashboard', icon: '📊', roles: ['OWNER', 'KASIR'] },
];

const bottomItems = [
  { path: '/audit', label: 'Audit Log', icon: '📋', roles: ['OWNER'] },
];

const navGroups = [
  {
    label: 'Transaksi',
    roles: ['OWNER', 'KASIR'],
    defaultOpen: true,
    items: [
      { path: '/sales', label: 'Input Penjualan', icon: '💰', roles: ['KASIR'] },
      { path: '/transactions', label: 'Riwayat Transaksi', icon: '📋' },
    ],
  },
  {
    label: 'Data Master',
    roles: ['OWNER', 'KASIR'],
    items: [
      { path: '/members', label: 'Member', icon: '👥' },
      { path: '/products', label: 'Produk', icon: '🍗', roles: ['OWNER'] },
      { path: '/ingredients', label: 'Bahan Baku', icon: '🥩', roles: ['OWNER'] },
      { path: '/voucher-rewards', label: 'Voucher Reward', icon: '🎁', roles: ['OWNER'] },
    ],
  },
  {
    label: 'Inventory',
    roles: ['OWNER'],
    items: [
      { path: '/inventory', label: 'Stok Bahan', icon: '📦' },
      { path: '/production', label: 'Produksi', icon: '🏭' },
    ],
  },
  {
    label: 'Keuangan',
    roles: ['OWNER', 'KASIR'],
    items: [
      { path: '/expenses', label: 'Pengeluaran', icon: '💸' },
      { path: '/profit-loss', label: 'Profit & Loss', icon: '📈', roles: ['OWNER'] },
      { path: '/reports', label: 'Laporan', icon: '📄', roles: ['OWNER'] },
    ],
  },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState({});
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const readNotifsRef = useRef(JSON.parse(sessionStorage.getItem('readNotifs') || '{}'));

  const markAsRead = useCallback((path) => {
    const key = notifMap[path];
    if (!key) return;
    const count = notifications[key] || 0;
    readNotifsRef.current = { ...readNotifsRef.current, [key]: count };
    sessionStorage.setItem('readNotifs', JSON.stringify(readNotifsRef.current));
  }, [notifications]);

  const getBadge = useCallback((path) => {
    const key = notifMap[path];
    if (!key) return 0;
    const total = notifications[key] || 0;
    const read = readNotifsRef.current[key] || 0;
    return Math.max(0, total - read);
  }, [notifications]);

  const [openGroups, setOpenGroups] = useState(() => {
    const init = {};
    navGroups.forEach((g) => { if (g.defaultOpen) init[g.label] = true; });
    return init;
  });
  const toggleGroup = (label) => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const logoutTimerRef = useRef(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000;

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    toast.success('Berhasil logout');
    navigate('/login');
  }, [clearSession, navigate]);

  const handleInactivityLogout = useCallback(() => {
    clearSession();
    toast.success('Sesi habis karena tidak ada aktivitas', { icon: '⏰' });
    navigate('/login');
  }, [clearSession, navigate]);

  const resetTimer = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(handleInactivityLogout, INACTIVITY_LIMIT);
  }, [handleInactivityLogout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/dashboard/sidebar-notifications');
        setNotifications(data);
      } catch { /* ignore */ }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}>
        <div className="flex items-center gap-2 px-4 lg:px-6 py-4 lg:py-5 border-b border-gray-200 bg-red-600 flex-shrink-0">
          <span className="text-xl lg:text-2xl">🐔</span>
          <div>
            <h1 className="text-base lg:text-lg font-bold text-white leading-tight">Sales Auto</h1>
            <p className="text-base lg:text-lg font-bold text-white">Analytics</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 min-h-0 space-y-1">
          {standaloneItems.filter((i) => i.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            const badge = getBadge(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => markAsRead(item.path)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${
                  isActive ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">{badge > 99 ? '99+' : badge}</span>}
              </Link>
            );
          })}

          <div className="border-t border-gray-100 my-2" />

          {navGroups.filter((g) => g.roles.includes(user.role)).map((group) => {
            const visibleItems = group.items.filter((i) => !i.roles || i.roles.includes(user.role));
            if (visibleItems.length === 0) return null;
            const isOpen = openGroups[group.label];
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  {group.label}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="ml-1 mt-0.5 space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                      const badge = getBadge(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => markAsRead(item.path)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">{badge > 99 ? '99+' : badge}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {bottomItems.filter((i) => i.roles.includes(user.role)).length > 0 && (
            <div className="border-t border-gray-100 my-2" />
          )}
          {bottomItems.filter((i) => i.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            const badge = getBadge(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => markAsRead(item.path)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">{badge > 99 ? '99+' : badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">
              {user.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            🚪 Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 -ml-1 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-lg font-bold text-red-600">Sales Auto Analytics</h1>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
