import { Request } from 'express';

const mockUserId = '123456789'; // Mock user ID for development

/**
 * Extracts the user ID from the request's Authorization header or query parameters.
 * Dynamically imports `validateAuthToken` to avoid circular dependencies or loading issues.
 * Provides a fallback to a mock user ID in development environments.
 * @param req The Express request object.
 * @returns A promise that resolves to the user's ID.
 */
export const getUserId = async (req: Request): Promise<string> => {
  let userId: string | undefined;

  // Function to validate a token and get userId
  const getUserIdFromToken = async (token: string): Promise<string | undefined> => {
    try {
      const { validateAuthToken } = await import('../telegram-bot');
            const userSession = validateAuthToken(token);
      return userSession?.userId ? String(userSession.userId) : undefined;
    } catch (e) {
      console.error('Token validation failed', e);
      return undefined;
    }
  };

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    userId = await getUserIdFromToken(token);
  }

  // 2. Check query parameter if not found in header
  if (!userId && typeof req.query.token === 'string') {
    userId = await getUserIdFromToken(req.query.token);
  }

  // 3. Fallback for development or if no token is provided
  if (!userId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`AUTH: No token found, falling back to mock user ID: ${mockUserId}`);
    } else {
      console.warn(`AUTH: Unauthorized access attempt. No user ID found. Using mock ID as fallback.`);
    }
    return mockUserId;
  }

  return userId;
};
