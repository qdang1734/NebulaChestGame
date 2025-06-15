import { auth } from './auth';

const API_URL = 'https://nebulachestgamebackend.onrender.com/api';

async function getHeaders(): Promise<HeadersInit> {
  const token = await auth.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: await getHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        await auth.removeToken();
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      if (response.status === 401) {
        await auth.removeToken();
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      if (response.status === 401) {
        await auth.removeToken();
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }
}; 