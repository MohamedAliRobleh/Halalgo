import { createClerkClient } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

const clerk = createClerkClient({
  secretKey: process.env['CLERK_SECRET_KEY'],
});

export interface AuthenticatedRequest extends Request {
  clerkUserId: string;
  userRole: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const payload = await clerk.verifyToken(token);
    (req as AuthenticatedRequest).clerkUserId = payload.sub;
    (req as AuthenticatedRequest).userRole =
      (payload.publicMetadata as { role?: string })?.role ?? 'customer';

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.userRole !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
