import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../../shared/schema';
import { validateAuthToken } from '../telegram-bot';

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
function getUserIdFromAuth(req: Request): number | null {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return null;
  }

  const userSession = validateAuthToken(token);
  return userSession ? userSession.userId : null;
}


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
      res.json({ success: true, user });
    } else {
      res.status(500).json({ error: 'Failed to login or create user' });
    }
  } catch (err) {
    console.error("Error in /api/login:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user
router.get("/user", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuth(req) || mockUserId;
    
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
router.get("/validate-token", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({ valid: false, error: "No authentication token provided" });
    }

    const userSession = validateAuthToken(token);

    if (!userSession) {
      return res.status(401).json({ valid: false, error: "Invalid or expired token" });
    }

    const userResult = await db.select().from(users).where(eq(users.id, userSession.userId)).limit(1);
    const user = userResult[0];

    if (!user) {
      return res.status(404).json({ valid: false, error: "User not found" });
    }

    res.json({ valid: true, user });
  } catch (error) {
    console.error("Error validating token:", error);
    res.status(500).json({ valid: false, error: "Server error during token validation" });
  }
});

export default router;
