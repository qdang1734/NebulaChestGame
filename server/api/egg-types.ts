import { Router, type Request, type Response } from 'express';
import { storage } from '../storage';
import { insertEggTypeSchema } from '../schema';

const router = Router();

// API lấy danh sách các loại trứng
router.get('/egg-types', async (req: Request, res: Response) => {
  try {
    const allEggTypes = await storage.getAllEggTypes();
    res.json(allEggTypes);
  } catch (error) {
    console.error("Error fetching egg types:", error);
    res.status(500).json({ error: "Failed to fetch egg types" });
  }
});

// API tạo một loại trứng mới
router.post('/egg-types', async (req: Request, res: Response) => {
  try {
    const parsed = insertEggTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid egg type data" });
    }

    const newEggType = await storage.createEggType(parsed.data);
    res.status(201).json(newEggType);
  } catch (error) {
    console.error("Error creating egg type:", error);
    res.status(500).json({ error: "Failed to create egg type" });
  }
});

export default router;
