import { Router, type Request, type Response } from 'express';
import { storage } from '../storage';
import type { Kitty } from '../schema';

const router = Router();

// Helper function for weighted random selection based on drop rates
const selectRandomKitty = (kitties: Kitty[]): Kitty | null => {
  if (!kitties || kitties.length === 0) {
    return null;
  }

  const totalWeight = kitties.reduce((sum, kitty) => sum + (kitty.dropRate || 0), 0);
  let random = Math.random() * totalWeight;

  for (const kitty of kitties) {
    if (random < (kitty.dropRate || 0)) {
      return kitty;
    }
    random -= (kitty.dropRate || 0);
  }

  // Fallback in case of floating point inaccuracies, should rarely happen
  return kitties[kitties.length - 1];
};

router.post('/open-egg', async (req: Request, res: Response) => {
  try {
    const { eggId } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated. Please log in.' });
    }

    if (!eggId) {
      return res.status(400).json({ success: false, error: 'Egg ID is required' });
    }

    // 1. Fetch the egg and validate it
    const egg = await storage.getEgg(eggId);

    if (!egg) {
      return res.status(404).json({ success: false, error: 'Egg not found' });
    }

    if (egg.userId !== userId) {
      return res.status(403).json({ success: false, error: 'This egg does not belong to you' });
    }

    if (egg.isOpened) {
      return res.status(400).json({ success: false, error: 'This egg has already been opened' });
    }

    // 2. Get possible kitties for this egg type
    const possibleKitties = await storage.getKittiesByEggType(egg.eggTypeId);

    if (!possibleKitties || possibleKitties.length === 0) {
      return res.status(500).json({ success: false, error: 'Configuration error: No possible kitties found for this egg type.' });
    }
    
    // 3. Select a random kitty based on drop rate
    const selectedKitty = selectRandomKitty(possibleKitties);

    if (!selectedKitty) {
        return res.status(500).json({ success: false, error: 'Configuration error: Could not select a kitty. Check drop rates.' });
    }

    // 4. Update the egg record in the database, linking the selected kitty
    await storage.openEgg(eggId, selectedKitty.id);

    // 5. Return the successful result with the hatched kitty
    res.json({
      success: true,
      message: 'Egg opened successfully!',
      kitty: selectedKitty,
    });

  } catch (error) {
    console.error('Error opening egg:', error);
    res.status(500).json({ success: false, error: 'Failed to open egg due to a server error.' });
  }
});

export default router;
