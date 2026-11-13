// What's new, in plain words for students and teachers. Newest first. This is the one
// place to write release notes: tools/bump.mjs copies the top version into version.js
// and the service worker, and writes CHANGELOG.md from this list.
export const CHANGES = [
  {
    version: '0.26.0', date: '2026-11-13', title: 'Fairer marking',
    items: [
      'Big fix: Stave now follows your speed bar by bar. Slowing down, speeding up or pausing used to make it lose its place and count right notes as wrong, sometimes hundreds of them.',
      'Marks now aim to match a real examiner, not to be stricter. A good, accurate play-through can reach Merit or Distinction.',
      'If Stave really can\'t follow a take, it says so and doesn\'t give an unfair mark.',
      'Photo scans: Stave checks every bar the AI wrote. If a bar doesn\'t add up, it tells you which, and gives you a message to send back to the AI so it fixes them. The AI is also asked to check every bar and marking before it replies.',
      'Recording kit (Perform, Test lab): new takes of your own piece at your own speed, to help tune Stave to real pianos.',
    ],
  },
  {
    version: '0.25.0', date: '2026-11-13', title: 'Try it in a minute, streak freezes and reminders',
    items: [
      'New to Stave? Try a C major scale straight away and get your first mark, before you add any music.',
      'Adding a piece is clearer: ask your teacher (with a message ready to send), take a photo, or add a file.',
      'Streak freezes: you have 2, and earn 1 more for every 30 days. A freeze covers a missed day by itself. Tap your streak at the top to see it.',
      'A daily reminder: in Settings, pick a time and Stave adds a practice event with an alert to your phone\'s calendar.',
      'Your piece shows your best mark to beat, and a play button to hear it.',
      'A mock exam now waits until you\'re ready, shows your total at the end, and has no pop-up boxes.',
      'Help explains how Stave marks, and has a part for teachers. Settings are now at the top of the Account page.',
      'Fixed: the on-screen piano covered flashcards on small phones and sideways; pop-up messages after big or cut-off files; a blank screen on slow phones; Stave still listening on other tabs without saying so.',
    ],
  },
  {
    version: '0.24.0', date: '2026-11-13', title: 'Lots of fixes from testing',
    items: [
      'Stave works offline again once it has loaded. It had stopped saving itself for offline use.',
      'If Stave hears no notes, it now says so instead of giving a mark.',
      '"Well done" now always tells you something you did well, and every mark says it is an estimate.',
      'Playing in Perform now counts towards your practice minutes, and every screen shows the same streak. The day after a rest day, your streak no longer shows 0 before you play.',
      'The Exam tab agrees with your marks, and changing your board there changes it everywhere.',
      'Wrong notes on your music get a cross and timing slips a ring, not just a colour.',
      'The Back button closes pop-ups instead of leaving the app. A Performance Grade video you have not saved asks before it is thrown away.',
      'Phones that block saving (some school iPads) can now get past setup.',
      'Smaller fixes: tapping flashcards quickly skips to the next card, the keyboard on Read shows the whole clef, Grade 4 to 5 and Grade 6 to 8 in setup, and "beats a minute" everywhere.',
    ],
  },
  {
    version: '0.23.0', date: '2026-11-13', title: 'Swipe between pieces',
    items: [
      'On Perform, swipe your piece left or right to get to your other pieces, like flicking through album covers. The dots underneath show where you are; you can tap them or the arrows too.',
      'Fixed: pop-ups on iPhone opened with their top hidden under the clock and notch, and faded in blurry. They now open fully in view, straight away.',
    ],
  },
  {
    version: '0.22.0', date: '2026-11-13', title: 'Perform, made simple',
    items: [
      'Perform is now three steps: open your music book, tap the big button, play.',
      'Play the whole piece or just one part: Stave works out which bars you played and marks just those. Fixed: it used to think you always started at the beginning.',
      'Your result is short: your mark, one thing you did well, one thing to try next time, and Play again. All the details are one tap away.',
      'Hearing the piece, looking at the music, learning it slowly and adding pieces are under More, at the bottom.',
    ],
  },
  {
    version: '0.21.0', date: '2026-11-12', title: 'A new Perform',
    items: [
      'Perform looks like a music player now: your piece\'s first line as the cover, the title big and clear, and one Start listening button.',
      'The music no longer fills the screen. Tap the cover or Score and it slides up from the bottom, with a Play button. After you play, "See your notes on the score" shows every note marked.',
      'Hear it plays your piece with its expression: louder and softer where marked, accents, short staccato, smooth slurs, pedal and pauses, at the marked speed.',
      'Photo scans now ask the AI for the tempo and every marking on the page, so Stave can mark your dynamics, accents and flow against them.',
    ],
  },
  {
    version: '0.20.1', date: '2026-11-12', title: 'Listening that stays on',
    items: [
      'Fixed: Perform could stop listening by itself in a quiet passage, or not keep your take at all. Now it keeps listening until you tap "I\'ve finished".',
      'Your screen stays on while Stave is listening, so the phone can\'t lock half way through a piece.',
      'While you play, Perform shows one simple screen: whether Stave can hear you, a timer and a sound meter.',
    ],
  },
  {
    version: '0.20.0', date: '2026-11-12', title: 'Play it your way',
    items: [
      'Perform is now played from memory, like the exam: the music stays hidden while you play and appears afterwards with every note marked. Tap "Show the music" if you need it.',
      'No count-in and no set speed: tap the big Start listening button, start when you\'re ready and play at your own speed. Stave follows you, stops listening when you finish, and tells you how your speed compares with the marked one.',
      '"Hear the piece" plays it to you at the marked speed.',
    ],
  },
  {
    version: '0.19.0', date: '2026-11-12', title: 'More colour, more fun',
    items: [
      'The floating tab bar is back, with its sliding bubble and rising icon.',
      'Each part of Stave has its own colour: coral Today, pink Read, gold Practise, violet Perform and blue Exam.',
      'Your mark counts up, each part of the mark sheet fills bar by bar, and a Merit, Distinction or new best gets confetti.',
      'Cards you can tap press down like buttons.',
    ],
  },
  {
    version: '0.18.0', date: '2026-11-12', title: 'Marked like an examiner',
    items: [
      'After you play a piece, Stave now gives an estimated exam mark for your board: out of 30 for ABRSM (Pitch, Time, Tone, Shape, Performance) or out of 22 for Trinity (Accuracy and fluency, Technical facility, Communication and interpretation).',
      'Each part gets its own band and a comment, so you can see exactly what stands between you and Distinction.',
      'It marks a little strictly on purpose, so the real exam doesn\'t surprise you. With the microphone, tone and shape are rough; a digital piano with a cable hears them exactly.',
      'Your marks replace the old score out of 100 on Today, your shelf and the Stats page.',
    ],
  },
  {
    version: '0.17.0', date: '2026-11-12', title: 'A cleaner look',
    items: [
      'Stave has a new, cleaner look: a plain dark background, simple cards and one colour, coral, for the things you tap.',
      'Buttons press down when you tap them, so it\'s clear what you can tap.',
      'Plainer words everywhere: "Practise bar 3" instead of "Drill", "Speed (beats a minute)" instead of "Tempo", and a short hint under every setting.',
    ],
  },
  {
    version: '0.16.2', date: '2026-11-11', title: 'Smoother and tidier',
    items: [
      'Scrolling is smoother on phones.',
      'Fixed: with a pop-up open, swiping moved the page behind it.',
      'Tidier screens: your shelf lines up with the page, covers show one whole line of music, Practise only shows Discard and Finish once you\'ve started, and the tempo shown matches the tempo lock.',
    ],
  },
  {
    version: '0.16.1', date: '2026-11-11', title: 'Easier to see, easier to start',
    items: [
      'Fixed: the Stave bar no longer covers the top of the page. It now scrolls away with the page. On iPhone, remove Stave from your home screen and add it again so it sits below the clock.',
      'Adding your first piece is simpler: take a photo of the music, or add a file from your teacher or MuseScore.',
    ],
  },
  {
    version: '0.16.0', date: '2026-11-02', title: 'Accounts are on',
    items: [
      'You can now make an account (tap the circle at the top): your practice is backed up, and you can join your teacher\'s studio with their code.',
      'Accounts are optional. Without one, everything still works and stays on your phone.',
    ],
  },
  {
    version: '0.15.0', date: '2026-11-02', title: 'Scan a page',
    items: [
      'Perform can now turn a photo of printed music into a score, for free: copy Stave\'s message, send it with your photo to an AI chat app you\'re allowed to use (such as ChatGPT or Gemini), then paste the reply back.',
      'Stave shows what it read next to your photo. Check every bar before you add it, because AI apps can get notes wrong.',
      'Under 13? Ask a parent, carer or teacher to send the photo for you.',
    ],
  },
  {
    version: '0.14.1', date: '2026-11-01', title: 'Fix',
    items: [
      'Fixed: on phones with a notch, the Stave bar at the top covered the first lines of every page.',
    ],
  },
  {
    version: '0.14.0', date: '2026-10-31', title: 'Getting ready to scan',
    items: [
      'Coming soon: photograph a printed page and Stave turns it into a score you can play against. It switches on once it has been tested on real exam books.',
    ],
  },
  {
    version: '0.13.0', date: '2026-10-31', title: 'Covers',
    items: [
      'Each piece on your shelf now shows its own first bars, like the first page of the music.',
    ],
  },
  {
    version: '0.12.0', date: '2026-10-31', title: 'Your pieces, on a shelf',
    items: [
      'Today has a shelf: each of your pieces stands in its own lit niche.',
      'Tap a piece to zoom in and see how it\'s going, then Perform to play it through or Learn to go slowly. Arrows move between pieces.',
      'No pieces yet? The first niche adds one.',
    ],
  },
  {
    version: '0.11.0', date: '2026-10-31', title: 'Stats, and fairer sign-up',
    items: [
      'Tap your three numbers on Today for a new Stats page: minutes by what you practised, your check scores over time, and this week\'s goal.',
      'The tab bar has a new look: your tab rises in its own colour.',
      'A new sign-in card.',
      'Making an account now asks the month and year you were born, and has a box to agree to the Terms and Privacy Policy. If you\'re under 13, a parent, carer or your teacher says OK first.',
      'A new Copyright page, links are blue and underlined, and the app passed a full accessibility check.',
    ],
  },
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
