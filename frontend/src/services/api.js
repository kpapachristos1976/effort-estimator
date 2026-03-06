const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// Projects
export const projectApi = {
  list: () => request('/projects'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  upload: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/projects/${id}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  },
  getEstimations: (id) => request(`/projects/${id}/estimations`),
};

// Estimations
export const estimationApi = {
  create: (data) => request('/estimate', { method: 'POST', body: JSON.stringify(data) }),
  exportCsv: (id) => `${API_BASE}/estimations/${id}/export/csv`,
};

// Task Classifications
export const taskClassificationApi = {
  list: () => request('/task-classifications'),
  create: (data) => request('/task-classifications', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/task-classifications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/task-classifications/${id}`, { method: 'DELETE' }),
};

// Parameters
export const parameterApi = {
  list: () => request('/parameters'),
  defaults: () => request('/parameters/defaults'),
  create: (data) => request('/parameters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/parameters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/parameters/${id}`, { method: 'DELETE' }),
};
