import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #ffffff 0%, #fce8e6 50%, #f9d5d3 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  logo: {
    width: 64, height: 64, background: '#C0392B', borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32, marginBottom: 16, boxShadow: '0 4px 12px rgba(192,57,43,0.3)',
  },
  title: { fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center', maxWidth: 360 },
  card: {
    background: '#fff', borderRadius: 20, padding: '36px 40px',
    width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, color: '#333', outline: 'none', background: '#fff',
  },
  btn: {
    width: '100%', padding: '13px', background: '#C0392B', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, marginTop: 8,
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#555' },
  linkRed: { color: '#C0392B', fontWeight: 700 },
  error: { background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  success: { background: '#f0fff4', border: '1px solid #9ae6b4', color: '#276749', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
};

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get('email') || '';
  const [form, setForm] = useState({ email: prefillEmail, otp: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/users/activate-account', { email: form.email, otp: form.otp, newPassword: form.newPassword });
      setSuccess('Account activated! You can now sign in.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const inputFocus = (e) => (e.target.style.borderColor = '#C0392B');
  const inputBlur = (e) => (e.target.style.borderColor = '#e5e7eb');

  return (
    <div style={styles.page}>
      <div style={styles.logo}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <h1 style={styles.title}>Activate Account</h1>
      <p style={styles.subtitle}>Enter the OTP sent to your email and set a new password</p>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          {[
            { name: 'email', label: 'Email', type: 'email', placeholder: 'Your email address' },
            { name: 'otp', label: 'OTP Code', type: 'text', placeholder: 'Enter the 6-digit OTP' },
            { name: 'newPassword', label: 'New Password', type: 'password', placeholder: 'Create a new password' },
            { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password' },
          ].map((f) => (
            <div key={f.name} style={styles.formGroup}>
              <label style={styles.label}>{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                placeholder={f.placeholder}
                value={form[f.name]}
                onChange={handleChange}
                required
                readOnly={f.name === 'email' && !!prefillEmail}
                style={{
                  ...styles.input,
                  ...(f.name === 'email' && prefillEmail ? { background: '#f5f5f5', color: '#888', cursor: 'not-allowed' } : {}),
                }}
                onFocus={f.name === 'email' && prefillEmail ? undefined : inputFocus}
                onBlur={f.name === 'email' && prefillEmail ? undefined : inputBlur}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Activating...' : 'Activate Account'}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/login" style={styles.linkRed}>Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
