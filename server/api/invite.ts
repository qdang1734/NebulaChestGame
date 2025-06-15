import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { chestOpenings } from '../schema';
import { eq, and, gt, desc } from 'drizzle-orm';

const router = Router();

// API lấy lịch sử invite reward của user
router.get('/invite-rewards-history', async (req: Request, res: Response) => {
  try {
    const telegramId = req.query.telegramId as string;
    if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

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
