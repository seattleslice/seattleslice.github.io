// ===================== SESSIONS SECTION =====================
// The whole Sessions section - its markup, the panel a row opens, and the
// sheet it reads - in one place, so the home page and s.html show the same
// thing without either one having to render the other.
//
// There are two ways of reading the same set of sessions. The schedule is the
// day as it runs, an hour at a time; the session list is the bill split by
// format. The home page shows both behind a switch, s.html shows the list
// alone. Either way the sheet is read once and both views are filled from it,
// so a row in one and the same row in the other are the one object and open
// the one panel.
//
// A page says where the section goes:
//
//   <div data-sessions></div>
//
// and includes js/tabs.js and this file BEFORE shared.js - js/schedule.js too,
// for a page asking for the schedule. shared.js reads the session panel's
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
//   <div data-sessions data-title="Sessions" data-views="schedule"
//        data-sheet="Sessions2026" data-speakers-sheet="Speakers2026"></div>

const SESSIONS_DEFAULTS = {
  title: 'Sessions',
  sheet: 'Sessions2026',
  speakersSheet: 'Speakers2026',
  // Empty is the session list on its own, which is what s.html wants. Naming
  // the schedule puts the two behind a switch.
  views: '',
  defaultView: 'schedule'
};

// What the placeholder asked for, over the defaults above
var sessionsConfig = Object.assign({}, SESSIONS_DEFAULTS);

// The bars and the schedule, kept from when the markup was built so that the
// filling further down can reach them
var sessionsViewBar = null;
var sessionsFormatBar = null;
var sessionsScheduleView = null;

const SESSION_VIEWS = {
  schedule: 'Schedule View',
  sessions: 'Session View'
};

// The breakfast tables run in the Café before the day proper opens, and are a
// different event to the Level 5 tables they share the Roundtable format with.
// The schedule separates them with a heading of its own; the list has no
// headings to work with, so it says so on the row and keeps them together at
// the end. Spelled out here rather than borrowed from the schedule - this file
// has to work on a page that never loads that one.
const SESSION_BREAKFAST_ROOMS = /^1[A-D]$/;
const SESSION_BREAKFAST_NOTE = 'Women in Games Breakfast';

function sessionBreakfastNote(session) {
  const first = String(session.room || '').split(',')[0].trim();
  return SESSION_BREAKFAST_ROOMS.test(first) ? SESSION_BREAKFAST_NOTE : '';
}

// ===================== MARKUP =====================
// The tabs and the lists are built empty. What goes in them waits on the sheet,
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

  // Up from the moment this runs, which is while the page is still parsing, and
  // down once both views are filled. Two sheets have to be fetched and read
  // before there is anything to show, and a couple of seconds of nothing under
  // a heading reads as a section that has broken. role=status so it is spoken
  // as well as shown.
  const status = document.createElement('p');
  status.className = 'section-status';
  status.id = 'sessionsStatus';
  status.setAttribute('role', 'status');
  status.textContent = 'Loading...';
  section.appendChild(status);

  // The schedule is only offered where the page has loaded it
  const wantsSchedule =
    String(config.views || '').indexOf('schedule') !== -1 &&
    typeof buildScheduleView === 'function';

  // One pane per view, one showing at a time. The box is what carries the
  // height while the two are swapped, so neither one's arrival jolts the page.
  const views = document.createElement('div');
  views.className = 'session-views';
  views.id = 'sessionViews';

  if (wantsSchedule) {
    // Above the sub-options, so the switch reads as the question asked first
    sessionsViewBar = tabBar({
      id: 'viewTabs',
      label: 'How to read the sessions',
      controls: 'sessionViews',
      className: 'session-tabs--views'
    });
    section.appendChild(sessionsViewBar.element);

    const pane = document.createElement('div');
    pane.className = 'session-view';
    pane.id = 'sessionView-schedule';
    pane.hidden = true;
    sessionsScheduleView = buildScheduleView(pane);
    views.appendChild(pane);
  }

  const pane = document.createElement('div');
  pane.className = 'session-view';
  pane.id = 'sessionView-sessions';
  if (wantsSchedule) pane.hidden = true;

  // One button per format, filled in once the sheet says which formats are on
  // the bill. The pill behind the buttons is placed by script.
  sessionsFormatBar = tabBar({
    id: 'sessionTabs',
    label: 'Session formats',
    controls: 'sessionsList'
  });
  pane.appendChild(sessionsFormatBar.element);

  const list = document.createElement('div');
  list.className = 'sessions-list';
  list.id = 'sessionsList';
  list.setAttribute('role', 'tabpanel');
  pane.appendChild(list);

  views.appendChild(pane);
  section.appendChild(views);

  return section;
}

// A folded map with a marker on the middle panel. Drawn rather than fetched,
// so the panel has no image to wait on, and in currentColor so the button can
// fill it in on hover with nothing else to keep in step.
const SESSION_MAP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
  ' stroke-linejoin="round" stroke-linecap="round" aria-hidden="true" focusable="false">' +
  '<path d="M3 6.5 L9 4 L15 6.5 L21 4 V17 L15 19.5 L9 17 L3 19.5 Z"/>' +
  '<path d="M9 4 V17"/><path d="M15 6.5 V19.5"/>' +
  '<circle cx="12" cy="11.6" r="1.9" fill="currentColor" stroke="none"/>' +
  '</svg>';

// The panel a row opens. It shares the scrim with the speaker panel, so it is
// hung off the same overlay rather than given one of its own.
function buildSessionPanel() {
  const panel = document.createElement('div');
  panel.className = 'speaker-overlay__panel speaker-overlay__panel--session';
  panel.id = 'sessionPanel';
  panel.hidden = true;

  // The corner used to hold a way out, which the scrim already is: a tap
  // anywhere off the panel closes it, and so does Escape. A session has
  // somewhere to be instead, so the corner carries the map button - it shuts
  // the panel and takes the reader to the room on the venue map.
  //
  // It ships hidden. js/shared.js raises it only where the page carries the
  // map and the map knows the room, so the pages that show sessions without a
  // map of their own - s.html, schedulepreview.html - simply have no button.
  const map = document.createElement('button');
  map.type = 'button';
  map.className = 'session-panel__map';
  map.id = 'sessionMap';
  map.hidden = true;
  map.setAttribute('aria-label', 'Show this room on the venue map');
  map.innerHTML = SESSION_MAP_ICON;
  panel.appendChild(map);

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
    ['title', 'sheet', 'speakersSheet', 'views', 'defaultView'].forEach(function(key) {
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

// ===================== THE SESSION LIST =====================
// There are far too many sessions for one list, so they are split by format
// behind a row of tabs. A row shows only the title and the line-up - the format
// and the faces wait for the panel.
//
// Returns whether there was anything to show.
function fillSessionList(sessions) {
  const list = document.getElementById('sessionsList');
  if (!list || !sessions.length) return false;

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

  // "Micro-talk", "micro talk" and "Microtalks" are all the one format. The
  // schedule has the same rule, spelled out again rather than borrowed - this
  // file has to work on a page that never loads that one.
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

  // Which session a row stands for, so a click can work out what else was on
  // offer beside it
  const rowSessions = new Map();

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

    // Everything that follows the title travels together - see
    // .session-row__meta, which is what keeps it from being split up.
    const meta = document.createElement('span');
    meta.className = 'session-row__meta';

    const names = session.speakers.map(function(speaker) {
      return speaker.name;
    }).join(', ');

    if (names) {
      const lineup = document.createElement('span');
      lineup.className = 'session-row__speakers';
      lineup.textContent = names;
      meta.appendChild(lineup);
    }

    // Which event this one belongs to, where the format alone does not say
    const event = sessionBreakfastNote(session);
    if (event) {
      row.dataset.event = event;
      if (meta.childNodes.length) meta.appendChild(document.createTextNode(' '));

      const note = document.createElement('span');
      note.className = 'session-row__event';
      note.textContent = '(' + event + ')';
      meta.appendChild(note);
    }

    if (meta.childNodes.length) {
      // The gap between the title and what follows, carried as white space
      // rather than as a margin on the title. A margin at the end of a line is
      // still charged to that line, so a title near the edge would wrap a word
      // early to leave room for a gap that has gone down with the block anyway
      // - and a row with no metadata at all would pay for a gap separating it
      // from nothing. White space hangs at a break instead, and is also what
      // lets the line break here in the first place.
      const gap = document.createElement('span');
      gap.className = 'session-row__gap';
      gap.textContent = ' ';
      text.appendChild(gap);

      text.appendChild(meta);
    }

    row.appendChild(text);

    const chevron = document.createElement('span');
    chevron.className = 'session-row__chevron';
    chevron.innerHTML = '&#9654;';
    row.appendChild(chevron);

    rowSessions.set(row, session);

    row.addEventListener('click', function() {
      // Only the format on screen. Reading past the tab you are on is not
      // something a second click could have done.
      const shown = overlayVisible(list, '.session-row');

      openSessionOverlay(session, shown.map(function(el) {
        return rowSessions.get(el);
      }), shown.indexOf(row));
    });

    return row;
  }

  const groups = new Map();
  let swapping = null;

  sessions.forEach(function(session) {
    const key = formatKey(session.format);
    let group = groups.get(key);

    if (!group) {
      group = { key: key, label: formatLabel(session.format), rows: [] };
      groups.set(key, group);
    }

    group.rows.push(buildRow(session));
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

  // Now the order is settled. Within a format the sheet's order stands, except
  // that the breakfast tables go to the end of the roundtables - they are a
  // different event, and reading past them to reach the day's own is backwards.
  ordered.forEach(function(group) {
    group.rows.sort(function(a, b) {
      return (a.dataset.event ? 1 : 0) - (b.dataset.event ? 1 : 0);
    });

    group.rows.forEach(function(row) { list.appendChild(row); });
  });

  // Show one format's rows and hide the rest. The arriving rows are stepped
  // in one after another, which is what the delay is for.
  function show(key, animate) {
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
          row.style.animationDelay = tabSwapDelay(shown);
          row.classList.add('session-row--in');
        }
        shown++;
      });
    });
  }

  // A bar holding one button is just a label, so leave it off and show the
  // whole list.
  if (!sessionsFormatBar || ordered.length < 2) {
    show(ordered[0].key, false);
    return true;
  }

  sessionsFormatBar.setTabs(
    ordered.map(function(group) {
      return { key: group.key, label: group.label };
    }),
    function(key, animate) {
      tabSwapCancel(swapping);
      swapping = tabSwap(list, function(stagger) {
        show(key, stagger);
      }, {
        animate: animate,
        itemSelector: '.session-row',
        outClass: 'session-row--out'
      });
    }
  );

  sessionsFormatBar.select(
    groups.has(DEFAULT_FORMAT) ? DEFAULT_FORMAT : ordered[0].key, false);
  return true;
}

// ===================== THE SWITCH =====================
// One pane leaves and the other arrives, sub-options and all. The bar inside
// the arriving pane has been sitting hidden with nothing to measure, so its
// pill is placed the moment the pane is on screen and before its buttons are
// stepped in.
function setUpSessionViews(views) {
  const box = document.getElementById('sessionViews');
  if (!box) return;

  const panes = views.filter(function(view) {
    view.pane = document.getElementById('sessionView-' + view.key);
    return view.pane;
  });

  if (!panes.length) return;

  let swapping = null;

  function show(key, animate) {
    panes.forEach(function(view) {
      const on = view.key === key;

      view.pane.classList.remove('session-view--out');
      view.pane.classList.remove('session-view--in');
      view.pane.hidden = !on;
      if (!on) return;

      if (view.arrive) view.arrive(animate);
      if (animate) view.pane.classList.add('session-view--in');
    });
  }

  // Only one to show, so the switch would be a label rather than a choice
  if (panes.length < 2 || !sessionsViewBar) {
    show(panes[0].key, false);
    return;
  }

  sessionsViewBar.setTabs(
    panes.map(function(view) {
      return { key: view.key, label: SESSION_VIEWS[view.key] || view.key };
    }),
    function(key, animate) {
      tabSwapCancel(swapping);
      swapping = tabSwap(box, function(stagger) {
        show(key, stagger);
      }, {
        animate: animate,
        itemSelector: '.session-view',
        outClass: 'session-view--out'
      });
    }
  );

  const asked = sessionsConfig.defaultView;
  const wanted = panes.filter(function(view) { return view.key === asked; })[0];
  sessionsViewBar.select(wanted ? wanted.key : panes[0].key, false);
}

// ===================== FILLING IT IN =====================
// A session is kept when at least one seat names a speaker we imported. The
// sheet is read the forgiving way, without insisting on a synopsis, because the
// schedule would rather show a room's session with nothing written about it yet
// than leave a hole in the day. The list, which is nothing but descriptions,
// keeps the stricter rule for itself.
function buildSessions(speakers) {
  const section = document.getElementById('sessions');
  const list = document.getElementById('sessionsList');
  if (!section || !list) return;

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

  const loading = loadSessions(sessionsConfig.sheet, speakers, function(all) {
    if (!all.length) {
      hideSection();
      return;
    }

    const described = all.filter(function(session) { return session.synopsis; });
    const views = [];

    if (sessionsScheduleView && sessionsScheduleView.fill(all)) {
      views.push({
        key: 'schedule',
        arrive: function(animate) {
          sessionsScheduleView.reflow();
          if (animate) sessionsScheduleView.playIn();
        }
      });
    }

    if (fillSessionList(described)) {
      views.push({
        key: 'sessions',
        arrive: function(animate) {
          if (!sessionsFormatBar) return;
          sessionsFormatBar.reflow();
          if (animate) {
            sessionsFormatBar.playIn(TAB_SWAP.staggerMs, TAB_SWAP.staggerMaxMs);
          }
        }
      });
    }

    if (!views.length) {
      hideSection();
      return;
    }

    setUpSessionViews(views);

    // Both views are filled, so the wait is over
    const statusEl = document.getElementById('sessionsStatus');
    if (statusEl) statusEl.hidden = true;
  }, { requireSynopsis: false });

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
