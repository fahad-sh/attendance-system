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
  const today_date = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    getToday().then(r => setToday(r.data)).catch(() => {});
    getMySummary().then(r => setSummary(r.data)).catch(() => {});
  }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: '#1e3a5f', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>AttendPro</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#8ab4d4', fontSize: '13px' }}>{user.department}</span>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2d5a8e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '600' }}>{initials}</div>
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Hero banner */}
        <div style={{ background: '#1e3a5f', borderRadius: '14px', padding: '28px', marginBottom: '20px', color: 'white' }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginBottom: '4px' }}>{today_date}</p>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>{greeting}, {user.full_name?.split(' ')[0]} 👋</h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>{user.role === 'admin' ? 'Administrator' : 'Employee'} · {user.department}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>Present days</p>
              <p style={{ fontSize: '22px', fontWeight: '700' }}>{summary?.present ?? '—'}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>Hours worked</p>
              <p style={{ fontSize: '22px', fontWeight: '700' }}>{summary?.total_hours_worked ?? '—'}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>On-time rate</p>
              <p style={{ fontSize: '22px', fontWeight: '700' }}>
                {summary && (summary.present + summary.late) > 0
                  ? Math.round((summary.present / (summary.present + summary.late)) * 100) + '%'
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Today's timing — big and clear */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>Today's Attendance</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', padding: '16px', background: today?.check_in ? '#f0fdf4' : '#f8fafc', borderRadius: '10px', border: `1px solid ${today?.check_in ? '#86efac' : '#e2e8f0'}` }}>
              <p style={{ fontSize: '11px', color: '#718096', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check In</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: today?.check_in ? '#166534' : '#cbd5e0' }}>
                {today?.check_in || '—'}
              </p>
              {today?.check_in && <p style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>IST</p>}
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: today?.check_out ? '#eff6ff' : '#f8fafc', borderRadius: '10px', border: `1px solid ${today?.check_out ? '#93c5fd' : '#e2e8f0'}` }}>
              <p style={{ fontSize: '11px', color: '#718096', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check Out</p>
              <p style={{ fontSize: '24px', fontWeight: '700', color: today?.check_out ? '#1e40af' : '#cbd5e0' }}>
                {today?.check_out || '—'}
              </p>
              {today?.check_out && <p style={{ fontSize: '11px', color: '#1e40af', marginTop: '4px' }}>IST</p>}
            </div>
            <div style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', color: '#718096', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: today?.status === 'present' ? '#166534' : today?.status === 'late' ? '#92400e' : '#718096' }}>
                {today?.status ? today.status.charAt(0).toUpperCase() + today.status.slice(1) : 'Not in'}
              </p>
              {!user.face_registered && (
                <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>⚠️ Register face</p>
              )}
            </div>
          </div>
          <Link to="/attendance" style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#1e3a5f', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '15px' }}>
            {today?.check_in && !today?.check_out ? '🚪 Check Out Now' : today?.check_out ? '✅ Attendance Complete' : '📸 Mark Attendance'}
          </Link>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link to="/reports" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📊</div>
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px', color: '#1a202c' }}>My Reports</p>
              <p style={{ fontSize: '12px', color: '#718096' }}>View attendance history</p>
            </div>
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: '#fef3c7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🛡️</div>
              <div>
                <p style={{ fontWeight: '600', fontSize: '14px', color: '#1a202c' }}>Admin Panel</p>
                <p style={{ fontSize: '12px', color: '#718096' }}>Manage team attendance</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
