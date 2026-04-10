import axios from 'axios';

const API = axios.create({
  baseURL: 'http://3.108.41.17.nip.io/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

export const checkIn = () => API.post('/attendance/checkin');
export const checkOut = () => API.post('/attendance/checkout');
export const getToday = () => API.get('/attendance/today');
export const getMyHistory = () => API.get('/attendance/my-history');

export const registerFace = (image) => API.post('/face/register', { image });
export const verifyFace = (image) => API.post('/face/verify', { image });

export const getMySummary = () => API.get('/reports/summary');
export const applyLeave = (data) => API.post(`/reports/leave?reason=${data.reason}&from_date=${data.from_date}&to_date=${data.to_date}`);
export const getMyLeaves = () => API.get('/reports/leave/my');

export const getDashboard = () => API.get('/admin/dashboard');
export const getAllEmployees = () => API.get('/admin/employees');
export const deleteEmployee = (id) => API.delete(`/admin/employees/${id}`);
export const getTodaysAttendance = () => API.get('/admin/attendance/today');
export const getReport = (from, to) => API.get(`/admin/attendance/report?from_date=${from}&to_date=${to}`);
export const exportCSV = (from, to) => API.get(`/admin/attendance/export?from_date=${from}&to_date=${to}`, { responseType: 'blob' });
export const getLeaves = () => API.get('/admin/leaves');
export const updateLeave = (id, status) => API.put(`/admin/leaves/${id}?status=${status}`);
