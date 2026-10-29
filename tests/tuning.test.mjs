// Per-user mic tuning: thresholds move with corrections, within bounds.
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { THRESHOLDS } = await import('../app/js/micanalysis.js');
const { micThresholds, reportVerdict, resetTuning, describeTuning } = await import('../app/js/tuning.js');

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };

ok(micThresholds().present === THRESHOLDS.present, 'untuned = standard thresholds');
reportVerdict('right', 0.22); reportVerdict('right', 0.24);
ok(micThresholds().present === THRESHOLDS.present, 'two corrections change nothing yet');
reportVerdict('right', 0.25);
const loose = micThresholds();
ok(loose.present < THRESHOLDS.present && loose.present >= 0.18, `3 "it was right" → more forgiving (${loose.present.toFixed(3)})`);
ok(loose.wrongRatio > THRESHOLDS.wrongRatio, 'forgiving → wrong neighbours need to be clearer');
ok(loose.present <= 0.22, 'bar sits under the reported notes');
ok(reportVerdict('right', 0.02) === false, 'a note the mic never heard is not learned from');

resetTuning();
for (let i = 0; i < 10; i++) reportVerdict('right', 0.05 + 0.07);
ok(micThresholds().present >= 0.18, 'floor holds against many very low reports');

resetTuning();
reportVerdict('wrong', 0.33); reportVerdict('wrong', 0.36);
const strict = micThresholds();
ok(strict.present > THRESHOLDS.present && strict.present <= 0.42, `2 "it was wrong" → stricter (${strict.present.toFixed(3)})`);
for (let i = 0; i < 10; i++) reportVerdict('wrong', 0.95);
ok(micThresholds().present === 0.42, 'ceiling holds');

resetTuning();
for (const p of [0.2, 0.21, 0.22]) reportVerdict('right', p);
for (const p of [0.34, 0.35]) reportVerdict('wrong', p);
ok(micThresholds().present > THRESHOLDS.present, 'when corrections conflict, strict wins');
ok(/stricter/.test(describeTuning()), `describe: "${describeTuning()}"`);

console.log(fails ? `\n${fails} FAILED` : '\nAll tuning checks passed');
process.exit(fails ? 1 : 0);
