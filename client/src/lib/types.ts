export type ActiveScreen = "home" | "stats" | "invite" | "earn" | "wallet" | "deposit" | "withdraw" | "profile";

export interface User {
  id: number;
  username: string;
  rank?: string;
  avatar?: string;
  balance?: number;
  totalReward?: number;
  openedEggsCount?: number;
  totalEggs?: number;
  openedEggs?: number;
  loginStreak?: number;
  totalLogins?: number;
  lastLoginAt?: string;
  telegramUsername?: string;
  telegramId?: number;
}

export interface Kitty {
  id: number;
  name: string;
  rarity: string;
  earnPerDay: number;
  dropRate: number;
  eggTypeId: number;
  color?: string;
  spotColor?: string;
  imageUrl?: string;
}

export interface Reward {
  amount: number;
  currency: string;
}

export interface Egg {
  id: number;
  type: string;
  color: string;
  spotColor: string;
  reward?: Reward;
}

export interface Collection {
  id: number;
  name: string;
  count: number;
  icon: string;
  color: string;
  reward: Reward;
}

export interface Task {
  id: number;
  title: string;
  platform: "twitter" | "telegram";
  reward: number;
  completed: boolean;
}

// Unified and comprehensive Telegram WebApp type definitions
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramCloudStorage {
  setItem: (key: string, value: string) => Promise<boolean>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<boolean>;
}

export interface TelegramWebApp {
  ready: () => void;
  initDataUnsafe: { // Can be more specific if needed
    user?: TelegramWebAppUser;
    start_param?: string;
  };
  CloudStorage?: TelegramCloudStorage; // Make CloudStorage optional here
  // Add other properties as they are used in the app
  // E.g., expand(), close(), isExpanded, viewportHeight, etc.
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        CloudStorage: any;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          auth_date: number;
          hash: string;
        };
      };
    };
  }
}
