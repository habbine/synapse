/*
 * Tests for the SYNAPSE health model.
 * Run: node tests/model.test.js
 * No test framework, so there is no dependency to license or install.
 */
'use strict';

var M = require('../health-model.js');

var passed = 0;
var failed = 0;
var failures = [];

function ok(name, cond, detail) {
  if (cond) { passed++; }
  else { failed++; failures.push(name + (detail ? '  -> ' + detail : '')); }
}

function eq(name, actual, expected) {
  ok(name, actual === expected, 'got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));
}

function band(id, value) {
  return M.evaluate(id, value).band;
}

/* ---------------- provenance discipline ---------------- */

(function provenance() {
  var allowed = ['nasa', 'clinical', 'operational', 'none', 'clinical+operational',
    'nasa+peer-reviewed', 'peer-reviewed+operational', 'peer-reviewed'];
  M.indicators.forEach(function (ind) {
    ok('origin declared: ' + ind.id, allowed.indexOf(ind.origin) !== -1, ind.origin);
    ok('origin note present: ' + ind.id, !!ind.originNote && ind.originNote.length > 20);
    ok('has sources: ' + ind.id, Array.isArray(ind.sources) && ind.sources.length > 0);
    ok('plain-language why: ' + ind.id, !!ind.why && ind.why.length > 40);
    ok('measurement instructions: ' + ind.id, !!ind.how && ind.how.length > 10);
    ind.sources.forEach(function (s) {
      ok('source ' + s + ' is registered (' + ind.id + ')', !!M.sources[s]);
    });
    ok('system exists: ' + ind.id, !!M.getSystem(ind.system), ind.system);
  });
  Object.keys(M.sources).forEach(function (k) {
    var s = M.sources[k];
    ok('source has citation: ' + k, !!s.cite && s.cite.length > 20);
    ok('source has url: ' + k, /^https?:\/\//.test(s.url));
    ok('source has kind: ' + k, ['nasa', 'clinical', 'peer-reviewed', 'landscape'].indexOf(s.kind) !== -1);
  });
  // Every indicator referenced by a hazard must exist.
  M.hazards.forEach(function (hz) {
    hz.indicators.forEach(function (id) {
      ok('hazard ' + hz.id + ' maps real indicator ' + id, !!M.getIndicator(id));
    });
    hz.sources.forEach(function (s) {
      ok('hazard ' + hz.id + ' source registered: ' + s, !!M.sources[s]);
    });
  });
  eq('five NASA hazards', M.hazards.length, 5);
}());

/* ---------------- blood pressure, ACC/AHA boundaries ---------------- */

eq('BP 119 systolic is normal', band('bp_sys', 119), 'ok');
eq('BP 120 systolic is elevated', band('bp_sys', 120), 'watch');
eq('BP 129 systolic is elevated', band('bp_sys', 129), 'watch');
eq('BP 130 systolic is stage 1', band('bp_sys', 130), 'watch');
eq('BP 139 systolic is stage 1', band('bp_sys', 139), 'watch');
eq('BP 140 systolic is stage 2 alert', band('bp_sys', 140), 'alert');
eq('BP 181 systolic is severe alert', band('bp_sys', 181), 'alert');
eq('BP 85 systolic flags low', band('bp_sys', 85), 'watch');
eq('BP 79 diastolic is normal', band('bp_dia', 79), 'ok');
eq('BP 80 diastolic is stage 1', band('bp_dia', 80), 'watch');
eq('BP 90 diastolic is stage 2 alert', band('bp_dia', 90), 'alert');
eq('BP 121 diastolic is severe alert', band('bp_dia', 121), 'alert');
ok('severe BP escalates', M.evaluate('bp_sys', 190).escalate === true);
ok('normal BP does not escalate', M.evaluate('bp_sys', 110).escalate === false);

/* ---------------- heart rate, AHA 60-100 ---------------- */

eq('HR 60 is normal', band('hr', 60), 'ok');
eq('HR 100 is normal', band('hr', 100), 'ok');
eq('HR 101 is watch', band('hr', 101), 'watch');
eq('HR 111 is alert', band('hr', 111), 'alert');
eq('HR 59 is watch', band('hr', 59), 'watch');
eq('HR 44 is alert', band('hr', 44), 'alert');

/* ---------------- temperature, CDC fever ---------------- */

eq('temp 37.4 is ok', band('temp', 37.4), 'ok');
eq('temp 37.5 is watch', band('temp', 37.5), 'watch');
eq('temp 38.0 is fever alert', band('temp', 38.0), 'alert');
eq('temp 39.5 is high fever alert', band('temp', 39.5), 'alert');
eq('temp 34.9 is low alert', band('temp', 34.9), 'alert');
ok('fever escalates to surgeon', M.evaluate('temp', 38.2).escalate === true);
ok('fever action names crew infection protocol',
  /infection protocol/i.test(M.evaluate('temp', 38.2).action));

/* ---------------- glucose, ADA bands ---------------- */

eq('glucose 69 is hypoglycaemia alert', band('glucose', 69), 'alert');
eq('glucose 70 is normal', band('glucose', 70), 'ok');
eq('glucose 99 is normal', band('glucose', 99), 'ok');
eq('glucose 100 is impaired fasting', band('glucose', 100), 'watch');
eq('glucose 125 is impaired fasting', band('glucose', 125), 'watch');
eq('glucose 126 is diabetes range alert', band('glucose', 126), 'alert');
ok('hypoglycaemia blocks EVA in its action',
  /EVA|critical task/i.test(M.evaluate('glucose', 60).action));

/* ---------------- CO2, NASA-STD-3001 [V2 6004] ---------------- */

eq('CO2 2.2 is ok', band('co2', 2.2), 'ok');
eq('CO2 2.3 is symptom-onset watch', band('co2', 2.3), 'watch');
eq('CO2 2.5 is above headache target', band('co2', 2.5), 'watch');
eq('CO2 3.0 is still within the limit', band('co2', 3.0), 'watch');
eq('CO2 3.1 breaches the standard', band('co2', 3.1), 'alert');
ok('CO2 breach is framed as a vehicle problem',
  /vehicle problem/i.test(M.evaluate('co2', 4).action));
ok('CO2 cites the standard', M.evaluate('co2', 4).sources.indexOf('ochmo_co2') !== -1);

/* ---------------- radiation, 600 mSv career / 250 mSv event ---------------- */

eq('career 100 mSv is ok', band('rad_career', 100), 'ok');
eq('career 299 mSv is ok', band('rad_career', 299), 'ok');
eq('career 300 mSv is half the limit', band('rad_career', 300), 'watch');
eq('career 480 mSv is 80 percent', band('rad_career', 480), 'alert');
eq('career 600 mSv is at the limit', band('rad_career', 600), 'alert');
ok('career band reports percent of 600',
  /% of the 600 mSv/.test(M.evaluate('rad_career', 300).why),
  M.evaluate('rad_career', 300).why);
eq('career 0 mSv is ok', band('rad_career', 0), 'ok');
eq('SPE 0 is ok', band('rad_event', 0), 'ok');
eq('SPE 100 is watch', band('rad_event', 100), 'watch');
eq('SPE 150 is alert', band('rad_event', 150), 'alert');
eq('SPE 250 breaches the per-event limit', band('rad_event', 250), 'alert');
ok('SPE breach mentions the storm shelter',
  /shelter/i.test(M.evaluate('rad_event', 260).action));

/* ---------------- sleep, Barger 2014 ---------------- */

eq('sleep 7.5 h is ok', band('sleep', 7.5), 'ok');
eq('sleep 7.0 h is ok', band('sleep', 7.0), 'ok');
eq('sleep 6.5 h is below target', band('sleep', 6.5), 'watch');
eq('sleep 5.5 h is short', band('sleep', 5.5), 'watch');
eq('sleep 4.0 h is severely short', band('sleep', 4.0), 'alert');
eq('sleep 12 h is unusually long', band('sleep', 12), 'watch');
ok('sleep why cites the 8.5 h schedule', /8\.5 hours/.test(M.getIndicator('sleep').why));

/* ---------------- mood: supportive, never clinical ---------------- */

eq('mood 1 is watch not alert', band('mood', 1), 'watch');
eq('mood 2 is watch', band('mood', 2), 'watch');
eq('mood 3 is ok', band('mood', 3), 'ok');
eq('mood 5 is ok', band('mood', 5), 'ok');
ok('low mood never escalates automatically', M.evaluate('mood', 1).escalate === false);
ok('low mood points to existing crew support',
  /private psychological conference|crewmate/i.test(M.evaluate('mood', 1).action));
ok('mood is declared a Team 3S choice, not a standard',
  /Team 3S/.test(M.getIndicator('mood').originNote));
ok('mood is not presented as validated',
  /not a validated/i.test(M.getIndicator('mood').originNote));

/* ---------------- exercise, ~600 min/week ISS ---------------- */

eq('exercise 90 min is ok', band('exercise', 90), 'ok');
eq('exercise 86 min is ok', band('exercise', 86), 'ok');
eq('exercise 70 min is slightly below', band('exercise', 70), 'watch');
eq('exercise 30 min is well below', band('exercise', 30), 'watch');
eq('a single zero-exercise day is a watch, not an alert', band('exercise', 0), 'watch');
ok('a zero day is read against the 6-day training week, not a 7-day average',
   /6 training days a week/.test(M.evaluate('exercise', 0).why));
ok('zero exercise does not page the surgeon', M.evaluate('exercise', 0).escalate === false);

/* ---------------- vision / SANS screening ---------------- */

eq('vision no change is ok', band('vision', 0), 'ok');
eq('vision near harder is watch', band('vision', 1), 'watch');
eq('vision grid distortion is alert', band('vision', 2), 'alert');
ok('positive Amsler screen escalates', M.evaluate('vision', 2).escalate === true);
ok('vision instructions describe the Amsler grid',
  /Amsler/i.test(M.getIndicator('vision').how));
ok('vision is screening, not diagnosis',
  /not a diagnosis/i.test(M.getIndicator('vision').originNote));

/* ---------------- body mass: no invented threshold ---------------- */

eq('mass has no band', band('mass', 70), 'info');
eq('mass origin is none', M.getIndicator('mass').origin, 'none');
ok('mass says why there is no threshold',
  /No verified numeric threshold/i.test(M.getIndicator('mass').originNote));
ok('mass is excluded from system colour',
  M.systemStatus(M.evaluateDay({ mass: 70 })).metabolic === 'unknown');

/* ---------------- unknown and junk input ---------------- */

eq('null is unknown', band('hr', null), 'unknown');
eq('undefined is unknown', band('hr', undefined), 'unknown');
eq('empty string is unknown', band('hr', ''), 'unknown');
eq('text is unknown', band('hr', 'abc'), 'unknown');
eq('NaN is unknown', band('hr', NaN), 'unknown');
eq('Infinity is unknown', band('hr', Infinity), 'unknown');
eq('unknown indicator returns null', M.evaluate('not_a_thing', 5), null);
ok('numeric string is accepted', band('hr', '72') === 'ok');

/* ---------------- worstBand ---------------- */

eq('worst of ok+watch', M.worstBand(['ok', 'watch']), 'watch');
eq('worst of watch+alert', M.worstBand(['watch', 'alert']), 'alert');
eq('worst of all ok', M.worstBand(['ok', 'ok']), 'ok');
eq('worst of empty', M.worstBand([]), 'unknown');
eq('worst ignores info', M.worstBand(['info', 'ok']), 'ok');
eq('alert beats info', M.worstBand(['info', 'alert']), 'alert');

/* ---------------- system roll-up ---------------- */

(function systemRollup() {
  var res = M.evaluateDay({ bp_sys: 145, bp_dia: 70, hr: 72, temp: 36.8 });
  var st = M.systemStatus(res);
  eq('cardio takes the worst of its indicators', st.cardio, 'alert');
  eq('immune reflects a normal temperature', st.immune, 'ok');
  eq('unlogged system is unknown', st.metabolic, 'unknown');
}());

/* ---------------- hazard roll-up ---------------- */

(function hazardRollup() {
  var res = M.evaluateDay({ co2: 3.4, sleep: 7.5, mood: 4, exercise: 90, rad_career: 100 });
  var hz = M.hazardStatus(res, 'iss');
  function find(id) { return hz.filter(function (h) { return h.id === id; })[0]; }
  eq('closed environment flags on CO2 breach', find('environment').band, 'alert');
  eq('isolation is ok on good sleep and mood', find('isolation').band, 'ok');
  eq('radiation ok at 100 mSv', find('radiation').band, 'ok');
  eq('CO2 breach is listed as a driver', find('environment').drivers[0].id, 'co2');
  eq('distance is ok in LEO', find('distance').band, 'ok');
  eq('distance is flagged on Mars', find('distance', 'mars') && M.hazardStatus(res, 'mars').filter(function (h) { return h.id === 'distance'; })[0].band, 'watch');
  // gravity hazard has several indicators; only logged ones should count
  var g = find('gravity');
  eq('gravity counts only logged indicators', g.logged, 1);
  eq('gravity knows how many it maps', g.mapped, 6);
}());

/* ---------------- environments and self-reliance ---------------- */

eq('ISS self-reliance is 0', M.selfRelianceLevel(M.environments.iss), 0);
eq('lunar self-reliance is 1', M.selfRelianceLevel(M.environments.lunar), 1);
eq('mars self-reliance is 2', M.selfRelianceLevel(M.environments.mars), 2);
eq('transit self-reliance is 2', M.selfRelianceLevel(M.environments.transit), 2);
eq('polar winter self-reliance is 2 despite instant comms',
  M.selfRelianceLevel(M.environments.polar), 2);
eq('vessel self-reliance is 1', M.selfRelianceLevel(M.environments.vessel), 1);
eq('offshore self-reliance is 0', M.selfRelianceLevel(M.environments.offshore), 0);

(function envIntegrity() {
  Object.keys(M.environments).forEach(function (k) {
    var e = M.environments[k];
    eq('env id matches key: ' + k, e.id, k);
    ok('env has a care category: ' + k, !!M.CARE[e.careAccess], e.careAccess);
    ok('env has a care note: ' + k, !!e.careNote && e.careNote.length > 20);
    ok('env has a delay note: ' + k, !!e.delayNote && e.delayNote.length > 20);
    ok('env domain is space or earth: ' + k, ['space', 'earth'].indexOf(e.domain) !== -1);
  });
}());

/* ---------------- briefing ---------------- */

(function briefingTests() {
  var res = M.evaluateDay({ temp: 38.4, hr: 105, sleep: 7, mood: 4, exercise: 90 });
  var bMars = M.briefing(res, 'mars');
  ok('mars briefing is Earth-independent', bMars.earthIndependent === true);
  ok('mars briefing quotes a 40 min round trip', /40 min/.test(bMars.roundTripText), bMars.roundTripText);
  eq('mars care access is none', bMars.careAccess, 'none');
  eq('fever is listed as an alert', bMars.alerts.filter(function (a) { return a.id === 'temp'; }).length, 1);
  eq('raised HR is listed as a watch', bMars.watches.filter(function (a) { return a.id === 'hr'; }).length, 1);
  ok('escalations include the fever', bMars.escalations.some(function (e) { return e.id === 'temp'; }));

  var bIss = M.briefing(res, 'iss');
  ok('ISS briefing is not Earth-independent', bIss.earthIndependent === false);
  ok('ISS answer comes back in seconds', /seconds/.test(bIss.roundTripText));

  var bPolar = M.briefing(res, 'polar');
  ok('polar winter is Earth-independent on care, not comms', bPolar.earthIndependent === true);
  ok('polar posture says treat it yourself', /yourself/i.test(bPolar.posture));
  eq('polar has no GCR limit', bPolar.gcrDailyLimit, null);

  var clean = M.evaluateDay({ temp: 36.7, hr: 68, sleep: 8, mood: 4, exercise: 90, bp_sys: 112, bp_dia: 72 });
  eq('a clean day has no alerts', M.briefing(clean, 'mars').alerts.length, 0);
}());

/* ---------------- domain filtering ---------------- */

ok('CO2 applies in space', M.appliesTo('co2', 'iss') === true);
ok('CO2 does not apply at sea', M.appliesTo('co2', 'vessel') === false);
ok('career dose does not apply at a polar station', M.appliesTo('rad_career', 'polar') === false);
ok('heart rate applies everywhere', M.appliesTo('hr', 'vessel') === true);
ok('unknown indicator does not apply', M.appliesTo('nope', 'iss') === false);
ok('space has more active indicators than earth',
  M.activeIndicators('mars').length > M.activeIndicators('vessel').length);
eq('earth drops exactly the three space-only indicators',
  M.activeIndicators('mars').length - M.activeIndicators('vessel').length, 3);

/* ---------------- routine: what is due ---------------- */

(function dueTests() {
  var log = {
    '2026-11-10': { hr: 70, temp: 36.8, sleep: 7, mood: 4, exercise: 90, co2: 2.1, bp_sys: 118, bp_dia: 76, vision: 0, mass: 72, rad_career: 120 },
    '2026-11-14': { hr: 71, temp: 36.7, sleep: 7.5, mood: 4, exercise: 90, co2: 2.0 }
  };
  var due = M.dueToday(log, '2026-11-14');
  var ids = due.map(function (d) { return d.id; });
  ok('daily items logged today are not due', ids.indexOf('hr') === -1);
  ok('weekly BP logged 4 days ago is not due yet', ids.indexOf('bp_sys') === -1);
  ok('event items are never listed as due', ids.indexOf('rad_event') === -1);

  var stale = { '2026-10-01': { bp_sys: 118 } };
  var due2 = M.dueToday(stale, '2026-11-14').map(function (d) { return d.id; });
  ok('weekly BP logged 44 days ago is due', due2.indexOf('bp_sys') !== -1);
  ok('monthly glucose never logged is due', due2.indexOf('glucose') !== -1);

  var empty = M.dueToday({}, '2026-11-14').map(function (d) { return d.id; });
  ok('with an empty log, every non-event item is due', empty.length === M.indicators.length - 1, 'got ' + empty.length);
}());

/* ---------------- streak: rewards logging and countermeasures ---------------- */

(function streakTests() {
  var daily = { hr: 70, temp: 36.8, sleep: 7, mood: 4, exercise: 90, co2: 2.0 };
  var log = {
    '2026-11-12': daily, '2026-11-13': daily, '2026-11-14': daily
  };
  eq('three complete days make a streak of 3', M.streak(log, '2026-11-14'), 3);

  var gap = { '2026-11-12': daily, '2026-11-14': daily };
  eq('a missing day breaks the streak', M.streak(gap, '2026-11-14'), 1);

  var noExercise = JSON.parse(JSON.stringify(log));
  noExercise['2026-11-14'].exercise = 0;
  eq('no exercise breaks the streak', M.streak(noExercise, '2026-11-14'), 0);

  var shortSleep = JSON.parse(JSON.stringify(log));
  shortSleep['2026-11-14'].sleep = 4;
  eq('a short night does NOT break the streak', M.streak(shortSleep, '2026-11-14'), 3);

  eq('empty log has no streak', M.streak({}, '2026-11-14'), 0);
}());

/* ---------------- series and trend ---------------- */

(function trendTests() {
  var log = {
    '2026-11-10': { hr: 60 }, '2026-11-11': { hr: 62 },
    '2026-11-12': { hr: 64 }, '2026-11-13': { hr: 66 }, '2026-11-14': { hr: 68 }
  };
  var s = M.series(log, 'hr');
  eq('series length', s.length, 5);
  eq('series is date-ordered', s[0].date, '2026-11-10');
  eq('series limit keeps the latest points', M.series(log, 'hr', 2)[0].date, '2026-11-13');
  var t = M.trend(s);
  eq('a rising series is reported as rising', t.direction, 'rising');
  ok('slope is 2 bpm per day', Math.abs(t.slope - 2) < 1e-9, String(t.slope));

  var falling = M.trend([{ date: '2026-11-10', value: 80 }, { date: '2026-11-11', value: 75 }, { date: '2026-11-12', value: 70 }]);
  eq('a falling series is reported as falling', falling.direction, 'falling');

  var flat = M.trend([{ date: '2026-11-10', value: 70 }, { date: '2026-11-11', value: 70 }, { date: '2026-11-12', value: 70 }]);
  eq('a flat series is reported as flat', flat.direction, 'flat');

  eq('two points is not enough for a trend', M.trend([{ date: '2026-11-10', value: 1 }, { date: '2026-11-11', value: 2 }]).enough, false);
  eq('no points is not enough', M.trend([]).enough, false);
  eq('series skips non-numeric values', M.series({ '2026-11-10': { hr: 'abc' }, '2026-11-11': { hr: 70 } }, 'hr').length, 1);
  eq('series skips empty strings', M.series({ '2026-11-10': { hr: '' } }, 'hr').length, 0);
}());

/* ---------------- period comparison for the report ---------------- */

(function compareTests(){
  var log = {};
  for(var i=9;i>=5;i--) log[M.shiftDay('2026-11-14',-i)] = { hr: 60 };
  for(var j=4;j>=0;j--) log[M.shiftDay('2026-11-14',-j)] = { hr: 70 };

  var c = M.compare(log, 'hr', 30);
  eq('both halves are counted', c.n, 10);
  eq('the first half mean', c.first.mean, 60);
  eq('the second half mean', c.second.mean, 70);
  eq('the delta is reported', c.delta, 10);
  eq('the change is a percentage', c.pct, 16.7);
  eq('the direction is up', c.direction, 'up');
  ok('each half names its dates', !!c.first.from && !!c.second.to);

  var down = {};
  for(var k=5;k>=3;k--) down[M.shiftDay('2026-11-14',-k)] = { hr: 80 };
  for(var l=2;l>=0;l--) down[M.shiftDay('2026-11-14',-l)] = { hr: 60 };
  eq('a fall reads as down', M.compare(down,'hr',30).direction, 'down');

  var flat = {};
  for(var q=5;q>=0;q--) flat[M.shiftDay('2026-11-14',-q)] = { hr: 70 };
  eq('no change reads as flat', M.compare(flat,'hr',30).direction, 'flat');
  eq('no change is zero percent', M.compare(flat,'hr',30).pct, 0);

  var thin = { '2026-11-14': { hr: 70 }, '2026-11-13': { hr: 72 } };
  eq('two readings will not be split into two means', M.compare(thin,'hr',30).enough, false);
  ok('and it says why', /Not enough readings/.test(M.compare(thin,'hr',30).reason));
  eq('an empty log compares nothing', M.compare({}, 'hr', 30).enough, false);
  eq('an unlogged indicator compares nothing', M.compare(log, 'glucose', 30).enough, false);

  // a window shorter than the data only compares what is inside it
  var short = M.compare(log, 'hr', 4);
  eq('the window limits the comparison', short.n, 4);
}());

/* ---------------- date helpers ---------------- */

eq('daysBetween across a month boundary', M.daysBetween('2026-10-31', '2026-11-02'), 2);
eq('daysBetween same day', M.daysBetween('2026-11-14', '2026-11-14'), 0);
eq('shiftDay back one day', M.shiftDay('2026-11-01', -1), '2026-10-31');
eq('shiftDay forward one day', M.shiftDay('2026-12-31', 1), '2027-01-01');
eq('shiftDay over a leap day', M.shiftDay('2028-02-28', 1), '2028-02-29');

/* ---------------- delay formatting ---------------- */

ok('1 s delay reads as each way', /each way/.test(M.formatDelay(1)));
ok('1200 s delay reads as 20 min', /20 min/.test(M.formatDelay(1200)));

/* ---------------- safety invariants ---------------- */

(function safetyInvariants() {
  // No action text may tell the crew to dose a medicine.
  M.indicators.forEach(function (ind) {
    if (ind.kind === 'categorical') {
      ind.options.forEach(function (o) { checkAction(ind.id, ind.evaluate(o.value)); });
    } else {
      [ind.min, (ind.min + ind.max) / 2, ind.max].forEach(function (v) {
        checkAction(ind.id, ind.evaluate(v));
      });
    }
  });
  function checkAction(id, res) {
    var text = res.action;
    ok('no mg dosing in action text: ' + id, !/\b\d+\s?(mg|ml|mcg)\b/i.test(text), text);
    // A healthy reading is allowed to say "Nothing to do." Anything that is
    // not plainly OK has to tell the crewmember what to actually do.
    if (res.band !== 'ok') {
      ok('actionable band gives real instructions: ' + id + ' (' + res.band + ')', text.length > 25, text);
    } else {
      ok('ok band still has an action line: ' + id, text.length > 5, text);
    }
  }
  // Every alert band must either escalate or explain why it does not.
  M.indicators.forEach(function (ind) {
    if (ind.kind === 'categorical') return;
    var hi = ind.evaluate(ind.max);
    if (hi.band === 'alert') {
      ok('alert at max for ' + ind.id + ' has an action', hi.action.length > 15);
    }
  });
}());

/* ---------------- hardware: silence is a finding ---------------- */

(function sensorTests(){
  var NOW = Date.UTC(2026,10,14,12,0,0);
  function ago(h){ return NOW - h*3600000; }

  var all = M.sensorStatus({}, NOW, 'iss', false);
  ok('unknown sensors are reported, not assumed fine',
    all.every(function(s){ return s.band === 'watch' && s.status === 'Never connected'; }));
  ok('a never-connected sensor tells you to pair it',
    /Pair /.test(all[0].action));

  var st = {
    wearable:{connected:true,  lastSeen: ago(1)},
    thermometer:{connected:true, lastSeen: ago(40)},
    cabin_monitor:{connected:true, lastSeen: ago(7)},
    dosimeter:{connected:false, lastSeen: ago(5)}
  };
  var res = M.sensorStatus(st, NOW, 'iss', false);
  function find(id){ return res.filter(function(s){ return s.id===id; })[0]; }

  eq('a fresh wearable is ok', find('wearable').band, 'ok');
  eq('a thermometer overdue past its cadence is watch', find('thermometer').band, 'watch');
  eq('a cabin monitor silent past twice its cadence is alert', find('cabin_monitor').band, 'alert');
  eq('a disconnected dosimeter is alert', find('dosimeter').band, 'alert');
  eq('a disconnected sensor says so plainly', find('dosimeter').status, 'Not connected');
  ok('a disconnected sensor promises no estimate',
    /nothing here is estimating them/.test(find('dosimeter').action), find('dosimeter').action);
  ok('an alert sensor names the hardware, not the crewmember',
    /Check personal dosimeter|Reconnect personal dosimeter/.test(find('dosimeter').action));

  ok('suit telemetry is hidden when not on EVA', !find('suit_telemetry'));
  var eva = M.sensorStatus(st, NOW, 'iss', true);
  ok('suit telemetry appears during an EVA',
    eva.some(function(s){ return s.id==='suit_telemetry'; }));

  var sea = M.sensorStatus(st, NOW, 'vessel', false);
  ok('the cabin monitor is not listed at sea', !sea.some(function(s){ return s.id==='cabin_monitor'; }));
  ok('the dosimeter is not listed at sea', !sea.some(function(s){ return s.id==='dosimeter'; }));
  ok('the wearable is listed everywhere', sea.some(function(s){ return s.id==='wearable'; }));

  var fresh = M.sensorStatus({wearable:{connected:true,lastSeen:ago(0.25)}}, NOW, 'iss', false);
  ok('a very recent reading reads in minutes', /min ago/.test(find2(fresh,'wearable').status), find2(fresh,'wearable').status);
  function find2(arr,id){ return arr.filter(function(s){return s.id===id;})[0]; }

  M.sensors.forEach(function(s){
    ok('sensor declares what it feeds: '+s.id, Array.isArray(s.feeds));
    s.feeds.forEach(function(f){ ok('sensor '+s.id+' feeds a real indicator '+f, !!M.getIndicator(f)); });
    ok('sensor has a plain description: '+s.id, !!s.plain && s.plain.length > 10);
  });
}());

/* ---------------- activity: own norm, described not diagnosed ---------------- */

(function activityTests(){
  function build(baseVal, recentVal){
    var log = {};
    for(var i=16;i>=3;i--) log[M.shiftDay('2026-11-14', -i)] = { exercise: baseVal };
    for(var j=2;j>=0;j--) log[M.shiftDay('2026-11-14', -j)] = { exercise: recentVal };
    return log;
  }
  var steady = M.activityDeviation(build(90, 90), '2026-11-14');
  eq('steady activity is ok', steady.band, 'ok');
  eq('steady activity reports the baseline mean', steady.baseMean, 90);

  var down = M.activityDeviation(build(90, 54), '2026-11-14');
  eq('a 40 percent drop is watch', down.band, 'watch');
  eq('direction is below', down.direction, 'below');
  eq('percentage is reported', down.pct, -40);

  var way = M.activityDeviation(build(90, 20), '2026-11-14');
  eq('a 78 percent drop is alert', way.band, 'alert');
  ok('a large drop refuses to guess the cause',
    /does not say why|will not guess/.test(way.action), way.action);

  var up = M.activityDeviation(build(60, 120), '2026-11-14');
  eq('a doubling is alert', up.band, 'alert');
  eq('direction is above', up.direction, 'above');
  ok('a rise checks recovery rather than naming a state',
    /sleep and recovery/.test(up.action), up.action);

  var thin = M.activityDeviation({'2026-11-14':{exercise:90}}, '2026-11-14');
  eq('too little data is honest about it', thin.enough, false);
  eq('too little data has no band', thin.band, 'unknown');

  var zero = {};
  for(var i=16;i>=3;i--) zero[M.shiftDay('2026-11-14', -i)] = { exercise: 0 };
  for(var j=2;j>=0;j--) zero[M.shiftDay('2026-11-14', -j)] = { exercise: 60 };
  eq('a zero baseline refuses to divide', M.activityDeviation(zero, '2026-11-14').enough, false);

  // The output must never name a condition or a mental state.
  ['depress','anxiet','mania','manic','burnout','disorder','diagnos'].forEach(function(w){
    [steady, down, way, up].forEach(function(r){
      var blob = (r.text||'') + ' ' + (r.action||'');
      ok('activity output avoids the word "'+w+'"', blob.toLowerCase().indexOf(w) === -1, blob);
    });
  });
}());

/* ---------------- triage: order by what hurts first ---------------- */

(function triageTests(){
  function u(id, v){ return M.urgencyOf(M.evaluate(id, v)); }

  eq('hypoglycaemia is immediate', u('glucose', 55).key, 'now');
  eq('a high fasting glucose is not immediate', u('glucose', 140).key, 'today');
  ok('the two glucose alerts share a band but not an urgency',
    M.evaluate('glucose',55).band === M.evaluate('glucose',140).band
    && u('glucose',55).key !== u('glucose',140).key);

  eq('a high fever is immediate', u('temp', 39.4).key, 'now');
  eq('an ordinary fever is within hours', u('temp', 38.3).key, 'hours');
  eq('hypothermia is immediate', u('temp', 34.5).key, 'now');
  eq('severe systolic is immediate', u('bp_sys', 195).key, 'now');
  eq('stage 2 systolic is within hours', u('bp_sys', 150).key, 'hours');
  eq('severe diastolic is immediate', u('bp_dia', 125).key, 'now');
  eq('an active solar particle event is immediate', u('rad_event', 200).key, 'now');
  eq('career dose is a planning question', u('rad_career', 500).key, 'today');
  eq('a CO2 breach is within hours', u('co2', 3.6).key, 'hours');
  eq('a positive vision screen is today', u('vision', 2).key, 'today');
  eq('one missed session is noted, not actioned today', u('exercise', 0).key, 'note');
  eq('severely short sleep is today', u('sleep', 4).key, 'today');
  eq('a watch is noted, not actioned', u('bp_sys', 132).key, 'note');
  eq('a rising CO2 watch still counts for today', u('co2', 2.6).key, 'today');
  eq('an in-range reading is noted', u('hr', 70).key, 'note');
  eq('an unlogged reading is noted', M.urgencyOf(M.evaluate('hr', null)).key, 'note');
  ok('urgencyOf tolerates nothing at all', M.urgencyOf(null).key === 'note');

  // every urgency level carries its reason and its own visual channel
  Object.keys(M.URGENCY).forEach(function(k){
    var x = M.URGENCY[k];
    ok('urgency has a word: '+k, !!x.label && x.label === x.label.toUpperCase());
    ok('urgency has a horizon: '+k, !!x.horizon && x.horizon.length > 15);
    ok('urgency has a colour: '+k, /^#[0-9A-F]{6}$/i.test(x.colour));
    ok('urgency has a fill style: '+k, x.fill === 'solid' || x.fill === 'outline');
  });
  ok('urgency colours are all distinct',
    new Set(Object.keys(M.URGENCY).map(function(k){ return M.URGENCY[k].colour; })).size === 4);
  ok('no urgency level is green, because green means in range',
    Object.keys(M.URGENCY).every(function(k){ return M.URGENCY[k].colour.toUpperCase() !== '#35C47E'; }));
  ok('every urgency rule states a reason', !!u('glucose',55).why && u('glucose',55).why.length > 20);
}());

(function actionPlanTests(){
  var results = M.evaluateDay({
    glucose: 55,      // now
    co2: 3.6,         // hours
    exercise: 0,      // today
    bp_sys: 132,      // note (watch)
    hr: 70            // in range, excluded
  });
  var NOW = Date.UTC(2026,10,14,12,0,0);
  var sensors = M.sensorStatus({ glucometer:{connected:false,lastSeen:NOW-3600000} }, NOW, 'iss', false);
  var plan = M.actionPlan({ results: results, sensors: sensors });

  ok('the plan is not empty', plan.length > 0);
  eq('the first action is the immediate one', plan[0].urgency, 'now');
  ok('ranks never decrease down the list',
    plan.every(function(it,i){ return i===0 || plan[i-1].rank <= it.rank; }));
  ok('the list is numbered from one', plan[0].order === 1 && plan[plan.length-1].order === plan.length);
  ok('in-range readings are left out', !plan.some(function(it){ return it.id==='hr'; }));

  function at(id){ return plan.filter(function(it){ return it.id===id; })[0]; }
  ok('hypoglycaemia outranks the CO2 breach', at('glucose').order < at('co2').order);
  ok('the CO2 breach outranks the missed exercise', at('co2').order < at('exercise').order);
  ok('a stage 1 blood pressure outranks one missed session', at('bp_sys').order < at('exercise').order);

  // a disconnected sensor that feeds a currently-alerting reading is urgent
  var gl = at('glucometer');
  ok('a sensor feeding an out-of-band reading is immediate', gl && gl.urgency === 'now', gl && gl.urgency);
  ok('that sensor explains why the gap matters now', /matters now/.test(gl.rationale));

  // the same sensor, when nothing it feeds is alerting, is not immediate
  var calm = M.evaluateDay({ glucose: 90, hr: 70 });
  var plan2 = M.actionPlan({ results: calm, sensors: sensors });
  var gl2 = plan2.filter(function(it){ return it.id==='glucometer'; })[0];
  eq('the same disconnection is less urgent when nothing it feeds is out of band', gl2.urgency, 'hours');
  ok('and it says so', /not a change in the crewmember/.test(gl2.rationale));

  // activity folds into the same ordered list
  var log = {};
  for(var i=16;i>=3;i--) log[M.shiftDay('2026-11-14',-i)] = { exercise: 90 };
  for(var j=2;j>=0;j--) log[M.shiftDay('2026-11-14',-j)] = { exercise: 15 };
  var plan3 = M.actionPlan({ results: calm, sensors: [], activity: M.activityDeviation(log,'2026-11-14') });
  var a3 = plan3.filter(function(it){ return it.kind==='activity'; })[0];
  ok('activity appears as an action point', !!a3);
  eq('a large activity drop is a today item', a3.urgency, 'today');

  // ordering is stable: same input, same order
  var p1 = M.actionPlan({ results: results, sensors: sensors }).map(function(x){ return x.id; }).join(',');
  var p2 = M.actionPlan({ results: results, sensors: sensors }).map(function(x){ return x.id; }).join(',');
  eq('the order does not reshuffle between renders', p1, p2);

  eq('an empty day produces an empty plan', M.actionPlan({ results: M.evaluateDay({}), sensors: [] }).length, 0);
  eq('actionPlan tolerates no input at all', M.actionPlan().length, 0);

  plan.forEach(function(it){
    ok('action point carries a colour: '+it.id, /^#[0-9A-F]{6}$/i.test(it.colour));
    ok('action point carries an urgency word: '+it.id, !!it.urgencyLabel);
    ok('action point carries a rationale: '+it.id, !!it.rationale && it.rationale.length > 15);
    ok('action point carries something to do: '+it.id, !!it.action && it.action.length > 15);
  });
}());

/* ---------------- the checklist ---------------- */

(function scheduleTests(){
  var log = {
    '2026-11-07': { bp_sys: 118, bp_dia: 76, vision: 0, mass: 78.2 },
    '2026-11-13': { hr: 70, temp: 36.8, sleep: 7, mood: 4, exercise: 90, co2: 2.1 },
    '2026-11-14': { hr: 71, temp: 36.9 }
  };
  var sch = M.schedule(log, '2026-11-14', 'iss');
  function at(id){ return sch.filter(function(x){ return x.id===id; })[0]; }

  ok('every applicable non-event indicator appears', sch.length === M.activeIndicators('iss').length - 1);
  eq('a reading taken today is done', at('hr').status, 'done');
  eq('a daily reading not taken today is due', at('sleep').status, 'due');
  eq('a weekly reading taken 7 days ago is due today', at('bp_sys').dueInDays, 0);
  eq('and it reads as due', at('bp_sys').status, 'due');
  eq('a monthly reading never taken is due now', at('glucose').status, 'due');
  eq('the next due date is the last plus the window', at('vision').nextDue, '2026-11-14');

  var stale = { '2026-10-20': { bp_sys: 118 } };
  var s2 = M.schedule(stale, '2026-11-14', 'iss');
  var bp = s2.filter(function(x){ return x.id==='bp_sys'; })[0];
  eq('an old weekly reading is overdue', bp.status, 'overdue');
  ok('overdue counts the other way', bp.dueInDays < 0, String(bp.dueInDays));
  eq('overdue days are reported positively too', bp.overdueByDays, -bp.dueInDays);

  var order = sch.map(function(x){ return x.status; });
  var rank = { overdue:0, due:1, scheduled:2, done:3 };
  ok('the checklist puts overdue first and done last',
    order.every(function(st,i){ return i===0 || rank[order[i-1]] <= rank[st]; }), order.join(','));

  var sea = M.schedule(log, '2026-11-14', 'vessel');
  ok('the checklist drops space-only items at sea',
    !sea.some(function(x){ return x.id==='co2' || x.id==='rad_career'; }));
  ok('event items never appear on the checklist',
    !sch.some(function(x){ return x.id==='rad_event'; }));
  eq('an empty log makes everything due', M.schedule({}, '2026-11-14', 'iss').every(function(x){ return x.status==='due'; }), true);
}());

/* ---------------- the education library ---------------- */

(function educationTests(){
  ok('the library is not empty', M.education.length > 0);
  M.education.forEach(function(e){
    ok('entry has a title: '+e.id, !!e.title);
    ok('entry says what it is in plain words: '+e.id, !!e.what && e.what.length > 80);
    ok('entry says why it happens: '+e.id, !!e.why && e.why.length > 40);
    ok('entry states the evidence: '+e.id, !!e.evidence && e.evidence.length > 60);
    ok('entry gives things to do: '+e.id, Array.isArray(e.doing) && e.doing.length >= 3);
    ok('entry says when to involve the ground: '+e.id, !!e.ground && e.ground.length > 20);
    ok('entry is cited: '+e.id, Array.isArray(e.sources) && e.sources.length > 0);
    e.sources.forEach(function(sid){
      ok('entry '+e.id+' cites a registered source '+sid, !!M.sources[sid]);
    });
    e.indicators.forEach(function(iid){
      ok('entry '+e.id+' links a real indicator '+iid, !!M.getIndicator(iid));
    });
    // an explainer must never issue a dose
    var blob = e.what+' '+e.why+' '+e.evidence+' '+e.doing.join(' ')+' '+e.ground;
    ok('entry issues no dose: '+e.id, !/\b\d+\s?(mg|ml|mcg)\b/i.test(blob));
  });

  eq('the exercise indicator links to the bone entry', M.educationFor('exercise')[0].id, 'bone_muscle');
  eq('CO2 links to its own entry', M.educationFor('co2')[0].id, 'co2');
  eq('vision links to SANS', M.educationFor('vision')[0].id, 'sans');
  ok('sleep links to more than one entry', M.educationFor('sleep').length >= 2);
  eq('an indicator with no entry returns nothing', M.educationFor('bp_sys').length, 0);
  ok('a missing entry is null, not invented', M.getEducation('entorse') === null);
  ok('getEducation finds a real one', !!M.getEducation('sans'));
}());

/* ---------------- anatomy citation ---------------- */

ok('the figure declares its own origin', !!M.sources.figure_origin);
ok('the figure origin states no plate is traced',
  /no third-party plate is traced/.test(M.sources.figure_origin.cite));
ok('anatomical references that were never used are not cited', !M.sources.grays && !M.sources.blausen);
ok('the figure origin does not claim an atlas check that was not done', /were not measured from, or checked against, an atlas plate/.test(M.sources.figure_origin.cite));
ok('the anatomy references that were read are cited', !!M.sources.seer_anatomy && !!M.sources.openstax_ap);
ok('the figure origin names both references', /SEER Training Modules/.test(M.sources.figure_origin.cite) && /OpenStax/.test(M.sources.figure_origin.cite));
ok('the anatomy references say nothing is reproduced', /Nothing is reproduced/.test(M.sources.seer_anatomy.cite) && /No text or figure is reproduced/.test(M.sources.openstax_ap.cite));

/* ---------------- report ---------------- */

/* ---- self-challenge: the gate is the feature --------------------------
 * The point of these is not that a challenge appears. It is that it does
 * NOT appear on the days the record says recover, and that resting is not
 * punished for it. A challenge feature that fires on a bad-sleep day is
 * arguing with the alert on the same screen.
 */
(function challengeSuite(){
  function base(over){
    var log = {};
    for(var i=0;i<20;i++){
      log[M.shiftDay('2026-11-14', -i)] =
        { hr:70, temp:36.8, sleep:7.2, mood:4, exercise:80, co2:2.1 };
    }
    if(over) Object.keys(over).forEach(function(k){ log['2026-11-14'][k] = over[k]; });
    return log;
  }

  var ok1 = M.challenge(base(), '2026-11-14', null, {});
  ok('challenge: offered on an ordinary day', ok1.offered === true);
  ok('challenge: three things to show up for', ok1.items.length === 3);

  /* Nothing on offer may ask for more than last time. The words that would
     give it away are checked directly, because this is the rule that keeps
     the feature out of clinical decision support. */
  var txt = ok1.items.map(function(i){ return i.title + ' ' + i.note; }).join(' ').toLowerCase();
  ['harder','faster','longer than','beat your','personal record','more intense','increase the']
    .forEach(function(w){
      ok('challenge: never asks for intensity (' + w + ')', txt.indexOf(w) === -1);
    });

  var shortSleep = M.challenge(base({ sleep:4.5 }), '2026-11-14', null, {});
  ok('challenge: withheld on short sleep', shortSleep.offered === false);
  ok('challenge: short sleep is named as the reason',
    shortSleep.hold.some(function(h){ return h.id === 'sleep'; }));
  ok('challenge: a recovery day still carries a streak',
    typeof shortSleep.streak === 'number');
  ok('challenge: resting is not punished',
    /does not break your streak/i.test(shortSleep.text));

  var alerted = M.challenge(base(), '2026-11-14', null,
    { results: [{ id:'hr', label:'Heart rate', band:'alert' }] });
  ok('challenge: withheld while the PERSON is out of band', alerted.offered === false);
  ok('challenge: the out-of-band reading is named',
    alerted.hold.some(function(h){ return h.id === 'alert:hr'; }));

  /* An environmental alert says something about the vehicle, not about
     whether this person is recovered, and it can stand for weeks. Gating
     on it would park the feature in recovery mode permanently, and a gate
     that never opens is a dead screen rather than a safeguard. */
  var cabin = M.challenge(base(), '2026-11-14', null,
    { results: [{ id:'co2', label:'Cabin CO2', band:'alert' }] });
  ok('challenge: an environmental alert does not withhold', cabin.offered === true);
  ok('challenge: but it is still surfaced',
    cabin.noted.some(function(r){ return r.id === 'co2'; }));
  ok('challenge: accumulated dose does not withhold either',
    M.challenge(base(), '2026-11-14', null,
      { results: [{ id:'rad_career', label:'Career dose', band:'alert' }] }).offered === true);

  /* A watch band is not an alert: it should not shut the feature down. */
  var watched = M.challenge(base(), '2026-11-14', null,
    { results: [{ id:'co2', label:'Cabin CO2', band:'watch' }] });
  ok('challenge: a watch band does not withhold', watched.offered === true);

  var ramp = base();
  ['2026-11-14','2026-11-13','2026-11-12'].forEach(function(d){ ramp[d].exercise = 190; });
  ok('challenge: withheld when already above their own norm',
    M.challenge(ramp, '2026-11-14', null, {}).offered === false);

  /* Running BELOW their own norm is the case the feature exists for, so it
     must still offer something rather than treating any deviation as a
     reason to stay quiet. */
  var low = base();
  ['2026-11-14','2026-11-13','2026-11-12'].forEach(function(d){ low[d].exercise = 20; });
  ok('challenge: still offered when activity has dropped',
    M.challenge(low, '2026-11-14', null, {}).offered === true);

  ok('bestStreak: never below the current streak',
    M.bestStreak(base(), '2026-11-14') >= M.challenge(base(), '2026-11-14', null, {}).streak);
  ok('bestStreak: empty record has no best', M.bestStreak({}, '2026-11-14') === 0);
/* ---- the environment has to change the ADVICE, not just the indicators --
 * An offshore platform was told to raise a reading "at the next private
 * medical conference". The terrestrial deployments are the whole argument
 * for this being a product, so the words and the escalation have to follow
 * the place.
 */
(function environmentSpeaks(){
  var sample = 'Recheck daily and log it. Mention it at the next private medical conference, ' +
               'and tell the ground if it persists. The flight surgeon decides.';

  var space = M.speakFor(sample, M.environments.iss);
  ok('speakFor: spaceflight wording is left alone in space', space === sample);

  ['polar','vessel','offshore','earth'].forEach(function(k){
    var out = M.speakFor(sample, M.environments[k]);
    ok('speakFor[' + k + ']: no flight surgeon', out.indexOf('flight surgeon') === -1, out);
    ok('speakFor[' + k + ']: no private medical conference',
       out.indexOf('private medical conference') === -1, out);
    ok('speakFor[' + k + ']: says duty doctor instead', /duty doctor/.test(out), out);
    ok('speakFor[' + k + ']: says scheduled medical call instead',
       /scheduled medical call/.test(out), out);
  });

  /* The clinical instruction itself must survive untouched: only the help
     clause and the vocabulary move. */
  ok('speakFor: the clinical instruction is unchanged',
     M.speakFor(sample, M.environments.polar).indexOf('Recheck daily and log it.') === 0);

  /* Escalation follows distance from help, not domain. */
  var iss = M.escalation(M.environments.iss);
  var mars = M.escalation(M.environments.mars);
  var polar = M.escalation(M.environments.polar);
  var vessel = M.escalation(M.environments.vessel);

  ok('escalation: ISS is rank 0', iss.rank === 0);
  ok('escalation: Mars is rank 2', mars.rank === 2);
  ok('escalation: a polar winter is rank 2 even though it is on Earth', polar.rank === 2);
  ok('escalation: a vessel is rank 1', vessel.rank === 1);

  ok('escalation: close help says evacuation is possible', /within hours/.test(iss.text));
  ok('escalation: no evacuation says so plainly', /no evacuation/i.test(mars.text));
  ok('escalation: a long delay is quantified', /20 min/.test(mars.text), mars.text);
  ok('escalation: a short delay is not padded with a delay clause',
     !/each way/.test(polar.text), polar.text);
  ok('escalation: days-away advises deciding early', /early/.test(vessel.text));

  /* And it uses the right word for the clinician in each place. */
  ok('escalation: space says flight surgeon', /flight surgeon/.test(mars.text));
  ok('escalation: earth says duty doctor', /duty doctor/.test(polar.text));

  /* Two environments at the same distance must escalate the same way,
     whichever planet they are on. */
  ok('escalation: rank, not domain, decides the clause',
     M.escalation(M.environments.mars).rank === M.escalation(M.environments.polar).rank);
}());

/* ---- our own numbers must be tagged as ours --------------------------
 * Two figures on screen were doing what this build condemns: presenting a
 * team convention with the authority of a published threshold. The
 * comparison each makes is real; the cut-off that turns it into a band is
 * not sourced, so both carry origin 'none' like body mass does.
 */
(function unsourcedMetricsAreDeclared(){
  var log = {};
  for (var i = 0; i < 20; i++) {
    log[M.shiftDay('2026-11-14', -i)] =
      { exercise: i < 3 ? 20 : 80, sleep: 7, _bed: 1350 + ((i * 37) % 70 - 35) };
  }

  var a = M.activityDeviation(log, '2026-11-14');
  ok('provenance: activity deviation declares no threshold', a.origin === 'none', a.origin);
  ok('provenance: and says which part is ours',
    /25% and 50%/.test(a.originNote || '') && /not a published threshold/.test(a.originNote || ''),
    a.originNote);

  var r = M.sleepRegularity(log, '2026-11-14');
  ok('provenance: sleep regularity declares no threshold', r.origin === 'none', r.origin);
  ok('provenance: and says the window is ours',
    /90-minute window chosen by this team/.test(r.originNote || ''), r.originNote);

  /* The measured parts stay measured — declaring the convention must not
     turn the whole figure into a shrug. */
  ok('provenance: the deviation percentage is still computed', typeof a.pct === 'number');
  ok('provenance: the bedtime spread is still computed in minutes',
    typeof r.meanDeviation === 'number');

  /* Every indicator that carries no threshold must say why. */
  M.indicators.filter(function(i2){ return i2.origin === 'none'; }).forEach(function(i2){
    ok('provenance: ' + i2.id + ' explains why it has no band',
      !!(i2.originNote && i2.originNote.length > 30), i2.id);
  });
}());

}());

console.log('');
console.log('SYNAPSE health model - test run');
console.log('model version ' + M.version);
console.log('');
if (failed) {
  failures.forEach(function (f) { console.log('  FAIL  ' + f); });
  console.log('');

}
/* ---------------- OSD-941: NASA data, cited with its limits ------------- */

(function osd941(){
  var src = M.sources.osdr_osd941;
  ok('osd941: the dataset is a registered source', !!src);
  ok('osd941: licence is stated (T&C requires it)', /CC0-1\.0/.test(src.cite), src.cite);
  ok('osd941: carries its DOI', /10\.26030\/twtb-sc40/.test(src.cite));
  ok('osd941: carries its accession and GeneLab id',
     /OSD-941/.test(src.cite) && /GLDS-769/.test(src.cite));

  var e = M.getEducation('neuro_spaceflight');
  ok('osd941: it explains why neuro function is watched', !!e);
  ok('osd941: it is sourced to the dataset', (e.sources || []).indexOf('osdr_osd941') !== -1);

  /* The caption is the point. These limits are what keep a tissue-culture
     result from reading as a statement about the crewmember in front of it. */
  ok('osd941: says it is not a crewmember', /not a crewmember/i.test(e.evidence));
  ok('osd941: says the findings are exploratory', /exploratory/i.test(e.evidence));
  ok('osd941: gives the biological sample size', /three per group/i.test(e.evidence));
  ok('osd941: says direction varied by genotype', /varied/i.test(e.evidence));
  ok('osd941: names the familial-AD lines as a disease model',
     /familial/i.test(e.evidence));

  /* And it must never drift into a treatment or prevention claim, which is
     what would break the general-wellness position. */
  ok('osd941: makes no prevention or treatment claim',
     /prevents or treats no|nothing here prevents or treats/i.test(e.evidence),
     e.evidence.slice(-120));
  ok('osd941: claims nothing about an individual reading',
     /says nothing about what any reading/i.test(e.evidence));
}());

console.log(passed + ' passed, ' + failed + ' failed');
console.log('');
process.exit(failed ? 1 : 0);