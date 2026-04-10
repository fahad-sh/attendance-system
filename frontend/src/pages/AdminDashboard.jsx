import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, getAllEmployees, getTodaysAttendance, getLeaves, updateLeave, deleteEmployee, exportCSV } from '../utils/api';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'A';

  useEffect(() => {
    getDashboard().then(r => setDashboard(r.data)).catch(() => {});
    getAllEmployees().then(r => setEmployees(r.data)).catch(() => {});
    getTodaysAttendance().then(r => setTodayRecords(r.data)).catch(() => {});
    getLeaves().then(r => setLeaves(r.data)).catch(() => {});
  }, []);

  const handleLeave = async (id, status) => {
    await updateLeave(id, status);
    getLeaves().then(r => setLeaves(r.data));
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      await deleteEmployee(id);
      getAllEmployees().then(r => setEmployees(r.data));
    }
  };

  const handleExport = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await exportCSV('2024-01-01', today);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'attendance_report.csv'; a.click();
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const presentIds = new Set(todayRecords.filter(r => r.check_in).map(r => r.user_id));

  return (
    <div className="page-container fade-in">
      <nav className="navbar">
        <span className="navbar-brand">AttendPro Admin</span>
        <div className="navbar-right">
          <span style={{ color: '#8ab4d4', fontSize: '13px' }}>Administrator</span>
          <div className="avatar">{initials}</div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'white',padding:'6px 14px',borderRadius:'6px',fontSize:'13px' }}>Logout</button>
        </div>
      </nav>
      <div className="content">
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
          <div>
            <h2 style={{ fontSize:'20px',fontWeight:'700',color:'#1a202c' }}>Admin Dashboard</h2>
            <p style={{ color:'#718096',fontSize:'13px' }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
          </div>
          <button className="btn btn-primary" onClick={handleExport} style={{ display:'flex',alignItems:'center',gap:'8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export CSV
          </button>
        </div>

        {dashboard && (
          <div className="stat-grid" style={{ marginBottom:'20px' }}>
            <div className="stat-card" style={{ borderTop:'3px solid #1e3a5f' }}>
              <p className="stat-label">Total employees</p>
              <p className="stat-value">{dashboard.total_employees}</p>
            </div>
            <div className="stat-card" style={{ borderTop:'3px solid #22c55e' }}>
              <p className="stat-label">Present today</p>
              <p className="stat-value" style={{color:'#166534'}}>{dashboard.present_today}</p>
            </div>
            <div className="stat-card" style={{ borderTop:'3px solid #ef4444' }}>
              <p className="stat-label">Absent today</p>
              <p className="stat-value" style={{color:'#dc2626'}}>{dashboard.absent_today}</p>
            </div>
            <div className="stat-card" style={{ borderTop:'3px solid #f59e0b' }}>
              <p className="stat-label">Late today</p>
              <p className="stat-value" style={{color:'#92400e'}}>{dashboard.late_today}</p>
            </div>
            <div className="stat-card" style={{ borderTop:'3px solid #8b5cf6' }}>
              <p className="stat-label">Pending leaves</p>
              <p className="stat-value" style={{color:'#6d28d9'}}>{dashboard.pending_leaves}</p>
            </div>
          </div>
        )}

        <div className="tab-nav">
          {['overview','employees','leaves'].map(t => (
            <button key={t} className={`tab-btn ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {t==='leaves' && leaves.filter(l=>l.status==='pending').length > 0 && (
                <span style={{ marginLeft:'6px',background:'#ef4444',color:'white',fontSize:'10px',padding:'1px 6px',borderRadius:'99px' }}>
                  {leaves.filter(l=>l.status==='pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="card" style={{ marginBottom:'16px' }}>
              <p className="card-title">Employees present today ({todayRecords.length})</p>
              <div className="present-list">
                {todayRecords.length === 0 ? (
                  <p style={{ color:'#718096',fontSize:'14px',textAlign:'center',padding:'20px' }}>No attendance records yet today</p>
                ) : todayRecords.map((r,i) => (
                  <div key={i} className="present-item" style={{ animationDelay: `${i*0.05}s` }}>
                    <div className="present-avatar">{r.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase()}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:'500',fontSize:'14px',color:'#1a202c' }}>{r.full_name}</p>
                      <p style={{ fontSize:'12px',color:'#718096' }}>
                        In: {r.check_in ? new Date(r.check_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
                        {r.check_out && ` · Out: ${new Date(r.check_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`}
                      </p>
                    </div>
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                    <div className={`present-dot ${r.status==='present'?'dot-present':r.status==='late'?'dot-late':'dot-absent'}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'employees' && (
          <div className="card">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px' }}>
              <p className="card-title" style={{ margin:0 }}>All employees ({employees.length})</p>
              <input className="form-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:'200px' }} />
            </div>
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Face</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {filteredEmployees.map((emp,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:'500' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                        <div style={{ width:'28px',height:'28px',borderRadius:'50%',background:'#1e3a5f',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'600',flexShrink:0 }}>
                          {emp.full_name?.split(' ').map(n=>n[0]).join('').toUpperCase()}
                        </div>
                        {emp.full_name}
                      </div>
                    </td>
                    <td style={{ color:'#718096' }}>{emp.email}</td>
                    <td>{emp.department}</td>
                    <td>{emp.face_registered ? <span className="badge badge-present">Registered</span> : <span className="badge badge-absent">Not set</span>}</td>
                    <td>{presentIds.has(emp.id) ? <span className="badge badge-present">Present</span> : <span style={{ fontSize:'12px',color:'#718096' }}>—</span>}</td>
                    <td>
                      <button className="btn btn-danger" style={{ padding:'4px 10px',fontSize:'12px' }} onClick={() => handleDelete(emp.id, emp.full_name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="card">
            <p className="card-title">Leave requests</p>
            <table className="table">
              <thead><tr><th>Employee</th><th>Reason</th><th>From</th><th>To</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {leaves.map((l,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:'500' }}>{l.full_name}</td>
                    <td>{l.reason}</td>
                    <td>{l.from_date}</td>
                    <td>{l.to_date}</td>
                    <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                    <td>
                      {l.status === 'pending' && (
                        <div style={{ display:'flex',gap:'6px' }}>
                          <button className="btn btn-success" style={{ padding:'4px 10px',fontSize:'12px' }} onClick={() => handleLeave(l.id,'approved')}>Approve</button>
                          <button className="btn btn-danger" style={{ padding:'4px 10px',fontSize:'12px' }} onClick={() => handleLeave(l.id,'rejected')}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
