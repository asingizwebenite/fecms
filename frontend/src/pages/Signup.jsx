import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    width: 64,
    height: 64,
    background: '#C0392B',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    marginBottom: 16,
    boxShadow: '0 4px 12px rgba(192,57,43,0.3)',
  },
  title: { fontSize: 28, fontWeight: 800, color: '#1a1a2e', marginBottom: 4, letterSpacing: '-0.5px' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px 40px',
    width: '100%',
    maxWidth: 460,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  row: { display: 'flex', gap: 14 },
  formGroup: { marginBottom: 20, flex: 1 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 },
  input: {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 14,
    color: '#333',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#fff',
  },
  btn: {
    width: '100%',
    padding: '13px',
    background: '#C0392B',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    marginTop: 8,
    transition: 'background 0.2s',
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#555' },
  linkRed: { color: '#C0392B', fontWeight: 700 },
  error: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
  success: {
    background: '#f0fff4',
    border: '1px solid #9ae6b4',
    color: '#276749',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
};

export default function Signup() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/users/register', form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputFocus = (e) => (e.target.style.borderColor = '#C0392B');
  const inputBlur = (e) => (e.target.style.borderColor = '#e5e7eb');

  return (
    <div style={styles.page}>
      <div style={styles.logo}>🔥</div>
      <h1 style={styles.title}>Create Account</h1>
      <p style={styles.subtitle}>Join TWZ FEMS Fire Extinguisher Management</p>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={form.firstName}
                onChange={handleChange}
                required
                style={styles.input}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={form.lastName}
                onChange={handleChange}
                required
                style={styles.input}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              style={styles.input}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              style={styles.input}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#a93226')}
            onMouseOut={(e) => (e.target.style.background = '#C0392B')}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.linkRed}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
