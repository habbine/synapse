/* UI-layer tests for SYNAPSE.
 *
 * WHY THIS FILE EXISTS
 * The model has 824 tests and has never been the thing that broke. Every
 * defect that reached the user came from index.html: a renderer reading
 * fields the model does not have, a control wired to a deleted element, a
 * render cascade that blanked every card after the one that threw, a card
 * that survived its own removal, two buttons with the same label doing
 * different things. Those are all detectable by loading the page and
 * looking at it, which is what this does.
 *
 * It boots the real index.html in jsdom, with localStorage and the clock
 * stubbed, and then asserts against the DOM the user would actually get.
 *
 *   node tests/ui.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const APP = path.join(__dirname, '..', 'index.html');

let pass = 0;
let CLOSE = () => {};
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  failures.push(name + (detail ? '  -> ' + detail : ''));
}
function eq(name, actual, expected) {
  ok(name, actual === expected, 'got ' + JSON.stringify(actual) + ', wanted ' + JSON.stringify(expected));
}

/* ---- boot the real page ---------------------------------------------- */

function boot() {
  let html = fs.readFileSync(APP, 'utf8');
  /* The model is loaded by <script src>; jsdom will not fetch it from a
     string document, so it is inlined for the test run only. */
  const model = fs.readFileSync(path.join(__dirname, '..', 'health-model.js'), 'utf8');
  html = html.replace('<script src="health-model.js"></script>',
                      '<script>' + model + '</script>');
  const errors = [];

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://example.test/',
    virtualConsole: new (require('jsdom').VirtualConsole)()
      .on('jsdomError', e => errors.push(e))
      .on('error', (...a) => errors.push(a.join(' ')))
  });

  const w = dom.window;
  /* Speech and downloads do not exist here; the page must cope. */
  w.SpeechSynthesisUtterance = function () {};
  w.speechSynthesis = { speak() {}, cancel() {} };

  const api = w.__synapse;
  return { dom, w, d: w.document, api, errors };
}

function run() {
  const { dom, w, d, api, errors } = boot();
  CLOSE = () => { try { dom.window.close(); } catch (e) {} };
  ok('boot: the page exposes its test surface', !!api);
  if (!api) { report(); return; }

  /* ---- 1. the page boots without throwing --------------------------- */
  // A blank card almost always begins as an uncaught error at boot.
  ok('boot: no uncaught errors', errors.length === 0,
     errors.slice(0, 3).map(String).join(' | '));

  /* ---- 2. every element a script reaches for actually exists -------- */
  // Guards against markup moving while the wiring does not: one null
  // reference silently kills every control after it.
  const src = Array.from(d.querySelectorAll('script')).map(s => s.textContent).join('\n');
  const referenced = new Set();
  const re = /getElementById\(\s*'([A-Za-z0-9_-]+)'\s*\)/g;
  let m;
  while ((m = re.exec(src))) referenced.add(m[1]);

  // Ids created at runtime rather than authored in the markup.
  const RUNTIME_IDS = new Set([
    'filmPlay', 'filmStep', 'filmBar', 'posterSave', 'posterSvg', 'sceneSave', 'sceneSvg',
    'switchScene', 'switchPortrait', 'writeBox', 'writeCopy', 'writeSave',
    'gameBody', 'gameOpts', 'gameFb', 'gameAgain',
    'hwExplode', 'hwDiagram', 'hwPartNote', 'hwSteps',
    'nowDemo', 'nowStart', 'nowChecks', 'nowMore', 'nowMore2', 'nowDone', 'nowLater',
    'nowWhy', 'nowWhyBody', 'nowLearn', 'diaryFold', 'cycleStart', 'evoSettings',
    'avShapes', 'avPatterns', 'avEyes', 'avRandom', 'crewPick', 'crewBody', 'profName',
    /* Deliberately removed at runtime, or superseded. Their renderers are
       guarded no-ops; this list records that the absence is intended. */
    'cardHwOld', 'hw', 'cardLog', 'cardDiary', 'diaryList', 'trends',
    'viewClinical', 'viewPersonalise', 'crewNameHdr', 'evoRing',
    'evaState', 'evaBadge', 'evaIcon', 'evaSub', 'evaBtn2', 'evaDose',
    'alertSheet', 'asClose', 'asLater', 'asDone', 'cardProfile', 'crewBody',
    /* built by renderAlertBand only while the status is ACTION NEEDED */
    'bandGo',
    /* built by renderCycle inside the wheel it draws */
    'cycleLen', 'cycleBleed',
    /* built by openDietPicker when the dietary list is edited */
    'dietOther', 'dietDone', 'dietClear',
    /* built by openChipPicker for the diet and allergy lists */
    'chipOther', 'chipDone', 'chipClear',
    /* built by renderTour inside the first-run dialog */
    'tourGo', 'tourClose',
    /* The journal half of "How you are today" moved to Record my journey,
       which owns its own box, dictate button and release control. Every
       reader of these is guarded; the guards are what this list asserts
       is still true. */
    'journal', 'privacyChip', 'shareBtn', 'recBtn', 'recLabel', 'recDot', 'recNote',
    /* Relocated once at boot, and the move strips the id so the section can
       never be addressed twice. The lookup is legitimate; the element is gone
       by the time this test reads the DOM. viewAnalysis holds GENERATE A
       REPORT and is appended under the clinical record in My health > Record. */
    'dlRecord', 'eraseRecord', 'myDataSay', 'wearSheet', 'wsClose', 'layerPop', 'lpClose', 'hwWear', 'viewAnalysis', 'viewClinical', 'viewPersonalise', 'scenarioSheet', 'scClose', 'scNext', 'scAgain', 'wsMove', 'moveSheet', 'mvStage', 'mvCue', 'mvPlay', 'mvSeek', 'mvTime', 'mvReps', 'mvClose', 'asPlay', 'scnBanner', 'scSound', 'linkSheet', 'lkClose', 'lkTitle', 'lkFlows', 'lkRules', 'wsPlay', 'wsDemo', 'checkRun', 'srcLegal'
  ]);

  const missing = [...referenced].filter(id => !RUNTIME_IDS.has(id) && !d.getElementById(id));
  ok('wiring: no script reaches for an element that does not exist',
     missing.length === 0, 'missing: ' + missing.join(', '));

  /* ---- 3. the tab bar is a real tablist ----------------------------- */
  const nav = d.getElementById('views');
  eq('tabs: nav has role=tablist', nav && nav.getAttribute('role'), 'tablist');

  const tabs = Array.from(d.querySelectorAll('#views [role="tab"]'));
  ok('tabs: five primary tabs plus two utility tabs', tabs.length === 7, 'found ' + tabs.length);

  const labels = tabs.map(t => t.textContent.trim().replace(/\s+/g, ' '));
  ok('tabs: labels are in one register',
     labels.slice(0, 5).join('|') === 'Today|My health|My challenges|My gadgets|Create',
     labels.join(' | '));

  const selected = tabs.filter(t => t.getAttribute('aria-selected') === 'true');
  eq('tabs: exactly one is selected', selected.length, 1);

  tabs.forEach(t => {
    const panelId = t.getAttribute('aria-controls');
    ok('tabs: ' + t.getAttribute('data-view') + ' controls a real panel',
       !!(panelId && d.getElementById(panelId)), panelId);
  });

  const roving = tabs.filter(t => t.getAttribute('tabindex') === '0');
  eq('tabs: roving tabindex puts exactly one tab in sequence', roving.length, 1);

  /* ---- 4. switching tabs shows one panel and only one --------------- */
  /* Section panels inside a tab are tabpanels too, so "visible" has to
     mean "no hidden ancestor", not just "not hidden itself". A section in
     a closed tab is correctly hidden by its parent. This counts only the
     top-level view panels. */
  function visible(el) {
    let n = el;
    while (n) { if (n.hasAttribute && n.hasAttribute('hidden')) return false; n = n.parentElement; }
    return true;
  }
  function panelsVisible() {
    return Array.from(d.querySelectorAll('.wrap > [role="tabpanel"]')).filter(visible);
  }
  ['today', 'health', 'howto', 'create', 'now', 'sources'].forEach(v => {
    api.setView(v);
    const vis = panelsVisible();
    ok('view ' + v + ': exactly one panel visible', vis.length === 1,
       'visible: ' + vis.map(p => p.id).join(','));
  });
  api.setView('today');

  /* ---- 5. retired view names still resolve -------------------------- */
  // A session saved before the merge must not land on a tab that is gone.
  api.setView('clinical');
  eq('legacy: clinical resolves to My health', api.state.view, 'health');
  api.setView('analysis');
  eq('legacy: analysis resolves to My health', api.state.view, 'health');
  api.setView('personalise');
  eq('legacy: personalise resolves to the EVO settings view', api.state.view, 'now');
  api.setView('today');

  /* ---- 6. no renderer leaves "undefined" on the screen -------------- */
  // The coverage map shipped six rows reading "undefined" because the
  // renderer used field names the model does not have.
  api.setView('sources');
  api.setView('health');
  api.setView('howto');
  api.setView('create');
  api.setView('today');
  const clone = d.body.cloneNode(true);
  Array.prototype.forEach.call(clone.querySelectorAll('script'), n => n.remove());
  const body = clone.textContent;
  ok('render: nothing renders the word undefined',
     !/\bundefined\b/.test(body),
     (body.match(/.{0,60}undefined.{0,40}/) || [''])[0]);
  ok('render: nothing renders NaN', !/\bNaN\b/.test(body),
     (body.match(/.{0,60}NaN.{0,40}/) || [''])[0]);

  /* ---- 7. the NASA coverage map renders real area names ------------- */
  api.setView('sources');
  const cov = d.getElementById('coverage');
  {
    const A = q => w.__synapse.evoAnswer(q);
    ok('EVO: answers a status question from the record', /expected range/.test(A('How am I today?').text));
    ok('EVO: reads out one indicator with its value', /Sleep last night is [0-9.]+ h/.test(A('How did I sleep?').text));
    ok('EVO: a where question names a place to open', (A('Where are my trends?').place || {}).sec === 'Trends');
    ok('EVO: gadgets are found by what they are for', (A('how do I wear the cuff').place || {}).view === 'howto');
    ok('EVO: an unknown question gets guidance, not silence', /Try:/.test(A('xyzzy').text));
    ok('EVO: answering moves nothing by itself', (function(){ const v = w.__synapse.state.view; A('open the sources'); return w.__synapse.state.view === v; })());
    ok('EVO: the ask box, talk button and suggestions exist', !!d.getElementById('evoAsk') && !!d.getElementById('evoMic') && d.querySelectorAll('#evoChips button').length === 8);
    ok('scenarios: three are offered under Create, and marked as invented', d.querySelectorAll('#scnList [data-scn]').length === 4 && /INVENTED/.test(d.getElementById('cardScenarios').textContent));
    ['co2', 'storm', 'sleep'].forEach(function(id){
      const st = w.__synapse.scenarioStepsFor(id);
      ok('scenario [' + id + ']: four steps, each with one best answer and a verdict from the model', st.length === 4 && st.every(x => x.options.filter(o => o.pts === 2).length === 1 && /^(ok|watch|alert)$/.test(x.band) && x.action.length > 5));
      ok('scenario [' + id + ']: the debrief says what is real and what is invented', /What is real:/.test(w.__synapse.scenarioSet[id].real) && /What is invented:/.test(w.__synapse.scenarioSet[id].real));
    });
    ok('scenario [storm]: the bands follow the model (none, watch, alert, alert)', w.__synapse.scenarioStepsFor('storm').map(x => x.band).join() === 'ok,watch,alert,alert');
    ok('scenario [sleep]: the bands follow the model', w.__synapse.scenarioStepsFor('sleep').map(x => x.band).join() === 'ok,watch,watch,alert');
    (function(){
      const S = w.__synapse, logBefore = JSON.stringify(S.state.log), envBefore = S.state.env, stored = () => JSON.parse(w.localStorage.getItem(Object.keys(w.localStorage)[0]) || '{}');
      S.scenarioOpen('storm');
      ok('immersive: the scenario runs on the Today screen with a banner saying it is fictitious', S.state.view === 'today' && /FICTITIOUS SCENARIO RUNNING/.test((d.getElementById('scnBanner') || {}).textContent || ''));
      d.querySelector('#scenarioSheet [data-sc="0"]').click(); d.getElementById('scNext').click();
      d.querySelector('#scenarioSheet [data-sc="0"]').click(); d.getElementById('scNext').click();
      ok('immersive: an alert step sends rings out from the alert sign on the body map', d.querySelectorAll('#fig .bell .ripple').length >= 3);
      ok('immersive: the scenario panel is docked, not a full-screen cover', d.getElementById('scenarioSheet').style.inset === '' && /right/.test(d.getElementById('scenarioSheet').style.cssText));
      S.state.prefs.muted = false; const st0 = S.state; S.state = st0;
      ok('immersive: nothing from the scenario is stored', JSON.stringify(S.state.log) === logBefore && (stored().env === undefined || stored().env === envBefore));
      ok('immersive: the panel lets you switch between the three scenarios', d.querySelectorAll('#scenarioSheet [data-scpick]').length === 4);
      d.querySelector('#scenarioSheet [data-scpick="sleep"]').click();
      ok('immersive: switching restarts at step one of the chosen scenario', /Step 1 of 4/.test(d.getElementById('scenarioSheet').textContent) && /Night 1/.test(d.getElementById('scenarioSheet').textContent));
      ok('immersive: a Play a scenario button sits beside the page title on every tab', !!d.getElementById('scnStart') && !d.getElementById('scnStart').closest('section'));
      d.getElementById('scClose').click();
      ok('immersive: closing puts the place back and removes the banner', S.state.env === envBefore && !d.getElementById('scnBanner'));
    }());
    (function(){
      const S = w.__synapse;
      ok('Earth link: the card that says who decides opens it', !!d.getElementById('linkOpen'));
      S.linkOpen();
      const sh = d.getElementById('linkSheet'), txt = sh ? sh.textContent : '';
      ok('Earth link: seven flows, each with a recipient, a basis and a consent state', d.querySelectorAll('#lkFlows tbody tr').length === 7 && Array.from(d.querySelectorAll('#lkFlows tbody td')).every(c => c.textContent.trim().length >= 3));
      ok('Earth link: every rule is linked to where it was read', d.querySelectorAll('#lkRules a[href^="https://"]').length === S.linkRules.length && S.linkRules.length >= 6);
      ok('Earth link: it does not claim compliance or give legal advice', /not legal advice/.test(txt) && /not a statement that the prototype complies/.test(txt) && /sends nothing/.test(txt));
      ok('Earth link: research is consent to a study, not a switch', /intention only/.test(txt) && /ethics board/.test(txt));
      const st = S.state; st.consent = st.consent || {}; st.consent.kin = { on: true }; S.state = st; d.getElementById('lkClose').click(); S.linkOpen();
      ok('Earth link: the consent column follows the switches', /ON, by your switch/.test(d.getElementById('lkFlows').textContent));
      d.getElementById('lkClose').click();
      { const st2 = S.state; st2.consent = {}; S.state = st2; }
      ok('Earth link: its rules are listed under Sources', S.embeddedCites().filter(c => /Earth link/.test(c.where)).length === S.linkRules.length);
      S.setView('sources'); S.renderAll();
      ok('Sources: legal and regulatory sources have their own group, with every rule', !!d.getElementById('srcLegal') && S.embeddedCites().filter(c => c.legal).length === S.linkRules.length);
      S.setView('today');
      ok('EVO: where is the skeleton opens the body map on the bone layer', A('where is the skeleton').layer === 'skel' && A('how can I see the organs').layer === 'organ' && A('show me the nerves').layer === 'neuro');
      ok('EVO: asked for the journal, opens Record my journey', A('how do I find my journal').press === 'journeyBtn' && A('where can I record my journey').press === 'journeyBtn');
      ok('EVO: asked for the legal information, opens the Earth link', A('where is the legal information').link === true);
      ok('EVO: asked for the report, opens the record', (A('where is the flight surgeon report').place || {}).sec === 'Record');
      ok('EVO: Speak is the user speaking, and a separate button plays EVO', /Speak to EVO/.test(d.getElementById('speakMic').textContent) && /Hear EVO/.test(d.getElementById('speakBtn').textContent));
      ok('EVO: asked about consent or privacy, opens the Earth link', A('who can see my data, did I consent?').link === true);
    }());
    (function(){
      const S = w.__synapse, st = S.state, keep = JSON.stringify(st.sensors), logKeep = JSON.stringify(st.log);
      /* make the cabin air monitor the most urgent thing on the plan */
      const realPlan = S.M.actionPlan;
      S.M.actionPlan = () => [{ kind: 'hardware', id: 'cabin_monitor', label: 'Cabin air monitor \u2014 Not connected', band: 'alert', urgency: 'now', action: 'Reconnect cabin air monitor.' }];
      st.view = 'today'; S.state = st; S.setView('today'); S.renderAll();
      const band = d.getElementById('alertBand'), go = d.getElementById('bandGo');
      const isHw = !!band && /Cabin air monitor/.test(band.textContent) && !!go;
      ok('instrument alert: the band names the cabin air monitor', isHw, (band ? band.textContent.slice(0, 120) : 'no band') + ' | sensors=' + JSON.stringify(S.M.sensorStatus(S.state.sensors, Date.now(), S.state.env, false).filter(x => x.id === 'cabin_monitor')).slice(0, 300));
      if (isHw) {
        go.click();
        ok('instrument alert: Take me to it opens My gadgets', S.state.view === 'howto', S.state.view);
        ok('instrument alert: the cabin air monitor is the one selected', !!Array.from(d.querySelectorAll('#hwPick button')).find(b => /Cabin air monitor/.test(b.textContent) && b.getAttribute('aria-pressed') === 'true'));
      }
      S.M.actionPlan = realPlan;
      const st2 = S.state; st2.view = 'today'; S.state = st2; S.setView('today'); S.renderAll();
    }());
    (function(){
      const S = w.__synapse, logBefore = JSON.stringify(S.state.log);
      const run = acts => { S.scenarioOpen('sim'); acts.forEach(a => d.querySelector('#scenarioSheet [data-sim="' + a + '"]').click()); const txt = d.getElementById('scenarioSheet').textContent; return txt; };
      const idle = run(['carry', 'carry', 'carry', 'carry', 'carry', 'carry']);
      const acted = run(['report', 'service', 'carry', 'carry', 'carry', 'carry']);
      ok('simulation: doing nothing for six hours ends in alert', /End of the six hours/.test(idle) && /Hours spent in alert: [3-6]/.test(idle), idle.slice(0, 200));
      ok('simulation: reporting and servicing the unit keeps the air out of alert', /Hours spent in alert: 0/.test(acted) && /Reported to the ground: yes/.test(acted), acted.slice(0, 200));
      ok('simulation: the two runs end differently, so choices have consequences', idle !== acted);
      ok('simulation: it says what is real and what is invented', /What is real:/.test(acted) && /What is invented:/.test(acted));
      d.getElementById('scClose').click();
      ok('simulation: the record is not changed', JSON.stringify(S.state.log) === logBefore);
      ok('EVO: asked for a simulation game, starts the simulation', A('play the simulation game').scenario === 'sim');
    }());
    (function(){
      const S = w.__synapse;
      const keepCh = JSON.stringify(S.state.challenges || []);
      { const st = S.state; st.tokens = null; st.challenges = [{ id: 'sample1', discipline: 'strength', type: 'sessions', target: 1, sample: true }]; S.state = st; }
      S.setView('challenge'); S.renderAll();
      const card = () => d.querySelector('#challengeBody [data-tokens="card"]');
      const t0 = S.tokenTotals();
      ok('tokens: a met challenge pays, and the card shows the balance', !!card() && t0.earned >= 10 && +d.querySelector('[data-tokens="balance"]').textContent === t0.balance, JSON.stringify(t0));
      S.renderAll(); S.tokenSync();
      ok('tokens: the same challenge is not paid twice in a week', S.tokenTotals().earned === t0.earned);
      ok('tokens: five things to earn for EVO, each with a price', d.querySelectorAll('#challengeBody [data-buy]').length === S.tokenItems.length);
      const buy = d.querySelector('#challengeBody [data-buy="star"]');
      ok('tokens: an item within the balance can be bought', !!buy && !buy.disabled);
      buy.click();
      const t1 = S.tokenTotals();
      ok('tokens: buying spends the price and EVO wears the item', t1.balance === t0.balance - 10 && S.evoLook().items.indexOf('star') !== -1 && /F0B429/.test(d.getElementById('evoFace').innerHTML));
      ok('tokens: an item beyond the balance cannot be bought', (function(){ const b = d.querySelector('#challengeBody [data-buy="crown"]'); return !!b && b.disabled; })());
      d.querySelector('#challengeBody [data-wear="star"]').click();
      ok('tokens: an owned item can be taken off without losing it', S.evoLook().items.indexOf('star') === -1 && S.tokenTotals().balance === t1.balance);
      ok('tokens: the card says they cannot be bought and that nothing needed costs any', /cannot be bought, sold or exchanged/.test(card().textContent) && /exceeding it pays nothing more/.test(card().textContent));
      ok('tokens: Personalise carries the sign and the balance', /Earn space tokens by doing challenges/.test(d.getElementById('tokenSign').textContent) && +d.getElementById('tokenSignBal').textContent === S.tokenTotals().balance);
      d.getElementById('tokenSignGo').click();
      ok('tokens: the sign leads to the challenges', S.state.view === 'challenge');
      { const st = S.state; st.tokens = null; st.challenges = JSON.parse(keepCh); st.view = 'today'; S.state = st; S.setView('today'); S.renderAll(); }
    }());
    ok('games: Create links to the station drill and the reaction training', !!d.querySelector('#scnList a[data-play="station"][href="play/station.html"]') && !!d.querySelector('#scnList a[data-play="reaction"][href="play/reaction.html"]'));
    ok('games: both pages exist in the repository and say they are fictitious', ['station', 'reaction'].every(n => { const f = require('path').join(__dirname, '..', '..', 'play', n + '.html'); return require('fs').existsSync(f) && /FICTITIOUS TRAINING/.test(require('fs').readFileSync(f, 'utf8')) && /What is real and what is invented/.test(require('fs').readFileSync(f, 'utf8')); }));
    ok('EVO: asked for the game or the reaction training, opens the right page', A('open the station drill').open === 'play/station.html' && A('reaction training').open === 'play/reaction.html' && A('play the simulation game').scenario === 'sim');
    ok('games: their four sources are listed under Sources', w.__synapse.embeddedCites().filter(c => /Station drill|Reaction training/.test(c.where)).length === 4);
    (function(){
      const S = d.defaultView.__synapse, keep = JSON.stringify(S.state.challenges || []);
      const days = Object.keys(S.state.log).sort().slice(-42), st = S.state;
      days.forEach((k, i) => { const fromEnd = days.length - 1 - i, week = Math.floor(fromEnd / 7); st.log[k]._sessions = (week !== 3 && fromEnd % 2 === 0) ? [{ d: 'strength', m: 40 }] : []; });
      st.challenges = [{ id: 't1', discipline: 'strength', type: 'sessions', target: 3 }]; S.state = st;
      S.setView('challenge'); S.renderAll();
      const card = d.querySelector('#challengeBody [data-track="card"]');
      ok('progress: the challenges tab shows a streak and a six-week grid', !!card && d.querySelectorAll('[data-track="grid"] tbody tr').length === 1 && d.querySelectorAll('[data-track="grid"] tbody td').length === 7);
      ok('progress: the streak counts weeks in a row and stops at the missed week', +d.querySelector('[data-track="streak"]').textContent === 3, d.querySelector('[data-track="streak"]').textContent);
      ok('progress: a missed week is shown without a tick', (function(){ const tds = d.querySelectorAll('[data-track="grid"] tbody td'); return !/\u2713/.test(tds[2].textContent) && /\u2713/.test(tds[3].textContent); })());
      ok('progress: it says a missed week costs nothing', /no tokens are taken back/.test(card.textContent));
      { const s2 = S.state; s2.challenges = JSON.parse(keep); s2.tokens = null; s2.view = 'today'; S.state = s2; S.setView('today'); S.renderAll(); }
    }());
    ok('EVO: asked for the storm scenario, opens that one', A('play the solar storm scenario').scenario === 'storm');
    ok('EVO: asked to show a movement, opens the demonstration', A('Show me a movement').move === 'squat' && A('show me the blood pressure cuff video').move === 'cuff');
    (function(){
      ['squat', 'cuff'].forEach(function(k){
        w.__synapse.moveOpen(k);
        const sheet = d.getElementById('moveSheet');
        ok('demonstration [' + k + ']: it draws a figure and can be played and paused', !!sheet && sheet.querySelectorAll('#mvStage path').length > 8 && !!d.getElementById('mvPlay') && !!d.getElementById('mvSeek'));
        ok('demonstration [' + k + ']: it says it is fictitious and not footage', /FICTITIOUS DEMONSTRATION/.test(sheet.textContent) && /not a recording of a person/.test(sheet.textContent) && /AI-assisted drawing/.test(sheet.textContent));
        const seek = d.getElementById('mvSeek'), before = d.getElementById('mvStage').innerHTML;
        seek.value = 4; seek.dispatchEvent(new w.Event('input', { bubbles: true }));
        ok('demonstration [' + k + ']: moving the slider moves the figure and the cue', d.getElementById('mvStage').innerHTML !== before && /^[2-4]\. /.test(d.getElementById('mvCue').textContent));
        d.getElementById('mvClose').click();
        ok('demonstration [' + k + ']: it closes', !d.getElementById('moveSheet'));
      });
    }());
    ok('EVO: asked whether something exists, says yes and opens it', (function(){ const r = A('is there any data on my heart rate'); return /^Yes\. Resting heart rate is/.test(r.text) && r.place && r.place.sec === 'Trends'; })());
    ok('EVO: asked for something it does not hold, says so and lists what it does', (function(){ const r = A('do you have my cholesterol'); return /I do not hold that/.test(r.text) && /Resting heart rate/.test(r.text) && !r.place; })());
    ok('EVO: a where question about an instrument opens My gadgets', (function(){ const r = A('where can I see how the dosimeter works'); return r.place && r.place.view === 'howto'; })());
    ok('EVO: a reading names the body-map layer it belongs to', A('what is my blood pressure').layer === 'circ' && A('how did I sleep').layer === 'neuro' && A('my exercise').layer === 'skel');
    ok('EVO: answering about a reading turns the body map to that layer', (function(){ w.__synapse.evoReply('what is my blood pressure'); const on = d.querySelector('.layers button[aria-pressed="true"]'); return w.__synapse.state.layer === 'circ' && on && on.getAttribute('data-layer') === 'circ' && /circulatory layer/.test(d.getElementById('evoTalk').textContent); })());
    ok('EVO: asked to see it on the body, opens Today', (function(){ w.__synapse.setView('sources'); w.__synapse.evoReply('show me my glucose on the body map'); return w.__synapse.state.view === 'today' && w.__synapse.state.layer === 'organ'; })());
    ok('scenario: asking EVO for a scenario offers one', A('play a scenario').scenario === true);
    ok('scenario: four steps, the first on real NASA values, bands from the model', (function(){ const st = w.__synapse.scenarioSteps(); return st.length === 4 && /2014-09-20: 2761 ppm/.test(st[0].scene) && st[0].band === 'ok' && st[1].band === 'watch' && st[2].band === 'alert' && st[3].env === 'mars'; })());
    ok('scenario: every step has one best answer', w.__synapse.scenarioSteps().every(st => st.options.filter(o => o.pts === 2).length === 1));
    ok('scenario: playing it leaves the record alone', (function(){ const before = JSON.stringify(w.__synapse.state.log); w.__synapse.scenarioOpen(); const b0 = d.querySelector('#scenarioSheet [data-sc="0"]'); b0.click(); d.getElementById('scNext').click(); const labelled = /FICTITIOUS SCENARIO/.test(d.getElementById('scenarioSheet').textContent); d.getElementById('scClose').click(); return labelled && d.getElementById('scenarioSheet').hidden && JSON.stringify(w.__synapse.state.log) === before; })());
    ok('EVO: naming a place sets up an environment change and says what differs', (function(){ const r = A('we are on Mars now'); return r.env === 'mars' && /Environment changed from .* to Mars surface base/.test(r.text) && /3\/8 g/.test(r.text) && /escalate/.test(r.text); })());
    ok('EVO: asking about the environment offers the choices', A('change environment').envMenu === true);
    ok('EVO: switching environment through EVO moves the whole tool', (function(){ w.__synapse.evoReply('switch to lunar surface base'); const moved = w.__synapse.state.env === 'lunar' && /Lunar surface base/.test(d.getElementById('envShow').textContent); w.__synapse.evoReply('switch to the space station'); return moved && w.__synapse.state.env === 'iss'; })());
  }
  ok('coverage: the five areas this build draws on are listed',
     cov && cov.querySelectorAll(':scope > div[style*="border-bottom"]').length === 5, cov ? cov.children.length + ' rows' : 'no host');
  ok('coverage: an area with no measurement is not listed',
     cov && !/NOT COVERED/.test(cov.textContent) && !/microbio/i.test(cov.textContent));
  ok('coverage: each area cites its sources plainly, with no coverage tag',
     Array.from(cov.querySelectorAll(':scope > div[style*="border-bottom"]')).every(r => r.querySelectorAll('a').length >= 1 && /Source:/.test(r.textContent))
     && !/(PARTLY|BARELY|NOT) COVERED/.test(cov.textContent));
  api.setView('today');

  /* ---- 8. a failing panel reports itself ---------------------------- */
  // A throw must not blank every card after it with nothing on screen.
  const realDue = api.renderers.renderDue;
  api.renderers.renderDue = function () { throw new Error('deliberate test failure'); };
  api.renderAll();
  const due = d.getElementById('due');
  ok('errors: a failed panel shows a message rather than going blank',
     due && /not working/i.test(due.textContent), due ? due.textContent.slice(0, 60) : 'no host');
  const others = d.getElementById('tags');
  ok('errors: a failure in one panel does not blank the ones after it',
     others && others.children.length > 0);
  api.renderers.renderDue = realDue;
  api.renderAll();

  /* ---- 9. the crew screen never asks for a device-measured value ---- */
  // In flight the instrument reports these; typing them invents a workflow.
  const deviceIds = api.M.indicators.filter(i => i.capture === 'device').map(i => i.id);
  const inputsOnMain = deviceIds.filter(id => d.getElementById('in-' + id));
  ok('capture: no device-measured indicator has an entry field on Today',
     inputsOnMain.length === 0, inputsOnMain.join(', '));

  const selfIds = api.M.indicators.filter(i => i.capture === 'self').map(i => i.id);
  ok('capture: at least one self-reported check is offered on Today',
     selfIds.some(id => d.getElementById('in-' + id)));

  /* ---- 10. overall status never flatters an empty record ------------ */
  const savedLog = api.state.log;
  api.state.log = {};
  eq('status: an empty record reports NO DATA, not STABLE',
     api.overallStatus().label, 'NO DATA');
  api.state.log = savedLog;
  ok('status: with the demo record it does not claim plain STABLE',
     api.overallStatus().label !== 'STABLE', api.overallStatus().label);

  /* ---- 11. every status the menu lists is one the code can return --- */
  const canReturn = new Set(['NO DATA', 'ACTION NEEDED', 'WATCHING', 'INSTRUMENT FAULT',
                             'STABLE, INCOMPLETE', 'STABLE']);
  const listed = api.STATUS_STATES.map(x => x.k);
  ok('status: the menu lists exactly the states the code can produce',
     listed.length === canReturn.size && listed.every(k => canReturn.has(k)),
     listed.join(' | '));

  /* ---- 12. every manual step maps to a part that exists ------------- */
  let badSteps = [];
  api.MANUAL.forEach(dev => {
    const art = api.DEVICE_ART[dev.id];
    ok('manual: ' + dev.id + ' has artwork', !!art);
    if (!art) return;
    dev.use.forEach((u, i) => {
      if (u.p === null || u.p === undefined) return;
      if (!art[u.p]) badSteps.push(dev.id + ' step ' + (i + 1) + ' -> part ' + u.p);
    });
  });
  ok('manual: every numbered step points at a real part',
     badSteps.length === 0, badSteps.join(', '));

  /* ---- 13. Make an image routes a story to the scene ---------------- */
  const promptBox = d.getElementById('createPrompt');
  api.setView('create');
  promptBox.value = 'an astronaut meeting a very tall alien on a pink planet full of small squishy aliens and plants';
  api.makeImage();
  ok('create: a described scene produces the invented-scene badge',
     /INVENTED/.test(d.getElementById('createOut').textContent));
  promptBox.value = 'the EVA week';
  api.makeImage();
  ok('create: a record-shaped prompt produces the mission portrait',
     /YOUR MISSION, DRAWN/.test(d.getElementById('createOut').textContent));

  /* ---- 14. invented output is always labelled ----------------------- */
  promptBox.value = 'a dream about a robot friend';
  api.makeImage();
  const out = d.getElementById('createOut').textContent;
  ok('create: invented output is never presented as the record',
     /NOT FROM YOUR RECORD/.test(out));

  /* ---- 15. private sources are off by default ----------------------- */
  eq('privacy: measurements are on by default', d.getElementById('srcMetrics').checked, true);
  eq('privacy: written entries are off by default', d.getElementById('srcJournal').checked, false);
  eq('privacy: how you felt is off by default', d.getElementById('srcTags').checked, false);
  api.setView('today');

  /* ---- 16. the body figure follows the recorded body ---------------- */
  api.state.prefs.body = { heightCm: 150, massKg: 50 };
  const short = api.bodyDims();
  api.state.prefs.body = { heightCm: 195, massKg: 95 };
  const tall = api.bodyDims();
  ok('figure: a taller crewmember scales taller', tall.sy > short.sy,
     short.sy + ' vs ' + tall.sy);
  ok('figure: scaling is clamped so anatomy is not distorted',
     tall.sy <= 1.045 && short.sy >= 0.8 && tall.sx <= 1.26 && short.sx >= 0.78);
  ok('figure: the tallest crewmember still fits inside the drawing', 412 - (412 - 26) * tall.sy >= 6, String(412 - (412 - 26) * tall.sy));
  (function(){
    const log = api.state.log, days = Object.keys(log).filter(k => log[k]._journal);
    ok('sample data: the synthetic record carries invented journal entries with feelings', days.length >= 5 && days.every(k => (log[k]._tags || []).length >= 1), 'entries=' + days.length);
    ok('sample data: two invented challenges show how a challenge looks', (api.state.challenges || []).filter(c => c.sample).length === 2);
  }());

  /* ---- 16b. the silhouette follows the recorded sex ----------------- */
  function torsoPath() {
    const el = d.querySelector('#fig path[d^="M1"]');
    return Array.from(d.querySelectorAll('#fig path'))
      .map(n => n.getAttribute('d')).join(' ');
  }
  api.state.prefs.crew = 'f';
  api.renderAll();
  const female = torsoPath();
  api.state.prefs.crew = 'm';
  api.renderAll();
  const male = torsoPath();
  ok('figure: the two crewmembers are not drawn with the same silhouette',
     female !== male);
  ok('figure: both silhouettes actually draw something', female.length > 50 && male.length > 50);

  // The clickable regions must move with the drawing, or the hit areas lie.
  api.state.prefs.crew = 'f';
  api.renderAll();
  const fRegions = Array.from(d.querySelectorAll('#fig .region')).map(n => n.getAttribute('d') || '').join(' ');
  api.state.prefs.crew = 'm';
  api.renderAll();
  const mRegions = Array.from(d.querySelectorAll('#fig .region')).map(n => n.getAttribute('d') || '').join(' ');
  ok('figure: the clickable regions move with the silhouette', fRegions !== mRegions);
  ok('figure: every system region is still present',
     d.querySelectorAll('#fig .region').length >= 5,
     d.querySelectorAll('#fig .region').length + ' regions');
  api.state.prefs.crew = 'f';
  api.renderAll();

  /* ---- 16c. the EVO dock cannot hide an urgent finding -------------- */
  const launcher = d.getElementById('evoLauncher');
  const panel = d.getElementById('evoPanel');
  ok('dock: EVO is a launcher, not a card in the column', !!launcher && !!panel);
  ok('dock: the EVO card lives inside the panel',
     !!(panel && panel.querySelector('#cardEvo')));
  ok('dock: the launcher says what is waiting',
     !!d.getElementById('evoDockSub') && d.getElementById('evoDockSub').textContent.length > 3,
     d.getElementById('evoDockSub') && d.getElementById('evoDockSub').textContent);

  // With a NOW item the panel must be open without the crewmember acting.
  const keepLog = api.state.log;
  const td = Object.keys(keepLog).sort().pop();
  const keepDay = Object.assign({}, keepLog[td]);
  keepLog[td].glucose = 55;            // hypoglycaemia -> urgency "now"
  w.__evoDockSync();
  ok('dock: a NOW finding opens the panel by itself', panel.hidden === false);
  keepLog[td] = keepDay;
  w.__evoDockSync();

  /* ---- 16d. an out-of-band finding clings to the body and opens ----- */
  api.setView('today');
  const clings = d.querySelectorAll('#fig .cling');
  ok('body map: a finding out of band puts a marker on the figure',
     clings.length > 0, clings.length + ' markers');

  // Alert and watch must differ in shape, not only in colour.
  const shapes = Array.from(clings).map(g => g.querySelector('path') ? 'triangle' : 'disc');
  ok('body map: the marker shape carries the band, not colour alone',
     shapes.length > 0 && shapes.every(x => x === 'triangle' || x === 'disc'));

  Array.from(clings).forEach(g => {
    ok('body map: marker for ' + g.getAttribute('data-sys') + ' is focusable',
       g.getAttribute('tabindex') === '0' && !!g.getAttribute('aria-label'));
  });

  if (clings.length) {
    const sys = clings[0].getAttribute('data-sys');
    w.__synapse && api.setView('today');
    d.getElementById('fig').querySelector('.cling').dispatchEvent(
      new w.MouseEvent('click', { bubbles: true }));
    const sheet = d.getElementById('alertSheet');
    ok('alert sheet: tapping the marker opens it', !!sheet && sheet.innerHTML.length > 100);
    const rows = sheet ? sheet.querySelectorAll('details.asheet') : [];
    eq('alert sheet: four numbered options', rows.length, 4);
    const text = sheet ? sheet.textContent : '';
    ok('alert sheet: it names the system it is about', text.indexOf(sys) !== -1 || text.length > 200);
    ok('alert sheet: it does not promise a video player it has no video for',
       /no video|written out/i.test(text));
    ok('alert sheet: it says where the threshold came from',
       /threshold comes from|trend only/i.test(text));
    const cl = d.getElementById('asClose');
    if (cl) cl.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('alert sheet: closing empties it', d.getElementById('alertSheet').innerHTML === '');
  }

  /* ---- 17. nothing is scored that has no verified threshold --------- */
  // The provenance rule, checked where the user actually meets it.
  const noOrigin = api.M.indicators.filter(i => i.origin === 'none');
  ok('provenance: trend-only indicators exist and are declared', noOrigin.length > 0);
  noOrigin.forEach(i => {
    if (i.kind === 'categorical') return;
    const r = api.M.evaluate(i.id, (i.min + i.max) / 2);
    ok('provenance: ' + i.id + ' is not given a band',
       r.band === 'info' || r.band === 'unknown', r.band);
  });

  /* ---- 18. accessible names on the controls that carry meaning ------ */
  const unlabelled = Array.from(d.querySelectorAll('input, select, textarea')).filter(el => {
    if (el.type === 'checkbox' && el.closest('label')) return false;
    const id = el.getAttribute('id');
    if (id && d.querySelector('label[for="' + id + '"]')) return false;
    return !el.getAttribute('aria-label') && !el.closest('label');
  });
  ok('a11y: every field has a label or an accessible name',
     unlabelled.length === 0,
     unlabelled.map(e => e.id || e.type).join(', '));

  /* ---- 19. touch targets are not below 40px ------------------------- */
  const tiny = Array.from(d.querySelectorAll('button')).filter(b => {
    const m = /min-height:\s*(\d+)px/.exec(b.getAttribute('style') || '');
    return m && Number(m[1]) < 34;
  });
  ok('a11y: no button declares a target under 34px',
     tiny.length === 0, tiny.map(b => b.textContent.trim().slice(0, 20)).join(', '));

  /* ---- 20. the record survives a save and reload -------------------- */
  const before = JSON.stringify(api.state.log);
  api.save();
  const stored = w.localStorage.getItem(Object.keys(w.localStorage).find(k => /synapse/i.test(k)) || '');
  ok('persistence: state is written to storage', !!stored || !!w.localStorage.length);
  eq('persistence: the log is unchanged by saving', JSON.stringify(api.state.log), before);

  /* ---- 18. Today fits one screen, body map in the middle ------------
   * The crew screen is laid out to the height of the display. Three things
   * have to hold, and none of them is visible from reading the source,
   * because placeCards() rearranges the DOM at boot:
   *   - the body map is in the MIDDLE column, not a side one;
   *   - the PAGE is pinned but the side columns scroll, so nothing that
   *     does not fit becomes unreachable — a buried alert is worse than
   *     a scrollbar;
   *   - fit mode gives up on a screen too small to carry it.
   */
  (function todayFitsOneScreen() {
    api.setView('today');
    const vt = d.getElementById('viewToday');
    ok('today: the view exists', !!vt);
    if (!vt) return;

    const cols = Array.from(vt.children);
    eq('today: two columns', cols.length, 2);
    ok('today: every child is a column',
       cols.every(c => c.classList.contains('tcol')),
       cols.map(c => c.className || c.id).join(' | '));

    const mid = vt.querySelector('.tcol-mid');
    ok('today: the body map is in the middle column',
       !!(mid && mid.querySelector('#cardBody')),
       mid ? 'mid holds: ' + Array.from(mid.children).map(c => c.id).join(',') : 'no middle column');
    /* The figure comes FIRST in reading order: it is the thing the screen
       is for. Actions follow it. */
    eq('today: the figure column is first', cols.indexOf(mid), 0);

    /* The figure is the point of the middle column; if it ends up in a
       side column the layout has silently inverted. */
    const fig = d.getElementById('fig');
    ok('today: the figure is inside the middle column', !!(mid && fig && mid.contains(fig)));

    const sides = cols.filter(c => c.classList.contains('tcol-side'));
    eq('today: one action column beside the figure', sides.length, 1);
    ok('today: the figure column is not the action column',
       !!(mid && !mid.classList.contains('tcol-side')));

    /* Everything a crewmember logs has to be ON the screen, not one tab
       away: what is left to do, and how they say they are. */
    ['cardChecks', 'cardFeel', 'inds'].forEach(id => {
      const n = d.getElementById(id);
      ok('today: #' + id + ' is on the crew screen', !!(n && vt.contains(n)));
    });

    /* Moved off the crew screen, not deleted: the chronometer is an
       exercise tool and belongs with the exercise countermeasure. */
    const chrono = d.getElementById('cardTime');
    ok('today: the chronometer still exists somewhere', !!chrono);
    ok('today: the chronometer is not on Today', !!(chrono && !vt.contains(chrono)));

    /* Today's checks must stay on Today: that is the one thing the screen
       is for. */
    ok('today: today\u2019s checks are still on Today',
       !!(d.getElementById('cardChecks') && vt.contains(d.getElementById('cardChecks'))));
  }());

  (function fitModeEngagesAndGivesUp() {
    api.setView('today');
    api.fitToday();
    const vt = d.getElementById('viewToday');
    ok('fit: engages on Today at a usable size', vt.classList.contains('fit'));
    ok('fit: the page itself stops scrolling', d.body.classList.contains('fit'));
    ok('fit: a height was actually set', /px$/.test(vt.style.height), vt.style.height);

    /* A short screen must fall back to ordinary scrolling rather than
       clipping the crew screen to nothing. */
    const realH = w.innerHeight;
    Object.defineProperty(w, 'innerHeight', { value: 420, configurable: true });
    api.fitToday();
    ok('fit: gives up on a short screen', !vt.classList.contains('fit'));
    ok('fit: the page scrolls again when it gives up', !d.body.classList.contains('fit'));
    Object.defineProperty(w, 'innerHeight', { value: realH, configurable: true });

    /* Fit now applies to whichever tab is open, not only Today. What must
       not happen is Today keeping a pinned height while another tab is on
       screen — that would leave a stale height behind the new panel. */
    api.setView('health');
    ok('fit: Today releases its height when another tab opens',
       d.getElementById('viewToday').style.height === '',
       d.getElementById('viewToday').style.height);
    ok('fit: at most one panel is pinned at a time',
       ['viewToday','viewHealth','viewChallenge','viewCreate','viewSources','viewHowto']
         .filter(id => d.getElementById(id) && d.getElementById(id).classList.contains('fit'))
         .length <= 1);
    api.setView('today');
  }());

  (function headerDoesNotRepeatTheCrewRecord() {
    /* Name, ID, height and mass live on the body map now. If the header
       still carried them the two could drift apart again, which is exactly
       how the 1.74 m / 1.68 m contradiction happened. */
    ok('header: no duplicate crew name', !d.getElementById('hdrName'));
    ok('header: no duplicate height and mass', !d.getElementById('hdrBody'));
    /* It lives in the band above the tabs. Two things must hold: it
       carries the figures the rest of the screen is computed from, and it
       is OUTSIDE viewToday, or switching crewmember and opening My health
       would leave the previous person's readings on screen with nothing
       saying whose they are. */
    const band = d.getElementById('crewBand');
    ok('crew band: exists and carries the record',
       !!(band && /\d/.test(band.textContent)), band ? band.textContent.trim().slice(0, 70) : 'missing');
    const vtp = d.getElementById('viewToday');
    ok('crew band: sits outside Today, so every tab shows it',
       !!(band && vtp && !vtp.contains(band)));
    /* The band must FOLLOW the crewmember. Checked for both, because a
       hardcoded 174 cm / 78.4 kg fallback would print one person's body
       beside the other person's name whenever no body had been recorded
       yet. */
    ['f', 'm'].forEach(k => {
      const st2 = api.state;
      st2.prefs.crew = k;
      st2.prefs.body = null;
      api.state = st2;
      api.renderAll();
      const t = d.getElementById('crewBand').textContent.replace(/\s+/g, ' ');
      const c = api.crew();
      ok('crew band [' + k + ']: names this crewmember', t.indexOf(c.name) !== -1, t.slice(0, 80));
      ok('crew band [' + k + ']: shows their mass', t.indexOf(c.mass.toFixed(1)) !== -1, t.slice(0, 110));
      ok('crew band [' + k + ']: shows their height',
         t.indexOf((c.height / 100).toFixed(2)) !== -1, t.slice(0, 110));
    });
    ok('crew band: the crewmember switcher moved with it',
       !!(band && band.querySelector('#crewPick')));

    /* The figure itself is drawn to the person: outline by recorded sex,
       a height ruler, and personal notes placed where they apply. */
    const shape = {};
    ['f', 'm'].forEach(k => {
      const st3 = api.state;
      st3.prefs.crew = k; st3.prefs.body = null; st3.layer = 'surface';
      api.state = st3;
      api.renderAll();
      const fig = d.getElementById('fig'), c = api.crew();
      shape[k] = { ell: fig.querySelectorAll('.bodyline ellipse').length, marks: fig.querySelectorAll('.pmark').length,
                   ruler: (fig.querySelector('#figRuler') || { textContent: '' }).textContent };
      ok('figure [' + k + ']: the ruler carries this crewmember\'s height', shape[k].ruler.indexOf(c.height + ' cm') !== -1, shape[k].ruler.slice(0, 60));
      eq('figure [' + k + ']: one mark per personal note in the profile', shape[k].marks, (c.marks || []).length);
      ok('figure [' + k + ']: every personal mark says what it is', Array.from(fig.querySelectorAll('.pmark title')).every(n => /^Personal note: .{10,}/.test(n.textContent)));
    });
    ok('figure: the female and male outlines are built from different volumes', shape.f.ell !== shape.m.ell, JSON.stringify(shape));
    ok('figure: the two crewmembers stand at different heights on the ruler', shape.f.ruler !== shape.m.ruler);

    /* And the body map card is now just the figure. */
    ok('body map: the dossier is not inside the figure card', !d.getElementById('figWho'));
  }());

  (function noDuplicateIds() {
    /* getElementById returns the first match, so a repeated id means one
       of the two elements can never be written to and sits there empty
       forever. This is cheap to check and impossible to see by reading. */
    const seen = new Map();
    const dupes = [];
    d.querySelectorAll('[id]').forEach(el => {
      const id = el.id;
      if (seen.has(id)) dupes.push(id); else seen.set(id, el);
    });
    ok('dom: no element id is used twice', dupes.length === 0, dupes.join(', '));
  }());

  (function recordMatchesTheCrewmember() {
    /* The illustrative record must follow the crewmember. One hardcoded
       person would leave the readings identical when the crewmember
       changes, including a preflight mass that contradicts the profile
       printed next to it. Both halves have to agree, and they have to
       change together. */
    ok('record: the seeder is reachable from the test surface',
       typeof api.buildSyntheticLog === 'function' && typeof api.crew === 'function');
    const st = api.state;
    st.seeded = true;
    const CREWS = ['f', 'm'];
    const seen = {};
    CREWS.forEach(k => {
      st.prefs.crew = k;
      st.prefs.body = null;
      api.state = st;
      const log = api.buildSyntheticLog();
      const days = Object.keys(log).sort();
      const withMass = days.filter(dd => typeof log[dd].mass === 'number');
      seen[k] = {
        mass: withMass.length ? log[withMass[0]].mass : null,
        hr: log[days[days.length - 1]].hr
      };
    });

    if (seen.f && seen.m) {
      ok('record: the two crewmembers do not share one body mass',
         seen.f.mass !== seen.m.mass, JSON.stringify(seen));
      ok('record: resting heart rate differs by crewmember',
         seen.f.hr !== seen.m.hr, JSON.stringify(seen));
      /* Both starting points must stay inside the ordinary adult band;
         an illustration that opens outside 60-100 bpm would be alarming
         rather than realistic. */
      [seen.f.hr, seen.m.hr].forEach(h => {
        ok('record: resting heart rate starts inside 60-100 bpm', h >= 60 && h <= 100, String(h));
      });
    }

    /* And the mass in the record must be the mass in the profile, not a
       number from somewhere else. */
    st.prefs.crew = 'f'; st.prefs.body = null; api.state = st;
    {
      const log = api.buildSyntheticLog();
      const dd = Object.keys(log).sort().filter(x => typeof log[x].mass === 'number')[0];
      const profileMass = api.crew().mass;
      ok('record: preflight mass agrees with the crew profile',
         dd && Math.abs(log[dd].mass - profileMass) <= 1.6,
         dd ? log[dd].mass + ' vs profile ' + profileMass : 'no mass logged');
    }
  }());

  (function everyViewIsInsideThePageWrapper() {
    /* A surplus </div> closed .wrap early, which left My health, Create,
       My gadgets and Sources as direct children of <body>: no max-width,
       no side padding, so each ran to the window edge and clipped its own
       left margin. Nothing in the rendering code was wrong and nothing
       threw; the markup had simply lost a nesting level. */
    const wrap = d.querySelector('.wrap');
    ok('layout: the page wrapper exists', !!wrap);
    if (!wrap) return;
    ['viewToday', 'viewHealth', 'viewCreate', 'viewHowto', 'viewSources', 'viewNow']
      .forEach(id => {
        const n = d.getElementById(id);
        ok('layout: #' + id + ' is inside the page wrapper', !!(n && wrap.contains(n)));
      });
    /* And nothing of substance should sit outside it. */
    const strays = Array.from(d.body.children)
      .filter(n => !wrap.contains(n) && n !== wrap)
      .filter(n => !['SCRIPT', 'DIALOG', 'TEMPLATE'].includes(n.tagName))
      /* The skip link belongs outside: it has to be the first focusable
         thing on the page, before the wrapper's chrome. */
      .filter(n => !n.classList.contains('skip'))
      .filter(n => n.id !== 'evoDock' && n.id !== 'journeyWrap' && n.id !== 'alertSheet' && n.id !== 'scenarioSheet')
      .map(n => n.tagName + (n.id ? '#' + n.id : ''));
    ok('layout: nothing unexpected sits outside the wrapper',
       strays.length === 0, strays.join(', '));
  }());

  (function challengeTab() {
    api.setView('challenge');
    const panel = d.getElementById('viewChallenge');
    ok('challenge: the panel opens', !!(panel && !panel.hasAttribute('hidden')));
    const body = d.getElementById('challengeBody');
    ok('challenge: it renders something', !!(body && body.textContent.trim().length > 40));

    /* The clock belongs with the thing it times, and nowhere else. */
    const chrono = d.getElementById('cardTime');
    ok('challenge: the chronometer is in this tab', !!(chrono && panel.contains(chrono)));
    ok('challenge: and not on Today',
       !!(chrono && !d.getElementById('viewToday').contains(chrono)));

    /* The gate is the feature. Give today a short night and the targets
       must disappear from the SCREEN, not merely from the model. */
    const st = api.state;
    const todayKey = Object.keys(st.log).sort().pop();
    st.log[todayKey].sleep = 4.2;
    api.state = st;
    api.renderChallenge();
    const t2 = d.getElementById('challengeBody').textContent;
    ok('challenge: a short night withdraws the targets on screen',
       /recovery day/i.test(t2), t2.replace(/\s+/g, ' ').slice(0, 110));
    ok('challenge: and says resting does not break the streak',
       /does not break your streak/i.test(t2));

    /* Nothing on this screen may ask for a harder session. */
    ['harder', 'faster', 'beat your', 'personal record'].forEach(w => {
      ok('challenge: screen never asks for intensity (' + w + ')',
         d.getElementById('challengeBody').textContent.toLowerCase().indexOf(w) === -1);
    });
    api.setView('today');
  }());

  (function sectionsLoseNothing() {
    /* The requirement was "fit one screen WITHOUT cutting boxes or
       information". Sectioning satisfies that only if every card survives
       the move. These checks are the proof: each panel ends up with
       nothing but the section bar and the sections, every named card is
       inside exactly one of them, and the content is still reachable. */
    /* Create is deliberately NOT sectioned: asking and seeing the answer
       belong on one screen, so it is split into two panes instead. */
    ['health', 'challenge', 'sources'].forEach(view => {
      api.setView(view);
      const panel = d.getElementById('view' + view.charAt(0).toUpperCase() + view.slice(1));
      ok('sections[' + view + ']: panel exists', !!panel);
      if (!panel) return;

      const bar = panel.querySelector(':scope > .secbar');
      const secs = Array.from(panel.querySelectorAll(':scope > .sec'));
      ok('sections[' + view + ']: a section bar was built', !!bar);
      ok('sections[' + view + ']: more than one section', secs.length > 1, String(secs.length));

      /* Nothing may be left loose beside the sections: a stray card would
         be a card the switcher cannot reach. */
      const stray = Array.from(panel.children)
        .filter(n => !n.classList.contains('sec') && !n.classList.contains('secbar'))
        .map(n => n.id || n.tagName);
      ok('sections[' + view + ']: no card left outside a section',
         stray.length === 0, stray.join(', '));

      /* Exactly one visible at a time, and it has something in it. */
      const open = secs.filter(x => !x.hasAttribute('hidden'));
      eq('sections[' + view + ']: exactly one section open', open.length, 1);
      ok('sections[' + view + ']: the open section is not empty',
         open[0] && open[0].textContent.trim().length > 0);

      /* No button without a section, no section without a button. */
      const btns = Array.from(bar ? bar.children : []);
      eq('sections[' + view + ']: one button per section', btns.length, secs.length);
      btns.forEach(b => {
        const id = b.getAttribute('data-go');
        ok('sections[' + view + ']: button "' + b.textContent + '" opens a real section',
           secs.some(x => x.getAttribute('data-sec') === id));
      });

      /* Every section must be reachable and non-empty when opened:
         an empty one is a dead control. */
      secs.forEach(x => {
        const id = x.getAttribute('data-sec');
        panel.__show(id);
        const now = panel.querySelector(':scope > .sec:not([hidden])');
        ok('sections[' + view + ']: "' + id + '" opens', !!(now && now.getAttribute('data-sec') === id));
        ok('sections[' + view + ']: "' + id + '" holds at least one card', x.children.length > 0);
      });
      panel.__show(secs[0].getAttribute('data-sec'));
    });

    /* Every card named in the section map must actually exist, or the map
       has drifted from the markup. */
    Object.keys(api.SECTIONS).forEach(view => {
      api.SECTIONS[view].forEach(g => {
        g.cards.forEach(id => {
          const n = d.getElementById(id);
          if (!n) return;   // absent cards are dropped on purpose
          const sec = n.closest('.sec');
          ok('sections: #' + id + ' sits in a section', !!sec, id);
        });
      });
    });
    api.setView('today');
  }());

  (function customChallenges() {
    api.setView('challenge');
    const st = api.state;
    st.challenges = [{ id:'t1', discipline:'cardio', type:'sessions', target:4 }];
    api.state = st;
    api.renderChallenge();
    const list = d.getElementById('myChalList');
    ok('custom: the challenge is listed', /cardio/i.test(list.textContent), list.textContent.slice(0, 80));
    ok('custom: a six-week comparison is drawn', list.querySelectorAll('div[style*="height:"]').length > 3);

    /* Encouragement is reactive, but it must never propose a bigger
       target — that is the line between a wellness feature and clinical
       decision support. */
    const txt = list.textContent.toLowerCase();
    ['try increasing', 'push harder', 'go longer', 'raise your target', 'aim higher']
      .forEach(w => ok('custom: never proposes a bigger target (' + w + ')', txt.indexOf(w) === -1));

    /* And on a withheld day it says the opposite of "almost there". */
    const k = Object.keys(st.log).sort().pop();
    st.log[k].sleep = 4.1;
    api.state = st;
    api.renderChallenge();
    const t2 = d.getElementById('myChalList').textContent;
    ok('custom: paused rather than pushed on a recovery day',
       /paused today/i.test(t2), t2.slice(0, 120));
    ok('custom: does not say almost there on a recovery day',
       !/almost there/i.test(t2));
    api.setView('today');
  }());

  (function emergencyIsVisible() {
    /* A chip in the corner would leave the page unchanged when the state
       went critical. These checks are the contract for the band. */
    const band = d.getElementById('alertBand');
    ok('emergency: the band exists', !!band);
    if (!band) return;

    /* Calm: no band, no demotion. An always-present band is wallpaper. */
    const st0 = api.state;
    const key = Object.keys(st0.log).sort().pop();
    const keep = JSON.parse(JSON.stringify(st0.log[key]));
    ['co2', 'hr', 'sleep', 'bp_sys', 'bp_dia', 'temp'].forEach(k2 => delete st0.log[key][k2]);
    st0.log[key].hr = 68; st0.log[key].sleep = 7.4; st0.log[key].co2 = 2.0;
    api.state = st0;
    api.renderAll();
    ok('emergency: no band when nothing needs doing', band.hasAttribute('hidden'));
    ok('emergency: no demotion when nothing needs doing',
       !d.body.classList.contains('emergency'));

    /* Critical: band shows, page demotes. */
    const st = api.state;
    st.log[key].co2 = 6.2; st.log[key].hr = 128; st.log[key].sleep = 3.1;
    api.state = st;
    api.renderAll();
    ok('emergency: the band appears', !band.hasAttribute('hidden'));
    ok('emergency: the page enters the demoted state',
       d.body.classList.contains('emergency'));
    ok('emergency: it is announced assertively',
       band.getAttribute('role') === 'alert' && band.getAttribute('aria-live') === 'assertive');

    /* ONE item and ONE step. A list of five is a reading task. */
    const headings = band.querySelectorAll('span[style*="font-weight:700;margin-top:1px"]');
    eq('emergency: exactly one item is named', headings.length, 1);
    ok('emergency: it offers a way to act', !!d.getElementById('bandGo'));
    ok('emergency: the band says something specific',
       band.textContent.trim().length > 50, band.textContent.slice(0, 60));

    /* It must be the first thing reachable after the skip link, or it is
       not "one place to look" — it is one more place. */
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),' +
                'select:not([disabled]),textarea,summary,[tabindex]:not([tabindex="-1"])';
    const stops = Array.from(d.querySelectorAll(sel)).filter(e => {
      let n = e;
      while (n) { if (n.hasAttribute && n.hasAttribute('hidden')) return false; n = n.parentElement; }
      return true;
    });
    const at = stops.findIndex(e => e.id === 'bandGo');
    ok('emergency: the action is the first stop after the skip link', at === 1, 'index ' + at);

    /* Demoted, never removed: every tab must still be reachable. */
    ['tab-today', 'tab-health', 'tab-challenge', 'tab-howto', 'tab-create', 'tab-sources']
      .forEach(id => {
        const t = d.getElementById(id);
        ok('emergency: ' + id + ' is still reachable', !!(t && !t.hasAttribute('hidden')));
      });

    st.log[key] = keep;
    api.state = st;
    api.renderAll();
  }());

  (function figureCarriesNoScaffolding() {
    /* The 7.5-head construction grid and the vessel labels were rendering
       at 7.5px in #4A5876 — about 2.5:1, failing WCAG 1.4.3 — on the single
       most important visual. They are build scaffolding, not information. */
    ['surface', 'circ', 'skel', 'organ', 'neuro'].forEach(layer => {
      const st = api.state;
      st.layer = layer;
      api.state = st;
      api.renderAll();
      /* the floor compass (R, L, FRONT) is the one deliberate label: it was asked for */
      const texts = Array.from(d.getElementById('fig').querySelectorAll('text')).filter(n => !n.closest('#figCompass') && !n.closest('#figRuler'));   /* and the height ruler, also asked for */
      eq('figure[' + layer + ']: no construction labels', texts.length, 0);
    });
  }());

  (function sectionBarIsARealTablist() {
    api.setView('health');
    const bar = d.querySelector('#viewHealth .secbar');
    ok('tablist: the bar exists', !!bar);
    if (!bar) return;
    const btns = Array.from(bar.children);

    btns.forEach(b => {
      const id = b.getAttribute('aria-controls');
      ok('tablist: "' + b.textContent + '" names its panel', !!id);
      const panel = id && d.getElementById(id);
      ok('tablist: "' + b.textContent + '" points at a real tabpanel',
         !!(panel && panel.getAttribute('role') === 'tabpanel'));
      ok('tablist: that panel names its tab back',
         !!(panel && panel.getAttribute('aria-labelledby') === b.id));
    });

    /* Roving tabindex: exactly one stop for the whole bar. */
    const stops = btns.filter(b => b.getAttribute('tabindex') === '0');
    eq('tablist: exactly one keyboard stop in the bar', stops.length, 1);
    ok('tablist: the stop is the selected tab',
       stops[0] && stops[0].getAttribute('aria-selected') === 'true');

    /* Arrows must actually move, or the role is a lie. */
    const first = btns[0];
    first.focus();
    bar.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    ok('tablist: ArrowRight moves selection',
       bar.querySelector('[aria-selected="true"]') === btns[1],
       bar.querySelector('[aria-selected="true"]').textContent);
    bar.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    ok('tablist: Home returns to the first tab',
       bar.querySelector('[aria-selected="true"]') === btns[0]);
    bar.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    ok('tablist: End reaches the last tab',
       bar.querySelector('[aria-selected="true"]') === btns[btns.length - 1]);
    btns[0].click();
    api.setView('today');
  }());

  (function clinicalBeforeConfiguration() {
    /* Neither the environment selector nor the prototype crew switcher may
       come ahead of clinical content in keyboard order. */
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),' +
                'select:not([disabled]),textarea,summary,[tabindex]:not([tabindex="-1"])';
    const stops = Array.from(d.querySelectorAll(sel)).filter(e => {
      let n = e;
      while (n) { if (n.hasAttribute && n.hasAttribute('hidden')) return false; n = n.parentElement; }
      return true;
    });
    const idx = id => stops.findIndex(e => e.id === id);
    const env = idx('env'), today = idx('tab-today');
    /* Stronger than "after the tabs": the environment CONTROL is not on
       the clinical screens at all. It is configuration — an operator sets
       where the vehicle is before the mission — so it lives in Personalise
       and the header carries the value as a read-only fact, beside mission
       day and current mode. A span is not focusable, so it cannot push a
       configuration control ahead of clinical content again. */
    ok('order: the environment control is not in the crew tab order',
       env === -1 || env > today, 'tab-today ' + today + ', env ' + env);
    const show = d.getElementById('envShow');
    ok('order: the header states the environment as a value',
       !!(show && show.textContent.trim().length > 1), show && show.textContent);
    ok('order: that value is not a control',
       !!(show && !show.matches('select, input, button, a[href]')));
    ok('order: the environment can still be changed in Personalise',
       !!(d.getElementById('env') && d.getElementById('cardEnv')));
    const band = d.getElementById('crewBand');
    const nav = d.getElementById('views');
    ok('order: configuration sits after the tab bar',
       !!(band && nav && (nav.compareDocumentPosition(band) & 4)));
  }());

  (function consentIsGranularAndOff() {
    /* Releasing an entry to family while alive, leaving an instruction for
       an investigation, and contributing to research are three different
       acts with three different legal mechanics. One form with two boxes
       would be the bundling that consent law exists to catch. */
    d.getElementById('journeyBtn').click();
    const panel = d.getElementById('journeyConsent');
    ok('consent: the panel renders when the journal opens', !!(panel && panel.textContent.trim()));

    const boxes = Array.from(panel.querySelectorAll('input[type="checkbox"]'));
    ok('consent: at least three separate switches', boxes.length >= 3, String(boxes.length));
    ok('consent: every one is off by default', boxes.every(b => !b.checked));

    const ids = Array.from(panel.querySelectorAll('[data-consent]')).map(b => b.getAttribute('data-consent'));
    ['kin', 'mishap', 'research'].forEach(id =>
      ok('consent: "' + id + '" is its own decision', ids.indexOf(id) !== -1, ids.join(',')));

    const txt = panel.textContent.toLowerCase();

    /* It must not claim to obtain research consent: that is an IRB process
       under 45 CFR 46, not a checkbox. */
    ok('consent: research is not claimed to be complete here',
       /ethics board|does not replace/.test(txt), txt.slice(0, 160));

    /* It must not promise anonymity it cannot deliver. A named crewmember
       on a named expedition is identifiable however the data is scrubbed. */
    ok('consent: identifiability is stated plainly',
       /identifiable|cannot be anonymised/.test(txt));
    ok('consent: no false de-identification promise',
       !/fully anonymous|cannot be identified|completely de-identified/.test(txt));

    /* Irreversibility of research release must be said, not implied. */
    ok('consent: says what cannot be undone', /cannot be pulled back/.test(txt));

    /* Product improvement must not be bundled into any of it. */
    ok('consent: product improvement is excluded explicitly',
       /not used to improve this software/.test(txt));

    /* Turning one on must not turn another on. */
    const first = panel.querySelector('[data-consent="research"]');
    first.checked = true;
    first.dispatchEvent(new w.Event('change'));
    const after = api.state.consent || {};
    ok('consent: switching one leaves the others alone',
       !!(after.research && after.research.on) && !(after.kin && after.kin.on));
    ok('consent: the decision is timestamped', !!(after.research && after.research.at));
    first.checked = false;
    first.dispatchEvent(new w.Event('change'));
    d.getElementById('journeyClose').click();
  }());

  (function buildFromAJourneyEntry() {
    const st = api.state;
    const k = Object.keys(st.log).sort().pop();
    st.log[k]._journal = 'Shoulder felt odd after the EVA, nothing the suit logged.';
    api.state = st;
    api.setView('create');

    /* The journal is a release, so the picker stays shut until the source
       toggle above it is on. */
    const gate = d.getElementById('jrnGate');
    const cb = d.getElementById('srcJournal');
    cb.checked = false;
    cb.dispatchEvent(new w.Event('change'));
    ok('journey source: closed while written entries are off',
       /off/i.test(gate.textContent) &&
       d.getElementById('jrnPick').querySelectorAll('[data-use]').length === 0);

    cb.checked = true;
    cb.dispatchEvent(new w.Event('change'));
    ok('journey source: opens when entries are allowed', /allowed/i.test(gate.textContent));
    const uses = d.getElementById('jrnPick').querySelectorAll('[data-use]');
    ok('journey source: entries are listed', uses.length > 0, String(uses.length));

    uses[0].click();
    ok('journey source: the entry lands in the prompt',
       d.getElementById('createPrompt').value.indexOf('Shoulder felt odd') === 0,
       d.getElementById('createPrompt').value.slice(0, 50));

    /* "Listen" is read-back of written words. The app has never stored
       audio, and this screen must not imply that it has. */
    const card = d.getElementById('cardFromJourney').textContent.toLowerCase();
    ok('journey source: says it reads the written words', /reads your\s+written words/.test(card.replace(/\s+/g, ' ')));
    ok('journey source: denies holding a recording',
       /does not hold a recording/.test(card.replace(/\s+/g, ' ')));
    ok('journey source: never offers playback of a recording',
       !/play(back| the )? ?recording|your recording|listen to the recording/.test(card));

    cb.checked = false;
    cb.dispatchEvent(new w.Event('change'));
    api.setView('today');
  }());

  (function everyIndicatorCanBeRemoved() {
    /* sit_stand, tandem_walk and immune_sx must belong to a module, or
       they are the only indicators that cannot be switched off. Both
       sensorimotor tests assume a crewmember who rises from a chair and
       walks heel to toe with their eyes shut; one who cannot do that needs
       a way to remove them, or they stay outstanding in the schedule for
       the whole mission. */
    const covered = new Set();
    api.state.modules && Object.keys(api.state.modules);
    const mods = w.MODULES || null;
    const st = api.state;

    /* Every indicator the model knows must belong to some module. */
    const inModules = new Set();
    (api.MODULES || []).forEach(m => (m.inds || []).forEach(id => inModules.add(id)));
    if (api.MODULES) {
      api.M.indicators.forEach(i => {
        ok('modules: ' + i.id + ' belongs to a module that can be removed',
           inModules.has(i.id), i.id);
      });
    }

    /* And removing one must actually take its work off the schedule. */
    api.setView('today');
    st.modules.sensorimotor = true;
    api.state = st; api.renderAll();
    const withIt = d.getElementById('due').textContent;
    ok('modules: the sensorimotor tests are scheduled when installed',
       /sit-to-stand|tandem/i.test(withIt));

    st.modules.sensorimotor = false;
    api.state = st; api.renderAll();
    const without = d.getElementById('due').textContent;
    ok('modules: uninstalling them clears them from the schedule',
       !/sit-to-stand|tandem/i.test(without), without.slice(0, 90));

    st.modules.sensorimotor = true;
    api.state = st; api.renderAll();
  }());

  (function cycleIsInstalledNotGranted() {
    /* It must not appear because the crew record says the crewmember is
       female: a fact about a body must not behave like a choice. */
    /* Toggling the switch is a CHOICE, and the real checkbox records it as
       one: until the crewmember chooses, the crew record supplies the
       default, which is why a female profile opens with the tab working
       instead of telling her to go and switch it on. */
    const st = api.state;
    st.prefs.crew = 'f';
    st.prefs.cycleChosen = true;
    st.modules.cycle = false;
    api.state = st; api.renderAll();
    ok('cycle: off for a female crewmember when the module is uninstalled',
       !/cycle/i.test(d.getElementById('crewBand').textContent));

    st.prefs.crew = 'm';
    st.modules.cycle = true;
    api.state = st; api.renderAll();
    ok('cycle: available to a male crewmember when the module is installed',
       /cycle/i.test(d.getElementById('crewBand').textContent),
       d.getElementById('crewBand').textContent.slice(0, 90));

    /* And with no choice recorded, the crew record decides. */
    st.prefs.crew = 'f'; delete st.prefs.cycleChosen; delete st.modules.cycle;
    api.state = st; api.renderAll();
    ok('cycle: on by default for a crewmember whose record tracks it',
       /cycle/i.test(d.getElementById('crewBand').textContent),
       d.getElementById('crewBand').textContent.slice(0, 80));
    st.modules.cycle = true; st.prefs.cycleChosen = true;
    api.state = st; api.renderAll();
  }());

  (function sexIsClinicalNotIdentity() {
    api.setView('now');
    const addr = d.getElementById('userAddress');
    ok('identity: there is a way to say how you want to be addressed', !!addr);
    if (addr) {
      addr.value = 'Commander';
      addr.dispatchEvent(new w.Event('input'));
      eq('identity: it is kept', api.state.prefs.address, 'Commander');
      /* Free text, not a list: a fixed list of options is a claim about
         which answers exist. */
      eq('identity: it is free text', addr.tagName, 'INPUT');
    }
    const card = d.getElementById('viewNow').textContent;
    ok('identity: the record says what sex is recorded for',
       /reference ranges depend on it/i.test(card));
    ok('identity: and that it does not gate modules',
       /or which modules you get/i.test(card.replace(/\s+/g, ' ')));
    api.setView('today');
  }());

  (function ageChoiceIsDocumented() {
    api.setView('sources');
    const panel = d.getElementById('viewSources');
    const btn = Array.from(panel.querySelectorAll('.secbar button'))
      .filter(b => /threshold/i.test(b.textContent))[0];
    if (btn) btn.click();
    const t = d.getElementById('srcAge');
    ok('age: the choice not to band by age is written down', !!t);
    if (t) {
      const txt = t.textContent.replace(/\s+/g, ' ');
      ok('age: it is stated as a choice', /is a choice, not an omission/i.test(txt));
      /* And the cost of the choice is admitted, not glossed. */
      ok('age: the cost is admitted',
         /does not model that difference/i.test(txt), txt.slice(0, 120));
    }
    api.setView('today');
  }());

  /* Stacking: .wrap sets z-index:1, so it composites the whole page as one
     layer. Anything position:fixed appended to <body> outranks every page
     element wholesale, however high that element's z-index. That is why the
     status popover rendered behind the dock. jsdom cannot test paint order,
     but it can test the structural cause: overlays that are meant to sit
     among page content must live inside .wrap, and the popover must outrank
     them there. */
  /* Emergency dimming put opacity:.62 on <header>. The status popover lives
     inside it, so during an alert it was painted translucent AND trapped in
     the header's stacking context (opacity<1 creates one), which no z-index
     can escape. Opening it must lift the dim. */
  /* Fit mode pins a panel's height and stops the page scrolling. Only
     #viewToday had an overflow rule, so other panels could be pinned with
     content past the fold and no way to reach it — a frozen screen. Every
     fittable panel must declare an overflow behaviour. */
  /* The check run: one button, a count, a cost, and a terminal state. */
  /* Side cards must never be squashed-and-clipped. Content cut mid-word on a
     health screen is unreadable AND undetectable by the reader. The column
     scrolls instead. */
  /* The written report must be REACHABLE, not merely present.
     It shipped inside a hidden #viewAnalysis, outside every tab and section:
     two relocation passes ran in sequence and the first stripped the id the
     second looked up, so the guarded move silently did nothing. Existing in
     the DOM is not the same as being reachable, and only the second is worth
     asserting. */
  /* Judged on the artefact alone, the first screen must answer what this is
     and why it differs — not only where the tabs are. */
  /* A dead or disconnected instrument must reach the band the crewmember is
     certain to look at. It never could: the band read a variable that only
     existed inside other functions and so always passed an empty list. */
  (function aFailedInstrumentReachesTheAlertBand() {
    const { d, w } = boot();
    const api = w.__synapse;
    const st = api.state;

    /* Make every reading in range, so the only thing wrong is the hardware. */
    const today = Object.keys(st.log).sort().pop();
    const day = st.log[today];
    Object.keys(day).forEach(k => { if (k === 'co2') day[k] = 2.0; });
    day.vision = 0; day.hr = 62; day.temp = 36.8; day.bp_sys = 116; day.bp_dia = 74;
    day.glucose = 90; day.sleep = 7.5; day.rad_event = 0;
    /* Every device last heard from long ago. */
    st.sensors = st.sensors || {};
    api.M.sensors.forEach(sn => {
      st.sensors[sn.id] = { connected: true, lastSeen: Date.now() - 1000 * 3600 * 24 * 30 };
    });
    api.renderAll();

    const status = api.overallStatus().label;
    const band = d.getElementById('alertBand');
    const text = (band.textContent || '').replace(/\s+/g, ' ');
    if (status === 'INSTRUMENT FAULT') {
      ok('fault: the band appears for an instrument fault', !band.hasAttribute('hidden'), status);
      ok('fault: it names itself as an instrument fault', /INSTRUMENT FAULT/.test(text), text.slice(0, 90));
      ok('fault: it is not dressed as a health emergency', !d.body.classList.contains('emergency'));
      const go = d.getElementById('bandGo');
      if (go) { go.click(); ok('fault: the button opens how the instrument goes on', !!d.querySelector('#wearSheet [role="dialog"]'), (d.querySelector('#alertBand').textContent || '').slice(0, 80)); const x = d.getElementById('wsClose'); if (x) x.click(); }
    } else {
      /* The state could not be driven to a pure fault; at least prove the
         band does not swallow the sensor list. */
      ok('fault: (state not reachable here: ' + status + ')', true);
    }
    const src = Array.from(d.querySelectorAll('script')).map(n => n.textContent).join('\n');
    ok('fault: the band computes sensor status itself',
       !/typeof sensorList !== 'undefined'/.test(src));
  }());

  /* Trends is every indicator tracked in this environment, not six from one
     body layer. */
  (function trendsCoversEverythingTracked() {
    const { d, w } = boot();
    const api = w.__synapse;
    d.getElementById('tab-health').click();
    Array.from(d.querySelectorAll('#viewHealth .secbar button'))
      .filter(b => b.textContent === 'Trends')[0].click();
    const cards = d.querySelectorAll('#trends .tr').length;
    const tracked = api.M.activeIndicators(api.state.env).length;
    ok('trends: more than the old cap of six', cards > 6, 'cards=' + cards);
    ok('trends: one card per tracked indicator (allowing uninstalled modules)',
       cards >= tracked - 4 && cards <= tracked, 'cards=' + cards + ' tracked=' + tracked);
  }());

  /* Self-check tiles are one line until they matter or are opened. */
  (function selfCheckTilesAreOneLine() {
    const { d } = boot();
    const tiles = Array.from(d.querySelectorAll('#inds details.ind'));
    ok('tiles: they are collapsible', tiles.length > 0, 'found ' + tiles.length);
    tiles.forEach(function (t) {
      const band = t.getAttribute('data-band');
      const shouldOpen = band === 'watch' || band === 'alert';
      ok('tiles: ' + t.id + ' is ' + (shouldOpen ? 'open (out of band)' : 'closed (settled)'),
         t.hasAttribute('open') === shouldOpen, 'band=' + band + ' open=' + t.hasAttribute('open'));
    });
    /* The row in today's checks opens the tile it refers to. */
    const row = d.getElementById('row-vision');
    if (row) {
      row.click();
      const run = d.getElementById('checkRun');
      ok('checks: tapping a check row opens its test, not a tick', !!run && /DO THE CHECK/.test(run.textContent) && !!run.querySelector('svg[aria-label^="Amsler grid"]'));
      run.querySelector('[data-cr="manual"]').click();
      const tile = d.getElementById('tile-vision');
      ok('tiles: Enter a value instead opens the tile', !d.getElementById('checkRun') && !!tile && tile.hasAttribute('open'));
      /* the other tests, done to the end */
      const S2 = d.defaultView.__synapse, press = k => { const b = d.querySelector('#checkRun [data-cr="' + k + '"]'); if (!b) throw new Error('no button ' + k + ' in: ' + ((d.getElementById('checkRun') || {}).textContent || 'NO DIALOG').slice(0, 160)); b.click(); };
      const before = S2.state.log[Object.keys(S2.state.log).sort().pop()].immune_sx;
      S2.checkRunOpen('immune_sx'); press('go'); press('no'); press('no'); press('yes');
      ok('checks: the immune check asks its questions and gives a result with a next step', /YOUR RESULT/.test(d.getElementById('checkRun').textContent) && /Rash, allergy/.test(d.getElementById('checkRun').textContent));
      press('save');
      ok('checks: saving writes the result to today and closes the test', !d.getElementById('checkRun') && S2.state.log[Object.keys(S2.state.log).sort().pop()].immune_sx === 1);
      { const st = S2.state, day = st.log[Object.keys(st.log).sort().pop()]; if (before === undefined) delete day.immune_sx; else day.immune_sx = before; S2.state = st; S2.renderAll(); }
      S2.checkRunOpen('mood'); press('m4');
      ok('checks: the mood check is one tap on a five-point scale', /YOUR RESULT/.test(d.getElementById('checkRun').textContent));
      press('close');
      S2.checkRunOpen('tandem_walk'); press('stepper'); press('stepper'); press('stepper'); press('stop');
      ok('checks: the tandem walk counts the steps you tap', /3 steps/.test(d.getElementById('checkRun').textContent));
      press('close');
      S2.checkRunOpen('sit_stand'); press('go'); press('stop');
      ok('checks: the sit-to-stand test times you, then asks you to hold still', /Now hold still/.test(d.getElementById('checkRun').textContent));
      press('close');
      ok('checks: closing a test saves nothing', !d.getElementById('checkRun'));
    }
    ok('tiles: the mood tags are folded away', !!d.getElementById('tagFold')
       && !d.getElementById('tagFold').hasAttribute('open'));
  }());

  /* The figure is a body outline, mirrored from one half. */
  (function theFigureIsABody() {
    const { d } = boot();
    const g = d.querySelector('#fig .bodyline');
    ok('figure: it has a body', !!g);
    if (!g) return;
    ok('figure: the body is solids with one outline (an ink pass under a fill pass)', g.querySelectorAll(':scope > g').length === 3 && g.querySelectorAll('ellipse').length >= 30);   /* third group: the few surface contour lines */
    ok('figure: the body cannot swallow a click meant for a marker', /pointer-events:\s*none/.test(g.getAttribute('style') || ''));
  }());

  (function theFigureIsAModelThatTurns() {
    const { d, w } = boot();
    const turn = deg => { const sl = d.querySelector('#turnSlider'); sl.value = String(deg); sl.dispatchEvent(new w.Event('input', { bubbles: true })); };
    const widthOf = () => { const xs = Array.from(d.querySelectorAll('#fig .bodyline ellipse')).map(e => [+e.getAttribute('cx') - +e.getAttribute('rx'), +e.getAttribute('cx') + +e.getAttribute('rx')]); return Math.max(...xs.map(x => x[1])) - Math.min(...xs.map(x => x[0])); };
    /* an organ may be more than one solid: take the middle of all of them */
    const cx = sel => { const xs = Array.from(d.querySelectorAll(sel)).map(e => +e.getAttribute('cx')); return xs.reduce((p, q) => p + q, 0) / xs.length; };
    ok('turn: there is a keyboard-operable control', d.querySelector('#turnSlider').getAttribute('type') === 'range');
    ok('turn: four view buttons, front right back left', d.querySelectorAll('#turnBar [data-turn]').length === 4);
    ['surface', 'circ', 'skel', 'organ', 'neuro'].forEach(k => {
      d.querySelector('[data-layer="' + k + '"]').click();
      const n = d.querySelectorAll('#fig .figlayer[data-layer3d="' + k + '"] > *').length;
      ok('figure: the ' + k + ' layer is drawn', n >= 12, 'elements=' + n);
    });
    d.querySelector('[data-layer="organ"]').click();
    const heart = '#fig .figlayer ellipse[fill="#C0392B"]', liver = '#fig .figlayer ellipse[fill="#8E3B2E"]';
    ok('front: the heart is on the body\'s left, the viewer\'s right', cx(heart) > 150 && cx(liver) < 150, cx(heart) + ' / ' + cx(liver));
    const wFront = widthOf();
    turn(180);
    ok('back: left and right swap for the viewer', cx(heart) < 150 && cx(liver) > 150, cx(heart) + ' / ' + cx(liver));
    ok('back: the readout says so', /^Back/.test(d.querySelector('#turnLabel').textContent));
    turn(90);
    const wSide = widthOf();
    ok('side: a true profile, narrower than the front but with real depth', wSide < wFront * 0.6 && wSide > 30, wFront.toFixed(0) + ' -> ' + wSide.toFixed(0));
    ok('side: the heart is in front of the spine line', cx(heart) > 150, String(cx(heart)));
    ok('side: named as the right side', /^Right side/.test(d.querySelector('#turnLabel').textContent));
    const t = Array.from(d.querySelectorAll('#figCompass text')).map(n => n.textContent).join(' ');
    ok('compass: R, L and FRONT are marked on the floor', /R/.test(t) && /L/.test(t) && /FRONT/.test(t), t);
    const tx = l => +Array.from(d.querySelectorAll('#figCompass text')).find(n => n.textContent === l).getAttribute('x');
    turn(0); const r0 = tx('R'); turn(180); const r180 = tx('R');
    ok('compass: R is the body\'s right, so it changes side when the body turns round', r0 < 150 && r180 > 150, r0 + ' -> ' + r180);
    d.querySelector('[data-layer="skel"]').click();
    ok('turn: changing layer keeps the angle', d.querySelector('#figTurn').getAttribute('data-deg') === '180');
    d.querySelector('#turnBar [data-turn="0"]').click();
    ok('turn: one button brings it back to the front', d.querySelector('#figTurn').getAttribute('data-deg') === '0' && d.querySelector('#turnBar [data-turn="0"]').getAttribute('aria-pressed') === 'true');
    ok('turn: markers and regions survive a turn', d.querySelectorAll('#fig .region').length === 7 && d.querySelectorAll('#fig .cling').length >= 1);
  }());

  (function theLayerNoteAndTheWearGuideArePopups() {
    const { d, w } = boot();
    ok('layer note: it takes no room under the body', d.querySelector('#layerNote').hasAttribute('hidden'));
    d.querySelector('#layerInfo').click();
    const lp = d.querySelector('#layerPop [role="dialog"]');
    ok('layer note: the About button opens it as a dialog', !!lp && d.querySelector('#lpBody').textContent.length > 20);
    ok('layer note: the popup says what the 3D model is and is not', /schematic/.test(lp.textContent));
    d.querySelector('#lpClose').click();
    ok('layer note: it closes', !d.querySelector('#layerPop'));
    d.querySelector('#tab-howto').click();
    const picks = Array.from(d.querySelectorAll('#hwPick button'));
    ok('wear guide: every instrument has a card', picks.length >= 7);
    let worn = 0, notWorn = 0, labelled = 0, drawn = 0;
    picks.forEach((_, i) => {
      d.querySelectorAll('#hwPick button')[i].click();
      d.querySelector('#hwWear').click();
      const dlg = d.querySelector('#wearSheet [role="dialog"]');
      if (!dlg) return;
      if (/not the manufacturer/.test(d.querySelector('#wsNote').textContent)) labelled++;
      if (/not worn/.test(dlg.textContent)) notWorn++; else { worn++; if (dlg.querySelector('svg .bodyline') && dlg.querySelectorAll('ol li').length >= 3) drawn++; }
      d.querySelector('#wsClose').click();
    });
    ok('wear guide: opened by a tap on every instrument', worn + notWorn === picks.length, worn + '+' + notWorn);
    ok('wear guide: every card says it is illustrative, not the manufacturer\'s', labelled === picks.length, String(labelled));
    ok('wear guide: worn instruments are drawn on the body with steps', worn === 7 && drawn === 7, worn + '/' + drawn);
    ok('wear guide: instruments that are not worn say so instead of inventing a site', notWorn === 3);
    ok('gadgets: sleep has an instrument behind it', w.__synapse.M.sensors.some(x => x.feeds.indexOf('sleep') !== -1) && w.__synapse.M.sensors.some(x => x.feeds.indexOf('exercise') !== -1));
    d.querySelectorAll('#hwPick button')[0].click(); d.querySelector('#hwWear').click();
    d.querySelector('#wearSheet [data-wturn="180"]').click();
    ok('wear guide: the body in the card turns', d.querySelector('#wearSheet [data-wturn="180"]').getAttribute('aria-pressed') === 'true');
    d.querySelector('#wsClose').click();
  }());

  (function nasaMeasurementsAreShownAndKeptApartFromTheCrewRecord() {
    const { d, w } = boot();
    const N = w.__synapse.nasa;
    ok('nasa data: the radiation table is embedded whole', !!N && N.rad.length === 39 && N.rad[0][0] === '2014-09-21' && N.rad[38][4] === 7.96);
    if (!N) return;
    let acc = 0, drift = 0; N.rad.forEach(r => { acc += r[3]; if (Math.abs(acc - r[4]) > 0.06) drift++; });
    ok('nasa data: the daily doses add up to NASA\'s own running total', drift === 0 && Math.abs(acc - 7.96) < 0.06, acc.toFixed(2));
    ok('nasa data: each day is cosmic rays plus the South Atlantic Anomaly, within rounding', N.rad.every(r => Math.abs(r[1] + r[2] - r[3]) <= 0.011));
    const live = N.co2.filter(r => r[2] !== r[3]);
    ok('nasa data: the CO2 range matches NASA\'s Summary Table', Math.min(...live.map(r => r[2])) === 1862 && Math.max(...live.map(r => r[3])) === 4667);
    d.querySelector('#tab-health').click();
    w.__synapse.renderNasa();
    const body = d.querySelector('#nasaBody');
    ok('nasa data: the card draws both charts', body.querySelectorAll('svg').length === 2 && body.querySelectorAll('rect').length === 78);
    ok('nasa data: it says these are not the crewmember\'s readings', /not your readings/.test(body.textContent) && /nothing here changes a band or an alert/.test(body.textContent));
    ok('nasa data: source, mission and retrieval date are on the card', /Rodent Research 1/.test(d.querySelector('#nasaSrc').textContent) && /Retrieved 2026-11-14/.test(d.querySelector('#nasaSrc').textContent) && !!d.querySelector('#nasaSrc a[href*="osdr.nasa.gov"]'));
    ok('nasa data: the unexplained constant days are disclosed, not hidden', /constant value/.test(d.querySelector('#nasaCo2Say').textContent));
  }());

  (function tonightsFourChanges() {
    const { d, w } = boot();
    /* 1. NASA data is reachable from Today */
    const nl = d.querySelector('#nasaLine');
    ok('today: the NASA measurements are one tap away', !!nl && /0\.20 mGy a day/.test(nl.textContent), nl && nl.textContent);
    if (nl) { nl.click(); ok('today: that tap lands on the NASA card in My health', !d.querySelector('#viewHealth').hasAttribute('hidden') && !!d.querySelector('#cardNasa svg')); }
    /* 2. honest status */
    w.__synapse.setView('today');
    ok('status: Sources says what this is and is not', /Not cleared or approved by the FDA/.test(d.querySelector('#statusLine').textContent) && /flight-surgeon oversight/.test(d.querySelector('#statusLine').textContent));
    ok('status: no screen claims general wellness', !/general wellness/i.test(d.body.textContent));
    ok('wording: the vision tile does not lead with a syndrome name', !/SANS screening\)/.test(d.querySelector('#viewToday').textContent));
    /* 3. prosthesis */
    const ul = d.querySelector('#userLimb');
    ok('limb: Personalise offers a lower-limb prosthesis', !!ul && ul.querySelectorAll('option').length === 5);
    ok('limb: by default nothing is drawn as a prosthesis', !d.querySelector('#fig .prosthesis'));
    const set = v => { ul.value = v; ul.dispatchEvent(new w.Event('change', { bubbles: true })); };
    d.querySelector('[data-layer="skel"]').click();
    const bones0 = d.querySelectorAll('#fig .figlayer > *').length;
    set('L-below');
    ok('limb: a below-knee prosthesis is drawn as socket, pylon and foot', !!d.querySelector('#fig .prosthesis') && d.querySelectorAll('#fig .prosthesis > g, #fig .prosthesis > ellipse').length === 3);
    ok('limb: the bones stop where the limb stops', d.querySelectorAll('#fig .figlayer > *').length < bones0);
    ok('limb: both leg regions survive below the knee', d.querySelectorAll('#fig .region[data-sys="musculo"]').length === 2);
    set('R-above');
    ok('limb: above the knee adds a knee joint', d.querySelectorAll('#fig .prosthesis > g, #fig .prosthesis > ellipse').length === 4);
    ok('limb: no clickable region is left on the missing leg', d.querySelectorAll('#fig .region[data-sys="musculo"]').length === 1);
    d.querySelector('#tab-howto').click(); d.querySelectorAll('#hwPick button')[0].click(); d.querySelector('#hwWear').click();
    ok('limb: the wear cards draw the same body', !!d.querySelector('#wearSheet .prosthesis'));
    d.querySelector('#wsClose').click();
    set('none');
    ok('limb: it can be set back', !d.querySelector('#fig .prosthesis'));
    /* 4. the status popover is a dialog that holds focus */
    d.querySelector('#statusBtn').click();
    const menu = d.querySelector('#statusMenu');
    ok('popover: opening it moves focus inside', menu.contains(d.activeElement), d.activeElement && d.activeElement.id);
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok('popover: Escape closes it and gives focus back to its button', menu.hasAttribute('hidden') && d.activeElement === d.querySelector('#statusBtn'));
  }());

  (function sourcesMuscleAndShortScreens() {
    const { d, w } = boot();
    /* every instrument manual now names where its instructions come from */
    d.querySelector('#tab-howto').click();
    const n = d.querySelectorAll('#hwPick button').length;
    let cited = 0, inCard = 0;
    for (let i = 0; i < n; i++) {
      d.querySelectorAll('#hwPick button')[i].click();
      const name = d.querySelectorAll('#hwPick button')[i].textContent;
      if (/Cabin air/.test(name)) { cited++; inCard++; continue; }   /* sourced in the model, not here */
      if (d.querySelectorAll('#hwManual a[href^="http"]').length) cited++;
      d.querySelector('#hwWear').click();
      if (d.querySelector('#wsSrc a[href^="http"]')) inCard++;
      d.querySelector('#wsClose').click();
    }
    ok('sources: every instrument manual carries a citation', cited === n, cited + '/' + n);
    ok('sources: every wear card shows where its steps come from', inCard === n, inCard + '/' + n);
    const all = d.querySelector('#viewHowto').textContent;
    d.querySelectorAll('#hwPick button').forEach(b => { if (/Glucometer/.test(b.textContent)) b.click(); });
    ok('reliability: the glucometer does not say to always discard the first drop', !/Discard the first drop, use the second/.test(d.querySelector('#viewHowto').textContent) && /use the first drop/.test(d.querySelector('#viewHowto').textContent));
    d.querySelectorAll('#hwPick button').forEach(b => { if (/dosimeter/i.test(b.textContent)) b.click(); });
    ok('reliability: the dosimeter does not warn against a pocket', !/in a pocket during an EVA/.test(d.querySelector('#viewHowto').textContent));
    w.__synapse.renderNasa();
    ok('sources: the NASA card states the terms it is used under', /open access policy/.test(d.querySelector('#nasaSrc').textContent) && !!d.querySelector('#nasaSrc a[href*="terms-and-conditions"]'));
    /* muscle */
    w.__synapse.setView('today');
    ok('muscle: there are six layers and Bone is labelled correctly', d.querySelectorAll('.layers [data-layer]').length === 6 && d.querySelector('[data-layer="skel"]').textContent === 'Bone');
    d.querySelector('[data-layer="muscle"]').click();
    const m = d.querySelectorAll('#fig .figlayer[data-layer3d="muscle"] ellipse').length;
    ok('muscle: the main groups are drawn on both sides', m >= 44, 'ellipses=' + m);
    const ul = d.querySelector('#userLimb'); ul.value = 'L-above'; ul.dispatchEvent(new w.Event('change', { bubbles: true }));
    const m2 = d.querySelectorAll('#fig .figlayer[data-layer3d="muscle"] ellipse').length;
    ok('muscle: muscles stop where a shortened limb stops', m2 < m && m2 >= m - 9, m + ' -> ' + m2);
    ul.value = 'none'; ul.dispatchEvent(new w.Event('change', { bubbles: true }));
    /* short screens */
    const css = Array.from(d.querySelectorAll('style')).map(x => x.textContent).join('\n');
    ok('short screens: the chrome compresses at 800 and 740 lines', /@media\(max-height:800px\)/.test(css) && /@media\(max-height:740px\)/.test(css));
    const src = Array.from(d.querySelectorAll('script')).map(x => x.textContent).join('\n');
    ok('short screens: a column that spills sideways counts as not fitting', /scrollWidth > c\.clientWidth/.test(src));
  }());

  (function privacyAccessAndErasure() {
    const { d, w } = boot();
    w.__synapse.setView('sources');
    const pn = d.querySelector('#privacyNote'), pr = d.querySelector('#pathReal');
    ok('privacy: the notice says what is stored, where, and what leaves the device', !!pn && /On this device only/.test(pn.textContent) && /not encrypted/.test(pn.textContent) && /Nothing about you/.test(pn.textContent));
    ok('privacy: it does not overstate security', !/secure|protected by/i.test(pn ? pn.textContent : ''));
    ok('path to real use: device clearance, in-flight limits and security are named', !!pr && /FDA pathway/.test(pr.textContent) && /in-flight limits/.test(pr.textContent) && /None exists yet/.test(pr.textContent));
    const er = d.querySelector('#eraseRecord'), dl = d.querySelector('#dlRecord');
    ok('data rights: download and erase controls exist', !!er && !!dl);
    if (!er) return;
    w.localStorage.setItem('synapse-3s-v1', '{"x":1}');
    er.click();
    ok('erase: one tap only arms it', w.localStorage.getItem('synapse-3s-v1') !== null && er.getAttribute('data-armed') === '1' && /Tap again/.test(er.textContent));
    er.click();
    ok('erase: the second tap removes the stored record', w.localStorage.getItem('synapse-3s-v1') === null);
    ok('limb: the setting says it is used for no assessment and not shared', /used for no assessment of you/.test(d.querySelector('#userLimb').parentNode.textContent));
    ok('consent: the research switch says it does not replace an ethics board', w.__synapse.CONSENTS.some(c => c.id === 'research' && /ethics board/.test(c.what) && c.irreversible));
  }());

  (function theSleepChartSaysItIsAnIllustration() {
    const { d, w } = boot();
    d.querySelector('#tab-health').click();
    const vh = d.querySelector('#viewHealth'); if (vh.__show) vh.__show('sleep');
    const g = d.querySelector('#sleepIllus');
    ok('sleep chart: the word ILLUSTRATION is drawn on the chart itself', !!g && /ILLUSTRATION/.test(g.textContent) && /not measured/.test(g.textContent));
    const svg = g && g.closest('svg');
    ok('sleep chart: a screen reader hears it first', !!svg && /^Illustration, not a measurement/.test(svg.getAttribute('aria-label')));
    ok('sleep chart: the text does not call the staged night reliable', !/shape of the night as reliable/.test(d.querySelector('#viewHealth').textContent) && /cannot measure stages/.test(d.querySelector('#viewHealth').textContent));
    const css = Array.from(d.querySelectorAll('style')).map(x => x.textContent).join('\n');
    ok('short screens: the assistant launcher shrinks so it covers no self-check', /#evoLauncher\{padding:3px !important;min-height:44px/.test(css) && /min-height:36px/.test(css));
  }());

  (function theCycleSectionShowsSomething() {
    const { d, w } = boot();
    d.querySelector('#tab-health').click();
    const vh = d.querySelector('#viewHealth'); if (vh.__show) vh.__show('cycle');
    const wheel = d.querySelector('#cycleWheel');
    ok('cycle: the demonstration record has a cycle day, not an empty wheel', /CYCLE DAY/.test(wheel.textContent) && /12/.test(wheel.querySelector('svg').getAttribute('aria-label')), wheel.querySelector('svg').getAttribute('aria-label'));
    ok('cycle: the seeded date is labelled synthetic', !!d.querySelector('#cycleDemoNote'));
    ok('cycle: the legend does not claim the days were recorded', !/Days you recorded bleeding/.test(wheel.textContent));
    const sd = d.querySelector('#cycleStart'); sd.value = ''; sd.dispatchEvent(new w.Event('change', { bubbles: true }));
    const w2 = d.querySelector('#cycleWheel');
    ok('cycle: with no date, nothing is marked as bleeding and the wheel says what to do', !/fill="var\(--alert\)"/.test(w2.querySelector('svg').innerHTML) && /Enter the first day/.test(w2.textContent) && !d.querySelector('#cycleDemoNote'));
  }());

  (function doneChecksCanBeUnticked() {
    const { d, w } = boot();
    w.__synapse.setView('today');
    const fold = () => d.querySelector('#doneFold');
    const first = fold() && fold().querySelector('[id^="tick-"]');
    ok('tick: a finished check has a tick control', !!first && first.getAttribute('aria-checked') === 'true');
    if (first) {
      const id = first.id.replace('tick-', '');
      const before = fold().querySelectorAll('[id^="tick-"]').length;
      first.click();
      const row = d.getElementById('row-' + id);
      ok('tick: unticking moves the check out of the done list', !!row && !(fold() && fold().contains(row)));
      const t2 = d.getElementById('tick-' + id);
      ok('tick: the untouched check offers a restore, not a blank tick', !!t2 && t2.getAttribute('aria-checked') === 'false' && /Restore/.test(t2.getAttribute('aria-label')));
      t2.click();
      ok('tick: ticking again restores it to the done list', !!fold() && fold().contains(d.getElementById('row-' + id)) && fold().querySelectorAll('[id^="tick-"]').length === before);
    }
  }());

  (function sourcesListOnlyWhatIsUsed() {
    const { d, w } = boot();
    w.__synapse.setView('sources');
    const used = w.__synapse.usedSources(), all = Object.keys(w.__synapse.M.sources);
    const shown = Array.from(d.querySelectorAll('#sources .src b')).map(b => b.textContent.replace(/[\[\]]/g, ''));
    ok('sources: every source listed is one the tool uses', shown.length > 10 && shown.every(k => used[k] || w.__synapse.M.sources[k].kind === 'landscape'), shown.filter(k => !used[k] && w.__synapse.M.sources[k].kind !== 'landscape').join(','));
    ok('sources: related-work entries are listed, and none is used by the model', all.filter(k => w.__synapse.M.sources[k].kind === 'landscape').length >= 7 && all.filter(k => w.__synapse.M.sources[k].kind === 'landscape').every(k => shown.indexOf(k) !== -1 && !used[k]));
    ok('sources: none that is used is missing from the list', all.filter(k => used[k]).every(k => shown.indexOf(k) !== -1));
    const rows = Array.from(d.querySelectorAll('#cardCoverage div')).filter(n => /NOT COVERED/.test(n.textContent) && n.querySelector(':scope > div > span'));
    const notCov = Array.from(d.querySelectorAll('#cardCoverage span')).filter(n => n.textContent.trim() === 'NOT COVERED').map(n => n.parentNode.parentNode);
    ok('coverage: no uncovered area is left on the page', notCov.length === 0, String(notCov.length));
    const embU = Array.from(d.querySelectorAll('#sources .src.emb a')).map(a => a.getAttribute('href'));
    const srcText = d.getElementById('sources').innerHTML;
    const inline = [];
    w.__synapse.MANUAL.forEach(m => (m.cites || []).forEach(c => inline.push(c.u)));
    ok('sources: every citation embedded in an instrument guide is also in the list', inline.length > 10 && inline.every(u => srcText.indexOf(u.replace(/&/g, '&amp;')) !== -1), inline.filter(u => srcText.indexOf(u.replace(/&/g, '&amp;')) === -1).join(' '));
    ok('sources: the live feed, the ESA study and the OSDR terms are in the list', ['swpc.noaa.gov', 'esa.int', 'osdr-help-terms'].every(k => embU.some(u => u.indexOf(k) !== -1)));
    ok('sources: no link is listed twice', new Set(Array.from(d.querySelectorAll('#sources .src a')).map(a => a.getAttribute('href'))).size === d.querySelectorAll('#sources .src a').length);
  }());

  (function theFirstScreenExplainsTheProject() {
    const { d } = boot();
    const tour = d.getElementById('tour');
    ok('tour: it opens for a first-time visitor', !!tour && !tour.hasAttribute('hidden'));
    const t = (d.getElementById('tourBody').textContent || '').replace(/\s+/g, ' ');

    ok('tour: says what the problem is', /far from a doctor|flight surgeon/i.test(t), t.slice(0, 80));
    ok('tour: states the provenance claim', /names its source/i.test(t));
    ok('tour: admits where it has no threshold',
       /no verified threshold|carry no band/i.test(t));
    ok('tour: offers a path to try, in order', /three things to try/i.test(t));
    ok('tour: still maps the tabs', /HOW THIS IS LAID OUT/i.test(t));
  }());

  (function theWrittenReportIsReachable() {
    const { d } = boot();
    const btn = d.getElementById('genReport');
    ok('report: the build-the-report control exists', !!btn);
    if (!btn) return;

    d.getElementById('tab-health').click();
    const rec = Array.from(d.querySelectorAll('#viewHealth .secbar button'))
      .filter(b => b.textContent === 'Record')[0];
    ok('report: My health has a Record section', !!rec);
    if (rec) rec.click();

    const sec = btn.closest('.sec');
    ok('report: it lives inside a section of My health',
       !!sec && sec.getAttribute('data-sec') === 'record',
       sec ? sec.getAttribute('data-sec') : '(outside every section)');

    let hidden = null;
    for (let n = btn; n && n !== d.body; n = n.parentNode) {
      if (n.hasAttribute && n.hasAttribute('hidden')) { hidden = n.id || n.className || '(anon)'; break; }
    }
    ok('report: nothing hides it once Record is open', hidden === null, 'hidden by: ' + hidden);
    ok('report: it is introduced under its own heading',
       /ANALYSIS AND REPORTS/.test(d.getElementById('viewHealth').textContent));
  }());

  (function sideCardsDoNotClipSilently() {
    const { d } = boot();
    const css = Array.from(d.querySelectorAll('style')).map(n => n.textContent).join('\n');
    const cardRules = [...css.matchAll(/#viewToday\.fit > \.tcol-side > \.card\{([^}]*)\}/g)]
      .map(m => m[1]);
    ok('today: the side-card rule exists', cardRules.length > 0, 'rule missing');
    ok('today: one side-card rule pins the height',
       cardRules.some(r => /flex:\s*0\s+0\s+auto/.test(r)), cardRules.join(' || '));
    ok('today: no side-card rule lets them shrink',
       !cardRules.some(r => /flex:\s*0\s+1\s/.test(r)), cardRules.join(' || '));
    ok('today: no side-card rule clips their content',
       !cardRules.some(r => /overflow:\s*hidden/.test(r)), cardRules.join(' || '));
    /* And it must NOT solve the problem by scrolling: the requirement is one
       screen. Content has to FIT, which is what the folded detail is for. */
    ok('today: the side column does not scroll — it is meant to fit',
       !/#viewToday\.fit > \.tcol-side\{[^}]*overflow-y:\s*(auto|scroll)/.test(css));

    /* The fold is what makes fitting possible: a settled tile is label,
       status and input, with its explanation one tap away. */
    const more = d.querySelectorAll('#inds details.indmore');
    ok('today: self-check tiles fold their explanation', more.length > 0,
       'found ' + more.length);
    const openByDefault = Array.from(more).filter(n => n.hasAttribute('open'));
    ok('today: folds start shut', openByDefault.length === 0,
       openByDefault.length + ' open');

    /* SAFETY: folding is only ever allowed for a settled reading. A tile that
       is out of band must show its finding and its action WITHOUT the reader
       opening anything. Nobody should have to go looking to discover that
       something is wrong. */
    const tiles = Array.from(d.querySelectorAll('#inds .ind'));
    ok('today: there are self-check tiles', tiles.length > 0);
    let checkedOne = false;
    tiles.forEach(function (t) {
      const band = t.getAttribute('data-band');
      if (band !== 'watch' && band !== 'alert') return;
      const label = band;
      checkedOne = true;
      const why = t.querySelector(':scope > .why');
      const act = t.querySelector(':scope > .act');
      ok('today: an out-of-band tile shows its finding unfolded (' + label.trim() + ')',
         !!why && !!act, label.trim());
    });
    /* If the demo happens to contain no out-of-band tile, drive one the way a
       crewmember would: log a vision answer that is not "no change". */
    if (!checkedOne) {
      const sel = d.querySelector('#inds select');
      if (sel && sel.options.length > 1) {
        sel.value = sel.options[sel.options.length - 1].value;
        sel.dispatchEvent(new w.Event('input', { bubbles: true }));
        sel.dispatchEvent(new w.Event('change', { bubbles: true }));
        const t2 = Array.from(d.querySelectorAll('#inds .ind'))
          .filter(n => ['watch', 'alert'].includes(n.getAttribute('data-band')))[0];
        ok('today: a logged out-of-band self-check appears', !!t2);
        if (t2) {
          ok('today: and it shows its finding without being opened',
             !!t2.querySelector(':scope > .why') && !!t2.querySelector(':scope > .act'),
             t2.getAttribute('data-band'));
        }
      }
    }
  }());

  (function checksRunIsOneAction() {
    const { d, w } = boot();
    const host = d.getElementById('due');
    ok('checks: the card exists', !!host);
    if (!host) return;
    const text = (host.textContent || '').replace(/\s+/g, ' ');

    const run = d.getElementById('runChecks');
    if (run) {
      ok('checks: the run button says what to do', /start/i.test(run.textContent));
      ok('checks: the card states how many are outstanding', /check(s)? to do/i.test(text), text.slice(0, 90));
      ok('checks: and what it will cost', /minute|few minutes/i.test(text), text.slice(0, 120));
      ok('checks: the cost is marked as an estimate',
         /estimated|~/.test(text), text.slice(0, 120));
    } else {
      ok('checks: with nothing due it says so loudly', /nothing due/i.test(text), text.slice(0, 90));
    }

    /* Effort figures must never masquerade as sourced numbers. */
    const e = w.HealthModel.effortFor('mood');
    ok('checks: effort carries origin none', e && e.origin === 'none', JSON.stringify(e));
    ok('checks: and says it is not measured', /not measured/i.test(e.originNote));
  }());

  (function fitModeCannotStrandContent() {
    const { d } = boot();
    const css = Array.from(d.querySelectorAll('style')).map(n => n.textContent).join('\n');
    ok('fit: the page itself is pinned in fit mode', /body\.fit\{[^}]*overflow:\s*hidden/.test(css));
    ['viewHealth', 'viewChallenge', 'viewCreate', 'viewSources'].forEach(function (id) {
      const re = new RegExp('#' + id + '\\.fit[^{]*\\{[^}]*overflow:\\s*(auto|scroll|hidden)');
      ok('fit: #' + id + ' declares how it overflows when pinned', re.test(css));
    });
  }());

  (function emergencyDimDoesNotSwallowTheStatusPopover() {
    const { d } = boot();
    const hdr = d.querySelector('header');
    const btn = d.getElementById('statusBtn');
    ok('emergency: header and status button exist', !!hdr && !!btn);
    if (!hdr || !btn) return;

    d.body.classList.add('emergency');
    btn.click();
    ok('emergency: opening the status popover lifts the header dim',
       hdr.classList.contains('nodim'),
       'header class=' + hdr.className);
    ok('emergency: the popover is actually open', !d.getElementById('statusMenu').hasAttribute('hidden'));

    btn.click();
    ok('emergency: closing it restores the dim', !hdr.classList.contains('nodim'));
    d.body.classList.remove('emergency');
  }());

  (function stackingContextIsNotATrap() {
    const { d } = boot();
    const wrap = d.querySelector('.wrap');
    ok('stacking: .wrap exists', !!wrap);

    const dock = d.getElementById('evoDock');
    if (dock) {
      ok('stacking: the EVO dock is inside .wrap, not a body child',
         !!dock.closest('.wrap'),
         'parent=' + (dock.parentNode && (dock.parentNode.className || dock.parentNode.tagName)));
    }

    const menu = d.getElementById('statusMenu');
    ok('stacking: the status popover exists', !!menu);
    const zMenu = parseInt((menu.getAttribute('style') || '').match(/z-index:\s*(\d+)/)?.[1] || '0', 10);
    const zDock = dock
      ? parseInt((dock.getAttribute('style') || '').match(/z-index:\s*(\d+)/)?.[1] || '0', 10)
      : 0;
    ok('stacking: the popover outranks the dock', zMenu > zDock, 'menu=' + zMenu + ' dock=' + zDock);

    /* And it must still sit UNDER the true full-screen modals. */
    const tour = d.getElementById('tour');
    if (tour) {
      const zTour = parseInt((tour.getAttribute('style') || '').match(/z-index:\s*(\d+)/)?.[1] || '0', 10);
      ok('stacking: full-screen overlays still outrank the popover',
         zTour > zMenu, 'tour=' + zTour + ' menu=' + zMenu);
    }
  }());

  (function sleepAndCycleAreHonest() {
    const st = api.state;
    st.modules.cycle = true;
    st.prefs.cycleStart = '2026-11-03';
    api.state = st;
    api.setView('health');

    /* --- the night --- */
    const night = d.getElementById('sleepNight');
    ok('sleep: the night panel draws when the tab opens',
       !!(night && night.querySelectorAll('path').length >= 2), night && night.innerHTML.length);
    ok('sleep: a week of rings is shown',
       night.querySelectorAll('svg').length >= 7, String(night.querySelectorAll('svg').length));
    const nt = night.textContent.replace(/\s+/g, ' ');
    ['Went to bed', 'Woke up', 'Asleep after', 'N3 deep sleep', 'REM', 'Bedtime regularity']
      .forEach(k => ok('sleep: "' + k + '" is reported', nt.indexOf(k) !== -1));

    /* No snore track, and the absence is stated rather than silent. A
       snore feature means holding the microphone open all night, and the
       app has never stored audio. */
    /* Scored the way sleep is scored now. The R&K four-stage non-REM
       scheme was superseded by the AASM manual in 2007, which merged
       stages 3 and 4 into N3 and renamed REM to stage R. */
    ['Awake', 'REM', 'N1', 'N2', 'N3'].forEach(st =>
      ok('sleep: stage "' + st + '" is on the hypnogram', nt.indexOf(st) !== -1));
    ok('sleep: it does not use the superseded stage 4',
       !/Stage 4|stage 3 and 4/i.test(nt));
    ok('sleep: cycles are marked', /cycle 1/.test(nt) && /cycle 3/.test(nt), nt.slice(0, 80));
    /* And it says what a wrist device can honestly claim. */
    ok('sleep: staging is called an estimate',
       /estimate/i.test(nt) && /EEG/.test(nt), nt.slice(0, 120));

    ok('sleep: no snore measurement is offered', !/snore[^s]*\d/i.test(nt));
    ok('sleep: the absence of a snore track is explained',
       /no snore track/i.test(nt) && /never stored audio/i.test(nt));

    /* --- the cycle --- */
    const btn = Array.from(d.querySelectorAll('#viewHealth .secbar button'))
      .filter(b => /cycle/i.test(b.textContent))[0];
    ok('cycle: it has its own section in My health', !!btn);
    if (btn) btn.click();
    const wheel = d.getElementById('cycleWheel');
    ok('cycle: the wheel is drawn', wheel.querySelectorAll('circle').length > 20,
       String(wheel.querySelectorAll('circle').length));
    const ct = wheel.textContent.replace(/\s+/g, ' ');
    ok('cycle: today’s cycle day is named', /CYCLE DAY/i.test(ct));

    /* The omission that matters: calendar arithmetic cannot locate
       ovulation, so the wheel must not assert one. */
    ok('cycle: no ovulation day is marked',
       !/ovulation day \d|fertile window (is|starts|opens)/i.test(ct), ct.slice(0, 120));
    ok('cycle: the omission is explained rather than silent',
       /no ovulation day on this wheel/i.test(ct));
    ok('cycle: it disclaims contraception and conception use',
       /not contraception/i.test(ct) || /contraception\s+or\s+conception guidance/i.test(ct));
    ok('cycle: nothing here is scored', /nothing here is scored/i.test(ct));

    /* And it follows the module, not the crew record's sex. */
    st.modules.cycle = false;
    st.prefs.cycleChosen = true;
    api.state = st;
    api.renderCycle();
    ok('cycle: hidden when the module is uninstalled',
       /not installed/i.test(d.getElementById('cycleWheel').textContent));
    st.modules.cycle = true;
    api.state = st;
    api.renderCycle();
    api.setView('today');
  }());

  (function dietaryIsAPickList() {
    /* It was a window.prompt taking free text. A crewmember typing "no
       dairy" while standingFlags() looks for "lactose" is how a
       restriction gets missed, so the list has to be pickable and the
       strings have to match. */
    api.setView('health');
    const ed = Array.from(d.querySelectorAll('.sfEdit'))
      .filter(b => b.getAttribute('data-k') === 'diet')[0];
    ok('diet: the dietary list is editable', !!ed);
    if (!ed) return;
    ed.click();
    const dp = d.getElementById('dietPicker');
    ok('diet: a picker opens', !!(dp && !dp.hasAttribute('hidden')));
    const opts = dp.querySelectorAll('[data-diet]');
    ok('diet: a full set of options is offered', opts.length >= 20, String(opts.length));

    /* Patterns, observances and exclusions are different kinds of fact
       even when they exclude the same food. */
    const groups = dp.textContent;
    ['PATTERN', 'OBSERVANCE', 'EXCLUDES'].forEach(g =>
      ok('diet: "' + g + '" is grouped separately', groups.indexOf(g) !== -1));
    ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Nut-free']
      .forEach(x => ok('diet: "' + x + '" is offered',
                       !!dp.querySelector('[data-diet="' + x + '"]')));

    /* No list of human diets is complete, so free text survives. */
    ok('diet: anything else can still be written in', !!d.getElementById('dietOther'));

    /* An allergy is a medical fact, not only a preference. */
    ok('diet: allergies are pointed at the medical record too',
       /medical record line as well/i.test(dp.textContent));

    const before = d.getElementById('standingBody').textContent;
    dp.querySelector('[data-diet="Halal"]').click();
    d.getElementById('dietDone').click();
    const after = d.getElementById('standingBody').textContent;
    ok('diet: a choice is kept', /Halal/.test(after), after.slice(0, 80));
    /* The old editor called renderFigure(), which stopped being where
       standing facts live; the card never refreshed. */
    ok('diet: the card refreshes after editing', after !== before);
    api.setView('today');
  }());

  (function adviceFollowsTheEnvironment() {
    /* The switch must change the advice as well as which indicators exist,
       or an offshore platform reads spaceflight wording. */
    const st = api.state;
    const k = Object.keys(st.log).sort().pop();
    st.log[k].bp_sys = 138; st.log[k].bp_dia = 88; st.log[k].hr = 112;
    api.state = st;

    function adviceIn(env) {
      const s2 = api.state; s2.env = env; api.state = s2;
      api.renderAll();
      return d.getElementById('alerts').textContent.replace(/\s+/g, ' ');
    }

    const iss = adviceIn('iss');
    ok('env: spaceflight wording is used in space',
       /flight surgeon|private medical conference/i.test(iss), iss.slice(0, 90));

    ['polar', 'vessel', 'offshore'].forEach(env => {
      const t = adviceIn(env);
      ok('env[' + env + ']: no spaceflight wording on Earth',
         !/flight surgeon|private medical conference/i.test(t), t.slice(0, 110));
      ok('env[' + env + ']: terrestrial wording is used instead',
         /duty doctor|scheduled medical call|support team/i.test(t), t.slice(0, 110));
    });

    /* The help clause has to be on screen, not only in the model. */
    const far = adviceIn('mars');
    ok('env: an urgent item carries the escalation clause',
       /NO EVACUATION/i.test(far), far.slice(0, 160));
    const near = adviceIn('iss');
    ok('env: and it says something different when help is close',
       /HELP IS CLOSE/i.test(near), near.slice(0, 160));

    /* Switching must show what it changed, or it looks cosmetic. */
    api.setView('now');
    const sel = d.getElementById('env');
    sel.value = 'iss'; sel.dispatchEvent(new w.Event('change'));
    sel.value = 'polar'; sel.dispatchEvent(new w.Event('change'));
    const diff = d.getElementById('envDiff');
    ok('env: a change summary appears', !!(diff && !diff.hasAttribute('hidden')));
    const dt = diff.textContent.replace(/\s+/g, ' ');
    ok('env: the summary names what was removed', /removed/i.test(dt), dt.slice(0, 140));
    ok('env: the summary names the escalation change',
       /Escalation moved/i.test(dt), dt.slice(0, 200));

    const s3 = api.state; s3.env = 'iss'; api.state = s3;
    api.renderAll(); api.setView('today');
  }());

  (function standingFactsAreCompleteAndNotDuplicated() {
    api.setView('health');
    const sb = d.getElementById('standingBody');
    const rows = sb.textContent.replace(/\s+/g, ' ');
    ['DIETARY', 'ALLERGIES AND INTOLERANCES', 'SPECIFIC REQUIREMENTS',
     'ON THE MEDICAL RECORD', 'CARRIED IN THE MEDICAL KIT']
      .forEach(r => ok('standing: "' + r + '" is on the You section', rows.indexOf(r) !== -1));

    /* The cycle had a full editor here AND its own section, so the same
       state.prefs.cycleStart had two date inputs on one tab. */
    /* Target the You section by name: an earlier test may have left the
       Cycle section open, and that one has a date input by design. */
    const you = d.getElementById('sec-health-profile');
    ok('standing: the You section exists', !!you);
    eq('standing: no duplicate cycle editor on the You section',
       you ? you.querySelectorAll('input[type="date"]').length : -1, 0);

    /* Allergies get a pick-list for the same reason the diet does:
       standingFlags() matches stored strings against a suggestion, and
       free text does not match reliably. */
    const ed = Array.from(d.querySelectorAll('.sfEdit'))
      .filter(b => b.getAttribute('data-k') === 'allergies')[0];
    ok('allergies: the list is editable', !!ed);
    if (ed) {
      ed.click();
      const dp = d.getElementById('dietPicker');
      ok('allergies: a picker opens', !!(dp && !dp.hasAttribute('hidden')));
      ok('allergies: a full set is offered', dp.querySelectorAll('[data-chip]').length >= 25,
         String(dp.querySelectorAll('[data-chip]').length));
      ['Peanut', 'Penicillin', 'Latex', 'Lactose'].forEach(a =>
        ok('allergies: "' + a + '" is offered', !!dp.querySelector('[data-chip="' + a + '"]')));
      ok('allergies: severity is left to the flight surgeon',
         /medical record, with the flight surgeon/i.test(dp.textContent));
      dp.querySelector('[data-chip="Penicillin"]').click();
      d.getElementById('chipDone').click();
      ok('allergies: the choice is kept',
         /Penicillin/.test(d.getElementById('standingBody').textContent));
    }
    api.setView('today');
  }());

  (function firstRunWalkthrough() {
    /* Someone meeting this cold has no way to know My health has five
       sections or that the environment lives in Personalise. Shown once,
       then a button in Sources — not a permanent tab, which would cost a
       slot in a tab bar already carrying seven. */
    const tour = d.getElementById('tour');
    ok('tour: the dialog exists', !!tour);
    if (!tour) return;

    api.state.prefs.tourSeen = false;
    api.openTour();
    ok('tour: it opens', !tour.hasAttribute('hidden'));
    const steps = d.getElementById('tourBody').querySelectorAll('div[style*="border-bottom"]');
    eq('tour: five places, because five is what someone remembers', steps.length, 5);
    const txt = d.getElementById('tourBody').textContent.replace(/\s+/g, ' ');
    ['Today', 'My health', 'My challenges', 'Personalise', 'Sources']
      .forEach(t => ok('tour: "' + t + '" is covered', txt.indexOf(t) !== -1));
    /* The thing a cold user actually misses. */
    ok('tour: it warns that the section buttons are easy to miss',
       /easy to miss/i.test(txt), txt.slice(0, 120));

    d.getElementById('tourClose').click();
    ok('tour: closing hides it', tour.hasAttribute('hidden'));
    ok('tour: and it does not come back', api.state.prefs.tourSeen === true);
    ok('tour: it is reachable again from Sources', !!d.getElementById('tourAgain'));
    ok('tour: it is not a tab',
       !Array.from(d.querySelectorAll('#views [role="tab"]'))
         .some(b => /tour|guide|how it works|this app/i.test(b.textContent)));
  }());

  (function emergencyActionLeadsSomewhere() {
    /* "Take me to it" called setView('today') and scrollIntoView. The
       crewmember is usually already on Today, and the page is pinned with
       overflow:hidden, so nothing moved and the button did nothing. */
    const st = api.state;
    const k = Object.keys(st.log).sort().pop();
    const keep = JSON.parse(JSON.stringify(st.log[k]));
    st.log[k].hr = 132; st.log[k].bp_sys = 150;
    api.state = st;
    api.renderAll();
    api.setView('today');

    const go = d.getElementById('bandGo');
    ok('band: the action button is there', !!go);
    if (go) {
      go.click();
      const sheet = d.getElementById('alertSheet');
      ok('band: it opens the finding itself',
         !!(sheet && !sheet.hasAttribute('hidden')));
      ok('band: the sheet names the reading',
         !!(sheet && /mmHg|bpm|blood pressure|heart rate/i.test(sheet.textContent)),
         sheet ? sheet.textContent.slice(0, 90) : 'no sheet');
      const close = d.getElementById('asClose');
      if (close) close.click();
    }
    st.log[k] = keep;
    api.state = st;
    api.renderAll();
  }());

  (function nothingShowsTheEmptyRecordAnswer() {
    /* The example data seeds AFTER the first render, so everything derived
       from the log was drawing the empty-record answer and never correcting
       itself. Mission day was the visible symptom — it read 1 while the
       record held 120 days — but the streak, the trends and the sleep night
       were all in the same state. */
    const days = Object.keys(api.state.log).length;
    ok('boot: the example record is loaded', days > 30, String(days));

    const md = d.getElementById('mday');
    ok('boot: mission day is derived, not a constant',
       md && md.textContent !== '141', md && md.textContent);
    const n = parseInt(md.textContent, 10);
    ok('boot: mission day matches the record it is drawn from',
       n > 1 && Math.abs(n - days) <= 1, md.textContent + ' vs ' + days);

    const streak = d.getElementById('streak');
    ok('boot: the streak is not the empty-record answer',
       !!(streak && streak.textContent.trim() !== '0'), streak && streak.textContent);

    api.setView('health');
    const night = d.getElementById('sleepNight');
    ok('boot: the sleep night drew from the record',
       night.querySelectorAll('path').length >= 2);

    /* And it has to follow the arrival date once one is set. */
    const st = api.state;
    st.prefs.missionStart = '2026-07-01';
    api.state = st;
    api.renderAll();
    ok('boot: mission day follows the arrival date',
       d.getElementById('mday').textContent !== String(n),
       d.getElementById('mday').textContent);
    delete st.prefs.missionStart;
    api.state = st;
    api.renderAll();
    api.setView('today');
  }());

  (function sectionsRepairThemselves() {
    /* The user reported My health sections rendering completely blank.
       placeCards() relocates cards at boot and some renderers rebuild
       their host, so a card named in the section map can end up outside
       its section after the one-time build. Blank is the worst failure
       available: indistinguishable from a missing feature. */
    d.getElementById('tab-health').click();
    const box = d.querySelector('#viewHealth .sec[data-sec="sleep"]');
    ok('sections: the sleep section exists', !!box);
    if (!box) return;

    /* Move a card out, the way placeCards would. */
    d.getElementById('healthSlot').appendChild(d.getElementById('cardSleep'));
    ok('sections: the card really left its section',
       d.getElementById('cardSleep').closest('.sec').getAttribute('data-sec') !== 'sleep');

    d.getElementById('tab-today').click();
    d.getElementById('tab-health').click();
    eq('sections: revisiting reclaims it',
       d.getElementById('cardSleep').closest('.sec').getAttribute('data-sec'), 'sleep');

    /* Trends, Sleep and Cycle are DRAWN, not written. They are drawn at
       boot while hidden, so unless show() re-runs their renderer the card
       is present and completely blank. Assert that opening each one
       actually puts content on the screen. */
    ['Trends', 'Sleep', 'Cycle', 'Record'].forEach(function (label) {
      const btn = Array.from(d.querySelectorAll('#viewHealth .secbar button'))
        .filter(b => b.textContent === label)[0];
      ok('sections: ' + label + ' has a button', !!btn);
      if (!btn) return;
      btn.click();
      const sec = d.querySelector('#viewHealth .sec[data-sec="' + btn.getAttribute('data-go') + '"]');
      const text = (sec.textContent || '').replace(/\s+/g, ' ').trim();
      ok('sections: ' + label + ' draws something when opened',
         text.length > 40, label + ' len=' + text.length);

      /* textContent is NOT enough: [hidden]{display:none!important} blanks a
         card on screen while jsdom still reads its text. That is precisely
         how the reading-level toggle blanked these sections through a green
         suite. Assert nothing in the open section is hidden. */
      const hid = Array.from(sec.querySelectorAll('[hidden]'))
        .filter(n => !n.hasAttribute('data-sec-empty'));
      ok('sections: ' + label + ' has no hidden card in it',
         hid.length === 0, label + ' hidden: ' + hid.map(n => n.id || n.tagName).join(','));
      ok('sections: ' + label + ' is not itself hidden', !sec.hasAttribute('hidden'));
      ok('sections: ' + label + ' is not the empty-section note',
         !/NOTHING TO SHOW HERE/i.test(text), text.slice(0, 70));
      ok('sections: ' + label + ' did not fail to draw',
         !/THIS SECTION DID NOT DRAW/i.test(text), text.slice(0, 70));
    });

    Array.from(d.querySelectorAll('#viewHealth .secbar button'))
      .filter(b => b.textContent === 'Sleep')[0].click();

    /* And if one is genuinely empty, it must say so rather than render
       nothing at all. Move the contents out rather than deleting them:
       cards get RELOCATED by placeCards, not destroyed, and a deleted
       card could never be reclaimed by anything. */
    const stash = d.getElementById('healthSlot');
    while (box.firstChild) stash.appendChild(box.firstChild);
    Array.from(d.querySelectorAll('#viewHealth .secbar button'))
      .filter(b => b.textContent === 'Sleep')[0].click();
    ok('sections: an empty section explains itself',
       /NOTHING TO SHOW HERE/i.test(box.textContent), box.textContent.slice(0, 60));
    ok('sections: and points at the build stamp',
       /stamp/i.test(box.textContent));

    d.getElementById('tab-today').click();
    d.getElementById('tab-health').click();
    ok('sections: it repairs after being emptied',
       box.textContent.indexOf('NOTHING TO SHOW') === -1,
       box.textContent.slice(0, 60));
    d.getElementById('tab-today').click();
  }());

  (function buildIsStamped() {
    const st = d.getElementById('buildStamp');
    ok('build: the page says which build it is', !!st && /Build /.test(st.textContent),
       st && st.textContent);
    /* The suite reads index.html, where the placeholder is still present;
       build.py substitutes it. Either way the raw token must never reach
       a reader. */
    ok('build: the raw placeholder never reaches the page',
       !!st && st.textContent.indexOf('__BUILD__') === -1, st && st.textContent);
  }());

  (function createIsTwoPanes() {
    d.getElementById('tab-create').click();
    const panel = d.getElementById('viewCreate');
    ok('create: it is split, not sectioned', panel.classList.contains('split'));
    ok('create: it has no section bar', !panel.querySelector(':scope > .secbar'));

    const left = panel.querySelector(':scope > .cpane-l');
    const right = panel.querySelector(':scope > .cpane-r');
    ok('create: both panes exist', !!(left && right));
    if (!left || !right) return;

    ok('create: the prompt is on the left',
       !!left.querySelector('#createPrompt'), left.textContent.slice(0, 50));
    ok('create: the buttons are on the left', !!left.querySelector('#makeWrite'));
    ok('create: the result is on the right', !!right.querySelector('#createOut'));

    /* Nothing loose outside the panes. */
    const stray = Array.from(panel.children).filter(n => !n.classList.contains('cpane'));
    ok('create: nothing sits outside the two panes', stray.length === 0,
       stray.map(n => n.id || n.tagName).join(', '));

    /* Empty must explain itself, and must clear when something is made. */
    ok('create: the empty result pane says what it is waiting for',
       /NOTHING MADE YET/i.test(right.textContent), right.textContent.slice(0, 50));
    d.getElementById('createPrompt').value = 'the EVA week';
    d.getElementById('makeWrite').click();
    ok('create: the result lands in the right pane',
       right.textContent.trim().length > 100, String(right.textContent.trim().length));
    ok('create: the placeholder clears itself',
       !right.querySelector('[data-cpane-empty]'));
    d.getElementById('tab-today').click();
  }());

  (function unsourcedMetricsShowTheirTag() {
    /* Declaring it in the model is not enough: the chip has to be on the
       screen beside the number, the same as every other threshold. */
    d.getElementById('tab-health').click();
    Array.from(d.querySelectorAll('#viewHealth .secbar button'))
      .filter(b => b.textContent === 'Sleep')[0].click();
    const sleep = d.getElementById('sleepNight').textContent.replace(/\s+/g, ' ');
    ok('provenance: sleep regularity carries the no-threshold tag',
       /No threshold/i.test(sleep), sleep.slice(-120));
    ok('provenance: and names the window as the team’s choice',
       /90-minute window chosen by this team/i.test(sleep));

    d.getElementById('tab-challenge').click();
    const chal = d.getElementById('challengeBody').textContent.replace(/\s+/g, ' ');
    if (/AGAINST YOUR OWN NORM/.test(chal)) {
      ok('provenance: activity deviation carries the no-threshold tag',
         /No threshold/i.test(chal), chal.slice(0, 140));
      ok('provenance: and names the cut-offs as the team’s convention',
         /25% and 50%/.test(chal));
    }
    d.getElementById('tab-today').click();
  }());

  report();
}

function report() {
  /* The page runs a one-second interval; without closing the window node
     never exits and the suite looks like it hung. */
  CLOSE();
  console.log('\nUI tests');
  console.log('  passed: ' + pass);
  if (failures.length) {
    console.log('  FAILED: ' + failures.length);
    failures.forEach(f => console.log('    - ' + f));
    process.exitCode = 1;
  } else {
    console.log('  all green');
  }
}

run();
process.exit(process.exitCode || 0);
