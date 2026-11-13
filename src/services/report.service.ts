import { pool } from '../db';
import { AppointmentReportResponse, DoctorAppointmentReportItem } from '../types';

export function convertIstRangeToUtc(
  startDate: string,
  endDate: string
): { startInstantUtc: string; endInstantUtc: string } {
  // startDate at 00:00:00 IST (+05:30)
  const startInstantUtc = new Date(`${startDate}T00:00:00+05:30`).toISOString();

  // Next calendar day after endDate at 00:00:00 IST (+05:30)
  const [y, m, d] = endDate.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const nextY = nextDate.getUTCFullYear();
  const nextM = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const nextD = String(nextDate.getUTCDate()).padStart(2, '0');
  const nextDayStr = `${nextY}-${nextM}-${nextD}`;

  const endInstantUtc = new Date(`${nextDayStr}T00:00:00+05:30`).toISOString();

  return { startInstantUtc, endInstantUtc };
}

export async function getAppointmentReport(
  startDate: string,
  endDate: string
): Promise<AppointmentReportResponse> {
  const { startInstantUtc, endInstantUtc } = convertIstRangeToUtc(startDate, endDate);

  // Mandatory SQL query requirements:
  // 1. LEFT JOIN so doctors with 0 appointments are included
  // 2. Date-range conditions placed directly in JOIN ON clause (not WHERE)
  //    so doctors without appointments in the range are preserved
  // 3. Conditional aggregation: COUNT(a.id) FILTER (WHERE a.status = ...)
  // 4. GROUP BY doctor fields
  // 5. Deterministic sorting by doctor name and ID
  // 6. Inactive doctors included as well
  const query = `
    SELECT
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.specialization,
      d.is_active,
      COUNT(a.id) FILTER (WHERE a.status = 'BOOKED') AS booked_count,
      COUNT(a.id) FILTER (WHERE a.status = 'CANCELLED') AS cancelled_count
    FROM doctors d
    LEFT JOIN appointments a
      ON a.doctor_id = d.id
     AND a.start_time >= $1::timestamptz
     AND a.start_time < $2::timestamptz
    GROUP BY d.id, d.name, d.specialization, d.is_active
    ORDER BY d.name ASC, d.id ASC
  `;

  const result = await pool.query<{
    doctor_id: number;
    doctor_name: string;
    specialization: string | null;
    is_active: boolean;
    booked_count: string;
    cancelled_count: string;
  }>(query, [startInstantUtc, endInstantUtc]);

  const data: DoctorAppointmentReportItem[] = result.rows.map((row) => ({
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialization: row.specialization,
    isActive: row.is_active,
    // PostgreSQL count aggregates return as strings via pg driver; explicitly cast to number
    bookedCount: parseInt(row.booked_count, 10) || 0,
    cancelledCount: parseInt(row.cancelled_count, 10) || 0,
  }));

  return {
    data,
    range: {
      startDate,
      endDate,
      timeZone: 'Asia/Kolkata',
    },
  };
}

