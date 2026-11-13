import { Request, Response, NextFunction } from 'express';
import { getAppointmentReport } from '../services/report.service';
import { AppError } from '../middleware/error-handler';

export function isValidDateString(str: unknown): str is string {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return false;
  }
  const [y, m, d] = str.split('-').map(Number);
  if (m < 1 || m > 12) return false;

  const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const daysInMonth = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > daysInMonth[m]) return false;

  return true;
}

export async function handleGetAppointmentReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError(
        400,
        'INVALID_DATE_RANGE',
        'Both startDate and endDate query parameters are required in YYYY-MM-DD format.'
      );
    }

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      throw new AppError(
        400,
        'INVALID_DATE_RANGE',
        'startDate and endDate must be valid calendar dates formatted as YYYY-MM-DD.'
      );
    }

    if (startDate > endDate) {
      throw new AppError(
        400,
        'INVALID_DATE_RANGE',
        `startDate (${startDate}) cannot be later than endDate (${endDate}).`
      );
    }

    const report = await getAppointmentReport(startDate, endDate);

    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
}

