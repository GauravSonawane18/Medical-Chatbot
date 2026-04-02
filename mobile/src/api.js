import { getToken } from './storage';

// Physical device (Android + iOS): use your PC's LAN IP
// Android emulator only: use 10.0.2.2
export const API_BASE_URL = 'http://10.187.101.163:8000';

async function request(path, options = {}) {
  const token = options.skipAuth ? null : await getToken();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check that FastAPI is running and the IP is correct.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    let msg = 'Request failed.';
    if (typeof data === 'string' && data) {
      msg = data;
    } else if (data?.detail) {
      if (Array.isArray(data.detail)) {
        // FastAPI validation errors: [{loc, msg, type}]
        msg = data.detail.map((e) => e.msg || JSON.stringify(e)).join(', ');
      } else {
        msg = String(data.detail);
      }
    } else if (data) {
      msg = JSON.stringify(data);
    }
    throw new Error(msg);
  }

  return data;
}

export const api = {
  healthCheck: () => request('/health', { skipAuth: true }),
  login: (body) => request('/login', { method: 'POST', body, skipAuth: true }),
  register: (body) => request('/register', { method: 'POST', body, skipAuth: true }),

  getMe: () => request('/me'),
  getChatHistory: () => request('/chat/history'),
  getMedicalHistory: () => request('/medical-history'),
  sendChat: (body) => request('/chat', { method: 'POST', body }),

  getPatients: () => request('/patients'),
  getPatient: (id) => request(`/patients/${id}`),
  getFlaggedChats: () => request('/doctor/flagged-chats'),
  addDoctorNote: (body) => request('/doctor/notes', { method: 'POST', body }),
  addMedicalHistory: (body) => request('/doctor/medical-history', { method: 'POST', body }),
};
