import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from './middleware';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../../shared/schema';


const router = Router();

// A mock user ID for testing purposes when no token is available
const mockUserId = 1;

/**
 * Extracts a user ID from an Express request object.
 * It checks for a Bearer token in the Authorization header first,
 * then falls back to a 'token' query parameter.
 * @param req The Express Request object.
 * @returns The user ID if the token is valid, otherwise null.
 */



// POST /api/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, avatar } = req.body;
    const telegramId = (req.body.telegramId ?? req.body.telegram_id)?.toString();
    if (!telegramId) return res.status(400).json({ error: 'Missing telegramId' });

    const updateData: Record<string, any> = {};
    if (username !== undefined) updateData.username = username;
    if (avatar !== undefined) updateData.avatar = avatar;

    const userResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    let user = userResult[0];

    if (user) {
      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.telegramId, telegramId));
      }
    } else {
      await db.insert(users).values({ telegramId, username: username ?? '', avatar: avatar ?? '' });
    }

    const finalUserResult = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    user = finalUserResult[0];

    if (user) {
      // *** IMPORTANT: Create JWT on login ***
      const secret = process.env.SESSION_SECRET;
      if (!secret) {
        console.error('JWT secret is not defined. Please set SESSION_SECRET environment variable.');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '30d' });

      res.json({ success: true, user, token });
    } else {
      res.status(500).json({ error: 'Failed to login or create user' });
    }
  } catch (err) {
    console.error("Error in /api/login:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user
router.get("/user", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // The user object is attached to the request by the authenticateToken middleware.
    const userId = req.user?.id;
    if (!userId) {
      // This case should not be reached if middleware is working
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// GET /api/validate-token
router.get("/validate-token", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // If authenticateToken middleware passes, the token is valid.
    // The user object is available in req.user.
    const user = req.user;
    if (!user) {
      // This case should not be reached if middleware is working
      return res.status(401).json({ valid: false, error: "User not authenticated" });
    }

    // The user object from the middleware might be partial, so we can just confirm validity.
    // Or we can send back the user data we have.
    res.json({ valid: true, user });
  } catch (error) {
    console.error("Error validating token:", error);
    res.status(500).json({ valid: false, error: "Server error during token validation" });
  }
});

export default router;
