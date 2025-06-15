import { Router, type Request, type Response } from 'express';
import { storage } from '../storage';
import { getUserId } from './auth-utils';
import { insertEggSchema } from '../schema';

const router = Router();

// API lấy danh sách trứng của người dùng
router.get('/eggs', async (req: Request, res: Response) => {
  try {
    const userIdString = await getUserId(req);
    const userEggs = await storage.getUserEggs(parseInt(userIdString, 10));
    res.json(userEggs);
  } catch (error) {
    console.error("Error fetching user eggs:", error);
    res.status(500).json({ error: "Failed to fetch user eggs" });
  }
});

// API tạo một quả trứng mới cho người dùng
router.post('/eggs', async (req: Request, res: Response) => {
  try {
    const parsed = insertEggSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid egg data" });
    }

    // Note: This endpoint is not fully authenticated yet.
    const newEgg = await storage.createEgg(parsed.data);
    res.status(201).json(newEgg);
  } catch (error) {
    console.error("Error creating egg:", error);
    res.status(500).json({ error: "Failed to create egg" });
  }
});

export default router;
