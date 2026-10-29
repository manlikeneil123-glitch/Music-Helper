// MusicXML import tests: node tests/musicxml.test.mjs
import { readFileSync } from 'node:fs';
import { parseMusicXML, unzipMxl } from '../app/js/musicxml.js';
import { timeline, excerpt, totalBeats } from '../app/js/score.js';

let failures = 0;
const check = (name, cond, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  — ${detail}`}`);
};

const wrap = (measures, attrs = '<divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>') =>
  `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">${measures
    .map((m, i) => `<measure number="${i + 1}">${i === 0 ? `<attributes>${attrs}</attributes>` : ''}${m}</measure>`)
    .join('')}</part></score-partwise>`;
const n = (step, oct, dur, extra = '') => `<note>${extra.includes('<chord/>') ? '<chord/>' : ''}<pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration>${extra.replace('<chord/>', '')}</note>`;
const r = (dur) => `<note><rest/><duration>${dur}</duration></note>`;

// Chords, rests, ties across the bar line
{
  const s = parseMusicXML(wrap([
    n('C', 4, 2) + n('E', 4, 2, '<chord/>') + n('G', 4, 2, '<chord/>') + r(2) + n('D', 4, 4, '<tie type="start"/>'),
    n('D', 4, 4, '<tie type="stop"/>') + n('E', 4, 4),
  ]));
  const tl = timeline(s);
  check('chord: three notes on beat 0', tl.filter((x) => x.beat === 0).length === 3);
  check('rest is kept', s.rests.length === 1 && s.rests[0].beat === 1);
  const d = tl.find((x) => x.midi === 62);
  check('tie across the bar becomes one long note', d && d.beat === 2 && d.beats === 4 && tl.filter((x) => x.midi === 62).length === 1, JSON.stringify(d));
  check('note after the tie lands on bar 2 beat 3', tl.find((x) => x.midi === 64 && x.beat === 6)?.bar === 2);
}

// Two staves with backup, voices, fingering, articulation, dynamics, pedal, tempo
{
  const s = parseMusicXML(wrap([
    '<direction><direction-type><dynamics><mf/></dynamics></direction-type><sound tempo="96"/></direction>' +
    '<direction><direction-type><pedal type="start"/></direction-type></direction>' +
    n('E', 5, 4, '<voice>1</voice><staff>1</staff><notations><technical><fingering>3</fingering></technical><articulations><staccato/></articulations></notations>') +
    n('D', 5, 4, '<voice>1</voice><staff>1</staff><notations><ornaments><trill-mark/></ornaments></notations>') +
    '<backup><duration>8</duration></backup>' +
    n('C', 3, 8, '<voice>5</voice><staff>2</staff>') +
    '<direction><direction-type><pedal type="stop"/></direction-type></direction>',
  ], '<divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign></clef><clef number="2"><sign>F</sign></clef>'));
  check('two staves detected', s.staves === 2 && s.clefs[1] === 'bass');
  check('left hand starts on beat 0 after <backup>', s.notes.find((x) => x.midi === 48)?.beat === 0);
  check('tempo read from <sound>', s.targetBpm === 96, s.targetBpm);
  check('fingering, staccato, trill read', s.notes[0].finger === '3' && s.notes[0].artic === 'staccato' && s.notes[1].ornament === 'trill');
  check('dynamic read', s.dynamics[0]?.mark === 'mf');
  check('pedal start/stop read', s.pedal.length === 1 && s.pedal[0].start === 0 && s.pedal[0].end === 4, JSON.stringify(s.pedal));
}

// Pickup bar
{
  const s = parseMusicXML(wrap(['' + n('G', 4, 2), n('C', 5, 8), n('D', 5, 8)]));
  const tl = timeline(s);
  check('pickup note is bar 0, beat 4', tl[0].bar === 0 && tl[0].beatInBar === 4, `${tl[0].bar} ${tl[0].beatInBar}`);
  check('first full bar is bar 1', tl[1].bar === 1 && tl[1].beatInBar === 1);
  check('excerpt of printed bar 1', timeline(excerpt(s, 1, 1)).length === 1 && timeline(excerpt(s, 1, 1))[0].midi === 72);
}

// Repeat with 1st and 2nd endings: A |: B [1. C :| [2. D  → A B C B D
{
  const bar = (step) => n(step, 4, 8);
  const s = parseMusicXML(wrap([
    bar('A'),
    '<barline location="left"><repeat direction="forward"/></barline>' + bar('B'),
    '<barline location="left"><ending number="1" type="start"/></barline>' + bar('C') + '<barline location="right"><ending number="1" type="stop"/><repeat direction="backward"/></barline>',
    '<barline location="left"><ending number="2" type="start"/></barline>' + bar('D') + '<barline location="right"><ending number="2" type="discontinue"/></barline>',
  ]));
  const seq = timeline(s).map((x) => 'CDEFGAB'[x.step % 7]).join('');
  check('repeat with 1st/2nd endings unfolds A B C B D', seq === 'ABCBD', seq);
  check('total length is 5 bars', totalBeats(s) === 20, totalBeats(s));
}

// Grace note and accidentals
{
  const s = parseMusicXML(wrap([
    '<note><grace slash="yes"/><pitch><step>A</step><octave>4</octave></pitch><voice>1</voice></note>' +
    n('G', 4, 2) + '<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration></note>' + n('B', 3, 4, ''),
  ]));
  const g = s.notes.find((x) => x.grace);
  check('grace note placed just before its main note', g && g.beat < 0.01 && g.beats > 0);
  check('F♯ spelled with alter +1, midi 66', s.notes.some((x) => x.midi === 66 && x.alter === 1));
}

// The bundled study
{
  const s = parseMusicXML(readFileSync(new URL('../app/scores/octave-study.musicxml', import.meta.url), 'utf8'));
  check('study: title, key, tempo', s.title.includes('Octave Study') && s.keyFifths === 1 && s.targetBpm === 84);
  check('study: repeat unfolds to 12 bars', totalBeats(s) === 48, totalBeats(s));
  check('study: 11 pedal changes', s.pedal.length === 11, s.pedal.length);
  check('study: no warnings', s.warnings.length === 0, s.warnings.join('; '));
}

// Compressed .mxl (deflate, like MuseScore's default export)
{
  const xml = wrap([n('C', 4, 8)]);
  const zipped = await makeZip([['META-INF/container.xml', '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>'], ['score.xml', xml]]);
  const text = await unzipMxl(zipped);
  check('.mxl unzips and finds the root file', parseMusicXML(text).notes[0]?.midi === 60);
}

// Errors are friendly
{
  let msg = '';
  try { parseMusicXML('<html>nope</html>'); } catch (e) { msg = e.message; }
  check('non-MusicXML gives a clear error', /doesn't look like a MusicXML/.test(msg), msg);
}

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);

// Minimal zip writer (deflate) for the test.
async function makeZip(entries) {
  const crcTable = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const deflate = async (b) => new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const raw = new TextEncoder().encode(content);
    const data = await deflate(raw);
    const nameB = new TextEncoder().encode(name);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(8, 8, true); local.setUint32(14, crc32(raw), true);
    local.setUint32(18, data.length, true); local.setUint32(22, raw.length, true); local.setUint16(26, nameB.length, true);
    chunks.push(new Uint8Array(local.buffer), nameB, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(10, 8, true); cd.setUint32(16, crc32(raw), true);
    cd.setUint32(20, data.length, true); cd.setUint32(24, raw.length, true); cd.setUint16(28, nameB.length, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return await new Blob([...chunks, ...central, new Uint8Array(end.buffer)]).arrayBuffer();
}
