import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { db } from '../db';
import { kitties, eggs } from '../schema';
import { sql, eq, and } from 'drizzle-orm';

const router = Router();

// API lấy danh sách mèo của người dùng
router.get('/user-kitties', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch kitties owned by user (opened eggs)
    const rows = await db
      .select({
        id: kitties.id,
        name: kitties.name,
        rarity: kitties.rarity,
        earnPerDay: kitties.earnPerDay,
        color: kitties.color,
        spotColor: kitties.spotColor,
        imageUrl: kitties.imageUrl,
        count: sql`COUNT(*)`.as("count"),
      })
      .from(eggs)
      .innerJoin(kitties, eq(eggs.kittyId, kitties.id))
      .where(and(eq(eggs.userId, userId), eq(eggs.isOpened, true)))
      .groupBy(kitties.id);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching user kitties:", error);
    res.status(500).json({ error: "Failed to fetch user kitties" });
  }
});

export default router;
