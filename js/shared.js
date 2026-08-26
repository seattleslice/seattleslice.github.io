// ===================== GOOGLE SHEETS IMPORT =====================
function GSheetsapi({ apiKey, sheetId, sheetName, sheetNumber = 1 }) {
  try {
    const sheetNameStr = sheetName && sheetName !== '' ? encodeURIComponent(sheetName) : `Sheet${sheetNumber}`;
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetNameStr}?dateTimeRenderOption=FORMATTED_STRING&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&key=${apiKey}`;

    return fetch(sheetsUrl)
      .then(response => {
        if (!response.ok) {
          console.log('there is an error in the gsheets response');
          throw new Error('Error fetching GSheet');
        }
        return response.json();
      })
      .then(data => data)
      .catch(err => {
        throw new Error(
          'Failed to fetch from GSheets API. Check your Sheet Id and the public availability of your GSheet.'
        );
      });
  } catch (err) {
    throw new Error(`General error when fetching GSheet: ${err}`);
  }
}

function processGSheetResults(
  JSONResponse,
  returnAllResults,
  filter,
  filterOptions,
  startRow
) {
  const data = JSONResponse.values;
  if (typeof startRow === 'undefined') startRow = 3;

  let processedResults = [{}];
  let colNames = {};

  for (let i = 0; i < data.length; i++) {
    // Rows
    const thisRow = data[i];

    for (let j = 0; j < thisRow.length; j++) {
      // Columns/cells
      const cellValue = thisRow[j];
      const colNameToAdd = colNames[j]; // this will be undefined on the first pass

      if (i < startRow) {
        colNames[j] = cellValue;
        continue; // skip the header row(s)
      }

      if (typeof processedResults[i] === 'undefined') {
        processedResults[i] = {};
      }

      if (typeof colNameToAdd !== 'undefined' && colNameToAdd.length > 0) {
        processedResults[i][colNameToAdd] = cellValue;
      }
    }
  }

  // make sure we're only returning valid, filled data items
  processedResults = processedResults.filter(
    result => Object.keys(result).length
  );

  // if we're not filtering, then return all results
  if (returnAllResults || !filter) {
    return processedResults;
  }

  return filterResults(processedResults, filter, filterOptions);
}

function gsheetProcessor(options, callback, onError) {
  const { apiKey, sheetId, sheetName, sheetNumber, returnAllResults, filter, filterOptions, startRow } = options;

  if (!options.apiKey || options.apiKey === undefined) {
    throw new Error('Missing Sheets API key');
  }

  return GSheetsapi({
    apiKey,
    sheetId,
    sheetName,
    sheetNumber
  })
    .then(result => {
      const filteredResults = processGSheetResults(
        result,
        returnAllResults || false,
        filter || false,
        filterOptions || {
          operator: 'or',
          matching: 'loose'
        },
        startRow
      );

      callback(filteredResults);
    });
}

// ===================== SPEAKERS FROM GOOGLE SHEET =====================
// One public spreadsheet holds a tab per year: "Speakers2026", "Speakers2025".
const SPEAKERS_SHEET_ID = "1idfs0hL8dM0vwXtdph3Md1EIlc4__sClZyYjpAIyGBQ";
const SPEAKERS_API_KEY = "AIzaSyD4ZoTrXMfF7mhAMVNNiensNsWL5XC6Sqo";

var speakers = [];

// Setting a background image inline replaces the gradient placeholder even
// when the file is missing, which leaves an empty circle. So only swap the
// headshot in once the browser has actually loaded it.
function setHeadshot(el, url) {
  if (!el) return;

  el.style.backgroundImage = '';
  el.dataset.headshot = url || '';
  if (!url) return;

  const probe = new Image();
  probe.onload = function() {
    // The overlay avatar gets reused, so make sure this is still the speaker
    // being shown by the time the image arrives.
    if (el.dataset.headshot === url) {
      el.style.backgroundImage = "url('" + url + "')";
    }
  };
  probe.src = url;
}

// Takes the tab to read, and returns the fetch promise so callers can react
// when the sheet is unreachable.
function loadSpeakers(sheetName, callback) {
  const year = (String(sheetName).match(/\d{4}/) || [''])[0];

  return gsheetProcessor(
    {
      sheetId: SPEAKERS_SHEET_ID,
      sheetName: sheetName,
      sheetNumber: 1,
      returnAllResults: true,
      apiKey: SPEAKERS_API_KEY,
      startRow: 1
    },
    (results) => {
      const loaded = [];

      results.forEach((result) => {
        if (result["Name"]) {
          loaded.push({
            name: result["Name"] || '',
            year: year,
            sessions: result["Sessions"] || '',
            company: result["Company"] || '',
            title: result["Title"] || '',
            x: result["X"] || '',
            facebook: result["Facebook"] || '',
            instagram: result["Instagram"] || '',
            bluesky: result["Bluesky"] || '',
            tiktok: result["TikTok"] || '',
            youtube: result["YouTube"] || '',
            twitch: result["Twitch"] || '',
            website: result["Website"] || '',
            bio: result["Bio"] || '',
            linkedin: result["Speakers LinkedIn"] || '',
            headshotUrl: result["Headshot URL"] || '',
            shortDescriptor: result["Very Short Descriptor (Company/games list)"] || ''
          });
        }
      });

      speakers = loaded;
      if (callback) callback(loaded);
    }
  );
}

// ===================== SESSIONS FROM GOOGLE SHEET =====================
// Only the sessions we can render in full are kept - see loadSessions.
var sessions = [];

const SESSION_SEATS = ['Moderator/Speaker', 'Seat 1', 'Seat 2', 'Seat 3'];

// A seat usually names one person, but a roundtable can put several in the one
// cell - "Eileen Tanner; Chris Brundage" - and means what side by side seats
// mean. Semicolons and not commas, so a name that carries a comma of its own -
// "Darlene Mortel Edouard, PhD" - is still read as the one person.
function seatSpeakers(cell, bySpeakerName) {
  return (cell || '')
    .split(';')
    .map(name => bySpeakerName.get(name.trim()))
    .filter(Boolean);
}

// Reads the sessions tab and keeps a session when the sheet has a synopsis for
// it and at least one seat names a speaker we imported. A seat naming somebody
// we know nothing about is dropped from the lineup rather than taking the whole
// session down with it.
//
// The schedule has reason to be the more forgiving of the two: a room standing
// empty at 2:45 because the sheet is one synopsis short reads as a hole in the
// day rather than as a session still being written up. It asks for
// { requireSynopsis: false } and shows the row with nothing under the title.
function loadSessions(sheetName, speakerList, callback, options) {
  const requireSynopsis = !options || options.requireSynopsis !== false;
  const bySpeakerName = new Map();
  (speakerList || []).forEach(speaker => bySpeakerName.set(speaker.name.trim(), speaker));

  return gsheetProcessor(
    {
      sheetId: SPEAKERS_SHEET_ID,
      sheetName: sheetName,
      sheetNumber: 1,
      returnAllResults: true,
      apiKey: SPEAKERS_API_KEY,
      startRow: 1
    },
    (results) => {
      const loaded = [];

      results.forEach((result) => {
        const title = (result["Title"] || '').trim();
        const synopsis = (result["Synopsis"] || '').trim();
        if (!title) return;
        if (requireSynopsis && !synopsis) return;

        const lineup = [];
        SESSION_SEATS.forEach(seat => {
          seatSpeakers(result[seat], bySpeakerName).forEach(speaker => {
            // Somebody named twice - a shared cell and a seat of their own -
            // is still the one seat at the table
            if (lineup.indexOf(speaker) === -1) lineup.push(speaker);
          });
        });

        if (!lineup.length) return;

        loaded.push({
          title: title,
          format: (result["Format"] || '').trim(),
          // Where and when, as the sheet writes them. Only the schedule reads
          // these, and it does its own parsing - a roundtable that runs twice
          // carries both of its starts in the one cell, and both of its tables
          // in the other when the two sittings are not at the same one.
          time: (result["Time"] || '').trim(),
          room: (result["Room"] || '').trim(),
          synopsis: synopsis,
          speakers: lineup
        });
      });

      sessions = loaded;
      if (callback) callback(loaded);
    }
  );
}

// The sessions a speaker appears in, in whatever order the shared list is
// currently in - sheet order, or the order the day runs in on a page that has
// laid a schedule out (see the sort at the end of scheduleRender).
function sessionsForSpeaker(speaker) {
  if (!speaker) return [];
  return sessions.filter(session => session.speakers.indexOf(speaker) !== -1);
}

// ===================== WHAT A CLICK BELONGS TO =====================
// The arrows on the overlay walk the run the panel was opened from, so they can
// only reach what the reader could have clicked instead. This is how a caller
// works that run out: the elements matching `selector` inside `box` that are on
// screen right now, in the order they are shown.
//
// offsetParent goes null the moment anything above an element is display:none,
// so a slot the tabs are not showing, a format that is not the open one and a
// collapsed half of the speaker grid all drop out of it together, without any
// of them having to be known about here.
//
// Declared here and called from js/schedule.js, js/sessions.js and the page
// scripts, all of which load before this file. That is fine - nothing calls it
// until something is clicked.
function overlayVisible(box, selector) {
  if (!box) return [];

  return Array.prototype.filter.call(
    box.querySelectorAll(selector),
    function(el) { return el.offsetParent !== null; }
  );
}

// ===================== SCROLL REVEAL =====================
// A section fades up once 15% of it is on screen. A section taller than about
// six windows can never show 15% of itself at once, though, and would sit at
// opacity 0 for good - so for those the first sight of it is the cue instead.
// The Sessions section grows that tall when the schedule is asked for the whole
// day; watching for the 0 crossing as well as the 15% one is what catches it.
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const unreachable = entry.rootBounds &&
      entry.target.offsetHeight * 0.15 > entry.rootBounds.height;

    if (entry.intersectionRatio >= 0.15 || (entry.isIntersecting && unreachable)) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: [0, 0.15] });

revealEls.forEach(el => revealObserver.observe(el));

// ===================== ROBOT MASCOT ANIMATION =====================
(function() {
  const robotMascot = document.getElementById('robotMascot');
  const robotRig = document.getElementById('robotRig');
  const robotArm = document.getElementById('robotArm');

  if (!robotMascot || !robotRig || !robotArm) return;

  let robotAnimId = null;
  let robotIdleId = null;
  let robotAnimating = false;

  // Slide the robot in after 1 second, already doing idle animation
  setTimeout(() => {
    robotMascot.classList.add('entered');
    DoAnimation();
  }, 1000);

  // Gentle idle sway
  function startIdleAnimation() {
    let t = 0;
    function idleTick() {
      t += 0.02;
      const bodyAngle = Math.sin(t * 0.7) * 1.5;
      const armAngle = Math.sin(t * 1.1 + 0.5) * 3;
      robotRig.style.transform = `rotate(${bodyAngle}deg)`;
      robotArm.style.transform = `rotate(${armAngle}deg)`;
      robotIdleId = requestAnimationFrame(idleTick);
    }
    idleTick();
  }

  function stopIdleAnimation() {
    if (robotIdleId) {
      cancelAnimationFrame(robotIdleId);
      robotIdleId = null;
    }
  }

  // Teaching animation
  function DoAnimation() {
    if (robotAnimating) return;
    robotAnimating = true;
    stopIdleAnimation();

    const duration = 3000;
    const start = performance.now();

    function animTick(now) {
      const elapsed = now - start;
      const p = elapsed / duration;

      if (p >= 1) {
        robotRig.style.transform = 'rotate(0deg)';
        robotArm.style.transform = 'rotate(0deg)';
        robotAnimating = false;
        startIdleAnimation();
        return;
      }

      const envelope = Math.sin(p * Math.PI);
      const bodyAngle = envelope * Math.sin(p * Math.PI * 6) * 4;
      const armAngle = envelope * (Math.sin(p * Math.PI * 8) * 12 - 5);

      robotRig.style.transform = `rotate(${bodyAngle}deg)`;
      robotArm.style.transform = `rotate(${armAngle}deg)`;
      robotAnimId = requestAnimationFrame(animTick);
    }
    robotAnimId = requestAnimationFrame(animTick);
  }

  // Hover triggers animation on desktop, tap on mobile
  robotMascot.addEventListener('mouseenter', DoAnimation);
  robotMascot.addEventListener('touchstart', DoAnimation, { passive: true });

  // Scroll indicator click (if present on page)
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (scrollIndicator) {
    scrollIndicator.addEventListener('click', DoAnimation);
  }

  // Trigger DoAnimation on large scroll events
  let lastScrollY = window.scrollY;
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const delta = Math.abs(window.scrollY - lastScrollY);
      if (delta > 400) {
        DoAnimation();
      }
      lastScrollY = window.scrollY;
    }, 150);
  });

  // Expose DoAnimation globally for page-specific use
  window.DoAnimation = DoAnimation;
})();

// ===================== BOTTOM CHARACTERS ANIMATION =====================
(function() {
  const container = document.getElementById('bottomCharacters');
  if (!container) return;

  const chars = container.querySelectorAll('.bottom-char');
  if (!chars.length) return;

  // Pivot point: percentage from top of image. The image is shifted
  // down so this point sits at the bottom of the screen.
  const pivotY = 90; // %
  const offsetY = 100 - pivotY; // how far to push image down

  // Per-character state
  const state = Array.from(chars).map((el, i) => ({
    el,
    img: el.querySelector('img'),
    idleId: null,
    animId: null,
    animating: false,
    // Offset each character's phase so they don't sway in unison
    phase: i * 2.1,
    // Base idle parameters (subtle)
    idleMaxRotation: 1.2,
    idleSpeed: 0.4 + i * 0.15
  }));

  // Hide characters while hero/intro video is in view, or while Jimothy
  // has the corner (see the Jimothy module below)
  const hero = document.getElementById('hero');
  let entered = false;

  function shouldShow() {
    if (window.jimothyHoldsCorner) return false;
    if (!hero) return true; // no hero on this page, just show
    return hero.getBoundingClientRect().bottom / window.innerHeight <= 0.85;
  }

  function updateVisibility() {
    const show = shouldShow();
    if (show && !entered) {
      entered = true;
      container.classList.add('entered');
    } else if (!show && entered) {
      entered = false;
      container.classList.remove('entered');
    }
  }

  // The Jimothy module nudges this when it takes or gives back the corner
  window.updateBottomCharsVisibility = updateVisibility;

  void container.offsetWidth; // force layout so transition triggers
  updateVisibility();
  window.addEventListener('scroll', updateVisibility, { passive: true });

  function setTransform(s, angle) {
    s.img.style.transform = 'translateY(' + offsetY + '%) rotate(' + angle + 'deg)';
  }

  function startIdleAnimation(s) {
    let t = s.phase;
    function tick() {
      t += 0.016;
      const angle = Math.sin(t * s.idleSpeed) * s.idleMaxRotation;
      setTransform(s, angle);
      s.idleId = requestAnimationFrame(tick);
    }
    tick();
  }

  function stopIdleAnimation(s) {
    if (s.idleId) {
      cancelAnimationFrame(s.idleId);
      s.idleId = null;
    }
  }

  // Click animation: brief excited rocking
  function doClickAnimation(s) {
    if (s.animating) return;
    s.animating = true;
    stopIdleAnimation(s);

    const duration = 1500;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const p = elapsed / duration;

      if (p >= 1) {
        setTransform(s, 0);
        s.animating = false;
        startIdleAnimation(s);
        return;
      }

      const envelope = Math.sin(p * Math.PI);
      const angle = envelope * Math.sin(p * Math.PI * 8) * 6;
      setTransform(s, angle);
      s.animId = requestAnimationFrame(tick);
    }
    s.animId = requestAnimationFrame(tick);
  }

  // Init idle animations
  state.forEach(s => {
    s.img.style.transformOrigin = '50% ' + pivotY + '%';
    startIdleAnimation(s);
  });

  // Detect hover via mousemove hit-testing (characters are behind
  // content in z-order, so normal mouseenter won't reach them)
  let lastHovered = null;
  document.addEventListener('mousemove', function(e) {
    if (!entered) return;
    let hit = null;
    for (let i = 0; i < state.length; i++) {
      const rect = state[i].el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        hit = state[i];
        break;
      }
    }
    if (hit && hit !== lastHovered) {
      doClickAnimation(hit);
    }
    lastHovered = hit;
  });

  // Mobile: tap anywhere near the characters triggers animation
  document.addEventListener('touchstart', function(e) {
    if (!entered) return;
    const touch = e.touches[0];
    for (let i = 0; i < state.length; i++) {
      const rect = state[i].el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        doClickAnimation(state[i]);
        break;
      }
    }
  }, { passive: true });
})();

// ===================== JIMOTHY EASTER EGG =====================
// Jimothy hides below the bottom-left corner and only comes up once the
// reader has scrolled the whole page: the three characters step aside
// first, then he rises with the body pivot resting on the bottom edge.
// Scrolling up at all reverses the swap.
(function() {
  const jimothyMascot = document.getElementById('jimothyMascot');
  const jimothyRig = document.getElementById('jimothyRig');
  const jimothyArm = document.getElementById('jimothyArm');
  const jimothyBase = document.getElementById('jimothyBase');

  if (!jimothyMascot || !jimothyRig || !jimothyArm || !jimothyBase) return;

  // ---- Rig -------------------------------------------------------------
  // All coordinates are pixels of the 262x257 body image, which is what the
  // container is sized to, so the maths holds at any rendered scale. Two points
  // are pinned: the body's (106,246) on the page bottom, and the base's (41,66)
  // BASE_OFFSET to its right and BASE_LIFT above it. The rod is a rigid link
  // from the body's shoulder to the base's socket, so body, rod and base form a
  // four bar linkage: one degree of freedom, everything else follows.
  //
  // The two pinned points and the rod's length decide each other: at rest every
  // piece must sit at its drawn angle, which means the shoulder has to be the
  // rod's own drop plus BASE_LIFT plus the socket's height above the page
  // bottom. The shoulder here is 131 px up while the rod and socket only reach
  // 119, which is why the base is lifted clear of the page bottom rather than
  // planted on it. Change any of these and rework the rest from that rule, or
  // the joints come apart.
  const BODY_PIVOT = { x: 106, y: 246 };   // meets the page bottom
  const SHOULDER = { x: 237, y: 115 };     // where the rod's top pins to the body
  const ARM_TOP = { x: 31, y: 42 };        // on the 100x105 rod image
  const ARM_BOTTOM = { x: 79, y: 101 };    // on the 100x105 rod image
  const BASE_SOCKET = { x: 41, y: 23 };    // on the 88x78 base image
  const BASE_PIVOT = { x: 41, y: 66 };     // the base's own fixed point
  const BASE_OFFSET = 179;                 // base pivot, right of the body pivot
  const BASE_LIFT = 29;                    // base pivot, above the page bottom

  // Body pivot to shoulder, rod top to rod bottom, base pivot to socket. The
  // socket is drawn straight above the base's pivot, which is what lets the
  // socket swing be a plain sin/cos of the tilt below.
  const shoulderRadius = Math.hypot(SHOULDER.x - BODY_PIVOT.x, SHOULDER.y - BODY_PIVOT.y);
  const rodLength = Math.hypot(ARM_BOTTOM.x - ARM_TOP.x, ARM_BOTTOM.y - ARM_TOP.y);
  const socketRadius = BASE_PIVOT.y - BASE_SOCKET.y;
  const restShoulderAngle = Math.atan2(SHOULDER.y - BODY_PIVOT.y, SHOULDER.x - BODY_PIVOT.x);
  const restRodAngle = Math.atan2(ARM_BOTTOM.y - ARM_TOP.y, ARM_BOTTOM.x - ARM_TOP.x);
  const DEG = 180 / Math.PI;

  // Tilt the base and solve the rest: the socket swings around the base's
  // pinned pivot, the shoulder has to be one rod length from it while staying
  // on its own circle around the body's pinned pivot, and the rod points from
  // one to the other. Origin is the body pivot, y downwards.
  function setPose(baseDeg) {
    const t = baseDeg / DEG;
    const socketX = BASE_OFFSET + socketRadius * Math.sin(t);
    const socketY = -BASE_LIFT - socketRadius * Math.cos(t);
    const reach = Math.hypot(socketX, socketY);

    // Circle intersection: distance along the socket direction to the chord,
    // then off to the side by half the chord. The near side is the one that
    // keeps Jimothy upright.
    const along = (reach * reach + shoulderRadius * shoulderRadius - rodLength * rodLength) / (2 * reach);
    const asideSq = shoulderRadius * shoulderRadius - along * along;
    const aside = asideSq > 0 ? Math.sqrt(asideSq) : 0;
    const shoulderX = (along * socketX + aside * socketY) / reach;
    const shoulderY = (along * socketY - aside * socketX) / reach;

    const bodyDeg = (Math.atan2(shoulderY, shoulderX) - restShoulderAngle) * DEG;
    const rodDeg = (Math.atan2(socketY - shoulderY, socketX - shoulderX) - restRodAngle) * DEG;

    jimothyRig.style.transform = `rotate(${bodyDeg}deg)`;
    // The rod hangs inside the rig, so it has already been turned by bodyDeg
    jimothyArm.style.transform = `rotate(${rodDeg - bodyDeg}deg)`;
    jimothyBase.style.transform = `rotate(${baseDeg}deg)`;
  }

  let jimothyAnimId = null;
  let jimothyIdleId = null;
  let jimothyAnimating = false;

  // Gentle idle waggle. The socket never leaves the rod's reach at any tilt, but
  // the body turns over at -26.4 degrees: tilt the base past that and he leans
  // back the other way instead of following it. Keep every amplitude inside it.
  function startIdleAnimation() {
    if (jimothyIdleId) return;
    let t = 0;
    let last = null;
    function idleTick(now) {
      // 1.2 a second, which is what 0.02 a frame came to at 60Hz, so a 120Hz
      // screen gets the same lazy waggle rather than one at double speed.
      // Capped so a tab coming back from the background does not lurch.
      const step = last === null ? 1 / 60 : Math.min((now - last) / 1000, 0.05);
      last = now;
      t += step * 1.2;
      setPose(Math.sin(t * 0.7) * 4.5 + Math.sin(t * 1.6 + 1) * 1.5);
      jimothyIdleId = requestAnimationFrame(idleTick);
    }
    jimothyIdleId = requestAnimationFrame(idleTick);
  }

  function stopIdleAnimation() {
    if (jimothyIdleId) {
      cancelAnimationFrame(jimothyIdleId);
      jimothyIdleId = null;
    }
  }

  // Excited waggle: he leans on the stick and the base rocks under it
  function DoJimothyAnimation() {
    if (jimothyAnimating) return;
    // He can sit under the pointer for a moment longer while he slides away,
    // and by then the exit has already parked the rig. Starting a loop here
    // would leave it running offstage for the rest of the visit.
    if (!jimothyMascot.classList.contains('entered')) return;
    jimothyAnimating = true;
    stopIdleAnimation();

    const duration = 3000;
    const start = performance.now();

    function animTick(now) {
      const p = (now - start) / duration;

      if (p >= 1) {
        jimothyAnimating = false;
        setPose(0);
        if (jimothyMascot.classList.contains('entered')) startIdleAnimation();
        return;
      }

      const envelope = Math.sin(p * Math.PI);
      setPose(envelope * Math.sin(p * Math.PI * 8) * 12);
      jimothyAnimId = requestAnimationFrame(animTick);
    }
    jimothyAnimId = requestAnimationFrame(animTick);
  }

  setPose(0);

  // Swap the corner between the three characters and Jimothy. The shared
  // slide transition spends most of its motion early, so a beat under a
  // second is enough for one act to be mostly offstage before the next
  // comes up.
  let atBottom = false;
  let swapTimer = null;

  function isAtBottom() {
    const doc = document.documentElement;
    return window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
  }

  function updateAtBottom() {
    const nowAtBottom = isAtBottom();
    if (nowAtBottom === atBottom) return;
    atBottom = nowAtBottom;
    clearTimeout(swapTimer);

    if (atBottom) {
      window.jimothyHoldsCorner = true;
      if (window.updateBottomCharsVisibility) window.updateBottomCharsVisibility();
      swapTimer = setTimeout(() => {
        jimothyMascot.classList.add('entered');
        DoJimothyAnimation();
      }, 900);
    } else {
      jimothyMascot.classList.remove('entered');
      swapTimer = setTimeout(() => {
        window.jimothyHoldsCorner = false;
        if (window.updateBottomCharsVisibility) window.updateBottomCharsVisibility();
        // He is off the bottom of the screen by now, so stop the rig until he
        // is called back up, and leave him parked at rest for the next entrance
        if (jimothyAnimId) cancelAnimationFrame(jimothyAnimId);
        jimothyAnimId = null;
        jimothyAnimating = false;
        stopIdleAnimation();
        setPose(0);
      }, 900);
    }
  }

  updateAtBottom();
  window.addEventListener('scroll', updateAtBottom, { passive: true });
  window.addEventListener('resize', updateAtBottom, { passive: true });

  // The sheet-fed speaker and session sections grow the page after load
  // without any scroll event firing, which would leave the at-bottom state
  // stale; watch the body the way the deeplink corrector does
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(updateAtBottom).observe(document.body);
  }

  // Hover triggers the excited animation on desktop, tap on mobile
  // (tapping also follows the link)
  jimothyMascot.addEventListener('mouseenter', DoJimothyAnimation);
  jimothyMascot.addEventListener('touchstart', DoJimothyAnimation, { passive: true });
})();

// ===================== SKYLINE =====================
(function() {
  const skyline = document.getElementById('skyline');
  if (!skyline) return;

  const hero = document.getElementById('hero');
  let entered = false;

  let ready = false;

  function updateVisibility() {
    if (!ready) return;
    if (!hero) {
      if (!entered) { entered = true; skyline.classList.add('entered'); }
      return;
    }
    const heroVisible = hero.getBoundingClientRect().bottom / window.innerHeight;
    if (heroVisible <= 0.85 && !entered) {
      entered = true;
      skyline.classList.add('entered');
    } else if (heroVisible > 0.85 && entered) {
      entered = false;
      skyline.classList.remove('entered');
    }
  }

  void skyline.offsetWidth;
  setTimeout(() => {
    ready = true;
    updateVisibility();
  }, 1000);
  window.addEventListener('scroll', updateVisibility, { passive: true });
})();

// ===================== SPEAKER OVERLAY =====================
(function() {
  const overlay = document.getElementById('speakerOverlay');
  const panel = document.getElementById('speakerPanel');
  const closeBtn = document.getElementById('speakerClose');
  const avatarEl = document.getElementById('speakerAvatar');
  const nameEl = document.getElementById('speakerNameDisplay');
  const roleEl = document.getElementById('speakerRole');
  const socialsEl = document.getElementById('speakerSocials');
  const bioEl = document.getElementById('speakerBio');
  const sessionsEl = document.getElementById('speakerSessions');
  const prevBtn = document.getElementById('speakerPrev');
  const nextBtn = document.getElementById('speakerNext');

  // The session side of the same scrim
  const sessionPanel = document.getElementById('sessionPanel');
  // The session panel's corner is a map button rather than a way out - see
  // buildSessionPanel in js/sessions.js. sessionClose is only still read for a
  // page held in a cache with the older markup, where it is the way out again.
  const sessionMapBtn = document.getElementById('sessionMap');
  const sessionCloseBtn = document.getElementById('sessionClose');
  const sessionFormatEl = document.getElementById('sessionFormat');
  const sessionTitleEl = document.getElementById('sessionTitle');
  const sessionSynopsisEl = document.getElementById('sessionSynopsis');
  const sessionLineupEl = document.getElementById('sessionLineup');
  // Read off the panel rather than by id, so the pages that write the panel out
  // by hand do not each need one adding
  const sessionRuleEl = sessionPanel ?
    sessionPanel.querySelector('.session-panel__rule') : null;

  if (!overlay || !closeBtn) return;

  // Which panel the scrim is showing, the run whoever opened it handed over,
  // and where in that run the panel currently sits. The arrows walk the run and
  // nothing else, so they can only reach what was on offer beside the thing
  // that was clicked.
  let mode = 'speaker';
  let currentRun = [];
  let currentIndex = -1;

  // Steps of the open and close sequences that are still pending. Reopening
  // while a close is in flight would otherwise let the old timers tear the
  // panel back down.
  let animTimers = [];

  function clearAnimTimers() {
    animTimers.forEach(clearTimeout);
    animTimers = [];
  }

  const SVG_ICONS = {
    x: '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>',
    bluesky: '<svg viewBox="0 0 24 24"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.593 3.494 6.21 3.16-.037.037-3.782 0-5.818 3.452 3.423 5.236 8.693 1.136 9.546-2.086l.04-.158c.088.338.164.644.221.868.854 3.221 6.124 7.322 9.547 2.086-2.036-3.452-5.782-3.415-5.819-3.452 2.618.334 5.426-.533 6.211-3.16.245-.828.624-5.789.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C13.44 4.73 11.087 8.687 12 10.8z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    // The play triangle is knocked out of the body rather than drawn on top of
    // it, so the background shows through and the icon stays legible.
    youtube: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    twitch: '<svg viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>',
    // A generic globe for personal sites
    website: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
  };

  // Where a bare handle lives for each network
  const SOCIAL_BASES = {
    x: 'https://x.com/',
    linkedin: 'https://www.linkedin.com/in/',
    bluesky: 'https://bsky.app/profile/',
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    tiktok: 'https://www.tiktok.com/@',
    youtube: '',
    twitch: 'https://www.twitch.tv/'
  };

  // The sheet is filled in by hand, so a cell can hold a full URL, a bare
  // domain, an @handle, or several handles separated by spaces.
  function socialUrl(value, iconKey) {
    if (!value) return '';

    var raw = String(value).trim().split(/\s+/)[0];
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    var base = SOCIAL_BASES[iconKey];
    var handle = raw.replace(/^@/, '');

    // A personal site is just a domain, with no handle base to fall back to
    if (iconKey === 'website') {
      return handle.indexOf('.') !== -1 ? 'https://' + handle : '';
    }

    // Something like "instagram.com/name" - just needs a scheme
    if (raw.charAt(0) !== '@' && handle.indexOf('.') !== -1 && handle.indexOf('/') !== -1) {
      return 'https://' + handle;
    }

    if (!base) return '';

    // Bluesky handles are domains, and the common ones end in .bsky.social
    if (iconKey === 'bluesky' && handle.indexOf('.') === -1) {
      handle += '.bsky.social';
    }

    return base + handle;
  }

  function addSocialLink(container, value, title, iconKey) {
    var url = socialUrl(value, iconKey);
    if (!url) return;
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = title;
    a.innerHTML = SVG_ICONS[iconKey];
    container.appendChild(a);
  }

  // Fill the panel from a speaker data object, without touching the open or
  // close animation. Used both when opening and when stepping between speakers.
  function fillPanel(speaker) {
    nameEl.textContent = speaker.name;

    // A handful of bios in the sheet are just a link to a doc
    const bio = (speaker.bio || '').trim();
    bioEl.textContent = '';
    if (/^https?:\/\/\S+$/.test(bio)) {
      const bioLink = document.createElement('a');
      bioLink.href = bio;
      bioLink.target = '_blank';
      bioLink.rel = 'noopener noreferrer';
      bioLink.textContent = 'Read full bio';
      bioEl.appendChild(bioLink);
    } else {
      bioEl.textContent = bio;
    }
    bioEl.style.display = bio ? '' : 'none';

    // Title and company, skipping whichever one the sheet is missing
    if (roleEl) {
      const role = [speaker.title, speaker.company].filter(Boolean).join(', ');
      roleEl.textContent = role;
      roleEl.style.display = role ? '' : 'none';
    }

    if (sessionsEl) fillSpeakerSessions(speaker);

    setHeadshot(avatarEl, speaker.headshotUrl);

    socialsEl.innerHTML = '';
    addSocialLink(socialsEl, speaker.website, 'Website', 'website');
    addSocialLink(socialsEl, speaker.x, 'X / Twitter', 'x');
    addSocialLink(socialsEl, speaker.linkedin, 'LinkedIn', 'linkedin');
    addSocialLink(socialsEl, speaker.bluesky, 'Bluesky', 'bluesky');
    addSocialLink(socialsEl, speaker.facebook, 'Facebook', 'facebook');
    addSocialLink(socialsEl, speaker.instagram, 'Instagram', 'instagram');
    addSocialLink(socialsEl, speaker.tiktok, 'TikTok', 'tiktok');
    addSocialLink(socialsEl, speaker.youtube, 'YouTube', 'youtube');
    addSocialLink(socialsEl, speaker.twitch, 'Twitch', 'twitch');

    // A long bio can leave the panel scrolled part way down
    if (panel) panel.scrollTop = 0;
  }

  // The sessions the speaker is on, each one a way into that session's panel.
  // Pages without a sessions sheet fall back to the plain text the speakers
  // sheet carries in its own Sessions column.
  function fillSpeakerSessions(speaker) {
    const theirs = sessionsForSpeaker(speaker);
    const label = 'Sessions';

    sessionsEl.innerHTML = '';

    if (theirs.length) {
      const heading = document.createElement('strong');
      heading.textContent = label;
      sessionsEl.appendChild(heading);

      // Built the way a session is shown everywhere else - the same card with
      // the same chevron, rather than a line of underlined text
      theirs.forEach(session => {
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'speaker-overlay__session-link';

        const title = document.createElement('span');
        title.className = 'speaker-overlay__session-title';
        title.textContent = session.title;
        link.appendChild(title);

        const chevron = document.createElement('span');
        chevron.className = 'speaker-overlay__session-chevron';
        chevron.innerHTML = '&#9654;';
        link.appendChild(chevron);

        link.addEventListener('click', (e) => {
          e.stopPropagation();
          // The others listed on this panel, which is what was on offer
          openSessionOverlay(session, theirs);
        });
        sessionsEl.appendChild(link);
      });

      sessionsEl.style.display = '';
      return;
    }

    // The sheet separates multiple sessions with semicolons
    const listed = (speaker.sessions || '')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);

    if (listed.length) {
      const heading = document.createElement('strong');
      heading.textContent = label;
      sessionsEl.appendChild(heading);
      sessionsEl.appendChild(document.createTextNode(listed.join(' | ')));
      sessionsEl.style.display = '';
    } else {
      sessionsEl.style.display = 'none';
    }
  }

  // Where a session's map button would send the reader, and what the map calls
  // the place when it gets there. An empty place means there is nowhere to send
  // anybody and no button to show.
  //
  // The sheet writes a room per sitting - "5A, 5D" for a roundtable the day
  // holds twice - and the first of them is where it opens.
  //
  // The map answers for itself. The lookup lives beside the markers, in the
  // floor map's own script on the home page, so the schedule's word for a room
  // and the map's word for it never have to be kept in step here; a page
  // carrying no map answers nothing at all, and shows no button.
  function sessionMapAim(session) {
    const room = String((session && session.room) || '').split(',')[0].trim();
    if (!room || typeof window.sliceMapPlaceFor !== 'function') {
      return { room: '', place: '' };
    }
    return { room: room, place: window.sliceMapPlaceFor(room) };
  }

  // What the session panel is showing right now. A page that has to put the
  // panel back later - s.html, for the phone's Back button - asks for this
  // rather than working it out from the title on screen: the day carries
  // fixtures of its own (Speed Networking, the Creative Clinic) that are
  // built by the schedule and are in no sheet, so there is nothing to look
  // a name up in.
  let sessionShowing = null;
  window.sliceSessionShowing = function() { return sessionShowing; };

  // Fill the session side of the scrim: what it is, then who is on it
  function fillSessionPanel(session) {
    if (!sessionPanel) return;

    sessionShowing = session;

    // Where on the map this one is, if the page carries a map and the map
    // knows the room. Read once: the place on the line above the title and
    // the button in the corner are two ways to the same marker.
    const aim = sessionMapAim(session);

    // What it is, when it runs and where - "Panel - 9:30 - 10:15am - Auditorium"
    // for something running the once, "Roundtable - 4:45 - 5:30pm & 5:45 - 6:30pm - Table 5D" for
    // something the day holds twice. The when and the where come from the
    // schedule, so a page that has not loaded it shows the format alone.
    if (sessionFormatEl) {
      // Marked by what each part is rather than by where it falls, so the
      // hours of something with no format - the coffee, the playtest floor -
      // are still read as hours and not as the name of a format.
      const parts = [];
      if (session.format) parts.push({ text: session.format, aside: false });

      if (typeof scheduleWhenAndWhere === 'function') {
        const where = scheduleWhenAndWhere(session);
        where.forEach((part, at) => {
          parts.push({
            text: part,
            aside: true,
            // A pair is the hours and then the place. A single part is a
            // session that moves rooms between its sittings and carries them
            // inside its hours, where there is no one place to point at.
            place: where.length > 1 && at === where.length - 1
          });
        });
      }

      sessionFormatEl.innerHTML = '';

      parts.forEach((part, at) => {
        if (at) {
          const sep = document.createElement('span');
          sep.className = 'session-panel__sep';
          sep.textContent = '-';
          sessionFormatEl.appendChild(sep);
        }

        // The place is also the way to it: pressing it opens the venue map on
        // the room, which is the corner button's whole job. So it is a button
        // where there is a map with the room on it, and the plain text it has
        // always been everywhere else.
        const isWay = part.place && aim.place && sessionMapBtn;

        // The format keeps the line's own look. When and where are read rather
        // than glanced at, so they are set in the body face and the quieter
        // blue the times on a schedule row already use.
        const span = document.createElement(isWay ? 'button' : 'span');
        if (part.aside) span.className = 'session-panel__where';
        span.textContent = part.text;

        if (isWay) {
          span.type = 'button';
          span.classList.add('session-panel__place');
          // The words on it lead, so what it is called can be read out loud
          // and still be the thing somebody sees
          const label = part.text + ' - show on the venue map';
          span.setAttribute('aria-label', label);
          span.title = label;
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            // The corner button, pressed from a second place. The room, the
            // closing and everything that follows stay where they already are.
            sessionMapBtn.click();
          });
        }

        sessionFormatEl.appendChild(span);
      });

      sessionFormatEl.style.display = parts.length ? '' : 'none';
    }

    // The map button, which is only worth showing where this page has the map
    // and the map has the room. The room travels on the button rather than in
    // a variable out here, so a panel stepped along with the arrows carries its
    // own destination and cannot be left pointing at the session before it.
    if (sessionMapBtn) {
      sessionMapBtn.hidden = !aim.place;
      sessionMapBtn.dataset.room = aim.place ? aim.room : '';

      if (aim.place) {
        // "Show Allen Room on the venue map", "Show the Cafe on the venue map"
        const label = 'Show ' + aim.place + ' on the venue map';
        sessionMapBtn.setAttribute('aria-label', label);
        sessionMapBtn.title = label;
      }
    }

    sessionTitleEl.textContent = session.title;
    sessionSynopsisEl.textContent = session.synopsis || '';

    // The rule is the line-up's divider. Nothing is on the bill for the coffee
    // or the playtest floor, so there is nothing for it to divide.
    if (sessionRuleEl) sessionRuleEl.hidden = !session.speakers.length;

    sessionLineupEl.innerHTML = '';
    session.speakers.forEach(speaker => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'session-speaker';

      const avatar = document.createElement('span');
      avatar.className = 'session-speaker__avatar';
      setHeadshot(avatar, speaker.headshotUrl);
      card.appendChild(avatar);

      const name = document.createElement('span');
      name.className = 'session-speaker__name';
      name.textContent = speaker.name;
      card.appendChild(name);

      const role = document.createElement('span');
      role.className = 'session-speaker__role';
      role.textContent = speaker.shortDescriptor || speaker.title || speaker.company || '';
      card.appendChild(role);

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        // The rest of this line-up and no further. A session with one name on
        // it hands over a run of one, which is to say no arrows.
        openSpeakerOverlay(speaker, session.speakers);
      });

      sessionLineupEl.appendChild(card);
    });

    balanceLineup();
    sessionPanel.scrollTop = 0;
  }

  // Four faces in a panel with room for three read as three and a straggler.
  // Once the line-up has had to wrap at all, the rows are levelled instead: the
  // block is capped at what an even share needs, and stays centred in the
  // panel. Measured rather than worked out from widths, so it follows whatever
  // the stylesheet has the cards doing at this size.
  function balanceLineup() {
    if (!sessionLineupEl) return;

    // Cleared first, so what is measured is where the cards fall on their own
    sessionLineupEl.style.maxWidth = '';

    const cards = Array.prototype.slice.call(sessionLineupEl.children);
    if (cards.length < 3) return;

    const rows = new Set(cards.map(card => card.offsetTop)).size;
    if (rows < 2) return;

    const perRow = Math.ceil(cards.length / rows);
    if (perRow >= cards.length) return;

    // The widest card, not the first: a name with a long unbroken word in it -
    // "Khatchatourians" - pushes its card past the width the others settle at,
    // and a cap measured off a narrow one cannot hold a row that includes it.
    const widest = cards.reduce((most, card) =>
      Math.max(most, card.offsetWidth), 0);

    const gap = parseFloat(getComputedStyle(sessionLineupEl).columnGap) || 0;
    sessionLineupEl.style.maxWidth = (perRow * widest + (perRow - 1) * gap) + 'px';
  }

  // What the arrows may reach, and where in it the panel currently is. The
  // run comes from whoever opened the panel: the speakers on screen in the
  // grid, the names on one session's line-up, the rows in the slot being read.
  // Walking it can therefore never arrive somewhere a second click could not
  // have, which is the whole point of it.
  //
  // `at` is passed by callers that know the position outright. The same session
  // can appear twice in a run - a roundtable at both its sittings - and indexOf
  // would always hand back the first of them.
  function setRun(item, run, at) {
    currentRun = Array.isArray(run) ? run.filter(Boolean) : [];

    if (typeof at === 'number' && at >= 0 && at < currentRun.length) {
      currentIndex = at;
      return;
    }

    currentIndex = currentRun.indexOf(item);
  }

  function updateNav() {
    const show = currentRun.length > 1 && currentIndex !== -1;
    if (prevBtn) prevBtn.hidden = !show;
    if (nextBtn) nextBtn.hidden = !show;
  }

  // Step along the run the panel was opened from, wrapping at either end. The
  // run itself does not change - stepping is reading further along the same
  // shelf, not moving to another one.
  function stepItem(delta) {
    if (currentRun.length < 2 || currentIndex === -1) return;

    currentIndex = (currentIndex + delta + currentRun.length) % currentRun.length;

    if (mode === 'session') {
      fillSessionPanel(currentRun[currentIndex]);
    } else {
      fillPanel(currentRun[currentIndex]);
    }
  }

  function showPanelFor(nextMode) {
    mode = nextMode;
    if (panel) panel.hidden = nextMode !== 'speaker';
    if (sessionPanel) sessionPanel.hidden = nextMode !== 'session';

    // One pair of arrows serves both panels, so what a screen reader is told
    // they step through has to change with the panel under them.
    const what = nextMode === 'session' ? 'session' : 'speaker';
    if (prevBtn) prevBtn.setAttribute('aria-label', 'Previous ' + what);
    if (nextBtn) nextBtn.setAttribute('aria-label', 'Next ' + what);
  }

  function raiseScrim() {
    // The arrows and the inactive panel were display:none, so let that state be
    // computed before the fade starts. Otherwise they snap straight to full
    // opacity while the panel fades in behind them.
    void overlay.offsetWidth;

    overlay.classList.add('active');
    overlay.classList.add('is-shown');
  }

  // `run` is what the arrows may reach from here and `at` where in it this one
  // sits. Opening without a run - a lone card written into the page - means no
  // arrows, which is right: there is nothing beside it to reach.
  function openSpeakerOverlay(speaker, run, at) {
    clearAnimTimers();
    showPanelFor('speaker');
    fillPanel(speaker);
    setRun(speaker, run, at);
    updateNav();
    raiseScrim();
  }
  window.openSpeakerOverlay = openSpeakerOverlay;

  function openSessionOverlay(session, run, at) {
    if (!sessionPanel) return;

    clearAnimTimers();
    showPanelFor('session');
    fillSessionPanel(session);
    setRun(session, run, at);
    updateNav();
    raiseScrim();
  }
  window.openSessionOverlay = openSessionOverlay;

  // Open overlay from a hardcoded HTML card (data attributes, used by index.html)
  function openOverlayFromCard(card) {
    openSpeakerOverlay({
      name: card.dataset.name || '',
      bio: card.dataset.bio || '',
      headshotUrl: card.dataset.image || '',
      x: card.dataset.twitter ? 'https://x.com/' + card.dataset.twitter : '',
      linkedin: '',
      bluesky: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      twitch: card.dataset.twitch || '',
      website: card.dataset.website || ''
    });
  }

  // The panel and the backdrop fade out together. 'active' comes off only once
  // that has finished, since it is what makes the overlay visible at all.
  function closeOverlay() {
    // Already leaving. Without this a held Escape re-arms the timer on every
    // repeat, and the scrim - which is what swallows clicks on the page behind
    // it - can be kept up for as long as the key is down.
    if (!overlay.classList.contains('is-shown')) return;

    clearAnimTimers();
    overlay.classList.remove('is-shown');

    // The run goes now rather than with the fade. Nothing should be able to
    // step a panel that is on its way out.
    currentRun = [];
    currentIndex = -1;

    animTimers.push(setTimeout(() => {
      overlay.classList.remove('active');
    }, 120));
  }

  // Attach click to any hardcoded speaker cards already in the DOM
  document.querySelectorAll('.speaker-card').forEach(card => {
    card.addEventListener('click', () => openOverlayFromCard(card));
  });

  closeBtn.addEventListener('click', closeOverlay);
  if (sessionCloseBtn) sessionCloseBtn.addEventListener('click', closeOverlay);

  // The map button puts the panel away and hands the room to the floor map,
  // which opens itself on the level it is on, pins its marker and brings the
  // whole plan into view - the same thing a card under the map does.
  //
  // stopPropagation matters twice over: the scrim behind takes a click as a
  // close, and the map's own document listener takes a click landing outside
  // the plan as a dismissal, which would throw away the popup just pinned.
  if (sessionMapBtn) {
    sessionMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const room = sessionMapBtn.dataset.room;
      closeOverlay();
      if (room && typeof window.sliceMapShowRoom === 'function') {
        window.sliceMapShowRoom(room);
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepItem(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stepItem(1);
    });
  }

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === overlay.querySelector('::before')) {
      closeOverlay();
    }
  });

  // A panel open while the window changes size has to be levelled again - the
  // number of cards a row holds is the whole basis for it.
  window.addEventListener('resize', () => {
    if (mode === 'session' && overlay.classList.contains('is-shown')) {
      balanceLineup();
    }
  });

  // Capture phase, and the press is stopped once it has been used. The tab bars
  // do their own arrow handling, and while a panel is open one press must step
  // the panel rather than also moving a bar the reader cannot see behind the
  // scrim - which would leave the panel walking a slot that is no longer up.
  document.addEventListener('keydown', (e) => {
    // 'is-shown' comes off the moment closing starts, where 'active' hangs on
    // for the fade. Gating on it stops the arrows walking a panel that is
    // already leaving.
    if (!overlay.classList.contains('is-shown')) return;

    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    const closing = e.key === 'Escape' || e.key === 'Backspace';
    if (!step && !closing) return;

    e.preventDefault();
    e.stopPropagation();

    if (closing) closeOverlay();
    else stepItem(step);
  }, true);
})();
