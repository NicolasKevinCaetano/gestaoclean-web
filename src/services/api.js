const API_BASE = import.meta.env.VITE_API_URL || '/api';
export const getToken = () => sessionStorage.getItem('gc_token');
export function logout() { sessionStorage.removeItem('gc_token'); sessionStorage.removeItem('gc_role'); window.location.assign('/login'); }
export function getRole() { return sessionStorage.getItem('gc_role') || ''; }
export async function ensureRole() {
  const token = getToken();
  if (!token) return '';
  if (/^(ADMIN|FUNCIONARIO)$/i.test(getRole())) return getRole();
  const day = new Date().toISOString().slice(0, 10);
  try {
    const response = await fetch(`${API_BASE}/dashboard?inicio=${day}&fim=${day}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) sessionStorage.setItem('gc_role', 'ADMIN');
    else if (response.status === 403) sessionStorage.setItem('gc_role', 'FUNCIONARIO');
    else if (response.status === 401) logout();
  } catch { /* Sem conexão: manter os recursos administrativos ocultos. */ }
  return getRole();
}
export async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401 && !path.includes('/auth/login')) { logout(); throw new Error('Sessão expirada'); }
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.message || data.mensagem || `Erro HTTP ${response.status}`); }
  if (response.status === 204) return null;
  return response.json();
}
export async function login(email, senha) {
  const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
  const token = data.token || data.accessToken;
  if (!token) throw new Error('A API não retornou um token JWT');
  sessionStorage.setItem('gc_token', token);
  try { const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); const role = data.perfil || data.role || payload.role || payload.perfil || (payload.authorities || []).join(' '); sessionStorage.setItem('gc_role', String(role)); } catch { sessionStorage.setItem('gc_role', String(data.perfil || data.role || '')); }
  // O JWT atual da API contém apenas o e-mail; consultamos um endpoint ADMIN para identificar o perfil.
  const now = new Date(); const day = now.toISOString().slice(0, 10);
  try {
    const probe = await fetch(`${API_BASE}/dashboard?inicio=${day}&fim=${day}`, { headers: { Authorization: `Bearer ${token}` } });
    if (probe.ok) sessionStorage.setItem('gc_role', 'ADMIN');
    else if (probe.status === 403) sessionStorage.setItem('gc_role', 'FUNCIONARIO');
  } catch { /* Rede indisponível: permissões permanecem restritas até novo login. */ }
  return data;
}
