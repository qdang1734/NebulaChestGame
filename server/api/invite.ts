import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { db } from '../db';
import { chestOpenings } from '../schema';
import { eq, and, gt, desc } from 'drizzle-orm';

const router = Router();

// API lấy lịch sử invite reward của user
router.get('/invite-rewards-history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const telegramId = req.user?.telegramId;
    if (!telegramId) return res.status(401).json({ error: 'User not authenticated' });

    const rows = await db.select({
      chestValue: chestOpenings.chestValue,
      openedAt: chestOpenings.openedAt,
      inviterReward: chestOpenings.inviterReward,
      inviteeId: chestOpenings.telegramId
    }).from(chestOpenings)
      .where(
        and(
          eq(chestOpenings.inviterId, telegramId),
          gt(chestOpenings.inviterReward, 0)
        )
      )
      .orderBy(desc(chestOpenings.openedAt))
      .limit(50);
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
