import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');

  const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' };
  const labelStyle = { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 };

  const handleProfile = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    try {
      await api.put('/users/profile', form);
      setMsg('Profile updated successfully');
    } catch (err) { setError(err.response?.data?.message || 'Update failed'); }
  };

  const handlePassword = async (e) => {
    e.preventDefault(); setPwMsg(''); setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError('Passwords do not match');
    try {
      await api.put('/users/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { setPwError(err.response?.data?.message || 'Failed to change password'); }
  };

  const ROLE_COLORS = { Admin: '#C0392B', Inspector: '#E67E22', User: '#27AE60' };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>My Profile</h1>
        <p style={{ color: '#666', fontSize: 13 }}>View and update your account information</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Profile info card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, background: '#C0392B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22 }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>{user?.firstName} {user?.lastName}</div>
              <span style={{ fontSize: 12, fontWeight: 700, background: `${ROLE_COLORS[user?.role]}18`, color: ROLE_COLORS[user?.role], padding: '2px 10px', borderRadius: 20 }}>{user?.role}</span>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>Update Profile</h3>
          {msg && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{msg}</div>}
          {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleProfile}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>First Name</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = '#C0392B')} onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Last Name</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = '#C0392B')} onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={user?.email} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#999', cursor: 'not-allowed' }} />
            </div>
            <button type="submit" style={{ width: '100%', padding: '11px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
              Save Changes
            </button>
          </form>
        </div>

        {/* Change password card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: '#1a1a2e' }}>Change Password</h3>
          {pwMsg && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{pwMsg}</div>}
          {pwError && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{pwError}</div>}
          <form onSubmit={handlePassword}>
            {[
              { name: 'currentPassword', label: 'Current Password' },
              { name: 'newPassword', label: 'New Password' },
              { name: 'confirmPassword', label: 'Confirm New Password' },
            ].map((f) => (
              <div key={f.name} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{f.label}</label>
                <input type="password" value={pwForm[f.name]} onChange={(e) => setPwForm({ ...pwForm, [f.name]: e.target.value })} required minLength={f.name !== 'currentPassword' ? 6 : undefined} style={inputStyle} onFocus={(e) => (e.target.style.borderColor = '#C0392B')} onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')} />
              </div>
            ))}
            <button type="submit" style={{ width: '100%', padding: '11px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
              Change Password
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
