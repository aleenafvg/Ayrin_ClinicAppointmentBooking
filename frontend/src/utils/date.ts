export function formatIstDateTime(isoString: string): {
  date: string;
  time: string;
  full: string;
} {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { date: isoString, time: '', full: isoString };
    }
    const date = d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return {
      date,
      time, // Formatted time without repeated IST (e.g. "02:00 PM")
      full: `${date}, ${time} IST`,
    };
  } catch {
    return { date: isoString, time: '', full: isoString };
  }
}

export interface IstDayItem {
  dateStr: string; // 'YYYY-MM-DD'
  dayName: string; // 'Monday'
  shortDay: string; // 'Mon'
  dayNumber: string; // '09'
  monthShort: string; // 'Nov'
  isToday: boolean;
}

export interface IstWeekRange {
  startDateIso: string; // e.g. '2026-11-09T00:00:00+05:30'
  endDateIso: string; // e.g. '2026-11-15T23:59:59+05:30'
  queryEndDateIso: string; // e.g. '2026-11-16T00:00:00+05:30' (exclusive for < queries)
  rangeLabel: string; // e.g. '09 – 15 Nov 2026' or '28 Dec 2026 – 03 Jan 2027'
  days: IstDayItem[];
  refDate: Date;
}

// Computes the Monday-to-Sunday week range in Asia/Kolkata timezone for any given reference date
export function getIstWeekRange(refDate: Date): IstWeekRange {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(refDate);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const y = parseInt(get('year'), 10);
  const m = parseInt(get('month'), 10);
  const d = parseInt(get('day'), 10);
  const weekday = get('weekday');

  // Monday = 0, Tuesday = 1, ..., Sunday = 6
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const diffDays = dayMap[weekday] ?? 0;

  const monUtc = new Date(Date.UTC(y, m - 1, d - diffDays));
  const sunUtc = new Date(Date.UTC(y, m - 1, d - diffDays + 6));
  const nextMonUtc = new Date(Date.UTC(y, m - 1, d - diffDays + 7));

  const formatIso = (dt: Date, end: boolean) => {
    const yr = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const da = String(dt.getUTCDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}${end ? 'T23:59:59+05:30' : 'T00:00:00+05:30'}`;
  };

  const startDateIso = formatIso(monUtc, false);
  const endDateIso = formatIso(sunUtc, true);
  const queryEndDateIso = formatIso(nextMonUtc, false);

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const dayNames = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const shortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthShorts = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const days: IstDayItem[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(
      Date.UTC(monUtc.getUTCFullYear(), monUtc.getUTCMonth(), monUtc.getUTCDate() + i)
    );
    const cy = cur.getUTCFullYear();
    const cm = cur.getUTCMonth();
    const cd = cur.getUTCDate();
    const dateStr = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(cd).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayName: dayNames[i],
      shortDay: shortNames[i],
      dayNumber: String(cd).padStart(2, '0'),
      monthShort: monthShorts[cm],
      isToday: dateStr === todayStr,
    });
  }

  const monYear = monUtc.getUTCFullYear();
  const sunYear = sunUtc.getUTCFullYear();
  const monMonth = monthShorts[monUtc.getUTCMonth()];
  const sunMonth = monthShorts[sunUtc.getUTCMonth()];
  const monDay = String(monUtc.getUTCDate()).padStart(2, '0');
  const sunDay = String(sunUtc.getUTCDate()).padStart(2, '0');

  let rangeLabel = '';
  if (monYear === sunYear) {
    if (monMonth === sunMonth) {
      rangeLabel = `${monDay} – ${sunDay} ${monMonth} ${monYear}`;
    } else {
      rangeLabel = `${monDay} ${monMonth} – ${sunDay} ${sunMonth} ${monYear}`;
    }
  } else {
    rangeLabel = `${monDay} ${monMonth} ${monYear} – ${sunDay} ${sunMonth} ${sunYear}`;
  }

  return {
    startDateIso,
    endDateIso,
    queryEndDateIso,
    rangeLabel,
    days,
    refDate,
  };
}

export function addWeeksToDate(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export interface AppointmentSlotDetails {
  dateStr: string; // 'YYYY-MM-DD'
  startHour: number;
  startMinute: number;
  minutesFromClinicOpen: number; // 9:00 AM = 0
  durationMinutes: number;
  startTimeLabel: string;
  endTimeLabel: string;
  timeRangeLabel: string;
  isValidSlot: boolean;
}

// Extracts IST start and end times and clinic-hour offsets for placement in the calendar grid
export function getAppointmentSlotDetails(
  startTimeIso: string,
  durationMinutes: number
): AppointmentSlotDetails {
  const start = new Date(startTimeIso);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const getHAndM = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hourCycle: 'h23',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(d);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return { hour, minute };
  };

  const startHM = getHAndM(start);

  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(start);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const startTimeLabel = formatTime(start);
  const endTimeLabel = formatTime(end);
  const timeRangeLabel = `${startTimeLabel} – ${endTimeLabel}`;

  const minutesFromMidnight = startHM.hour * 60 + startHM.minute;
  const clinicOpenMinutes = 9 * 60; // 9:00 AM = 540 min
  const minutesFromClinicOpen = minutesFromMidnight - clinicOpenMinutes;

  return {
    dateStr,
    startHour: startHM.hour,
    startMinute: startHM.minute,
    minutesFromClinicOpen,
    durationMinutes,
    startTimeLabel,
    endTimeLabel,
    timeRangeLabel,
    isValidSlot: minutesFromClinicOpen >= 0 && minutesFromClinicOpen < 12 * 60,
  };
}
