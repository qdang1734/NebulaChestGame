import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { db } from '../db';
import { users, userCollections, kitties } from '../schema';
import { eq } from 'drizzle-orm';
import { storage } from '../storage';

const router = Router();



// Claim daily rewards from kitties
router.post("/claim-rewards", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
            const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: User ID not found" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).then(rows => rows[0]);

      if (!user) {
        return res.status(404).json({ error: "User not found, please login again" });
      }

      const userKitties = await db
        .select({
          earnPerDay: kitties.earnPerDay,
          count: userCollections.count,
        })
        .from(userCollections)
        .innerJoin(kitties, eq(userCollections.collectionId, kitties.id))
        .where(eq(userCollections.userId, userId));

      const dailyReward = userKitties.reduce((sum, kitty) => 
        sum + (kitty.earnPerDay * kitty.count), 0
      );

      const now = new Date();
      const lastReward = user.lastRewardAt ? new Date(user.lastRewardAt) : new Date(0);
      const hoursPassed = (now.getTime() - lastReward.getTime()) / (1000 * 60 * 60);

      if (hoursPassed < 24) {
        return res.status(400).json({ 
          error: "Too early to claim rewards",
          nextClaimIn: Math.ceil(24 - hoursPassed)
        });
      }

      await db.update(users)
        .set({ 
          balance: user.balance + dailyReward,
          totalReward: user.totalReward + dailyReward,
          lastRewardAt: now
        })
        .where(eq(users.id, userId));

      res.json({ success: true, reward: dailyReward });

    } catch (error) {
      console.error("Error claiming rewards:", error);
      res.status(500).json({ error: "Failed to claim rewards" });
    }
});

// Get user's login history and streak
router.get("/login-history", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
            const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: User ID not found" });
      }

      const loginHistoryData = await storage.getUserLoginHistory(userId);
      const currentStreak = await storage.getUserCurrentStreak(userId);

      res.json({
        currentStreak,
        history: loginHistoryData,
        nextRewardAmount: storage.getDailyRewardForStreak(currentStreak + 1)
      });
    } catch (error) {
      console.error("Error fetching login history:", error);
      res.status(500).json({ error: "Failed to fetch login history" });
    }
});

// Claim daily login reward
router.post("/claim-login-reward", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
            const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized: User ID not found" });
      }

      const { loginHistoryId } = req.body;

      if (!loginHistoryId) {
        return res.status(400).json({ error: "Login history ID is required" });
      }

      const result = await storage.claimDailyReward(userId, loginHistoryId);

      if (!result.success) {
        return res.status(400).json({ error: "Failed to claim reward, it may have already been claimed" });
      }

      res.json({
        success: true,
        rewardAmount: result.amount,
        message: `You've received ${result.amount} TON as a login reward!`
      });
    } catch (error) {
      console.error("Error claiming login reward:", error);
      res.status(500).json({ error: "Failed to claim login reward" });
    }
});

export default router;
