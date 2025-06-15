import { CloudStorage } from '@twa-dev/sdk';

// Create a wrapper for storage that works in both contexts
class StorageWrapper {
  private storage: Storage | CloudStorage | null = null;

  constructor() {
    try {
      // Try to use Telegram WebApp storage first
      if (window.Telegram?.WebApp?.CloudStorage) {
        this.storage = window.Telegram.WebApp.CloudStorage;
      } else {
        // Fallback to localStorage
        this.storage = window.localStorage;
      }
    } catch (error) {
      console.warn('Storage initialization failed:', error);
      this.storage = null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.storage) return null;
    
    try {
      if (this.storage instanceof CloudStorage) {
        const result = await this.storage.getItem(key);
        return result;
      } else {
        return this.storage.getItem(key);
      }
    } catch (error) {
      console.warn('Error getting item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.storage) return;
    
    try {
      if (this.storage instanceof CloudStorage) {
        await this.storage.setItem(key, value);
      } else {
        this.storage.setItem(key, value);
      }
    } catch (error) {
      console.warn('Error setting item in storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.storage) return;
    
    try {
      if (this.storage instanceof CloudStorage) {
        await this.storage.removeItem(key);
      } else {
        this.storage.removeItem(key);
      }
    } catch (error) {
      console.warn('Error removing item from storage:', error);
    }
  }
}

export const storage = new StorageWrapper(); 