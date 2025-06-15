import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { db } from '../db';
import { users, chestOpenings } from '../schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = Router();

// API mở rương: cộng thưởng cho inviter nếu là lần đầu mở
router.post('/open-chest', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const telegramId = user?.telegramId;
    const { chestValue } = req.body;

    if (!chestValue) return res.status(400).json({ error: 'Missing chest value' });

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
router.get('/chest-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.user?.telegramId;
    if (!telegramId) return res.status(401).json({ error: 'User not authenticated or telegramId missing' });

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
