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
    if (window.confirm('Delete ' + name + '?')) {
      await deleteEmployee(id);
      getAllEmployees().then(r => setEmployees(r.data));
    }
  };

  const handleExport = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await exportCSV('2024-01-01', today);
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_report.csv';
    a.click();
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = ['overview', 'employees', 'leaves'];

  const statCards = dashboard ? [
    { label: 'Total employees', value: dashboard.total_employees, color: '#1e3a5f' },
    { label: 'Present today', value: dashboard.present_today, color: '#166534' },
    { label: 'Absent today', value: dashboard.absent_today, color: '#dc2626' },
    { label: 'Late today', value: dashboard.late_today, color: '#92400e' },
    { label: 'Pending leaves', value: dashboard.pending_leaves, color: '#6d28d9' },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: '#1e3a5f', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>AttendPro Admin</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#8ab4d4', fontSize: '13px' }}>Administrator</span>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2d5a8e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '600' }}>{initials}</div>
          <button onClick={() => navigate('/admin/photos')} style={{ background: 'white', color: '#1e3a5f', border: '1px solid white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Photos
          </button>
          <button onClick={handleExport} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Export CSV
          </button>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', margin: 0 }}>Admin Dashboard</h2>
          <p style={{ color: '#718096', fontSize: '13px', marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {statCards.map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', borderTop: '3px solid ' + s.color }}>
              <p style={{ fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</p>
              <p style={{ fontSize: '26px', fontWeight: '700', color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f0f4f8', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                background: activeTab === t ? 'white' : 'transparent',
                color: activeTab === t ? '#1e3a5f' : '#718096',
                boxShadow: activeTab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'leaves' && leaves.filter(l => l.status === 'pending').length > 0 && (
                <span style={{ marginLeft: '6px', background: '#ef4444', color: 'white', fontSize: '10px', padding: '1px 6px', borderRadius: '99px' }}>
                  {leaves.filter(l => l.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
              Employees present today ({todayRecords.length})
            </p>
            {todayRecords.length === 0 ? (
              <p style={{ color: '#718096', fontSize: '14px', textAlign: 'center', padding: '24px' }}>No attendance records yet today</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayRecords.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                      {r.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '500', fontSize: '14px', color: '#1a202c' }}>{r.full_name}</p>
                      <p style={{ fontSize: '12px', color: '#718096' }}>
                        In: {r.check_in || '—'}
                        {r.check_out ? ' · Out: ' + r.check_out : ''}
                      </p>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '500',
                      background: r.status === 'present' ? '#dcfce7' : r.status === 'late' ? '#fef9c3' : '#fee2e2',
                      color: r.status === 'present' ? '#166534' : r.status === 'late' ? '#92400e' : '#dc2626'
                    }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'employees' && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>All employees ({employees.length})</p>
              <input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '200px' }}
              />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Face</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>
                          {emp.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '500' }}>{emp.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#718096' }}>{emp.email}</td>
                    <td style={{ padding: '12px' }}>{emp.department}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '500', background: emp.face_registered ? '#dcfce7' : '#fee2e2', color: emp.face_registered ? '#166534' : '#dc2626' }}>
                        {emp.face_registered ? 'Registered' : 'Not set'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDelete(emp.id, emp.full_name)}
                        style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Leave requests</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Reason</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>From</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>To</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#718096', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{l.full_name}</td>
                    <td style={{ padding: '12px' }}>{l.reason}</td>
                    <td style={{ padding: '12px' }}>{l.from_date}</td>
                    <td style={{ padding: '12px' }}>{l.to_date}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '500',
                        background: l.status === 'approved' ? '#dcfce7' : l.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                        color: l.status === 'approved' ? '#166534' : l.status === 'rejected' ? '#dc2626' : '#92400e' }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {l.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleLeave(l.id, 'approved')}
                            style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            Approve
                          </button>
                          <button onClick={() => handleLeave(l.id, 'rejected')}
                            style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                            Reject
                          </button>
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
