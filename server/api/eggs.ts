import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { storage } from '../storage';

import { insertEggSchema } from '../schema';

const router = Router();

// API lấy danh sách trứng của người dùng
router.get('/eggs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userEggs = await storage.getUserEggs(userId);
    res.json(userEggs);
  } catch (error) {
    console.error("Error fetching user eggs:", error);
    res.status(500).json({ error: "Failed to fetch user eggs" });
  }
});

// API tạo một quả trứng mới cho người dùng
router.post('/eggs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Use the authenticated user's ID, ignoring any userId in the body.
    const eggData = { ...req.body, userId };

    const parsed = insertEggSchema.safeParse(eggData);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid egg data", details: parsed.error.flatten() });
    }

    const newEgg = await storage.createEgg(parsed.data);
    res.status(201).json(newEgg);
  } catch (error) {
    console.error("Error creating egg:", error);
    res.status(500).json({ error: "Failed to create egg" });
  }
});

export default router;
