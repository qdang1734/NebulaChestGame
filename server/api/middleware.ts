import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Extend the Request type to include the user property
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    // include any other properties you attach to the user object
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (token == null) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('JWT secret is not defined. Please set SESSION_SECRET environment variable.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, secret, async (err: any, payload: any) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ error: 'Token is not valid' });
    }

    try {
      const userId = payload.userId;
      if (!userId) {
        return res.status(403).json({ error: 'Invalid token payload' });
      }

      const userResult = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, userId)).limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      req.user = userResult[0];
      next();
    } catch (dbError) {
      console.error('Error fetching user from token:', dbError);
      return res.status(500).json({ error: 'Internal server error while verifying user' });
    }
  });
};
