import { TelegramCloudStorage } from './types';

// Create a wrapper for storage that works in both contexts
class StorageWrapper {
  private storage: Storage | TelegramCloudStorage | null = null;

  constructor() {
    try {
      // Try to use Telegram WebApp storage first
      if (window.Telegram?.WebApp?.CloudStorage &&
          typeof window.Telegram.WebApp.CloudStorage.getItem === 'function' &&
          typeof window.Telegram.WebApp.CloudStorage.setItem === 'function' &&
          typeof window.Telegram.WebApp.CloudStorage.removeItem === 'function') {
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
      if ('getItem' in this.storage && typeof this.storage.getItem === 'function') {
        const result = await (this.storage as TelegramCloudStorage).getItem(key);
        return result;
      } else {
        return (this.storage as Storage).getItem(key);
      }
    } catch (error) {
      console.warn('Error getting item from storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.storage) return;
    
    try {
      if ('setItem' in this.storage && typeof this.storage.setItem === 'function') {
        await (this.storage as TelegramCloudStorage).setItem(key, value);
      } else {
        (this.storage as Storage).setItem(key, value);
      }
    } catch (error) {
      console.warn('Error setting item in storage:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.storage) return;
    
    try {
      if ('removeItem' in this.storage && typeof this.storage.removeItem === 'function') {
        await (this.storage as TelegramCloudStorage).removeItem(key);
      } else {
        (this.storage as Storage).removeItem(key);
      }
    } catch (error) {
      console.warn('Error removing item from storage:', error);
    }
  }
}

export const storage = new StorageWrapper(); 