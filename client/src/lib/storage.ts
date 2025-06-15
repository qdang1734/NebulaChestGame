import { TelegramCloudStorage } from './types';

// Create a wrapper for storage that works in both contexts
class StorageWrapper {
  constructor() {
    // Logic moved to individual methods for robust fallback
  }

  async getItem(key: string): Promise<string | null> {
    const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
    if (cloudStorage) {
      try {
        const result = await cloudStorage.getItem(key);
        return result;
      } catch (error) {
        console.warn('Error getting item from Telegram Cloud Storage, falling back to localStorage:', error);
        // Fallback to localStorage on error
        return localStorage.getItem(key);
      }
    } else {
      // If CloudStorage is not available, use localStorage directly
      return localStorage.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
    if (cloudStorage) {
      try {
        await cloudStorage.setItem(key, value);
        return; // Success, no need for localStorage
      } catch (error) {
        console.warn('Error setting item in Telegram Cloud Storage, falling back to localStorage:', error);
        // Fallback to localStorage on error
        localStorage.setItem(key, value);
      }
    } else {
      // If CloudStorage is not available, use localStorage directly
      localStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
    if (cloudStorage) {
      try {
        await cloudStorage.removeItem(key);
        return; // Success, no need for localStorage
      } catch (error) {
        console.warn('Error removing item from Telegram Cloud Storage, falling back to localStorage:', error);
        // Fallback to localStorage on error
        localStorage.removeItem(key);
      }
    } else {
      // If CloudStorage is not available, use localStorage directly
      localStorage.removeItem(key);
    }
  }
}

export const storage = new StorageWrapper(); 