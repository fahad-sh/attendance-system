import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getToday, getMySummary } from '../utils/api';

export default function Dashboard() {
  const [today, setToday] = useState(null);
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today_date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    getToday().then(r => setToday(r.data)).catch(() => {});
    getMySummary().then(r => setSummary(r.data)).catch(() => {});
  }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const getStatusText = () => {
    if (!today || !today.checked_in) return { text: 'Not checked in', color: '#718096', bg: '#f8fafc', dot: '#cbd5e0' };
    if (today.checked_out) return { text: 'Shift complete', color: '#166534', bg: '#dcfce7', dot: '#22c55e' };
    return { text: 'Currently working', color: '#166534', bg: '#dcfce7', dot: '#22c55e' };
  };
  const status = getStatusText();

  return (
    <div className="page-container fade-in">
      <nav className="navbar">
        <span className="navbar-brand">AttendPro</span>
        <div className="navbar-right">
          <span style={{ color: '#8ab4d4', fontSize: '13px' }}>{user.department}</span>
          <div className="avatar">{initials}</div>
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '13px' }}>Logout</button>
        </div>
      </nav>
      <div className="content">
        <div className="hero-banner">
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginBottom: '4px' }}>{today_date}</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{greeting}, {user.full_name?.split(' ')[0]} 👋</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>{user.role === 'admin' ? 'Administrator' : 'Employee'} · {user.department}</p>
          <div className="hero-stats">
            <div className="hero-stat">
              <p className="hero-stat-label">Present days</p>
              <p className="hero-stat-value">{summary?.present ?? '—'}</p>
              <p className="hero-stat-sub">This month</p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-label">Hours worked</p>
              <p className="hero-stat-value">{summary?.total_hours_worked ?? '—'}</p>
              <p className="hero-stat-sub">Total</p>
            </div>
            <div className="hero-stat">
              <p className="hero-stat-label">On-time rate</p>
              <p className="hero-stat-value">
                {summary && summary.present + summary.late > 0
                  ? Math.round((summary.present / (summary.present + summary.late)) * 100) + '%'
                  : '—'}
              </p>
              <p className="hero-stat-sub">Punctuality</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="card">
            <p className="card-title">Today's status</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: status.bg, borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: status.dot, flexShrink: 0 }}></div>
              <div>
                <p style={{ fontWeight: '600', fontSize: '14px', color: status.color }}>{status.text}</p>
                {today?.check_in && <p style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>In: {new Date(today.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                {today?.check_out && <p style={{ fontSize: '12px', color: '#718096' }}>Out: {new Date(today.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
              </div>
            </div>
            <Link to="/attendance" className="btn btn-primary btn-full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Mark Attendance
            </Link>
          </div>
          <div className="card">
            <p className="card-title">Quick actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/attendance" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#2d3748', fontSize: '14px', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Mark attendance
              </Link>
              <Link to="/reports" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#2d3748', fontSize: '14px', transition: 'all 0.2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                View my reports
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#2d3748', fontSize: '14px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  Admin dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
