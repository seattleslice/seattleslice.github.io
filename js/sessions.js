// ===================== SESSIONS SECTION =====================
// The whole Sessions section - its markup, the panel a row opens, and the
// sheet it reads - in one place, so the home page and s.html show the same
// thing without either one having to render the other.
//
// A page says where the section goes:
//
//   <div data-sessions></div>
//
// and includes this file BEFORE shared.js. shared.js reads the session panel's
// elements as it starts, and both the section and the panel are put in place
// the moment this file runs.
//
// Once the page has a speaker list, the section is filled in with:
//
//   buildSessions(speakers);
//
// A page with no speaker list of its own can let the section fetch one:
//
//   buildSessionsFromSheet();
//
// Anything a page wants to say differently is set on the placeholder, which
// is how s.html can part ways with the home page without a second copy of
// any of this:
//
//   <div data-sessions data-title="Sessions" data-note="More soon!"
//        data-sheet="Sessions2026" data-speakers-sheet="Speakers2026"></div>

const SESSIONS_DEFAULTS = {
  title: 'Sessions',
  note: 'With more announced soon!',
  sheet: 'Sessions2026',
  speakersSheet: 'Speakers2026'
};

// What the placeholder asked for, over the defaults above
var sessionsConfig = Object.assign({}, SESSIONS_DEFAULTS);

// ===================== MARKUP =====================
// The tabs and the list are built empty. What goes in them waits on the sheet,
// which is buildSessions below.
function buildSessionsSection(config) {
  const section = document.createElement('section');
  section.className = 'section reveal';
  section.id = 'sessions';

  if (config.title) {
    const heading = document.createElement('h2');
    heading.className = 'section__title';
    heading.textContent = config.title;
    section.appendChild(heading);
  }

  // One button per format, filled in once the sheet says which formats are on
  // the bill. The pill behind the buttons is placed by script.
  const tabs = document.createElement('div');
  tabs.className = 'session-tabs';
  tabs.id = 'sessionTabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Session formats');
  tabs.hidden = true;

  const glider = document.createElement('span');
  glider.className = 'session-tabs__glider';
  glider.id = 'sessionTabsGlider';
  glider.setAttribute('aria-hidden', 'true');
  tabs.appendChild(glider);
  section.appendChild(tabs);

  const list = document.createElement('div');
  list.className = 'sessions-list';
  list.id = 'sessionsList';
  section.appendChild(list);

  if (config.note) {
    const note = document.createElement('p');
    note.className = 'section-note sessions-note';
    note.textContent = config.note;
    section.appendChild(note);
  }

  return section;
}

// The panel a row opens. It shares the scrim with the speaker panel, so it is
// hung off the same overlay rather than given one of its own.
function buildSessionPanel() {
  const panel = document.createElement('div');
  panel.className = 'speaker-overlay__panel speaker-overlay__panel--session';
  panel.id = 'sessionPanel';
  panel.hidden = true;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'speaker-overlay__close';
  close.id = 'sessionClose';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '&times;';
  panel.appendChild(close);

  const format = document.createElement('p');
  format.className = 'session-panel__format';
  format.id = 'sessionFormat';
  panel.appendChild(format);

  const title = document.createElement('h2');
  title.className = 'speaker-overlay__name';
  title.id = 'sessionTitle';
  panel.appendChild(title);

  const synopsis = document.createElement('p');
  synopsis.className = 'speaker-overlay__bio';
  synopsis.id = 'sessionSynopsis';
  panel.appendChild(synopsis);

  const rule = document.createElement('div');
  rule.className = 'session-panel__rule';
  panel.appendChild(rule);

  const lineup = document.createElement('div');
  lineup.className = 'session-panel__lineup';
  lineup.id = 'sessionLineup';
  panel.appendChild(lineup);

  return panel;
}

// Put both in place as this file runs, which is before shared.js goes looking
// for either the .reveal sections or the panel's elements.
(function() {
  const placeholder = document.querySelector('[data-sessions]');

  if (placeholder) {
    const asked = placeholder.dataset;
    ['title', 'note', 'sheet', 'speakersSheet'].forEach(function(key) {
      if (asked[key] !== undefined) sessionsConfig[key] = asked[key];
    });

    placeholder.parentNode.replaceChild(
      buildSessionsSection(sessionsConfig), placeholder);
  }

  const overlay = document.getElementById('speakerOverlay');
  if (overlay && !document.getElementById('sessionPanel')) {
    overlay.appendChild(buildSessionPanel());
  }
})();

// ===================== FILLING IT IN =====================
// A session is listed when the sheet gives it a synopsis and at least one seat
// names a speaker we imported. There are far too many for one list, so they
// are split by format behind a row of tabs. A row still shows only the title -
// the format and the lineup wait for the panel.
function buildSessions(speakers) {
  const section = document.getElementById('sessions');
  const list = document.getElementById('sessionsList');
  const tabsEl = document.getElementById('sessionTabs');
  const glider = document.getElementById('sessionTabsGlider');
  if (!section || !list) return;

  // The tabs we expect, in the order they are shown. A format the sheet has
  // picked up since gets a tab of its own after these, rather than dropping
  // its sessions off the page.
  const KNOWN_FORMATS = [
    { key: 'panel', label: 'Panels' },
    { key: 'lecture', label: 'Lectures' },
    { key: 'microtalk', label: 'Micro-talks' },
    { key: 'roundtable', label: 'Roundtables' }
  ];
  const DEFAULT_FORMAT = 'panel';

  // How long the rows take to leave, the step between the ones arriving,
  // and how long the list spends resizing between the two sets.
  const OUT_MS = 120;
  const STAGGER_MS = 24;
  const STAGGER_MAX_MS = 180;
  const HEIGHT_MS = 350;

  function hideSection() {
    section.style.display = 'none';
    const divider = section.nextElementSibling;
    if (divider && divider.classList.contains('divider')) {
      divider.style.display = 'none';
    }
  }

  // No speakers means nothing can pass the seat check
  if (!speakers || !speakers.length) {
    hideSection();
    return;
  }

  // "Micro-talk", "micro talk" and "Microtalks" are all the one format
  function formatKey(format) {
    return String(format || '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');
  }

  // A format we did not expect is labelled from what the sheet called it
  function formatLabel(format) {
    const known = KNOWN_FORMATS.filter(function(entry) {
      return entry.key === formatKey(format);
    })[0];
    if (known) return known.label;

    const raw = String(format || '').trim();
    if (!raw) return 'Other';
    return /s$/i.test(raw) ? raw : raw + 's';
  }

  function buildRow(session) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'session-row';

    const text = document.createElement('span');
    text.className = 'session-row__text';

    const title = document.createElement('span');
    title.className = 'session-row__title';
    title.textContent = session.title;
    text.appendChild(title);

    const names = session.speakers.map(function(speaker) {
      return speaker.name;
    }).join(', ');

    if (names) {
      // A plain space between the two, so a row too narrow to hold both
      // can still break where the title ends
      text.appendChild(document.createTextNode(' '));

      const lineup = document.createElement('span');
      lineup.className = 'session-row__speakers';
      lineup.textContent = names;
      text.appendChild(lineup);
    }

    row.appendChild(text);

    const chevron = document.createElement('span');
    chevron.className = 'session-row__chevron';
    chevron.innerHTML = '&#9654;';
    row.appendChild(chevron);

    row.addEventListener('click', function() {
      openSessionOverlay(session);
    });

    return row;
  }

  const groups = new Map();
  let tabs = [];
  let activeKey = '';
  let outTimer = 0;
  let settleTimer = 0;
  let gliderPending = false;

  function reducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // The pill is placed from the button it sits behind, so it follows
  // whatever the labels have wrapped to at this width. Instant while the
  // window is being resized - it has no move of its own to make there.
  function moveGlider(instant) {
    if (!glider || !tabs.length) return;

    const active = tabs.filter(function(tab) {
      return tab.dataset.formatKey === activeKey;
    })[0];
    if (!active || !active.offsetWidth) return;

    if (instant) glider.style.transition = 'none';
    glider.style.width = active.offsetWidth + 'px';
    glider.style.height = active.offsetHeight + 'px';
    glider.style.transform =
      'translate(' + active.offsetLeft + 'px, ' + active.offsetTop + 'px)';
    if (instant) {
      void glider.offsetWidth;
      glider.style.transition = '';
    }

    tabsEl.classList.add('session-tabs--glide');
  }

  function syncTabs(instant) {
    tabs.forEach(function(tab) {
      const on = tab.dataset.formatKey === activeKey;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      // Roving focus: Tab reaches the row of buttons, the arrow keys move
      // along it.
      tab.tabIndex = on ? 0 : -1;
      if (on) list.setAttribute('aria-labelledby', tab.id);
    });

    moveGlider(instant);
  }

  // Show one format's rows and hide the rest. The arriving rows are stepped
  // in one after another, which is what the delay is for.
  function showRows(key, animate) {
    let shown = 0;

    groups.forEach(function(group) {
      const on = group.key === key;

      group.rows.forEach(function(row) {
        row.classList.remove('session-row--out');
        row.classList.remove('session-row--in');
        row.style.animationDelay = '';
        row.hidden = !on;
        if (!on) return;

        if (animate) {
          row.style.animationDelay =
            Math.min(shown * STAGGER_MS, STAGGER_MAX_MS) + 'ms';
          row.classList.add('session-row--in');
        }
        shown++;
      });
    });
  }

  function swapTo(key, animate) {
    if (!groups.has(key) || key === activeKey) return;

    activeKey = key;
    syncTabs(!animate);

    clearTimeout(outTimer);
    clearTimeout(settleTimer);

    if (!animate || reducedMotion()) {
      list.classList.remove('is-swapping');
      list.style.height = '';
      showRows(key, false);
      return;
    }

    // What the list stands at now. The next format is only measured once
    // the old rows have gone, so the two heights are the ends of the move.
    const startHeight = list.offsetHeight;

    list.querySelectorAll('.session-row:not([hidden])').forEach(function(row) {
      row.classList.remove('session-row--in');
      row.style.animationDelay = '';
      row.classList.add('session-row--out');
    });

    outTimer = setTimeout(function() {
      list.classList.remove('is-swapping');
      list.style.height = '';
      showRows(key, true);

      const endHeight = list.offsetHeight;
      list.classList.add('is-swapping');
      list.style.height = startHeight + 'px';
      void list.offsetHeight;
      list.style.height = endHeight + 'px';

      // Clipping is only wanted while the height is moving - at rest the
      // rows need the room outside the box for their hover glow. A timer
      // rather than transitionend, which goes missing when a second tab is
      // pressed part way through.
      settleTimer = setTimeout(function() {
        list.classList.remove('is-swapping');
        list.style.height = '';
      }, HEIGHT_MS + 60);
    }, OUT_MS);
  }

  function buildTabs(ordered) {
    ordered.forEach(function(group) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'session-tab';
      tab.id = 'sessionTab-' + (group.key || 'other');
      tab.dataset.formatKey = group.key;
      tab.textContent = group.label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('aria-controls', 'sessionsList');
      tab.tabIndex = -1;

      tab.addEventListener('click', function() {
        swapTo(group.key, true);
      });

      tabsEl.appendChild(tab);
      tabs.push(tab);
    });

    list.setAttribute('role', 'tabpanel');
    tabsEl.hidden = false;

    tabsEl.addEventListener('keydown', function(e) {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();

      let at = 0;
      tabs.forEach(function(tab, i) {
        if (tab.dataset.formatKey === activeKey) at = i;
      });

      const next = tabs[(at + step + tabs.length) % tabs.length];
      next.focus();
      swapTo(next.dataset.formatKey, true);
    });

    // The buttons move when the row rewraps, and again when Bungee arrives
    // and every label changes width, so the pill is placed again for both.
    window.addEventListener('resize', function() {
      if (gliderPending) return;
      gliderPending = true;
      window.requestAnimationFrame(function() {
        gliderPending = false;
        moveGlider(true);
      });
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        moveGlider(true);
      });
    }
  }

  const loading = loadSessions(sessionsConfig.sheet, speakers, function(sessions) {
    if (!sessions.length) {
      hideSection();
      return;
    }

    sessions.forEach(function(session) {
      const key = formatKey(session.format);
      let group = groups.get(key);

      if (!group) {
        group = { key: key, label: formatLabel(session.format), rows: [] };
        groups.set(key, group);
      }

      const row = buildRow(session);
      group.rows.push(row);
      list.appendChild(row);
    });

    // The formats we know about first, then anything else in sheet order
    const ordered = [];
    KNOWN_FORMATS.forEach(function(entry) {
      const group = groups.get(entry.key);
      if (group) ordered.push(group);
    });
    groups.forEach(function(group) {
      if (ordered.indexOf(group) === -1) ordered.push(group);
    });

    // A bar holding one button is just a label, so leave it off and show
    // the whole list.
    if (!tabsEl || ordered.length < 2) {
      showRows(ordered[0].key, false);
      return;
    }

    buildTabs(ordered);
    swapTo(groups.has(DEFAULT_FORMAT) ? DEFAULT_FORMAT : ordered[0].key, false);
  });

  if (loading && typeof loading.catch === 'function') {
    loading.catch(function(err) {
      console.error('Could not load the session sheet', err);
      hideSection();
    });
  }
}

// For a page that is only showing sessions and so has no speaker list of its
// own. The home page loads the speakers for its own grid and hands that list
// straight to buildSessions rather than fetching the sheet twice.
function buildSessionsFromSheet() {
  const loading = loadSpeakers(sessionsConfig.speakersSheet, function(speakers) {
    buildSessions(speakers);
  });

  if (loading && typeof loading.catch === 'function') {
    loading.catch(function(err) {
      console.error('Could not load the speaker sheet', err);
      // Sessions are checked against the speaker list, so without it they
      // cannot be shown either. Say so by hiding, not by sitting empty.
      buildSessions([]);
    });
  }
}
