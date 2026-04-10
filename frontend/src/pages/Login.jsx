import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(form);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '20px' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '900px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }} className="fade-in">
        <div style={{ flex: 1, background: '#1e3a5f', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '52px', height: '52px', background: '#2d5a8e', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="white" strokeWidth="1.5"/><path d="M8 2v4M16 2v4M3 10h18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="15" r="1.5" fill="white"/><circle cx="12" cy="15" r="1.5" fill="white"/></svg>
          </div>
          <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>AttendPro</h1>
          <p style={{ color: '#8ab4d4', fontSize: '14px', lineHeight: '1.7', marginBottom: '36px' }}>Smart attendance management for modern teams.</p>
          {[['Face detection check-in', '#22c55e'], ['Real-time tracking', '#22c55e'], ['Reports & CSV export', '#22c55e']].map(([text, color]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }}></div>
              <span style={{ color: '#8ab4d4', fontSize: '13px' }}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, background: 'white', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px', color: '#1a202c' }}>Welcome back</h2>
          <p style={{ color: '#718096', fontSize: '14px', marginBottom: '32px' }}>Sign in to your account to continue</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? 'Signing in...' : 'Sign in to account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#718096' }}>
            Don't have an account? <Link to="/register" style={{ color: '#1e3a5f', fontWeight: '600' }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
