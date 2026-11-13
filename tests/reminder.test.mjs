// Daily reminder calendar file: node tests/reminder.test.mjs
import { reminderIcs } from '../app/js/reminder.js';
let failures = 0;
const ok = (c, name) => { if (!c) failures++; console.log(`${c ? 'PASS' : 'FAIL'}  ${name}`); };
const ics = reminderIcs({ time: '07:05', minutes: 25, url: 'https://x.io/app/', now: new Date(2026, 10, 13, 12) });
ok(ics.includes('DTSTART:20261113T070500'), 'starts today at the chosen local time');
ok(ics.includes('RRULE:FREQ=DAILY') && ics.includes('DURATION:PT25M'), 'repeats daily for the practice goal');
ok(ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:PT0M'), 'has an alert at the time');
ok(ics.split('\r\n').every((l) => l.length <= 75), 'lines short enough for calendar apps');
ok(ics.startsWith('BEGIN:VCALENDAR') && ics.trim().endsWith('END:VCALENDAR'), 'a whole calendar file');
if (failures) { console.log(`${failures} failed`); process.exit(1); }
console.log('reminder: all passed');
