import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #ffffff 0%, #fce8e6 50%, #f9d5d3 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  logo: { width: 64, height: 64, background: '#C0392B', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 16, boxShadow: '0 4px 12px rgba(192,57,43,0.3)' },
  title: { fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32, textAlign: 'center', maxWidth: 340 },
  card: { background: '#fff', borderRadius: 20, padding: '36px 40px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  formGroup: { marginBottom: 20 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, color: '#333', outline: 'none', background: '#fff' },
  btn: { width: '100%', padding: '13px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, marginTop: 8 },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#555' },
  linkRed: { color: '#C0392B', fontWeight: 700 },
  info: { background: '#ebf8ff', border: '1px solid #bee3f8', color: '#2b6cb0', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  error: { background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1=enter email, 2=enter OTP+new pass
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/users/forgot-password', { email });
      setMsg('If that email exists, a reset OTP has been sent.');
      setStep(2);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const resetPass = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      await api.post('/users/reset-password', { email, otp: form.otp, newPassword: form.newPassword });
      setMsg('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  const inputFocus = (e) => (e.target.style.borderColor = '#C0392B');
  const inputBlur = (e) => (e.target.style.borderColor = '#e5e7eb');

  return (
    <div style={s.page}>
      <div style={s.logo}>🔥</div>
      <h1 style={s.title}>Forgot Password</h1>
      <p style={s.subtitle}>{step === 1 ? 'Enter your email to receive a reset OTP' : 'Enter the OTP from your email and set a new password'}</p>

      <div style={s.card}>
        {msg && <div style={s.info}>{msg}</div>}
        {error && <div style={s.error}>{error}</div>}

        {step === 1 ? (
          <form onSubmit={sendOtp}>
            <div style={s.formGroup}>
              <label style={s.label}>Email Address</label>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required style={s.input} onFocus={inputFocus} onBlur={inputBlur} />
            </div>
            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending...' : 'Send Reset OTP'}</button>
          </form>
        ) : (
          <form onSubmit={resetPass}>
            {[{ name: 'otp', label: 'OTP Code', placeholder: '6-digit OTP', type: 'text' }, { name: 'newPassword', label: 'New Password', placeholder: 'New password', type: 'password' }, { name: 'confirmPassword', label: 'Confirm Password', placeholder: 'Confirm password', type: 'password' }].map((f) => (
              <div key={f.name} style={s.formGroup}>
                <label style={s.label}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required style={s.input} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
        )}

        <div style={s.footer}><Link to="/login" style={s.linkRed}>Back to Sign In</Link></div>
      </div>
    </div>
  );
}
