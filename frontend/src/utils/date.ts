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
      time: `${time} IST`,
      full: `${date}, ${time} IST`,
    };
  } catch {
    return { date: isoString, time: '', full: isoString };
  }
}

