import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MarkAttendance from './pages/MarkAttendance';
import MyReports from './pages/MyReports';
import AdminDashboard from './pages/AdminDashboard';
import PhotoGallery from './pages/PhotoGallery';

const PrivateRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return localStorage.getItem('token') && user.role === 'admin'
    ? children
    : <Navigate to="/dashboard" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/attendance" element={<PrivateRoute><MarkAttendance /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><MyReports /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/photos" element={<AdminRoute><PhotoGallery /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
