import { Request, Response, NextFunction } from 'express';
import { listDoctors, deactivateDoctor } from '../services/doctor.service';
import { AppError } from '../middleware/error-handler';

export async function getDoctors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const caller = req.user!;
    const includeInactive = req.query.includeInactive === 'true';

    const doctors = await listDoctors(caller.role, includeInactive);

    res.status(200).json({
      data: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        specialization: d.specialization,
        isActive: d.isActive,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeactivateDoctor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawParam = req.params.id;
    const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;

    if (!rawId || !/^\d+$/.test(rawId)) {
      throw new AppError(400, 'INVALID_DOCTOR_ID', 'Doctor ID must be a positive integer.');
    }

    const doctorId = parseInt(rawId, 10);
    if (isNaN(doctorId) || doctorId <= 0) {
      throw new AppError(400, 'INVALID_DOCTOR_ID', 'Doctor ID must be a positive integer.');
    }

    const updated = await deactivateDoctor(doctorId);

    res.status(200).json({
      data: {
        id: updated.id,
        name: updated.name,
        specialization: updated.specialization,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
