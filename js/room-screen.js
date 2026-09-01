// ===================== THE ROOM SCREEN =====================
// The display at a room's door, or on its lectern: one slide, full screen,
// for the session in the room now or next. The slides live in the room's
// folder under images/rooms, each named for the minute it takes the screen
// on a 24-hour clock (HH_MM.png), and 00_00.png opens the day. A slide may
// be a short clip instead (HH_MM.mp4), which loops silently for as long as
// it is up. The page reads the clock twice a second and puts up the latest
// slide whose minute has come, so it is opened at the start of the day and
// left alone.
// Nothing here fetches anything but the slides beside the page: a room's
// computer may be showing a copy of the site from its own disk, with no
// internet at all.
//
// Each room's page hands over its folder and slide names in
// window.ROOM_SCREEN before this script runs. The names are restated from
// the folder by hand, because a browser cannot list a folder: a slide
// added there needs its name added to the page as well.
//
// ?t=14:05 pretends it is that time and ticks on from there, the same
// rehearsal clock live.html reads. Under it a corner tag names the pretend
// time and the slide chosen for it; otherwise nothing but the slide is on
// screen.
(function() {
  const setup = window.ROOM_SCREEN || {};
  const folder = String(setup.folder || '').replace(/\/+$/, '');
  const names = Array.isArray(setup.slides) ? setup.slides : [];
  const stage = document.getElementById('stage');
  const tag = document.getElementById('testTag');

  // ---- the clock ----
  // Only the time of day matters. ?t=14:05 pretends it is that time, for
  // checking the day's slides ahead of the day, and ticks on from there;
  // past midnight it wraps to the start of the day, as the real clock would.
  const parts = window.location.search.match(/[?&]t=(\d{1,2})(?::|%3[Aa])(\d{1,2})\b/);
  const asked = parts &&
    parseInt(parts[1], 10) < 24 && parseInt(parts[2], 10) < 60 ? parts : null;
  const askedFrom = asked ? Date.now() : 0;
  const askedBase = asked
    ? (parseInt(asked[1], 10) * 60 + parseInt(asked[2], 10)) * 60
    : 0;

  function daySeconds() {
    if (asked) {
      const gone = Math.floor((Date.now() - askedFrom) / 1000);
      // A system clock stepped backwards must not read as a negative time
      return ((askedBase + gone) % 86400 + 86400) % 86400;
    }
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  }

  // 09:05:07, for the rehearsal tag
  function clockText(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return (h < 10 ? '0' : '') + h + ':' +
      (m < 10 ? '0' : '') + m + ':' +
      (s < 10 ? '0' : '') + s;
  }

  // ---- the slides ----
  // Each name becomes the second of the day its slide starts, in clock
  // order. A name that is not HH_MM is reported and skipped rather than
  // left to miss quietly; the .png is optional, so a folder listing pastes
  // straight in, a clip keeps its .mp4, and a repeat is folded away.
  const slides = [];
  const seen = {};
  names.forEach(function(name) {
    const m = String(name).trim().match(/^(\d{2})_(\d{2})(\.png|\.mp4|\.webm)?$/i);
    if (!m || parseInt(m[1], 10) > 23 || parseInt(m[2], 10) > 59) {
      console.error('Not a slide time, expected HH_MM: ' + name);
      return;
    }
    const file = m[1] + '_' + m[2] + (m[3] || '.png');
    if (seen[file]) return;
    seen[file] = true;
    slides.push({
      file: file,
      at: (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) * 60,
      video: /\.(mp4|webm)$/i.test(file),
      el: null,
      loaded: false,
      failed: false,
      retryIn: 0
    });
  });
  slides.sort(function(a, b) { return a.at - b.at; });
  if (!slides.length) console.error('ROOM_SCREEN names no slides');

  // ---- which slide, and putting it up ----
  let wanted = null;   // the slide the clock asks for
  let showing = null;  // the slide on screen
  let pending = null;  // the slide on its way up
  let revealToken = 0;

  // The latest slide whose minute has come. Before the first one's minute,
  // which 00_00.png leaves no room for, the first slide stands in rather
  // than an empty screen.
  function pick(seconds) {
    let found = null;
    for (let i = 0; i < slides.length && slides[i].at <= seconds; i++) {
      found = slides[i];
    }
    return found || slides[0] || null;
  }

  // The latest loaded slide before this one, for when it cannot go up
  function standInFor(slide) {
    for (let i = slides.indexOf(slide) - 1; i >= 0; i--) {
      if (slides[i].loaded) return slides[i];
    }
    return null;
  }

  function reveal(slide) {
    if (slide === pending) return;
    if (slide === showing) {
      // Asked for the slide already up, so whatever else was on its way
      // up is no longer wanted: its paint has to land as a no-op, and a
      // clip already set going is stopped
      if (pending) {
        if (pending.video) pending.el.pause();
        revealToken++;
        pending = null;
      }
      return;
    }
    pending = slide;
    const token = ++revealToken;
    let painted = false;
    function paint() {
      if (painted) return;
      painted = true;
      // The clock moved on while this one was getting ready
      if (token !== revealToken) {
        if (slide.video && slide !== pending && slide !== showing) slide.el.pause();
        return;
      }
      slides.forEach(function(other) {
        other.el.hidden = other !== slide;
        // A clip off screen has no business running
        if (other.video && other !== slide && !other.el.paused) other.el.pause();
      });
      showing = slide;
      pending = null;
    }
    // Made ready before it goes up, so the swap is one clean frame rather
    // than a blank one: a picture is decoded first, a clip is wound back
    // to its first frame and set going first. A browser holds both for a
    // page it is not showing until the page is back on screen, so the
    // wait is capped: past it the slide goes up regardless, and the sync
    // decoding flag below keeps even that swap whole for a picture.
    window.setTimeout(paint, 1500);
    if (slide.video) {
      try { slide.el.currentTime = 0; } catch (e) {}
      const starting = slide.el.play();
      if (starting && starting.then) starting.then(paint, paint); else paint();
    } else if (slide.el.decode) {
      slide.el.decode().then(paint, paint);
    } else {
      paint();
    }
  }

  function tick() {
    const seconds = daySeconds();
    const next = pick(seconds);
    if (next && next !== wanted) {
      wanted = next;
      // One still loading stays wanted, and its load handler puts it up
      // the moment it lands; until then the screen keeps what it has
      if (next.loaded) reveal(next);
    }
    // One that has failed to load, though, may leave nothing to keep: the
    // page may have opened on it. The latest loaded slide before it stands
    // in until a retry lands. A slide merely still loading gets no stand-in,
    // so a slow start does not flash the morning's slide first.
    if (wanted && wanted.failed && !wanted.loaded) {
      const standIn = standInFor(wanted);
      if (standIn) reveal(standIn);
    }
    // A clip on screen that has stopped, as a browser does to save power
    // while the page was hidden, is set going again
    if (showing && showing.video && showing.el.paused) {
      const again = showing.el.play();
      if (again && again.catch) again.catch(function() {});
    }
    if (tag && asked) {
      tag.textContent = '?t= clock ' + clockText(seconds) + '  showing ' +
        (showing ? showing.file : 'nothing yet') +
        (wanted && wanted !== showing
          ? (wanted.failed ? '  (missing ' : '  (loading ') + wanted.file + ')'
          : '');
    }
  }

  // Every slide of the day is in the page from the start, hidden until
  // its minute: an img, or for a clip a video. The browser fetches them
  // all up front, so a swap later in the day is a toggle rather than a
  // request that could stall.
  slides.forEach(function(slide) {
    const el = document.createElement(slide.video ? 'video' : 'img');
    el.className = 'room-slide';
    el.draggable = false;
    el.hidden = true;
    if (slide.video) {
      // Silent, which is what lets a browser start it with nobody behind
      // the request, and looping; it is set going only when it goes up
      el.muted = true;
      el.defaultMuted = true;
      el.loop = true;
      el.playsInline = true;
      el.preload = 'auto';
      el.disablePictureInPicture = true;
      el.setAttribute('disableremoteplayback', '');
    } else {
      el.alt = '';
      // Painted only once it is unpacked, never as a blank frame first
      el.decoding = 'sync';
    }
    // A picture is ready once it has landed whole, a clip once it can play
    el.addEventListener(slide.video ? 'canplay' : 'load', function() {
      slide.loaded = true;
      slide.failed = false;
      slide.retryIn = 0;
      if (slide === wanted) reveal(slide);
    });
    el.addEventListener('error', function() {
      // A miss is a name that matches no file, which never mends, or a
      // server hiccup, which usually does: try again, less and less often
      slide.loaded = false;
      slide.failed = true;
      slide.retryIn = Math.min(slide.retryIn ? slide.retryIn * 2 : 15000, 5 * 60 * 1000);
      console.error('Could not load ' + folder + '/' + slide.file +
        ', trying again in ' + Math.round(slide.retryIn / 1000) + 's');
      window.setTimeout(function() {
        el.removeAttribute('src');
        el.src = folder + '/' + slide.file;
        if (slide.video) el.load();
      }, slide.retryIn);
    });
    slide.el = el;
    if (stage) stage.appendChild(el);
  });

  // The slide the clock wants right now is asked for first, and marked
  // urgent where the browser understands that, so the first paint waits
  // on one file rather than on the whole folder sharing the connection.
  // The rest follow behind it.
  const first = pick(daySeconds());
  if (first) first.el.fetchPriority = 'high';
  [first].concat(slides).forEach(function(slide) {
    if (slide && !slide.el.getAttribute('src')) {
      slide.el.src = folder + '/' + slide.file;
    }
  });

  if (tag) tag.hidden = !asked;
  tick();
  window.setInterval(tick, 500);
})();

// ===================== FULLSCREEN =====================
// The same module live.html carries. The screens are set up by the venue's
// AV crew, who open the page and walk away: nobody thinks to press F11,
// and the browser's header has no place on a door screen. So the page asks
// for the screen itself: once outright on load, which a browser normally
// refuses without a person behind the request, and then again on the
// first click or key press, which it honours. Until one of those lands,
// the corner hint says what to press.
//
// F11 is not the fullscreen API and sets no fullscreenElement, so being
// full screen is also read off the window filling the display: a screen
// already set up right, by F11 or a kiosk shell, never shows the hint.
(function() {
  const hint = document.getElementById('fullscreenHint');
  const root = document.documentElement;

  function isFullscreen() {
    if (document.fullscreenElement) return true;
    // A window that has no size yet answers 0 for everything, and 0 of 0
    // must not read as filling the screen
    return window.innerWidth > 0 && window.innerHeight > 0 &&
      window.innerWidth >= screen.width - 2 &&
      window.innerHeight >= screen.height - 2;
  }

  function askForScreen() {
    if (isFullscreen()) return;
    if (root.requestFullscreen) {
      const asking = root.requestFullscreen({ navigationUI: 'hide' });
      // Refusal is the expected answer until somebody presses something
      if (asking && asking.catch) asking.catch(function() {});
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    }
  }

  function updateHint() {
    const up = isFullscreen();
    if (hint) hint.hidden = up;
    // The pointer is hidden on this page, nobody points at a door screen,
    // but somebody who has to click wants to see what they are aiming
    document.body.classList.toggle('tv-windowed', !up);
  }

  askForScreen();

  // Any press will do. Escape is how somebody leaves fullscreen on
  // purpose, so it alone never asks for the screen back.
  document.addEventListener('click', askForScreen);
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') askForScreen();
  });

  document.addEventListener('fullscreenchange', updateHint);
  window.addEventListener('resize', updateHint);
  updateHint();

  // Pulsing all day would make the corner the loudest thing on the screen;
  // two minutes is plenty to catch the eye of whoever set it up
  if (hint) {
    window.setTimeout(function() {
      hint.classList.add('is-settled');
    }, 2 * 60 * 1000);
  }
})();
