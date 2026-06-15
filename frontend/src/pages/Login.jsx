import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1a1a2e',
    marginBottom: 4,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: '#C0392B',
    marginBottom: 32,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px 40px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    marginBottom: 6,
  },
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
  formGroup: { marginBottom: 20 },
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
    letterSpacing: '0.3px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  linkRed: { fontSize: 14, color: '#C0392B', fontWeight: 600 },
  linkGray: { fontSize: 14, color: '#777' },
  error: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    color: '#c53030',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 16,
  },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.logo}>🔥</div>
      <h1 style={styles.title}>TWZ FEMS</h1>
      <p style={styles.subtitle}>Fire Extinguisher Management System</p>
      <p style={styles.subtext}>Sign in to your account</p>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = '#C0392B')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = '#C0392B')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            onMouseOver={(e) => !loading && (e.target.style.background = '#a93226')}
            onMouseOut={(e) => (e.target.style.background = '#C0392B')}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/signup" style={styles.linkRed}>Create account</Link>
          <Link to="/forgot-password" style={styles.linkGray}>Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
