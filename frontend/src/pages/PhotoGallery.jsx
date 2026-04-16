import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const API_URL = `http://${window.location.hostname}/api`;

  useEffect(() => {
    if (user.role !== 'admin') { navigate('/dashboard'); return; }
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await axios.get(`${API_URL}/face/photos/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPhotos(res.data.photos || []);
    } catch (err) {
      setError('Failed to load photos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteAll = async () => {
    if (!window.confirm('Delete all attendance photos?')) return;
    try {
      await axios.delete(`${API_URL}/face/photos/cleanup`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPhotos([]);
    } catch { setError('Failed to delete photos'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <nav style={{ background: '#1e3a5f', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>AttendPro — Photo Gallery</span>
        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
          ← Back to Admin
        </button>
      </nav>

      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a202c', margin: 0 }}>Attendance Photos</h2>
            <p style={{ color: '#718096', fontSize: '13px', marginTop: '4px' }}>{photos.length} photos · Admin view only</p>
          </div>
          <button onClick={deleteAll} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            🗑️ Delete All
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', color: '#718096' }}>
            Loading photos...
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
            <p style={{ color: '#718096' }}>No photos yet.</p>
            <p style={{ color: '#718096', fontSize: '13px', marginTop: '8px' }}>Photos are captured automatically when employees mark attendance using face verification.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {photos.map((photo, i) => (
              <div key={i} onClick={() => setSelected(photo)}
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={`${API_URL}/face/photos/view-public/${photo.id}?token=${token}`}
                    alt={photo.full_name}
                    style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', background: '#f0f4f8' }}
                    onError={e => { e.target.style.display='none'; }}
                  />
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: photo.action === 'checkin' ? '#dcfce7' : '#dbeafe', color: photo.action === 'checkin' ? '#166534' : '#1e40af', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '99px' }}>
                    {photo.action === 'checkin' ? '✓ Check In' : '← Check Out'}
                  </div>
                </div>
                <div style={{ padding: '12px' }}>
                  <p style={{ fontWeight: '600', fontSize: '14px', color: '#1a202c', marginBottom: '4px' }}>{photo.full_name}</p>
                  <p style={{ fontSize: '12px', color: '#718096' }}>{photo.date}</p>
                  <p style={{ fontSize: '12px', color: '#718096' }}>{photo.time} IST</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', maxWidth: '480px', width: '100%' }}>
            <img
              src={`${API_URL}/face/photos/view-public/${selected.id}?token=${token}`}
              alt={selected.full_name}
              style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'contain', background: '#0f172a' }}
            />
            <div style={{ padding: '20px' }}>
              <p style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px', color: '#1a202c' }}>{selected.full_name}</p>
              <p style={{ color: '#718096', fontSize: '13px' }}>
                {selected.action === 'checkin' ? 'Check In' : 'Check Out'} · {selected.date} · {selected.time} IST
              </p>
              <button onClick={() => setSelected(null)}
                style={{ marginTop: '16px', width: '100%', padding: '10px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
