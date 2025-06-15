import { Telegraf, Context, Input } from 'telegraf';
import { storage } from './storage';
import { InsertUser } from './schema';
import { Request } from 'express';

// A mock user ID for testing purposes when no token is available
export const mockUserId = 1;

/**
 * Extracts a user ID from an Express request object.
 * It checks for a Bearer token in the Authorization header first,
 * then falls back to a 'token' query parameter.
 * @param req The Express Request object.
 * @returns The user ID if the token is valid, otherwise null.
 */


const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7958696875:AAFD4wI0Fh54m8v9jDDdkZgFEKlLNT-xie4';
// Base URL for generating Telegram WebApp deep links
const BASE_URL = process.env.FRONTEND_URL || 'https://nebulachestgame.onrender.com';
export const bot = new Telegraf(BOT_TOKEN);

// In-memory storage for user sessions - maps Telegram IDs to our internal user IDs
interface UserSession {
  userId: number;
  telegramId: string;
  authToken: string;
  username: string;
  photoUrl?: string;
}

const userSessions = new Map<string, UserSession>();

export function generateAuthToken(length = 32): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Get or create user
async function getOrCreateUser(telegramId: string, username: string, photoUrl?: string): Promise<UserSession> {
  // Check if user already exists in our session
  if (userSessions.has(telegramId)) {
    return userSessions.get(telegramId)!;
  }

  try {
    // Try to find existing user by Telegram ID
    let user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      // Check if username exists (to avoid duplicates)
      const formattedUsername = username || `user_${telegramId}`;
      let actualUsername = formattedUsername;
      let counter = 1;
      
      // Try to find a user with the same username
      let existingUserWithUsername = await storage.getUserByUsername(actualUsername);
      
      // If username exists, append a number until we find a unique one
      while (existingUserWithUsername) {
        actualUsername = `${formattedUsername}_${counter}`;
        counter++;
        existingUserWithUsername = await storage.getUserByUsername(actualUsername);
      }
      
      // Create new user if doesn't exist
      const newUser: InsertUser = {
        username: actualUsername,
        rank: 'Beginner',
        telegramId,
        avatar: photoUrl || '',
        // Generate a random password for users created via Telegram
        password: generateAuthToken(),
      };
      
      try {
        user = await storage.createUser(newUser);
        console.log(`Created new user for Telegram ID ${telegramId}:`, user);
      } catch (error) {
        console.error(`Failed to create user for Telegram ID ${telegramId}:`, error);
        throw new Error(`Failed to create user for Telegram ID ${telegramId}`);
      }
    } else {
      // Update user information if it has changed
      try {
        if (user.avatar !== photoUrl) {
          await storage.updateUser(user.id, {
            avatar: photoUrl || user.avatar,
          });
          
          // Get updated user
          user = await storage.getUserByTelegramId(telegramId);
        }
      } catch (error) {
        console.error(`Failed to update user for Telegram ID ${telegramId}:`, error);
        // Continue with existing user data even if update fails
      }
    }
    
    // Ensure user exists
    if (!user) {
      throw new Error(`Failed to create or retrieve user for Telegram ID ${telegramId}`);
    }
    
    // Create session
    const authToken = generateAuthToken();
    const userId = user.id;
    
    const session: UserSession = {
      userId,
      telegramId,
      authToken,
      username: user.username, // Use actual username from database
      photoUrl,
    };
    
    // Store in memory
    userSessions.set(telegramId, session);
    
    return session;
  } catch (error) {
    console.error(`Error in getOrCreateUser for Telegram ID ${telegramId}:`, error);
    throw error;
  }
}

// Set up bot commands
bot.start(async (ctx) => {
  console.log("[Telegram Bot] Received /start command");
  try {
    const telegramIdNum = ctx.from.id;
    const telegramIdStr = telegramIdNum.toString();
    console.log(`[Telegram Bot] Processing /start for user ID: ${telegramIdStr}`);
    
    const username = ctx.from.username || ctx.from.first_name || `user_${telegramIdStr}`;
    let photoUrl: string | undefined;

    try {
      const userPhotos = await ctx.telegram.getUserProfilePhotos(telegramIdNum, 0, 1);
      if (userPhotos.total_count > 0) {
        const fileId = userPhotos.photos[0][0].file_id;
        photoUrl = (await ctx.telegram.getFileLink(fileId)).href;
      }
    } catch (error) {
      console.warn(`[Telegram Bot] Could not get user profile photo for ${telegramIdStr}:`, error);
    }

    console.log(`[Telegram Bot] Getting or creating user: ${username}`);
    const session = await getOrCreateUser(telegramIdStr, username, photoUrl);
    
    const baseUrl = BASE_URL;
    const gameLink = `${baseUrl}/telegram?token=${session.authToken}`;
    console.log(`[Telegram Bot] Generated game link: ${gameLink}`);
    
    try {
      console.log(`[Telegram Bot] Sending welcome message to ${username}`);
      await ctx.reply(
        `👋 Xin chào ${username}!\n\nChào mừng đến với NebulaChest Game - nơi bạn có thể sưu tầm các chú mèo NFT độc đáo trên blockchain TON.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎮 Chơi NebulaChest ngay!',
                  web_app: {
                    url: gameLink
                  }
                }
              ]
            ]
          }
        }
      );
      
      setTimeout(async () => {
        await ctx.reply(
          `📌 Lệnh hữu ích:\n` +
          `/start - Bắt đầu và đăng nhập\n` +
          `/game - Truy cập trò chơi\n` +
          `/menu - Xem menu đầy đủ\n\n` +
          `Chúc bạn chơi game vui vẻ! 🐱`
        );
      }, 1000);
    } catch (error) {
      console.error('[Telegram Bot] Error sending welcome message:', error);
      await ctx.reply(
        `👋 Xin chào ${username}!\n\nChào mừng đến với NebulaChest Game. Nhấp vào liên kết dưới đây để truy cập trò chơi:\n\n${gameLink}`
      );
    }
  } catch (error) {
    console.error('[Telegram Bot] Critical error in /start command:', error);
    try {
      await ctx.reply('❌ Đã xảy ra lỗi khi khởi động bot. Vui lòng thử lại sau hoặc liên hệ quản trị viên.');
    } catch (replyError) {
      console.error('[Telegram Bot] Could not send error message:', replyError);
    }
  }
});

bot.command('game', async (ctx) => {
  console.log("[Telegram Bot] Received /game command");
  
  try {
    const telegramIdNum = ctx.from.id;
    const telegramIdStr = telegramIdNum.toString();
    console.log(`[Telegram Bot] Processing /game for user ID: ${telegramIdStr}`);

    const session = userSessions.get(telegramIdStr);
    
    if (!session) {
      console.log(`[Telegram Bot] No session found for user ID: ${telegramIdStr}`);
      return ctx.reply('Bạn cần sử dụng lệnh /start trước để đăng nhập.');
    }
    
    // Create deep link to the game with authentication token
    // Sử dụng route /telegram để xử lý chuyển hướng an toàn
    const baseUrl = BASE_URL;
    const gameLink = `${baseUrl}/telegram?token=${session.authToken}`;
    
    console.log(`[Telegram Bot] Generated game link: ${gameLink}`);
    
    try {
      // Sử dụng Telegram WebApp để mở ứng dụng trực tiếp trong Telegram
      console.log(`[Telegram Bot] Sending game button to user ID: ${telegramIdStr}`);
      await ctx.reply('🎮 Trò chơi NebulaChest 🐱', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🎮 Chơi NebulaChest ngay!',
                web_app: {
                  url: gameLink
                }
              }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('[Telegram Bot] Error sending game button:', error);
      // Fallback to regular link if inline keyboard fails
      ctx.reply(`Đây là liên kết đến trò chơi của bạn:\n\n${gameLink}`);
    }
  } catch (error) {
    console.error('[Telegram Bot] Critical error in /game command:', error);
    try {
      await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau hoặc sử dụng lệnh /start trước.');
    } catch (replyError) {
      console.error('[Telegram Bot] Could not send error message:', replyError);
    }
  }
});

// Add menu command
bot.command('menu', async (ctx) => {
  console.log("[Telegram Bot] Received /menu command");
  
  try {
    const telegramIdNum = ctx.from.id;
    const telegramIdStr = telegramIdNum.toString();
    console.log(`[Telegram Bot] Processing /menu for user ID: ${telegramIdStr}`);

    const session = userSessions.get(telegramIdStr);
    
    if (!session) {
      console.log(`[Telegram Bot] No session found for user ID: ${telegramIdStr}`);
      return ctx.reply('Bạn cần sử dụng lệnh /start trước để đăng nhập.');
    }
    
    // Sử dụng route /telegram để xử lý chuyển hướng an toàn
    const baseUrl = BASE_URL;
    const gameLink = `${baseUrl}/telegram?token=${session.authToken}`;
    
    console.log(`[Telegram Bot] Generated game link: ${gameLink}`);
    console.log(`[Telegram Bot] Sending menu to user ID: ${telegramIdStr}`);
    
    await ctx.reply('📋 Menu trò chơi NebulaChest 🐱', {
      reply_markup: {
        inline_keyboard: [
          [
            { 
              text: '🎮 Chơi ngay', 
              web_app: {
                url: gameLink
              }
            },
            { text: '🏆 Xếp hạng', callback_data: 'rank' }
          ],
          [
            { text: '💰 Thưởng hàng ngày', callback_data: 'daily_reward' },
            { text: '📊 Thống kê tài khoản', callback_data: 'stats' }
          ],
          [
            { text: '🤝 Giới thiệu bạn bè', callback_data: 'referral' },
            { text: '📚 Trợ giúp', callback_data: 'help' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('[Telegram Bot] Critical error in /menu command:', error);
    try {
      await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau hoặc sử dụng lệnh /start trước.');
    } catch (replyError) {
      console.error('[Telegram Bot] Could not send error message:', replyError);
    }
  }
});

// Handle callback queries
bot.on('callback_query', async (ctx) => {
  try {
    if (!('data' in ctx.callbackQuery)) {
      return ctx.answerCbQuery();
    }
    const callbackData = ctx.callbackQuery.data;
    console.log('[Telegram Bot] Received callback query:', callbackData);

    const telegramIdStr = ctx.from.id.toString();
    const session = userSessions.get(telegramIdStr);

    if (!session) {
      console.log(`[Telegram Bot] No session found for user ID: ${telegramIdStr}`);
      return ctx.answerCbQuery('Bạn cần sử dụng lệnh /start trước để đăng nhập.', { show_alert: true });
    }

    await ctx.answerCbQuery();

    switch (callbackData) {
      case 'rank':
        await ctx.reply('🏆 Xếp hạng hiện tại chưa khả dụng. Vui lòng thử lại sau.');
        break;
      case 'daily_reward':
        await ctx.reply('💰 Tính năng nhận thưởng hàng ngày qua Telegram sẽ sớm được cập nhật!');
        break;
      case 'stats':
        const user = await storage.getUser(session.userId);
        if (user) {
          await ctx.reply(
            `📊 Thống kê tài khoản của ${user.username}:\n\n` +
            `💰 Số dư: ${user.balance.toFixed(3)} TON\n` +
            `💎 Tổng phần thưởng: ${user.totalReward.toFixed(4)} TON\n` +
            `🔄 Cập nhật lần cuối: ${new Date().toLocaleString('vi-VN')}`
          );
        } else {
          await ctx.reply('❌ Không thể tải thông tin người dùng.');
        }
        break;
      case 'referral':
        const botUsername = (await bot.telegram.getMe()).username;
        await ctx.reply(
          `🤝 Giới thiệu bạn bè tham gia NebulaChest!\n\n` +
          `Chia sẻ liên kết này đến bạn bè của bạn:\n` +
          `https://t.me/${botUsername}?start=${session.telegramId}`
        );
        break;
      case 'help':
        await ctx.reply(
          `📚 Trợ giúp NebulaChest Bot:\n\n` +
          `/start - Khởi động bot và đăng nhập\n` +
          `/game - Truy cập vào trò chơi NebulaChest\n` +
          `/menu - Hiển thị menu chức năng\n` +
          `/help - Hiển thị trợ giúp\n\n` +
          `Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ admin qua Telegram.`
        );
        break;
      default:
        await ctx.reply('❓ Lệnh không hợp lệ.');
    }
  } catch (error) {
    console.error(`[Telegram Bot] Critical error in callback_query for user ${ctx.from?.id}:`, error);
    try {
      if ('callbackQuery' in ctx) {
        await ctx.answerCbQuery('An error occurred. Please try again.').catch(e => console.error('Failed to answer callback query on error:', e));
      }
    } catch (e) {
      // Ignore if we can't even reply
    }
  }
});

// Function to validate an auth token and get the associated user
export function validateAuthToken(token: string): UserSession | undefined {
  // Convert to array first to avoid MapIterator issues
  const sessions = Array.from(userSessions.values());
  const session = sessions.find(session => session.authToken === token);
  return session;
}

// Start the bot
export async function startBot(secretPath: string) {
  try {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
        console.error('BACKEND_URL is not set. Webhook setup failed.');
        // Fallback to polling for local development if needed
        console.log('Falling back to polling mode for local development.');
        await bot.launch();
        return;
    }

    const webhookUrl = `${backendUrl}${secretPath}`;

    // Set webhook
    await bot.telegram.setWebhook(webhookUrl);
    console.log(`[Telegram Bot] Webhook set to ${webhookUrl}`);

    // Graceful stop
    process.once('SIGINT', async () => {
      console.log('Stopping bot and deleting webhook...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', async () => {
      console.log('Stopping bot and deleting webhook...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      bot.stop('SIGTERM');
    });

  } catch (error) {
    console.error('Error starting Telegram bot with webhook:', error);
  }
}