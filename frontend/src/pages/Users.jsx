import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const ROLE_COLORS = { Admin: '#C0392B', Inspector: '#E67E22', User: '#27AE60' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    const params = roleFilter ? { role: roleFilter } : {};
    api.get('/users', { params }).then((r) => setUsers(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleCreateInspector = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      await api.post('/users/inspectors', form);
      setSuccess(`Inspector account created! OTP sent to ${form.email}`);
      setForm({ firstName: '', lastName: '', email: '' });
      fetchUsers();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create inspector'); }
  };

  const handleToggleActive = async (user) => {
    await api.put(`/users/${user._id}`, { isActive: !user.isActive });
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    fetchUsers();
  };

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff' };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 5 };

  return (
    <Layout>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>User Management</h1>
          <p style={{ color: '#666', fontSize: 13 }}>Manage system users and inspector accounts</p>
        </div>
        <button onClick={() => { setError(''); setSuccess(''); setShowModal(true); }} style={{ background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Create Inspector
        </button>
      </div>

      {/* Filter */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">All Roles</option>
          <option>Admin</option><option>Inspector</option><option>User</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Name', 'Email', 'Role', 'Status', 'Activated', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No users found</td></tr>
                : users.map((u, i) => (
                  <tr key={u._id} style={{ borderTop: '1px solid #f0f0f0', background: i % 2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, background: `${ROLE_COLORS[u.role]}18`, color: ROLE_COLORS[u.role], padding: '3px 10px', borderRadius: 20 }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, background: u.isActive ? '#f0fff4' : '#fff5f5', color: u.isActive ? '#27AE60' : '#E74C3C', padding: '3px 10px', borderRadius: 20 }}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{u.isAccountActivated ? '✅ Yes' : '⏳ Pending'}</td>
                    <td style={{ padding: '12px 16px', display: 'flex', gap: 6 }}>
                      <button onClick={() => handleToggleActive(u)} style={{ padding: '5px 10px', background: u.isActive ? '#E67E22' : '#27AE60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => handleDelete(u._id)} style={{ padding: '5px 10px', background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1a1a2e' }}>Create Inspector Account</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>The inspector will receive an OTP via email to activate their account and set a password.</p>
            {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
            {success && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '10px', fontSize: 13, marginBottom: 14 }}>{success}</div>}
            <form onSubmit={handleCreateInspector}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" style={{ flex: 1, padding: '11px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Create & Send OTP</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
