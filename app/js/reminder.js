// A daily practice reminder without a server: a repeating event (with an alert) that
// the student adds to their phone's own calendar. Pure builder, so tests can check it.

/** A calendar file for a daily event at hh:mm local time, lasting `minutes`. */
export function reminderIcs({ time = '17:00', minutes = 20, url = '', now = new Date() } = {}) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  const pad = (n) => String(n).padStart(2, '0');
  const local = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(h)}${pad(m)}00`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stave//Practice reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:stave-practice-${stamp}@stave`, `DTSTAMP:${stamp}`,
    `DTSTART:${local}`, `DURATION:PT${Math.max(5, Math.round(minutes))}M`, 'RRULE:FREQ=DAILY',
    'SUMMARY:Piano practice', `DESCRIPTION:Time to practise. Open Stave${url ? `: ${url}` : ''}`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Time to practise the piano', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

/** Hand the file to the phone: the share sheet where it can take files, else a download. */
export async function addReminder(opts) {
  const file = new File([reminderIcs(opts)], 'stave-practice.ics', { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Piano practice reminder' }); return 'shared'; } catch { /* closed: fall back */ }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return 'downloaded';
}
