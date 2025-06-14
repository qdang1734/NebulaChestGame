// User model and DB logic for NebulaChest
import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH || './database/nebulachest.db');

export interface User {
  id?: number;
  telegram_id: string;
  username?: string;
  avatar?: string;
  balance: number;
  invite_by?: string;
  created_at?: string;
}

export function getUserByTelegramId(telegram_id: string): User | undefined {
  if (!telegram_id) return undefined;
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegram_id);
}

export function createUser(user: Partial<User>): User | undefined {
  if (!user.telegram_id) return undefined;
  db.prepare('INSERT INTO users (telegram_id, username, avatar, balance, invite_by) VALUES (?, ?, ?, 0, ?)')
    .run(user.telegram_id, user.username || null, user.avatar || null, user.invite_by || null);
  return getUserByTelegramId(user.telegram_id)!;
}

export function upsertUser(user: Partial<User>): User | undefined {
  if (!user.telegram_id) return undefined;
  let existing = getUserByTelegramId(user.telegram_id);
  if (!existing) {
    return createUser(user);
  }
  db.prepare('UPDATE users SET username = ?, avatar = ? WHERE telegram_id = ?')
    .run(user.username || existing.username, user.avatar || existing.avatar, user.telegram_id);
  return getUserByTelegramId(user.telegram_id)!;
}

// Cộng thưởng cho inviter khi invitee mở rương lần đầu
export function setInviterReward(inviterTelegramId: string, rewardAmount: number): User | undefined {
  const inviter = getUserByTelegramId(inviterTelegramId);
  if (!inviter) return undefined;
  db.prepare('UPDATE users SET balance = balance + ? WHERE telegram_id = ?')
    .run(rewardAmount, inviterTelegramId);
  return getUserByTelegramId(inviterTelegramId);
}
