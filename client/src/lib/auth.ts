import { storage } from './storage';

const TOKEN_KEY = 'auth_token';

export const auth = {
  async getToken(): Promise<string | null> {
    try {
      return await storage.getItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Error getting auth token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await storage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.warn('Error setting auth token:', error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await storage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('Error removing auth token:', error);
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}; 