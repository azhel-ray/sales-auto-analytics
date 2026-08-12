import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function MembersPage() {
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' });
  const [editUserModal, setEditUserModal] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', password: '' });

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isOwner = user.role === 'OWNER';

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get('/members');
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (tab === 'kasir') fetchUsers();
  }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/members', form);
      toast.success('Member berhasil ditambahkan');
      setShowForm(false);
      setForm({ name: '', phone: '', email: '' });
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambahkan member');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus member "${name}"? Semua data transaksi tetap tersimpan.`)) return;
    try {
      await api.delete(`/members/${id}`);
      toast.success('Member berhasil dihapus');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus member');
    }
  };

  const openEdit = (m) => {
    setEditForm({ name: m.name, email: m.email || '' });
    setEditModal(m);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/members/${editModal.id}`, editForm);
      toast.success('Member diperbarui');
      setEditModal(null);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui member');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isOwner) return toast.error('Hanya Owner yang bisa menambah akun kasir');
    if (regForm.password.length < 6) return toast.error('Password minimal 6 karakter');
    try {
      await api.post('/auth/register', regForm);
      toast.success('Akun kasir berhasil ditambahkan');
      setShowRegisterForm(false);
      setRegForm({ name: '', email: '', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambah akun kasir');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: editUserForm.name, email: editUserForm.email };
      if (editUserForm.password) payload.password = editUserForm.password;
      await api.put(`/auth/users/${editUserModal.id}`, payload);
      toast.success('Akun kasir diperbarui');
      setEditUserModal(null);
      setEditUserForm({ name: '', email: '', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui akun');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Hapus akun kasir "${name}"?`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      toast.success('Akun kasir berhasil dihapus');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus akun');
    }
  };

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search)
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">👥 Data Master</h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setTab('members')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === 'members' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>👥 Member</button>
        {isOwner && <button onClick={() => setTab('kasir')} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === 'kasir' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>🔑 Akun Kasir</button>}
      </div>

      {tab === 'members' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Daftar Member</h2>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">+ Tambah Member</button>
          </div>

          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">Tambah Member Baru</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nama" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="Nomor HP" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (opsional)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Simpan</button>
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">Edit Member: {editModal.name}</h2>
                <form onSubmit={handleEdit} className="space-y-3">
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required placeholder="Nama" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email (opsional)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Simpan</button>
                    <button type="button" onClick={() => setEditModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau nomor HP..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nama</th>
                    <th className="text-left px-4 py-3 font-medium">HP</th>
                    <th className="text-right px-4 py-3 font-medium">Poin</th>
                    <th className="text-center px-4 py-3 font-medium">Transaksi</th>
                    <th className="text-left px-4 py-3 font-medium">Tanggal Daftar</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600">{m.phone}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-600">{m.points}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{m._count?.transactions || 0}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 text-center">
                        <Link to={`/members/${m.id}`} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium rounded-lg">Detail</Link>
                        <button onClick={() => openEdit(m)} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg">Edit</button>
                        <button onClick={() => handleDelete(m.id, m.name)} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium rounded-lg">Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Belum ada member</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'kasir' && isOwner && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Akun Kasir</h2>
            <button onClick={() => setShowRegisterForm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">+ Tambah Kasir</button>
          </div>

          {showRegisterForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRegisterForm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">Tambah Akun Kasir</h2>
                <form onSubmit={handleRegister} className="space-y-3">
                  <input type="text" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required placeholder="Nama kasir" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required placeholder="Email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required placeholder="Password (min. 6 karakter)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Simpan</button>
                    <button type="button" onClick={() => setShowRegisterForm(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editUserModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditUserModal(null)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-4">Edit Akun: {editUserModal.name}</h2>
                <form onSubmit={handleEditUser} className="space-y-3">
                  <input type="text" value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} required placeholder="Nama" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="email" value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} required placeholder="Email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <input type="password" value={editUserForm.password} onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })} placeholder="Password baru (kosongkan jika tidak diubah)" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Simpan</button>
                    <button type="button" onClick={() => setEditUserModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nama</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-center px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Dibuat</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingUsers ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Belum ada akun kasir</td></tr>
                  ) : users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'OWNER' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 text-center">
                        {u.role !== 'OWNER' && (
                          <>
                            <button onClick={() => { setEditUserForm({ name: u.name, email: u.email, password: '' }); setEditUserModal(u); }} className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-lg">Edit</button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)} className="px-3 py-2 text-sm text-red-600 hover:text-red-800 font-medium rounded-lg">Hapus</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
