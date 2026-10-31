// What's new, in plain words for students and teachers. Newest first. This is the one
// place to write release notes: tools/bump.mjs copies the top version into version.js
// and the service worker, and writes CHANGELOG.md from this list.
export const CHANGES = [
  {
    version: '0.10.0', date: '2026-10-31', title: 'Simpler, and Sunset',
    items: [
      'A new Sunset look: coral, pink and purple through the glass.',
      'Today is simpler: your plan first, three numbers, and the rest under More.',
      'Flashcards: swipe right if you knew it, left if you didn\'t.',
      'Perform is simpler: pick your piece, press Start. Everything else is under Options, and the on-screen piano is gone (Stave listens to your real piano).',
      'Setting up the microphone is now three guided steps in plain words.',
      'Built-in songs are gone: add your own pieces (MusicXML) or get them from your teacher.',
      'New here? A 2-minute tour (in Settings, or the Getting started list on Today) shows you around.',
    ],
  },
  {
    version: '0.9.0', date: '2026-10-30', title: 'Day theme and Performance Grades',
    items: [
      'Doing a Performance Grade or Trinity repertoire-only exam? Choose "Pieces only" on the Exam tab: four pieces, and no scales, arpeggios or sight-reading anywhere.',
      'A Day theme, and Settings: theme, still scenery (no moving background), vibration, and download all your data.',
      'Your streak now allows one rest day a week.',
      'New pages: Terms, Help and support (with UK helplines), and Accessibility.',
      'Text is easier to read on every screen, and the app works offline with a notice when you lose connection.',
    ],
  },
  {
    version: '0.8.0', date: '2026-10-30', title: 'Stave',
    items: ['Music Helper is now Stave, with a new glass welcome screen.', 'A Skip button on setup.', 'Pop-ups sit in the middle of the screen on phones.'],
  },
  {
    version: '0.7.0', date: '2026-10-30', title: 'Recording kit and real piano sound',
    items: ['A real sampled piano.', 'The microphone hears loud and soft playing.', 'Imported scores follow D.C. and D.S. and time-signature changes, with beams, slurs and hairpins.', 'A Performance Grade video recorder (the video stays on your phone).', 'A recording kit for testing the microphone on your own piano. Taps and clicks no longer count as notes.'],
  },
  {
    version: '0.6.0', date: '2026-10-30', title: 'Teachers and parents',
    items: ['Teachers can set work, share scores, and listen to takes students send (deleted after 20 days).', 'A private parent link.', 'A weekly report card to share.', 'Assignment links and QR codes for teachers without accounts.'],
  },
  {
    version: '0.5.0', date: '2026-10-30', title: 'The Exam tab',
    items: ['Count down to your exam, with this week\'s targets and a readiness band for each piece.', 'A mock exam in the real order.', 'Practice plans follow your grade, board and lesson day.', 'Loop a few bars, or add a bar at a time.'],
  },
];
