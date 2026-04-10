import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyHistory, getMySummary, getMyLeaves, applyLeave } from '../utils/api';

export default function MyReports() {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ reason: '', from_date: '', to_date: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  useEffect(() => {
    getMyHistory().then(r => setHistory(r.data)).catch(() => {});
    getMySummary().then(r => setSummary(r.data)).catch(() => {});
    getMyLeaves().then(r => setLeaves(r.data)).catch(() => {});
  }, []);

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(leaveForm);
      setMessage('Leave request submitted successfully!');
      setLeaveForm({ reason: '', from_date: '', to_date: '' });
      getMyLeaves().then(r => setLeaves(r.data));
    } catch { setMessage('Failed to submit leave request.'); }
  };

  const chartData = history.slice(0, 7).reverse().map(r => ({
    label: r.date?.slice(5),
    hours: r.check_in && r.check_out ? Math.round((new Date(r.check_out) - new Date(r.check_in)) / 3600000 * 10) / 10 : 0,
    max: 10
  }));

  return (
    <div className="page-container fade-in">
      <nav className="navbar">
        <span className="navbar-brand">AttendPro</span>
        <div className="navbar-right">
          <div className="avatar">{initials}</div>
        </div>
      </nav>
      <div className="content">
        <button onClick={() => navigate('/dashboard')} style={{ display:'flex',alignItems:'center',gap:'6px',background:'none',border:'none',color:'#1e3a5f',fontSize:'14px',fontWeight:'500',marginBottom:'20px',padding:0 }}>← Back</button>
        <h2 style={{ fontSize:'20px',fontWeight:'700',marginBottom:'20px' }}>My Reports</h2>

        <div className="tab-nav">
          {['overview','history','leaves'].map(t => (
            <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="stat-grid" style={{ marginBottom:'16px' }}>
              <div className="stat-card"><p className="stat-label">Present days</p><p className="stat-value" style={{color:'#166534'}}>{summary?.present??'—'}</p></div>
              <div className="stat-card"><p className="stat-label">Late arrivals</p><p className="stat-value" style={{color:'#92400e'}}>{summary?.late??'—'}</p></div>
              <div className="stat-card"><p className="stat-label">Total hours</p><p className="stat-value">{summary?.total_hours_worked??'—'}</p></div>
              <div className="stat-card"><p className="stat-label">Avg per day</p><p className="stat-value">{summary?.average_hours_per_day??'—'}</p></div>
            </div>
            <div className="card">
              <p className="card-title">Hours worked — last 7 days</p>
              <div className="bar-chart">
                {chartData.length > 0 ? chartData.map((d,i) => (
                  <div key={i} className="bar-col">
                    <div className="bar" style={{height:`${Math.max(4,(d.hours/10)*100)}px`}}></div>
                    <span className="bar-label">{d.label}</span>
                  </div>
                )) : [['Mon',75],['Tue',80],['Wed',70],['Thu',85],['Fri',65],['Sat',0],['Sun',0]].map(([l,h],i) => (
                  <div key={i} className="bar-col">
                    <div className={`bar ${h===0?'weekend':''}`} style={{height:`${Math.max(4,h)}px`}}></div>
                    <span className="bar-label">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <p className="card-title">Attendance history</p>
            <table className="table">
              <thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Status</th><th>Face</th></tr></thead>
              <tbody>
                {history.map((r,i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.check_in ? new Date(r.check_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    <td>{r.check_out ? new Date(r.check_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                    <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                    <td>{r.verified_by_face ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'leaves' && (
          <>
            <div className="card" style={{ marginBottom:'16px' }}>
              <p className="card-title">Apply for leave</p>
              {message && <div className="alert alert-success">{message}</div>}
              <form onSubmit={submitLeave}>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <input className="form-input" placeholder="e.g. Medical appointment" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm,reason:e.target.value})} required />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                  <div className="form-group">
                    <label className="form-label">From date</label>
                    <input className="form-input" type="date" value={leaveForm.from_date} onChange={e => setLeaveForm({...leaveForm,from_date:e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To date</label>
                    <input className="form-input" type="date" value={leaveForm.to_date} onChange={e => setLeaveForm({...leaveForm,to_date:e.target.value})} required />
                  </div>
                </div>
                <button className="btn btn-primary" type="submit">Submit request</button>
              </form>
            </div>
            <div className="card">
              <p className="card-title">My leave requests</p>
              <table className="table">
                <thead><tr><th>Reason</th><th>From</th><th>To</th><th>Status</th></tr></thead>
                <tbody>
                  {leaves.map((l,i) => (
                    <tr key={i}>
                      <td>{l.reason}</td>
                      <td>{l.from_date}</td>
                      <td>{l.to_date}</td>
                      <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
