import { Router, type Request, type Response } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { kitties, insertKittySchema } from '../schema';

const router = Router();

// API lấy danh sách các con mèo
router.get('/kitties', async (req: Request, res: Response) => {
  try {
    const eggTypeId = req.query.eggTypeId ? Number(req.query.eggTypeId) : undefined;

    let kittyList;
    if (eggTypeId) {
      kittyList = await storage.getKittiesByEggType(eggTypeId);
    } else {
      kittyList = await db.select().from(kitties);
    }

    res.json(kittyList);
  } catch (error) {
    console.error("Error fetching kitties:", error);
    res.status(500).json({ error: "Failed to fetch kitties" });
  }
});

// API tạo một con mèo mới
router.post('/kitties', async (req: Request, res: Response) => {
  try {
    const parsed = insertKittySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid kitty data" });
    }

    const newKitty = await storage.createKitty(parsed.data);
    res.status(201).json(newKitty);
  } catch (error) {
    console.error("Error creating kitty:", error);
    res.status(500).json({ error: "Failed to create kitty" });
  }
});

export default router;
