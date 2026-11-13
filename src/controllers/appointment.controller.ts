import { Request, Response, NextFunction } from 'express';
import {
  createAppointment,
  listAppointments,
  cancelAppointment,
} from '../services/appointment.service';
import { AppError } from '../middleware/error-handler';
import { AppointmentDuration } from '../types';

// Comprehensive ISO 8601 validator checking:
// 1. Explicit timezone offset (Z or [+-]HH:MM / [+-]HHMM)
// 2. Calendar date validity (no Feb 31, no April 31, leap year validation for Feb 29)
// 3. Wall clock time validity (hours 0-23, minutes 0-59, seconds 0-59)
// 4. Timezone offset validity (hours -14 to +14, minutes 0-59)
export function isValidIsoTimestamp(str: string): boolean {
  const match = str.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|([+-])(\d{2}):?(\d{2}))$/
  );
  if (!match) return false;

  const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr, , tzStr, , tzHStr, tzMStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  const second = secStr ? parseInt(secStr, 10) : 0;

  // Month range
  if (month < 1 || month > 12) return false;

  // Days in month check (including leap year)
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > daysInMonth[month]) return false;

  // Time ranges
  if (hour < 0 || hour > 23) return false;
  if (minute < 0 || minute > 59) return false;
  if (second < 0 || second > 59) return false;

  // Timezone offset range (-14:00 to +14:00, minutes < 60)
  if (tzStr !== 'Z') {
    const tzH = parseInt(tzHStr, 10);
    const tzM = parseInt(tzMStr, 10);
    if (tzH > 14 || tzM > 59 || (tzH === 14 && tzM > 0)) return false;
  }

  // Ensure JS Date parse also validates correctly
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return false;

  return true;
}

const ALLOWED_DURATIONS: AppointmentDuration[] = [15, 30, 45, 60];

export async function handleBookAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const caller = req.user!;

    // Explicitly reject patientId if sent in body (must come exclusively from X-User-Id)
    if ('patientId' in req.body) {
      throw new AppError(
        400,
        'INVALID_REQUEST',
        'Do not provide patientId in request body. The booking patient is determined exclusively via X-User-Id.'
      );
    }

    const { doctorId, startTime, durationMinutes } = req.body;

    // Validate doctorId
    if (typeof doctorId !== 'number' || !Number.isInteger(doctorId) || doctorId <= 0) {
      throw new AppError(
        400,
        'INVALID_DOCTOR_ID',
        'doctorId must be a positive integer.'
      );
    }

    // Validate durationMinutes
    if (!ALLOWED_DURATIONS.includes(durationMinutes as AppointmentDuration)) {
      throw new AppError(
        400,
        'INVALID_DURATION',
        `durationMinutes must be one of: ${ALLOWED_DURATIONS.join(', ')}.`
      );
    }

    // Validate startTime presence and type
    if (typeof startTime !== 'string' || startTime.trim().length === 0) {
      throw new AppError(
        400,
        'INVALID_START_TIME',
        'startTime is required and must be an ISO 8601 formatted string.'
      );
    }

    // Validate strict ISO 8601 format, explicit timezone offset, and calendar/time validity
    if (!isValidIsoTimestamp(startTime)) {
      throw new AppError(
        400,
        'INVALID_TIMEZONE',
        'startTime must be a valid ISO 8601 timestamp with an explicit timezone offset (e.g. 2026-12-01T11:00:00+05:30 or 2026-12-01T11:00:00Z) and a valid calendar date and time.'
      );
    }

    const appointment = await createAppointment(caller, {
      doctorId,
      startTime,
      durationMinutes: durationMinutes as AppointmentDuration,
    });

    res.status(201).json({
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListAppointments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const caller = req.user!;

    // Pagination defaults and constraints
    let limit = 20;
    let offset = 0;

    if (req.query.limit !== undefined) {
      const rawLimit = String(req.query.limit).trim();
      const parsedLimit = parseInt(rawLimit, 10);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || !/^\d+$/.test(rawLimit)) {
        throw new AppError(
          400,
          'INVALID_PAGINATION',
          'limit must be a positive integer.'
        );
      }
      if (parsedLimit > 100) {
        throw new AppError(
          400,
          'INVALID_PAGINATION',
          'limit cannot exceed maximum allowed page size of 100.'
        );
      }
      limit = parsedLimit;
    }

    if (req.query.offset !== undefined) {
      const rawOffset = String(req.query.offset).trim();
      const parsedOffset = parseInt(rawOffset, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0 || !/^\d+$/.test(rawOffset)) {
        throw new AppError(
          400,
          'INVALID_PAGINATION',
          'offset must be a non-negative integer (>= 0).'
        );
      }
      offset = parsedOffset;
    }

    const result = await listAppointments(caller, { limit, offset });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleCancelAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const caller = req.user!;
    const rawParam = req.params.id;
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!rawId || !/^\d+$/.test(rawId)) {
      throw new AppError(
        400,
        'INVALID_APPOINTMENT_ID',
        'Appointment ID must be a positive integer.'
      );
    }

    const appointmentId = parseInt(rawId, 10);
    if (isNaN(appointmentId) || appointmentId <= 0) {
      throw new AppError(
        400,
        'INVALID_APPOINTMENT_ID',
        'Appointment ID must be a positive integer.'
      );
    }

    const cancelled = await cancelAppointment(caller, appointmentId);

    res.status(200).json({
      data: cancelled,
    });
  } catch (err) {
    next(err);
  }
}
