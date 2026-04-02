import { getToken } from './storage';

// Android emulator → host machine: 10.0.2.2
// Physical device  → your LAN IP, e.g. 192.168.1.x
export const API_BASE_URL = 'http://10.0.2.2:8000';

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
    const msg =
      typeof data === 'object' && data !== null
        ? data.detail || JSON.stringify(data)
        : data;
    throw new Error(msg || 'Request failed.');
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
