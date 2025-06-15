import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { storage } from '../storage';
import { z } from 'zod';

// Schema để xác thực dữ liệu khi mua trứng
const buyEggSchema = z.object({
  eggTypeId: z.number(),
});

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

// API tạo một quả trứng mới cho người dùng (mua trứng)
router.post('/eggs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Xác thực body của request
    const parsed = buyEggSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ: eggTypeId là bắt buộc và phải là một con số.", details: parsed.error.flatten() });
    }

    // Chuẩn bị dữ liệu để tạo trứng mới
    const eggToCreate = {
      userId,
      eggTypeId: parsed.data.eggTypeId,
    };

    const newEgg = await storage.createEgg(eggToCreate);
    res.status(201).json(newEgg);
  } catch (error) {
    console.error("Error creating egg:", error);
    res.status(500).json({ error: "Failed to create egg" });
  }
});

export default router;
