import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { AppError } from './error-handler';
import { UserRole } from '../types';

export async function authenticateUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const userIdHeader = req.headers['x-user-id'];

  if (!userIdHeader) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing required X-User-Id header.'));
    return;
  }

  // Handle header if received as array or string
  const rawId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
  const parsedId = parseInt(rawId.trim(), 10);

  if (isNaN(parsedId) || parsedId <= 0 || !/^\d+$/.test(rawId.trim())) {
    next(
      new AppError(
        401,
        'INVALID_USER_ID',
        'X-User-Id header must be a positive integer representing a valid user ID.'
      )
    );
    return;
  }

  try {
    const result = await pool.query<{
      id: number;
      name: string;
      email: string;
      role: UserRole;
      created_at: Date;
    }>(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [parsedId]
    );

    if (result.rows.length === 0) {
      next(
        new AppError(
          401,
          'USER_NOT_FOUND',
          `No user found with ID ${parsedId}. Please provide a valid seeded user ID.`
        )
      );
      return;
    }

    const row = result.rows[0];
    req.user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied. Allowed roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}.`
        )
      );
      return;
    }

    next();
  };
}

