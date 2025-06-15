import { Router, type Response } from 'express';
import { authenticateToken, type AuthRequest } from './middleware';
import { storage } from '../storage';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { eggTypes, kitties, userCollections, users } from '../schema';

const router = Router();

router.post('/open-egg', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { eggTypeId } = req.body;
    if (eggTypeId === undefined) {
      return res.status(400).json({ error: "Egg Type ID is required" });
    }

    const user = await storage.getUser(userId);
    const [eggType] = await db.select().from(eggTypes).where(eq(eggTypes.id, eggTypeId));

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (!eggType) {
      return res.status(404).json({ error: "Egg type not found." });
    }

    const price = eggType.price || 0;
    const userBalance = user.balance || 0;
    if (userBalance < price) {
      return res.status(400).json({ error: "Insufficient balance." });
    }

    const newBalance = userBalance - price;
    await db.update(users).set({ balance: newBalance }).where(eq(users.id, userId));

    const possibleKitties = await db.select().from(kitties).where(eq(kitties.eggTypeId, eggTypeId));
    if (possibleKitties.length === 0) {
      return res.status(500).json({ error: "No kitties found for this egg type." });
    }

    const totalDropRate = possibleKitties.reduce((sum, kitty) => sum + (kitty.dropRate || 0), 0);
    let random = Math.random() * totalDropRate;
    let selectedKitty = null;

    for (const kitty of possibleKitties) {
      random -= (kitty.dropRate || 0);
      if (random <= 0) {
        selectedKitty = kitty;
        break;
      }
    }

    if (!selectedKitty) {
      selectedKitty = possibleKitties[0];
    }

    await storage.createEgg({
      userId: userId,
      eggTypeId: eggTypeId,
      isOpened: true,
      openedAt: new Date(),
      kittyId: selectedKitty.id,
    });

    const collection = await storage.getCollectionByKittyId(selectedKitty.id);
    if (!collection) {
      return res.status(500).json({ error: "Could not find collection for the awarded kitty." });
    }

    const [existingUserCollection] = await db.select()
      .from(userCollections)
      .where(and(
          eq(userCollections.userId, userId),
          eq(userCollections.collectionId, collection.id)
      ));

    if (existingUserCollection) {
      const newCount = (existingUserCollection.count || 0) + 1;
      await db.update(userCollections)
          .set({ count: newCount })
          .where(eq(userCollections.id, existingUserCollection.id));
    } else {
      await storage.addUserCollection({
          userId: userId,
          collectionId: collection.id,
          count: 1
      });
    }

    res.json(selectedKitty);

  } catch (error) {
    console.error("Error opening egg:", error);
    res.status(500).json({ error: "Failed to open egg" });
  }
});

export default router;
