import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get('/users/profile').then(({ data }) => {
      if (data.success) {
        setProfileData(data.data);
        setForm({ firstName: data.data.firstName, lastName: data.data.lastName });
      }
    }).catch(() => {
      if (user) {
        setProfileData(user);
        setForm({ firstName: user.firstName || '', lastName: user.lastName || '' });
      }
    });
  }, []);

  const display = profileData || user;

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 };

  const handleProfile = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return setError('First name and last name are required');
    }
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', { firstName: form.firstName.trim(), lastName: form.lastName.trim() });
      setProfileData(data.data);
      await refreshUser();
      setMsg('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwMsg(''); setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwError('Passwords do not match');
    if (pwForm.newPassword.length < 6) return setPwError('New password must be at least 6 characters');
    setPwLoading(true);
    try {
      await api.put('/users/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
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
            <div style={{ width: 60, height: 60, background: '#C0392B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
              {display?.firstName?.[0]?.toUpperCase()}{display?.lastName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>{display?.firstName} {display?.lastName}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{display?.email}</div>
              <span style={{ fontSize: 12, fontWeight: 700, background: `${ROLE_COLORS[display?.role]}18`, color: ROLE_COLORS[display?.role], padding: '2px 10px', borderRadius: 20, display: 'inline-block', marginTop: 4 }}>{display?.role}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Account Status</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: display?.isActive ? '#27AE60' : '#C0392B' }}>
                {display?.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div style={{ flex: 1, background: '#f8f9fa', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Member Since</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
                {display?.createdAt ? new Date(display.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#1a1a2e' }}>Update Profile</h3>
          {msg && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{msg}</div>}
          {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleProfile}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#C0392B')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                disabled={loading}
                placeholder="Enter first name"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#C0392B')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                disabled={loading}
                placeholder="Enter last name"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={display?.email || ''}
                disabled
                style={{ ...inputStyle, background: '#f5f5f5', color: '#999', cursor: 'not-allowed' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? '#e0a0a0' : '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
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
              { name: 'currentPassword', label: 'Current Password', placeholder: 'Enter current password' },
              { name: 'newPassword', label: 'New Password', placeholder: 'At least 6 characters' },
              { name: 'confirmPassword', label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ].map((f) => (
              <div key={f.name} style={{ marginBottom: 16 }}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type="password"
                  value={pwForm[f.name]}
                  onChange={(e) => setPwForm({ ...pwForm, [f.name]: e.target.value })}
                  required
                  placeholder={f.placeholder}
                  disabled={pwLoading}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#C0392B')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>
            ))}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#888', marginBottom: 16 }}>
              Password must be at least 6 characters long.
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              style={{ width: '100%', padding: '11px', background: pwLoading ? '#555' : '#1a1a2e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: pwLoading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
            >
              {pwLoading ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
