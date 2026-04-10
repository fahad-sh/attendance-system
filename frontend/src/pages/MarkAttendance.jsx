import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { registerFace, verifyFace } from '../utils/api';

export default function MarkAttendance() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const capture = async (action) => {
    const image = webcamRef.current?.getScreenshot();
    if (!image) { setStatus('error'); setMessage('Could not capture image. Check camera permissions.'); return; }
    setLoading(true);
    setStatus('processing');
    setMessage('');
    try {
      let res;
      if (action === 'register') {
        res = await registerFace(image);
        setStatus('success');
        setMessage('Face registered! You can now mark attendance using face verification.');
        const updatedUser = {...user, face_registered: true};
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        res = await verifyFace(image);
        setStatus('success');
        const action_type = res.data.action === 'checkin' ? 'Check-in' : 'Check-out';
        const extra = res.data.action === 'checkin' ? `Status: ${res.data.status}` : `Hours worked: ${res.data.hours_worked}`;
        setMessage(`${action_type} successful! ${extra}`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container fade-in">
      <nav className="navbar">
        <span className="navbar-brand">AttendPro</span>
        <div className="navbar-right">
          <div className="avatar">{initials}</div>
        </div>
      </nav>
      <div className="content">
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#1e3a5f', fontSize: '14px', fontWeight: '500', marginBottom: '20px', padding: 0 }}>
          ← Back to dashboard
        </button>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div className="card">
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px', color: '#1a202c' }}>Mark Attendance</h2>
            <p style={{ color: '#718096', fontSize: '14px', marginBottom: '24px' }}>Face verification · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>

            {status === 'success' ? (
              <div className="checkin-success">
                <div className="checkin-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>Success!</h3>
                <p style={{ color: '#166534', fontSize: '14px', marginBottom: '20px' }}>{message}</p>
                <button className="btn btn-primary" onClick={() => { setStatus('idle'); setMessage(''); }}>Mark again</button>
              </div>
            ) : (
              <>
                <div className="webcam-wrapper" style={{ marginBottom: '16px' }}>
                  <Webcam ref={webcamRef} screenshotFormat="image/jpeg" style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }} videoConstraints={{ width: 480, height: 320, facingMode: 'user' }} />
                  <div className="webcam-overlay">
                    <div className="face-guide"></div>
                  </div>
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '11px', padding: '4px 10px', borderRadius: '20px' }}>
                    {loading ? 'Processing...' : 'Camera active'}
                  </div>
                </div>

                {status === 'error' && <div className="alert alert-error">{message}</div>}
                {status === 'processing' && (
                  <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid #93c5fd', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'ripple 0.8s linear infinite', flexShrink: 0 }}></div>
                    Verifying your face...
                  </div>
                )}

                {!user.face_registered && (
                  <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                    Register your face first before marking attendance
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  {!user.face_registered && (
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => capture('register')} disabled={loading}>
                      Register Face
                    </button>
                  )}
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => capture('verify')} disabled={loading}>
                    {loading ? 'Verifying...' : 'Check In / Check Out'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
