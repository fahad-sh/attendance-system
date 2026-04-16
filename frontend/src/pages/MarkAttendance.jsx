import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { registerFace, verifyFace, getToday } from '../utils/api';

export default function MarkAttendance() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const navigate = useNavigate();

  useEffect(() => {
    getToday().then(r => setTodayRecord(r.data)).catch(() => {});
  }, []);

  const capture = async (action) => {
    const image = webcamRef.current?.getScreenshot();
    if (!image) {
      setStatus('error');
      setMessage('Could not capture image. Please allow camera access.');
      return;
    }
    setLoading(true);
    setStatus('processing');
    setMessage('');
    try {
      if (action === 'register') {
        await registerFace(image);
        setStatus('success');
        setMessage('Face registered successfully! You can now mark attendance.');
        const updatedUser = { ...user, face_registered: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        const res = await verifyFace(image);
        setStatus('success');
        setMessage(res.data.action === 'checkin'
          ? `Checked in at ${res.data.time} — Status: ${res.data.status}`
          : `Checked out at ${res.data.time} — Hours worked: ${res.data.hours_worked}`
        );
        getToday().then(r => setTodayRecord(r.data)).catch(() => {});
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const faceRegistered = user.face_registered;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: '#1e3a5f', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>AttendPro</span>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
          ← Back
        </button>
      </nav>

      <div style={{ padding: '24px', maxWidth: '520px', margin: '0 auto' }}>

        {/* Today's timing card */}
        {todayRecord && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check In</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#166534' }}>
                {todayRecord.check_in || '—'}
              </p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: todayRecord.check_out ? '#eff6ff' : '#f8fafc', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Check Out</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: todayRecord.check_out ? '#1e40af' : '#cbd5e0' }}>
                {todayRecord.check_out || '—'}
              </p>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <p style={{ fontSize: '11px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: todayRecord.status === 'present' ? '#166534' : todayRecord.status === 'late' ? '#92400e' : '#718096' }}>
                {todayRecord.status || 'Not in'}
              </p>
            </div>
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', marginBottom: '4px' }}>Mark Attendance</h2>
          <p style={{ color: '#718096', fontSize: '13px', marginBottom: '20px' }}>
            {faceRegistered ? 'Look directly at the camera to verify' : 'Register your face first to mark attendance'}
          </p>

          {/* Face not registered warning */}
          {!faceRegistered && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <p style={{ fontWeight: '600', fontSize: '13px', color: '#92400e' }}>Face not registered</p>
                <p style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>Take a clear photo below to register your face first</p>
              </div>
            </div>
          )}

          {status === 'success' ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ width: '72px', height: '72px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'checkIn 0.5s ease' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>Success!</h3>
              <p style={{ color: '#166534', fontSize: '14px', marginBottom: '20px' }}>{message}</p>
              <button onClick={() => { setStatus('idle'); setMessage(''); }} style={{ padding: '10px 24px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                Mark Again
              </button>
            </div>
          ) : (
            <>
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #e2e8f0', marginBottom: '16px', position: 'relative', background: '#0f172a' }}>
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }}
                  videoConstraints={{ width: 480, height: 300, facingMode: 'user' }}
                />
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '11px', padding: '4px 10px', borderRadius: '20px' }}>
                  {loading ? '⏳ Processing...' : '🟢 Camera active'}
                </div>
              </div>

              {status === 'error' && (
                <div style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                  {message}
                </div>
              )}

              {status === 'processing' && (
                <div style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #93c5fd', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }}></div>
                  Verifying your face...
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Always show Register Face button if not registered */}
                {!faceRegistered && (
                  <button
                    onClick={() => capture('register')}
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                    📷 Register My Face
                  </button>
                )}

                {/* Show re-register option even if registered */}
                {faceRegistered && (
                  <button
                    onClick={() => capture('register')}
                    disabled={loading}
                    style={{ width: '100%', padding: '10px', background: 'white', color: '#1e3a5f', border: '1px solid #1e3a5f', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    🔄 Re-register Face
                  </button>
                )}

                {/* Check In/Out button — only show if face is registered */}
                {faceRegistered ? (
                  <button
                    onClick={() => capture('verify')}
                    disabled={loading}
                    style={{ width: '100%', padding: '14px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                    {loading ? 'Verifying...' : todayRecord?.check_in && !todayRecord?.check_out ? '🚪 Check Out' : '✅ Check In'}
                  </button>
                ) : (
                  <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e0', borderRadius: '8px', padding: '14px', textAlign: 'center', color: '#718096', fontSize: '13px' }}>
                    Register your face above to enable check-in
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes checkIn { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
