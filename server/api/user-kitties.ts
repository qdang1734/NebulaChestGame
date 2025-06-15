import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { kitties, eggs } from '../schema';
import { sql, eq, and } from 'drizzle-orm';

const router = Router();

// API lấy danh sách mèo của người dùng
router.get('/user-kitties', async (req: Request, res: Response) => {
  try {
    let userId: number | undefined;

    // TODO: Refactor auth logic into a middleware
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { validateAuthToken } = await import("../telegram-bot");
      const userSession = validateAuthToken(token);
      if (userSession) userId = userSession.userId;
    }

    if (!userId) {
      const queryToken = req.query.token as string | undefined;
      if (queryToken) {
        const { validateAuthToken } = await import("../telegram-bot");
        const userSession = validateAuthToken(queryToken);
        if (userSession) userId = userSession.userId;
      }
    }

    if (!userId) {
      // This is a temporary solution until proper auth middleware is in place.
      // For now, let's use a mock user id for development
      userId = 1;
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
