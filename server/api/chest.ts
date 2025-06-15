import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { users, chestOpenings } from '../schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

// API mở rương: cộng thưởng cho inviter nếu là lần đầu mở
router.post('/open-chest', async (req: Request, res: Response) => {
  try {
    // Accept both camelCase and snake_case telegram ID from client
    const rawTelegramId = req.body.telegramId ?? req.body.telegram_id;
    const telegramId = rawTelegramId?.toString();
    const { chestValue } = req.body;
    if (!telegramId || !chestValue) return res.status(400).json({ error: 'Missing parameters' });
    
    // Lấy user hiện tại
    const userResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    const user = userResult[0];

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Kiểm tra xem user có đủ tiền không
    if (user.balance < chestValue) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Trừ tiền user
    await db.update(users).set({ balance: sql`${users.balance} - ${chestValue}` }).where(eq(users.telegramId, telegramId));

    // Inviter reward logic disabled (inviteBy column removed)
    const inviterReward = 0;

    // Ghi lại lịch sử mở rương
    await db.insert(chestOpenings).values({
      telegramId: telegramId,
      chestValue: chestValue,
      inviterId: null,
      inviterReward: inviterReward
    });

    const updatedUserResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    res.json({ success: true, user: updatedUserResult[0] });
  } catch (err) {
    console.error("Error in /api/open-chest:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API lấy lịch sử mở rương của user
router.get('/chest-history', async (req: Request, res: Response) => {
  try {
    const telegramId = req.query.telegramId as string;
    if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

    const rows = await db.select({
      chestValue: chestOpenings.chestValue,
      openedAt: chestOpenings.openedAt,
      inviterId: chestOpenings.inviterId,
      inviterReward: chestOpenings.inviterReward
    }).from(chestOpenings)
      .where(eq(chestOpenings.telegramId, telegramId))
      .orderBy(desc(chestOpenings.openedAt))
      .limit(50);
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
